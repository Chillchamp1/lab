/* 02_zeiten.c — die Reisezeitmatrix der Spitzenstunde.
 *
 * Fuer jeden deutschen Bahnhof und jede Abfahrtsminute des Rasters wird die
 * fruehestmoegliche Ankunft an jedem anderen deutschen Bahnhof bestimmt —
 * mit dem Connection Scan Algorithm (Dibbelt/Pajor/Strasser/Wagner 2013),
 * der genau dafuer gemacht ist: einmal linear ueber alle nach Abfahrtszeit
 * sortierten Verbindungen laufen.
 *
 * Reisezeit heisst hier **Tuer-zu-Tuer ab Anfrageminute**: die Wartezeit auf
 * den ersten Zug zaehlt mit. Das ist der Punkt der ganzen Karte — ein
 * Knotenbahnhof mit vier Zuegen je Stunde liegt naeher als ein Haltepunkt
 * mit einem alle zwei Stunden, auch wenn die Fahrt selbst gleich lang ist.
 * Gemittelt wird ueber PROBEN Abfahrtsminuten quer durch die Spitzenstunde,
 * damit nicht der Zufall einer einzelnen Minute die Karte formt.
 *
 * Bauen:  cc -O2 -o zeiten 02_zeiten.c -lpthread -lm
 * Lauf:   ./zeiten zwischen/netz.bin zwischen/deutsch.bin zwischen/zeiten.bin
 */
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <pthread.h>

#define MINUM     5      /* Mindestumsteigezeit in Minuten, siehe METHODIK */
#define PROBEN    12     /* Abfahrtsminuten: alle 5 Minuten der Spitzenstunde */
#define SCHRITT   5
#define REICHWEIT 1080   /* Suchhorizont: 18 Stunden ab der Anfrage */
#define UNERR     65535
#define UNENDL    (1 << 29)   /* Sentinel mit Luft nach oben: INT32_MAX + MINUM laeuft ueber */

static uint32_t NB, NF, NC, T0;          /* Bahnhoefe, Fahrten, Verbindungen */
static uint16_t *cab, *can, *cvon, *cnach, *cfahrt;
static uint32_t *ersteAb;                /* Minute -> erster Verbindungsindex */
static uint32_t maxmin;

static uint32_t NDE;                     /* Zahl der deutschen Bahnhoefe */
static uint32_t *deIdx;                  /* deutsche Nummer -> Bahnhofsnummer */
static uint16_t *M;                      /* NDE * NDE Reisezeiten in Minuten */

static uint32_t naechste;                /* Arbeitsverteilung */
static pthread_mutex_t schloss = PTHREAD_MUTEX_INITIALIZER;

static void *arbeiten(void *arg)
{
    (void)arg;
    int32_t  *best   = malloc(NB * sizeof *best);
    uint8_t  *drauf  = malloc(NF);
    int64_t  *summe  = malloc(NDE * sizeof *summe);
    uint8_t  *treffer = malloc(NDE);
    for (;;) {
        uint32_t d;
        pthread_mutex_lock(&schloss);
        d = naechste++;
        pthread_mutex_unlock(&schloss);
        if (d >= NDE) break;
        uint32_t s = deIdx[d];
        memset(summe, 0, NDE * sizeof *summe);
        memset(treffer, 0, NDE);
        for (int p = 0; p < PROBEN; p++) {
            uint32_t tau = T0 + p * SCHRITT;
            uint32_t tmax = tau + REICHWEIT;
            for (uint32_t i = 0; i < NB; i++) best[i] = UNENDL;
            /* Am Startbahnhof faellt keine Umsteigezeit an: der Zeiger steht
             * schon auf dem Bahnsteig. Ein um MINUM vorgezogener Ankunftswert
             * sagt das dem Einstiegstest, ohne ihn zu verzweigen. */
            best[s] = (int32_t)tau - MINUM;
            memset(drauf, 0, NF);
            uint32_t i0 = ersteAb[tau < maxmin ? tau : maxmin];
            for (uint32_t i = i0; i < NC; i++) {
                uint32_t ab = cab[i];
                if (ab > tmax) break;
                uint32_t f = cfahrt[i];
                if (drauf[f] || best[cvon[i]] + MINUM <= (int32_t)ab) {
                    drauf[f] = 1;
                    int32_t an = can[i];
                    if (an < best[cnach[i]]) best[cnach[i]] = an;
                }
            }
            for (uint32_t z = 0; z < NDE; z++) {
                int32_t b = best[deIdx[z]];
                if (b >= UNENDL) continue;
                int32_t dt = b - (int32_t)tau;
                if (dt < 0) dt = 0;
                summe[z] += dt;
                treffer[z]++;
            }
        }
        uint16_t *zeile = M + (size_t)d * NDE;
        for (uint32_t z = 0; z < NDE; z++) {
            if (z == d) { zeile[z] = 0; continue; }
            if (!treffer[z]) { zeile[z] = UNERR; continue; }
            int64_t m = (summe[z] + treffer[z] / 2) / treffer[z];
            zeile[z] = m >= UNERR ? UNERR - 1 : (uint16_t)m;
        }
        if (d % 500 == 0) { printf("  %u/%u\n", d, NDE); fflush(stdout); }
    }
    free(best); free(drauf); free(summe); free(treffer);
    return NULL;
}

int main(int argc, char **argv)
{
    if (argc < 4) { fprintf(stderr, "netz.bin deutsch.bin zeiten.bin\n"); return 2; }
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror(argv[1]); return 1; }
    char magie[4];
    if (fread(magie, 1, 4, f) != 4 || memcmp(magie, "ZKN1", 4)) {
        fprintf(stderr, "netz.bin: falsche Kennung\n"); return 1; }
    uint32_t k[4];
    if (fread(k, 4, 4, f) != 4) return 1;
    NB = k[0]; NF = k[1]; NC = k[2]; T0 = k[3];
    cab = malloc(NC * 2); can = malloc(NC * 2);
    cvon = malloc(NC * 2); cnach = malloc(NC * 2); cfahrt = malloc(NC * 2);
    maxmin = 0;
    for (uint32_t i = 0; i < NC; i++) {
        struct { uint16_t ab, an; uint32_t a, b, fi; } r;
        if (fread(&r, sizeof r, 1, f) != 1) { fprintf(stderr, "netz.bin kurz\n"); return 1; }
        cab[i] = r.ab; can[i] = r.an; cvon[i] = (uint16_t)r.a;
        cnach[i] = (uint16_t)r.b; cfahrt[i] = (uint16_t)r.fi;
        if (r.an > maxmin) maxmin = r.an;
        if (r.ab > maxmin) maxmin = r.ab;
    }
    fclose(f);
    ersteAb = malloc((maxmin + 2) * sizeof *ersteAb);
    {   uint32_t i = 0;
        for (uint32_t m = 0; m <= maxmin + 1; m++) {
            while (i < NC && cab[i] < m) i++;
            ersteAb[m] = i;
        }
    }
    f = fopen(argv[2], "rb");
    if (!f) { perror(argv[2]); return 1; }
    if (fread(&NDE, 4, 1, f) != 1) return 1;
    deIdx = malloc(NDE * sizeof *deIdx);
    if (fread(deIdx, 4, NDE, f) != NDE) return 1;
    fclose(f);
    printf("%u Bahnhoefe, %u Fahrten, %u Verbindungen; %u deutsche Bahnhoefe\n",
           NB, NF, NC, NDE);
    printf("Abfahrtsraster: %02u:%02u ... %02u:%02u, alle %u Minuten (%u Proben)\n",
           T0 / 60, T0 % 60, (T0 + (PROBEN - 1) * SCHRITT) / 60,
           (T0 + (PROBEN - 1) * SCHRITT) % 60, SCHRITT, PROBEN);

    M = malloc((size_t)NDE * NDE * 2);
    if (!M) { fprintf(stderr, "kein Speicher fuer %zu MB\n",
                      (size_t)NDE * NDE * 2 / (1 << 20)); return 1; }

    long kerne = sysconf(_SC_NPROCESSORS_ONLN);
    if (kerne < 1) kerne = 1;
    pthread_t *tp = malloc(kerne * sizeof *tp);
    for (long i = 0; i < kerne; i++) pthread_create(tp + i, NULL, arbeiten, NULL);
    for (long i = 0; i < kerne; i++) pthread_join(tp[i], NULL);
    printf("gerechnet auf %ld Kernen\n", kerne);

    f = fopen(argv[3], "wb");
    uint32_t kopf[2] = { NDE, T0 };
    fwrite("ZKZ1", 1, 4, f);
    fwrite(kopf, 4, 2, f);
    fwrite(M, 2, (size_t)NDE * NDE, f);
    fclose(f);
    printf("geschrieben: %s (%zu MB)\n", argv[3],
           (size_t)NDE * NDE * 2 / (1 << 20));
    return 0;
}
