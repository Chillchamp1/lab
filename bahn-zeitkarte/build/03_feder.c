/* 03_feder.c — das Federmodell und das Relief darueber.
 *
 * Zwei Stufen, und die zweite ist der eigentliche Einfall.
 *
 * STUFE 1 — die flache Federkarte. Zwischen je zwei Bahnhoefen haengt eine
 * Feder, deren Ruhelaenge die Reisezeit ist: ein Millimeter je Minute, fuer
 * alle Paare derselbe Maßstab. Geloest wird das mit Stress-Majorisierung
 * (SMACOF, de Leeuw 1977) — jeder Schritt senkt den Stress garantiert, was
 * ein Gradientenverfahren auf dieser Zielfunktion nicht tut. Gewichtet wird
 * mit 1/t^2: gemessen wird damit der *relative* Fehler, sonst walzen die
 * Fernpaare die Nahbeziehungen platt.
 *
 * STUFE 2 — das Relief. Eine flache Karte kann die Reisezeit nicht treffen,
 * denn die ist keine euklidische Metrik: von Hintertupfingen sind es zu
 * allem drei Stunden, und in der Ebene gibt es keinen Punkt, der von allem
 * gleich weit weg ist und trotzdem in der Naehe liegt. Also bekommt jeder
 * Bahnhof eine dritte Zahl, seine Hoehe h >= 0, und die Modelldistanz ist
 * nicht mehr die Luftlinie, sondern der **Weg ueber das Gelaende**: die
 * kuerzeste Kette von Kanten im Nachbarschaftsgraphen, jede Kante so lang
 * wie sqrt(dx^2 + dy^2 + dh^2).
 *
 * Das ist genau die richtige Geometrie fuer ein Netz mit Knoten und Aesten.
 * Von einem Gipfel zum anderen muss der Weg ins Tal hinunter und wieder
 * hinauf — die Hoehen addieren sich, wie sich die Zu- und Abgangszeiten
 * addieren. Zwei Nachbarn auf demselben Ast bleiben dagegen Nachbarn, denn
 * der Weg bleibt oben auf dem Kamm. Die Hoehe ist damit lesbar: sie ist die
 * Zeit, die es kostet, an diesen Ort heran- und von ihm wegzukommen — in
 * Minuten, im selben Maßstab wie die Breite der Karte.
 *
 * Weil nur Hoehen*unterschiede* in die Kantenlaenge eingehen, wuesste das
 * Modell von sich aus nicht, ob ein abgelegener Ort ein Berg oder ein Loch
 * ist. h >= 0 entscheidet das: die gut erreichbaren Achsen liegen auf null,
 * alles andere steigt daraus auf.
 *
 * Bauen: cc -O3 -o feder 03_feder.c -lpthread -lm
 * Lauf:  ./feder zwischen/zeiten.bin zwischen/kern.bin zwischen/geo.bin \
 *               zwischen/lage.bin
 */
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif
#include <pthread.h>

#define UNERR   65535
#define NACHB   12       /* Nachbarn je Bahnhof im Gelaendegraphen */
#define SMACOF  400      /* Schritte der flachen Loesung */
#define RELIEF  200      /* Schritte der Gelaendeloesung */
/* Sparsamkeit im Gelaende. Von zwei Gelaenden, die die Reisezeit gleich gut
 * treffen, ist das flachere das richtige: Hoehe muss sich verdienen. Ohne
 * diesen Zug nach unten baut das Modell eine breite Kuppe ueber die
 * Landesmitte — in der Ebene liegt die Mitte nah an allem, in der Zeit nicht,
 * und Hoehe ist der billigste Weg, das auszugleichen. Die Kuppe trifft die
 * Zahlen, aber sie erzaehlt das Falsche: Frankfurt lag darin hoeher als
 * Westerland. Mit dem Zug nach unten bleibt nur die Hoehe stehen, die ein
 * einzelner Ort sich gegen seine Nachbarschaft verdient. */
#define NUR_H    50      /* die ersten davon: nur die Hoehe, die Ebene haelt still */

static uint32_t N;               /* Bahnhoefe im Kern */
static uint16_t *T;              /* N*N Reisezeiten, 0 = keine Feder */
static float *gx, *gy;           /* geografische Lage in Kilometern */
static float *x, *y, *h;         /* die gesuchte Lage */
static float *nx_, *ny_;         /* Zwischenspeicher fuer SMACOF */
static long kerne;

/* ------------------------------------------------------------ Arbeitsteilung */
typedef void (*teil_fn)(uint32_t von, uint32_t bis, int nr);
static teil_fn teil_f;
static uint32_t teil_grenze[65];
static void *teil_lauf(void *a)
{
    int nr = (int)(intptr_t)a;
    teil_f(teil_grenze[nr], teil_grenze[nr + 1], nr);
    return NULL;
}
static void parallel(teil_fn f, uint32_t n)
{
    pthread_t tp[64];
    for (long i = 0; i <= kerne; i++)
        teil_grenze[i] = (uint32_t)((double)n * i / kerne);
    teil_f = f;
    for (long i = 0; i < kerne; i++)
        pthread_create(tp + i, NULL, teil_lauf, (void *)(intptr_t)i);
    for (long i = 0; i < kerne; i++) pthread_join(tp[i], NULL);
}

/* --------------------------------------------------------- Stufe 1: SMACOF */
static void smacof_teil(uint32_t von, uint32_t bis, int nr)
{
    (void)nr;
    for (uint32_t i = von; i < bis; i++) {
        const uint16_t *ti = T + (size_t)i * N;
        double sx = 0, sy = 0, sw = 0;
        double xi = x[i], yi = y[i];
        for (uint32_t j = 0; j < N; j++) {
            uint32_t t = ti[j];
            if (!t) continue;
            double w = 1.0 / ((double)t * t);
            double dx = xi - x[j], dy = yi - y[j];
            double d = sqrt(dx * dx + dy * dy);
            if (d < 1e-7) { dx = 1e-7; dy = 0; d = 1e-7; }
            sx += w * (x[j] + t * dx / d);
            sy += w * (y[j] + t * dy / d);
            sw += w;
        }
        if (sw > 0) { nx_[i] = (float)(sx / sw); ny_[i] = (float)(sy / sw); }
        else { nx_[i] = x[i]; ny_[i] = y[i]; }
    }
}

static double stress_teil_erg[64][2];
static void stress_teil(uint32_t von, uint32_t bis, int nr)
{
    double oben = 0, unten = 0;
    for (uint32_t i = von; i < bis; i++) {
        const uint16_t *ti = T + (size_t)i * N;
        for (uint32_t j = i + 1; j < N; j++) {
            uint32_t t = ti[j];
            if (!t) continue;
            double w = 1.0 / ((double)t * t);
            double dx = x[i] - x[j], dy = y[i] - y[j];
            double d = sqrt(dx * dx + dy * dy) - t;
            oben += w * d * d; unten += w * (double)t * t;
        }
    }
    stress_teil_erg[nr][0] = oben; stress_teil_erg[nr][1] = unten;
}
static double stress_flach(void)
{
    parallel(stress_teil, N);
    double a = 0, b = 0;
    for (long i = 0; i < kerne; i++) { a += stress_teil_erg[i][0]; b += stress_teil_erg[i][1]; }
    return sqrt(a / b);
}

/* ------------------------------------------------- Nachbarschaftsgraph (kNN) */
static uint32_t *kopf, *nachb, *kante;   /* CSR: Nachbarn und Kantennummern */
static uint32_t *eu, *ev, M_;            /* Kantenliste */

static int cmp64(const void *p, const void *q)
{
    uint64_t a = *(const uint64_t *)p, b = *(const uint64_t *)q;
    return a < b ? -1 : a > b ? 1 : 0;
}

static int cmp_d(const void *a, const void *b)
{
    float da = ((const float *)a)[0], db = ((const float *)b)[0];
    return da < db ? -1 : da > db ? 1 : 0;
}

static void graph_bauen(void)
{
    /* Gitterindex mit etwa NACHB Punkten je Zelle */
    float x0 = 1e30f, x1 = -1e30f, y0 = 1e30f, y1 = -1e30f;
    for (uint32_t i = 0; i < N; i++) {
        if (x[i] < x0) x0 = x[i];
        if (x[i] > x1) x1 = x[i];
        if (y[i] < y0) y0 = y[i];
        if (y[i] > y1) y1 = y[i];
    }
    double flaeche = (double)(x1 - x0 + 1) * (y1 - y0 + 1);
    double zelle = sqrt(flaeche * NACHB / (double)N);
    int gw = (int)((x1 - x0) / zelle) + 2, gh = (int)((y1 - y0) / zelle) + 2;
    uint32_t nz = (uint32_t)gw * gh;
    uint32_t *zz = calloc(nz + 1, sizeof *zz);
    int *cx = malloc(N * sizeof *cx), *cy = malloc(N * sizeof *cy);
    for (uint32_t i = 0; i < N; i++) {
        cx[i] = (int)((x[i] - x0) / zelle); cy[i] = (int)((y[i] - y0) / zelle);
        zz[(uint32_t)cy[i] * gw + cx[i] + 1]++;
    }
    for (uint32_t i = 0; i < nz; i++) zz[i + 1] += zz[i];
    uint32_t *zp = malloc(N * sizeof *zp);
    uint32_t *lauf = malloc(nz * sizeof *lauf);
    memcpy(lauf, zz, nz * sizeof *lauf);
    for (uint32_t i = 0; i < N; i++) zp[lauf[(uint32_t)cy[i] * gw + cx[i]]++] = i;

    /* Paare sammeln, doppelte per Sortierung entfernen */
    uint64_t *paare = malloc((size_t)N * NACHB * sizeof *paare);
    size_t np = 0;
    float *kand = malloc(20000 * 2 * sizeof *kand);
    for (uint32_t i = 0; i < N; i++) {
        size_t nk = 0;
        for (int r = 1; r < 40 && nk < NACHB + 1u; r++) {
            nk = 0;
            for (int dy = -r; dy <= r; dy++)
                for (int dxx = -r; dxx <= r; dxx++) {
                    int px = cx[i] + dxx, py = cy[i] + dy;
                    if (px < 0 || py < 0 || px >= gw || py >= gh) continue;
                    uint32_t c = (uint32_t)py * gw + px;
                    for (uint32_t p = zz[c]; p < zz[c + 1]; p++) {
                        uint32_t j = zp[p];
                        if (j == i || nk >= 19000) continue;
                        float dx = x[i] - x[j], dy2 = y[i] - y[j];
                        kand[nk * 2] = dx * dx + dy2 * dy2;
                        kand[nk * 2 + 1] = (float)j;
                        nk++;
                    }
                }
        }
        qsort(kand, nk, 2 * sizeof *kand, cmp_d);
        size_t k = nk < NACHB ? nk : NACHB;
        for (size_t q = 0; q < k; q++) {
            uint32_t j = (uint32_t)kand[q * 2 + 1];
            uint32_t a = i < j ? i : j, b = i < j ? j : i;
            paare[np++] = ((uint64_t)a << 32) | b;
        }
    }
    free(kand); free(cx); free(cy); free(zp); free(lauf); free(zz);
    /* sortieren und vereinzeln */
    qsort(paare, np, sizeof *paare, cmp64);
    free(eu); free(ev);
    eu = malloc(np * sizeof *eu); ev = malloc(np * sizeof *ev);
    M_ = 0;
    for (size_t q = 0; q < np; q++) {
        if (q && paare[q] == paare[q - 1]) continue;
        eu[M_] = (uint32_t)(paare[q] >> 32); ev[M_] = (uint32_t)paare[q]; M_++;
    }
    free(paare);
    /* CSR */
    free(kopf); free(nachb); free(kante);
    kopf = calloc(N + 1, sizeof *kopf);
    for (uint32_t e = 0; e < M_; e++) { kopf[eu[e] + 1]++; kopf[ev[e] + 1]++; }
    for (uint32_t i = 0; i < N; i++) kopf[i + 1] += kopf[i];
    nachb = malloc(2 * (size_t)M_ * sizeof *nachb);
    kante = malloc(2 * (size_t)M_ * sizeof *kante);
    uint32_t *lf = malloc((N + 1) * sizeof *lf);
    memcpy(lf, kopf, (N + 1) * sizeof *lf);
    for (uint32_t e = 0; e < M_; e++) {
        nachb[lf[eu[e]]] = ev[e]; kante[lf[eu[e]]++] = e;
        nachb[lf[ev[e]]] = eu[e]; kante[lf[ev[e]]++] = e;
    }
    free(lf);
}

/* Zusammenhang sichern: getrennte Teile mit ihrem naechsten Paar verbinden.
 * Bei zwoelf Nachbarn passiert das praktisch nie, aber ein unzusammenhaengender
 * Graph macht jede Distanz dazwischen unendlich, und das faellt nicht auf. */
static uint32_t teile_verbinden(void)
{
    int8_t *ges = calloc(N, 1);
    uint32_t *stapel = malloc(N * sizeof *stapel);
    uint32_t *marke = malloc(N * sizeof *marke);
    uint32_t nt = 0;
    for (uint32_t s = 0; s < N; s++) {
        if (ges[s]) continue;
        uint32_t sp = 0; stapel[sp++] = s; ges[s] = 1; marke[s] = nt;
        while (sp) {
            uint32_t v = stapel[--sp];
            for (uint32_t p = kopf[v]; p < kopf[v + 1]; p++)
                if (!ges[nachb[p]]) { ges[nachb[p]] = 1; marke[nachb[p]] = nt; stapel[sp++] = nachb[p]; }
        }
        nt++;
    }
    if (nt > 1) {
        uint32_t neu = 0;
        for (uint32_t t = 1; t < nt; t++) {
            double best = 1e30; uint32_t bi = 0, bj = 0;
            for (uint32_t i = 0; i < N; i++) {
                if (marke[i] != t) continue;
                for (uint32_t j = 0; j < N; j++) {
                    if (marke[j] >= t) continue;
                    double dx = x[i] - x[j], dy = y[i] - y[j], d = dx * dx + dy * dy;
                    if (d < best) { best = d; bi = i; bj = j; }
                }
            }
            eu = realloc(eu, (M_ + 1) * sizeof *eu);
            ev = realloc(ev, (M_ + 1) * sizeof *ev);
            eu[M_] = bi < bj ? bi : bj; ev[M_] = bi < bj ? bj : bi; M_++; neu++;
        }
        /* CSR neu aufbauen */
        free(kopf); free(nachb); free(kante);
        kopf = calloc(N + 1, sizeof *kopf);
        for (uint32_t e = 0; e < M_; e++) { kopf[eu[e] + 1]++; kopf[ev[e] + 1]++; }
        for (uint32_t i = 0; i < N; i++) kopf[i + 1] += kopf[i];
        nachb = malloc(2 * (size_t)M_ * sizeof *nachb);
        kante = malloc(2 * (size_t)M_ * sizeof *kante);
        uint32_t *lf = malloc((N + 1) * sizeof *lf);
        memcpy(lf, kopf, (N + 1) * sizeof *lf);
        for (uint32_t e = 0; e < M_; e++) {
            nachb[lf[eu[e]]] = ev[e]; kante[lf[eu[e]]++] = e;
            nachb[lf[ev[e]]] = eu[e]; kante[lf[ev[e]]++] = e;
        }
        free(lf);
        fprintf(stderr, "  %u getrennte Teile mit %u Kanten verbunden\n", nt, neu);
    }
    free(ges); free(stapel); free(marke);
    return nt;
}

/* ------------------------------------- Stufe 2: Gradient ueber Gelaendewege */
static float *laenge;            /* Kantenlaengen */
static double *last_g[64];       /* Kantenlast je Kern */
static double teil_stress[64][2];

typedef struct { double *d; uint32_t *pk, *reih, *hp; uint32_t *pos; double *acc; } Werk;
static Werk werk[64];

static void dijkstra_last(uint32_t von, uint32_t bis, int nr)
{
    Werk *W = werk + nr;
    double *d = W->d, *acc = W->acc;
    uint32_t *pk = W->pk, *reih = W->reih, *hp = W->hp, *pos = W->pos;
    double *last = last_g[nr];
    double so = 0, su = 0;
    for (uint32_t s = von; s < bis; s++) {
        for (uint32_t i = 0; i < N; i++) { d[i] = INFINITY; pos[i] = UINT32_MAX; pk[i] = UINT32_MAX; }
        uint32_t nh = 0, nr2 = 0;
        d[s] = 0; hp[nh] = s; pos[s] = nh; nh++;
        while (nh) {
            uint32_t v = hp[0];
            nh--;
            if (nh) { hp[0] = hp[nh]; pos[hp[0]] = 0;
                uint32_t i = 0;
                for (;;) { uint32_t l = 2 * i + 1, r = l + 1, m = i;
                    if (l < nh && d[hp[l]] < d[hp[m]]) m = l;
                    if (r < nh && d[hp[r]] < d[hp[m]]) m = r;
                    if (m == i) break;
                    uint32_t t = hp[i]; hp[i] = hp[m]; hp[m] = t;
                    pos[hp[i]] = i; pos[hp[m]] = m; i = m; } }
            pos[v] = UINT32_MAX - 1;
            reih[nr2++] = v;
            for (uint32_t p = kopf[v]; p < kopf[v + 1]; p++) {
                uint32_t u = nachb[p];
                if (pos[u] == UINT32_MAX - 1) continue;
                double nd = d[v] + laenge[kante[p]];
                if (nd < d[u]) {
                    d[u] = nd; pk[u] = p;
                    if (pos[u] == UINT32_MAX) { hp[nh] = u; pos[u] = nh; nh++; }
                    uint32_t i = pos[u];
                    while (i && d[hp[(i - 1) / 2]] > d[hp[i]]) {
                        uint32_t q = (i - 1) / 2, t = hp[i];
                        hp[i] = hp[q]; hp[q] = t; pos[hp[i]] = i; pos[hp[q]] = q; i = q;
                    }
                }
            }
        }
        /* Residuen, dann von den Blaettern her aufsummieren */
        const uint16_t *ts = T + (size_t)s * N;
        for (uint32_t i = 0; i < N; i++) acc[i] = 0;
        for (uint32_t i = 0; i < N; i++) {
            uint32_t t = ts[i];
            if (!t || i == s || !isfinite(d[i])) continue;
            double w = 1.0 / ((double)t * t);
            double r = d[i] - (double)t;
            acc[i] = w * r;
            so += w * r * r; su += w * (double)t * t;
        }
        for (uint32_t q = nr2; q-- > 1;) {
            uint32_t v = reih[q];
            if (pk[v] == UINT32_MAX) continue;
            uint32_t e = kante[pk[v]];
            last[e] += acc[v];
            uint32_t par = eu[e] == v ? ev[e] : eu[e];
            acc[par] += acc[v];
        }
    }
    teil_stress[nr][0] = so; teil_stress[nr][1] = su;
}

int main(int argc, char **argv)
{
    if (argc < 5) { fprintf(stderr, "zeiten.bin kern.bin geo.bin lage.bin\n"); return 2; }
    kerne = sysconf(_SC_NPROCESSORS_ONLN); if (kerne < 1) kerne = 1;
    if (kerne > 64) kerne = 64;

    /* ---- einlesen und symmetrisieren */
    FILE *f = fopen(argv[1], "rb");
    char mg[4]; uint32_t kz[2];
    if (!f || fread(mg, 1, 4, f) != 4 || memcmp(mg, "ZKZ1", 4) ||
        fread(kz, 4, 2, f) != 2) { fprintf(stderr, "zeiten.bin?\n"); return 1; }
    uint32_t NDE = kz[0];
    uint16_t *Z = malloc((size_t)NDE * NDE * 2);
    if (fread(Z, 2, (size_t)NDE * NDE, f) != (size_t)NDE * NDE) return 1;
    fclose(f);

    f = fopen(argv[2], "rb");
    if (!f || fread(&N, 4, 1, f) != 1) { fprintf(stderr, "kern.bin?\n"); return 1; }
    uint32_t *kern = malloc(N * 4);
    if (fread(kern, 4, N, f) != N) return 1;
    fclose(f);

    f = fopen(argv[3], "rb");
    gx = malloc(N * sizeof *gx); gy = malloc(N * sizeof *gy);
    if (!f || fread(gx, 4, N, f) != N || fread(gy, 4, N, f) != N) {
        fprintf(stderr, "geo.bin?\n"); return 1; }
    fclose(f);

    T = malloc((size_t)N * N * 2);
    uint64_t ohne = 0;
    for (uint32_t a = 0; a < N; a++)
        for (uint32_t b = 0; b < N; b++) {
            uint32_t p = Z[(size_t)kern[a] * NDE + kern[b]];
            uint32_t q = Z[(size_t)kern[b] * NDE + kern[a]];
            uint32_t v;
            if (a == b) v = 0;
            else if (p == UNERR && q == UNERR) { v = 0; ohne++; }
            else if (p == UNERR) v = q;
            else if (q == UNERR) v = p;
            else v = (p + q + 1) / 2;
            T[(size_t)a * N + b] = (uint16_t)(v > 65000 ? 65000 : v);
        }
    free(Z);
    printf("%u Bahnhoefe, %llu Paare ohne Feder (%.3f%%)\n", N,
           (unsigned long long)ohne / 2,
           100.0 * ohne / ((double)N * (N - 1)));

    /* ---- Startlage: Geografie, auf Minuten skaliert */
    x = malloc(N * 4); y = malloc(N * 4); h = calloc(N, 4);
    nx_ = malloc(N * 4); ny_ = malloc(N * 4);
    {   double zo = 0, zu = 0;
        for (uint32_t i = 0; i < N; i++)
            for (uint32_t j = i + 1; j < N; j++) {
                uint32_t t = T[(size_t)i * N + j];
                if (!t) continue;
                double dx = gx[i] - gx[j], dy = gy[i] - gy[j];
                double d = sqrt(dx * dx + dy * dy), w = 1.0 / ((double)t * t);
                zo += w * d * t; zu += w * d * d;
            }
        double s = zo / zu;
        printf("Startmaßstab: %.4f Minuten je Kilometer (%.1f km/h Mittel)\n",
               s, 60.0 / s);
        for (uint32_t i = 0; i < N; i++) { x[i] = (float)(gx[i] * s); y[i] = (float)(gy[i] * s); }
    }

    /* ---- Stufe 1 */
    double stressGeo = stress_flach();
    printf("Stress der reinen Geografie: %.5f\n", stressGeo);
    for (int it = 0; it < SMACOF; it++) {
        parallel(smacof_teil, N);
        memcpy(x, nx_, N * 4); memcpy(y, ny_, N * 4);
        if (it % 50 == 49 || it == 0)
            printf("  SMACOF %3d: Stress %.5f\n", it + 1, stress_flach());
    }
    double stress2d = stress_flach();

    /* ---- nach Norden drehen: Drehung und Verschiebung gegen die Geografie */
    {   double px = 0, py = 0, qx = 0, qy = 0;
        for (uint32_t i = 0; i < N; i++) { px += x[i]; py += y[i]; qx += gx[i]; qy += gy[i]; }
        px /= N; py /= N; qx /= N; qy /= N;
        double a = 0, b = 0;
        for (uint32_t i = 0; i < N; i++) {
            double ux = x[i] - px, uy = y[i] - py, vx = gx[i] - qx, vy = gy[i] - qy;
            a += ux * vx + uy * vy; b += ux * vy - uy * vx;
        }
        double th = atan2(b, a), c = cos(th), s = sin(th);
        for (uint32_t i = 0; i < N; i++) {
            double ux = x[i] - px, uy = y[i] - py;
            x[i] = (float)(c * ux - s * uy); y[i] = (float)(c * uy + s * ux);
        }
        printf("gedreht um %.2f Grad gegen die Geografie\n", th * 180 / M_PI);
    }
    float *fx = malloc(N * 4), *fy = malloc(N * 4);
    memcpy(fx, x, N * 4); memcpy(fy, y, N * 4);

    /* ---- Starthoehe aus dem Rest, den die Ebene liegen laesst.
     * Bei h = 0 ueberall ist der Hoehengradient genau null: in die
     * Kantenlaenge geht nur der Unterschied ein, und der ist ueberall null.
     * Das flache Optimum ist fuer die Hoehe also ein Sattel, aus dem kein
     * Gradientenschritt herausfuehrt — die Hoehe braucht einen Anstoss.
     *
     * Er kommt nicht aus dem Zufall, sondern aus der Messung: wo die flache
     * Karte einen Bahnhof im Mittel zu *nah* an alles andere zeichnet, fehlt
     * Weg, und der fehlende Weg ist die Hoehe. Weil zwei Gipfel ihre Hoehen
     * beide beitragen, ist die Haelfte des Rests der Ansatz. */
    for (uint32_t i = 0; i < N; i++) {
        const uint16_t *ti = T + (size_t)i * N;
        double so = 0, sw = 0;
        for (uint32_t j = 0; j < N; j++) {
            uint32_t t = ti[j];
            if (!t) continue;
            double w = 1.0 / ((double)t * t);
            double dx = x[i] - x[j], dy = y[i] - y[j];
            so += w * ((double)t - sqrt(dx * dx + dy * dy));
            sw += w;
        }
        double r = sw > 0 ? so / sw / 2 : 0;
        h[i] = (float)(r > 0 ? r : 0);
    }
    {   float hm = 0; double hs = 0;
        for (uint32_t i = 0; i < N; i++) { if (h[i] > hm) hm = h[i]; hs += h[i]; }
        printf("Starthoehe aus dem Rest der Ebene: Mittel %.1f, Maximum %.0f Minuten\n",
               hs / N, hm);
    }

    /* ---- Stufe 2: Gelaende */
    laenge = malloc((size_t)N * NACHB * 2 * sizeof *laenge);
    for (int nr = 0; nr < kerne; nr++) {
        werk[nr].d = malloc(N * sizeof(double));
        werk[nr].pk = malloc(N * 4); werk[nr].reih = malloc(N * 4);
        werk[nr].hp = malloc(N * 4); werk[nr].pos = malloc(N * 4);
        werk[nr].acc = malloc(N * sizeof(double));
    }
    double *gX = calloc(N, sizeof *gX), *gY = calloc(N, sizeof *gY), *gH = calloc(N, sizeof *gH);
    double *mX = calloc(N, sizeof *mX), *mY = calloc(N, sizeof *mY), *mH = calloc(N, sizeof *mH);
    double *vX = calloc(N, sizeof *vX), *vY = calloc(N, sizeof *vY), *vH = calloc(N, sizeof *vH);
    double b1 = 0.9, b2 = 0.999, eps = 1e-8;
    double lam = 0, lam_rel = argc > 5 ? atof(argv[5]) : 0.0;
    double stressGel = 0, stressNurH = 0;
    int relief_n = argc > 6 ? atoi(argv[6]) : RELIEF;
    for (int it = 0; it < relief_n; it++) {
        /* Jeden Schritt neu. Ein festgehaltener Nachbarschaftsgraph laedt dazu
         * ein, seine Umwege auszunutzen statt die Zeit zu treffen: gemessen
         * sank der Stress zwanzig Schritte lang und stieg beim ersten Neubau
         * wieder. Der Graph gehoert zur Lage, nicht zur Rechnung. */
        graph_bauen();
        teile_verbinden();
        laenge = realloc(laenge, (size_t)M_ * sizeof *laenge);
        for (int nr = 0; nr < kerne; nr++) {
            free(last_g[nr]); last_g[nr] = calloc(M_, sizeof(double));
        }
        for (uint32_t e = 0; e < M_; e++) {
            double dx = x[eu[e]] - x[ev[e]], dy = y[eu[e]] - y[ev[e]], dh = h[eu[e]] - h[ev[e]];
            laenge[e] = (float)sqrt(dx * dx + dy * dy + dh * dh);
            if (laenge[e] < 1e-6f) laenge[e] = 1e-6f;
        }
        for (int nr = 0; nr < kerne; nr++) memset(last_g[nr], 0, M_ * sizeof(double));
        parallel(dijkstra_last, N);
        double so = 0, su = 0;
        for (long i = 0; i < kerne; i++) { so += teil_stress[i][0]; su += teil_stress[i][1]; }
        stressGel = sqrt(so / su);
        memset(gX, 0, N * sizeof *gX); memset(gY, 0, N * sizeof *gY); memset(gH, 0, N * sizeof *gH);
        for (uint32_t e = 0; e < M_; e++) {
            double L = 0;
            for (long nr = 0; nr < kerne; nr++) L += last_g[nr][e];
            if (L == 0) continue;
            uint32_t i = eu[e], j = ev[e];
            double dx = x[i] - x[j], dy = y[i] - y[j], dh = h[i] - h[j], l = laenge[e];
            double fxx = L * dx / l, fyy = L * dy / l, fhh = L * dh / l;
            gX[i] += fxx; gX[j] -= fxx;
            gY[i] += fyy; gY[j] -= fyy;
            gH[i] += fhh; gH[j] -= fhh;
        }
        int nur_hoehe = it < NUR_H * relief_n / RELIEF;
        /* lam wird im ersten Schritt auf die Groessenordnung des
         * Hoehengradienten gesetzt und dann festgehalten. */
        if (it == 0) {
            double m = 0;
            for (uint32_t i = 0; i < N; i++) m += fabs(gH[i]);
            lam = lam_rel * m / N;
            printf("Sparsamkeit: lambda = %.4g (%.2f x mittlerer Hoehengradient)\n",
                   lam, lam_rel);
        }
        for (uint32_t i = 0; i < N; i++) gH[i] += lam;
        double lr = 0.9 * pow(0.03, (double)it / relief_n);
        double c1 = 1 - pow(b1, it + 1), c2 = 1 - pow(b2, it + 1);
        for (uint32_t i = 0; i < N; i++) {
            mX[i] = b1 * mX[i] + (1 - b1) * gX[i]; vX[i] = b2 * vX[i] + (1 - b2) * gX[i] * gX[i];
            mY[i] = b1 * mY[i] + (1 - b1) * gY[i]; vY[i] = b2 * vY[i] + (1 - b2) * gY[i] * gY[i];
            mH[i] = b1 * mH[i] + (1 - b1) * gH[i]; vH[i] = b2 * vH[i] + (1 - b2) * gH[i] * gH[i];
            if (!nur_hoehe) {
                x[i] -= (float)(lr * (mX[i] / c1) / (sqrt(vX[i] / c2) + eps));
                y[i] -= (float)(lr * (mY[i] / c1) / (sqrt(vY[i] / c2) + eps));
            }
            h[i] -= (float)(lr * (mH[i] / c1) / (sqrt(vH[i] / c2) + eps));
            if (h[i] < 0) h[i] = 0;
        }
        if (it % 10 == 9 || it == 0) {
            float hmax = 0; double hs = 0;
            for (uint32_t q = 0; q < N; q++) { if (h[q] > hmax) hmax = h[q]; hs += h[q]; }
            printf("  Relief %3d%s: Stress %.5f  Kanten %u  Hoehe Mittel %.1f Max %.0f\n",
                   it + 1, nur_hoehe ? " (nur Hoehe)" : "          ",
                   stressGel, M_, hs / N, hmax);
        }
        if (it == NUR_H * relief_n / RELIEF - 1) stressNurH = stressGel;
    }

    /* die Hoehe soll auf null beginnen */
    {   float hmin = 1e30f;
        for (uint32_t i = 0; i < N; i++) if (h[i] < hmin) hmin = h[i];
        for (uint32_t i = 0; i < N; i++) h[i] -= hmin;
    }
    /* Gelaendelage ebenfalls nach Norden drehen */
    {   double px = 0, py = 0, qx = 0, qy = 0;
        for (uint32_t i = 0; i < N; i++) { px += x[i]; py += y[i]; qx += gx[i]; qy += gy[i]; }
        px /= N; py /= N; qx /= N; qy /= N;
        double a = 0, b = 0;
        for (uint32_t i = 0; i < N; i++) {
            double ux = x[i] - px, uy = y[i] - py, vx = gx[i] - qx, vy = gy[i] - qy;
            a += ux * vx + uy * vy; b += ux * vy - uy * vx;
        }
        double th = atan2(b, a), c = cos(th), s = sin(th);
        for (uint32_t i = 0; i < N; i++) {
            double ux = x[i] - px, uy = y[i] - py;
            x[i] = (float)(c * ux - s * uy); y[i] = (float)(c * uy + s * ux);
        }
    }
    /* Wie weit ist der Grundriss von der Landkarte weggelaufen? Gemessen wird
     * gegen die Geografie, optimal gedreht und skaliert — nur die Verformung
     * bleibt uebrig. Die Frage dahinter: nimmt das Relief der Ebene etwas von
     * ihrer Verzerrung ab? */
    double verz2d = 0, verzGel = 0;
    for (int welche = 0; welche < 2; welche++) {
        const float *ax = welche ? x : fx, *ay = welche ? y : fy;
        double px = 0, py = 0, qx = 0, qy = 0;
        for (uint32_t i = 0; i < N; i++) { px += ax[i]; py += ay[i]; qx += gx[i]; qy += gy[i]; }
        px /= N; py /= N; qx /= N; qy /= N;
        double a = 0, b = 0, gg = 0;
        for (uint32_t i = 0; i < N; i++) {
            double ux = ax[i] - px, uy = ay[i] - py, vx = gx[i] - qx, vy = gy[i] - qy;
            a += ux * vx + uy * vy; b += ux * vy - uy * vx; gg += vx * vx + vy * vy;
        }
        double sk = sqrt(a * a + b * b) / gg;          /* Minuten je Kilometer */
        double th = atan2(-b, a), c = cos(th), si = sin(th);
        double s2s = 0;
        for (uint32_t i = 0; i < N; i++) {
            double vx = (gx[i] - qx) * sk, vy = (gy[i] - qy) * sk;
            double rx = c * vx - si * vy, ry = c * vy + si * vx;
            double ux = ax[i] - px, uy = ay[i] - py;
            s2s += (ux - rx) * (ux - rx) + (uy - ry) * (uy - ry);
        }
        double rms = sqrt(s2s / N) / sk;               /* zurueck in Kilometer */
        if (welche) verzGel = rms; else verz2d = rms;
        printf("%s: Maßstab %.4f min/km, Grundriss %.1f km (RMS) von der Geografie\n",
               welche ? "Gelaende " : "flach    ", sk, rms);
    }
    printf("Stress: Geografie %.5f -> flache Feder %.5f -> nur Hoehe %.5f -> Gelaende %.5f\n",
           stressGeo, stress2d, stressNurH, stressGel);

    f = fopen(argv[4], "wb");
    uint32_t kopfz[1] = { N };
    fwrite("ZKL1", 1, 4, f);
    fwrite(kopfz, 4, 1, f);
    double kenn[6] = { stressGeo, stress2d, stressNurH, stressGel, verz2d, verzGel };
    fwrite(kenn, 8, 6, f);
    fwrite(fx, 4, N, f); fwrite(fy, 4, N, f);      /* flache Federkarte */
    fwrite(x, 4, N, f); fwrite(y, 4, N, f); fwrite(h, 4, N, f);  /* Gelaende */
    fwrite(gx, 4, N, f); fwrite(gy, 4, N, f);                    /* Geografie */
    fclose(f);
    printf("geschrieben: %s\n", argv[4]);
    return 0;
}
