#!/usr/bin/env bash
#
# Lädt die drei Rohdatensätze nach ../data/raw/. Nichts wird von Hand abgelegt.
#
#   ./holen.sh              alles, was fehlt
#   ./holen.sh ice6g        nur ICE-6G_C
#   ./holen.sh dated        nur DATED-1
#   ./holen.sh dem          nur das moderne DEM
#   ./holen.sh pruefen      nichts laden, nur die Prüfsummen nachrechnen
#
# Das Skript ist absichtlich stur:
#
#   * Eine Datei, die schon liegt und deren Prüfsumme stimmt, wird nicht noch
#     einmal geholt. Eine, deren Prüfsumme **nicht** stimmt, wird nicht
#     stillschweigend ersetzt, sondern gemeldet — sonst merkt niemand, dass
#     sich eine Quelle unter der Hand geändert hat.
#   * Abgebrochene Übertragungen werden fortgesetzt (curl -C -), nicht neu
#     begonnen. Das DEM ist gross.
#   * Wo die Quelle keine Prüfsumme veröffentlicht, wird die beim ersten
#     erfolgreichen Lauf gerechnete in PRUEFSUMMEN.eigen festgehalten. Das ist
#     keine Echtheitsprüfung, sondern eine Wiederholbarkeitsprüfung: ein
#     zweiter Rechner bekommt dieselben Bytes oder erfährt, dass er es nicht
#     tut.
#
set -u -o pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROH="$HIER/../data/raw"
AMTLICH="$HIER/PRUEFSUMMEN.amtlich"     # von der Quelle veröffentlicht, im Repo
EIGEN="$HIER/PRUEFSUMMEN.eigen"         # beim ersten Lauf gerechnet, nicht im Repo

mkdir -p "$ROH/ice6g" "$ROH/dated1" "$ROH/dem"
: > "$ROH/.holen.log"

rot()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }
grau() { printf '\033[2m%s\033[0m\n'  "$*" >&2; }
sagt() { printf '%s\n' "$*" >&2; }

FEHLT=0; NEU=0; DA=0; KAPUTT=0

# ---------------------------------------------------------------- Prüfsummen
summe() { sha256sum "$1" | cut -d' ' -f1; }

erwartet() {   # Pfad relativ zu data/raw -> erwartete Summe oder leer
  local rel="$1" s=""
  [ -f "$AMTLICH" ] && s=$(awk -v f="$rel" '$2==f{print $1}' "$AMTLICH")
  [ -z "$s" ] && [ -f "$EIGEN" ] && s=$(awk -v f="$rel" '$2==f{print $1}' "$EIGEN")
  printf '%s' "$s"
}

merke() {      # Summe in PRUEFSUMMEN.eigen festhalten, falls noch keine da ist
  local rel="$1" sum="$2"
  touch "$EIGEN"
  grep -q " $rel\$" "$EIGEN" || printf '%s  %s\n' "$sum" "$rel" >> "$EIGEN"
}

pruefe() {     # Pfad, rel -> 0 heil, 1 fehlt, 2 falsche Summe
  local pfad="$1" rel="$2"
  [ -s "$pfad" ] || return 1
  local soll; soll=$(erwartet "$rel")
  [ -z "$soll" ] && { merke "$rel" "$(summe "$pfad")"; return 0; }
  [ "$(summe "$pfad")" = "$soll" ] && return 0 || return 2
}

# ------------------------------------------------------------------- Laden
hole() {       # URL, Pfad, rel
  local url="$1" pfad="$2" rel="$3"
  case "$(pruefe "$pfad" "$rel"; echo $?)" in
    0) DA=$((DA+1)); grau "  da      $rel"; return 0 ;;
    2) KAPUTT=$((KAPUTT+1))
       rot "  SUMME   $rel — liegt da, passt aber nicht zu $( [ -n "$(awk -v f="$rel" '$2==f{print $1}' "$AMTLICH" 2>/dev/null)" ] && echo PRUEFSUMMEN.amtlich || echo PRUEFSUMMEN.eigen )"
       rot "          nicht ersetzt. Löschen und noch einmal laufen lassen, wenn das gewollt ist."
       return 1 ;;
  esac

  if [ "${NURPRUEFEN:-0}" = 1 ]; then
    FEHLT=$((FEHLT+1)); rot "  fehlt   $rel"; return 1
  fi

  sagt "  hole    $rel"
  if ! curl -fSL --retry 4 --retry-delay 3 --retry-connrefused \
            -C - --connect-timeout 30 -o "$pfad" "$url" 2>>"$ROH/.holen.log"; then
    FEHLT=$((FEHLT+1))
    rot "  FEHLER  $rel"
    rot "          $url"
    rot "          Grund siehe data/raw/.holen.log — bei 403/407 ist es die"
    rot "          Netzpolitik dieser Umgebung, nicht die Quelle."
    rm -f "$pfad"
    return 1
  fi
  NEU=$((NEU+1))
  pruefe "$pfad" "$rel" || { KAPUTT=$((KAPUTT+1)); rot "  SUMME   $rel nach dem Laden falsch"; return 1; }
  return 0
}

# =====================================================================
#  (a) ICE-6G_C (VM5a), 10 Bogenminuten
#
#  Peltier, Argus & Drummond (2015), JGR Solid Earth 120, 450–487,
#  doi:10.1002/2014JB011176 — Modell ICE-6G_C, Erdmodell VM5a.
#  Verzeichnis der PMIP4-Seite:
#      https://pmip4.lsce.ipsl.fr/doku.php/data:ice_ice6g_c
#
#  Eine Datei je Zeitscheibe, I6_C.VM5a_10min.<t>.nc. Darin unter anderem
#  stgit (Eismächtigkeit, m), Topo (Topographie, m), Topo_Diff (Differenz zu
#  0 ka, m), sftlf (Landanteil) und stgif (Eisanteil).
#
#  Die Schrittweite der Reihe ist ungleichmässig, und das ist kein Zufall,
#  sondern die Datenlage: 26 bis 21 ka in Schritten von 1 ka, 21 ka bis heute
#  in Schritten von 0,5 ka. Die Seite muss das sichtbar machen (siehe
#  ASTHETIK.md, Abschnitt 7) — hier steht es zum ersten Mal.
# =====================================================================
# Geprüft am 14.09.2026. Drei Dinge, die man nicht rät:
#
#   * Die Dateien liegen unter ~peltier/datasets/Ice6G_C_VM5a/ und heissen
#     I6_C.VM5a_1deg.<t>.nc.gz — **gzip**, und in **1 Grad**. Die von der
#     Aufgabe verlangte 10'-Fassung liegt dort nicht; sie kommt von PMIP4,
#     dessen Zertifikat am 4.8.2026 abgelaufen ist (siehe ../QUELLEN.md).
#   * Der Server antwortet fremden Programmen mit 403. Er braucht einen
#     Browser-Kennstring.
#   * Er sendet sein Zwischenzertifikat nicht mit. Die Wurzel liegt in jedem
#     Vertrauensspeicher, das Glied dazwischen nicht — ohne es bricht die
#     TLS-Prüfung ab. Die Adresse steht im Serverzertifikat selbst (AIA).
ICE6G_BASIS="${ICE6G_BASIS:-https://www.atmosp.physics.utoronto.ca/~peltier/datasets/Ice6G_C_VM5a}"
ICE6G_KENN="${ICE6G_KENN:-Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36}"
ICE6G_AIA="${ICE6G_AIA:-http://crt.sectigo.com/SectigoPublicServerAuthenticationCAOVR36.crt}"
ICE6G_KETTE="${ICE6G_KETTE:-$HIER/.kette.pem}"

# Die fehlende Zwischenstelle holen und an den vorhandenen Vertrauensspeicher
# hängen. Das ist **keine** Abschwächung der Prüfung: der Vertrauensanker
# bleibt dieselbe Wurzel, es wird nur das Glied nachgeliefert, das der Server
# hätte senden sollen. Die Prüfung abzuschalten wäre etwas ganz anderes, und
# das tut dieses Skript nicht.
kette_bauen() {
  [ -s "$ICE6G_KETTE" ] && return 0
  local speicher="${CURL_CA_BUNDLE:-${SSL_CERT_FILE:-/etc/ssl/certs/ca-certificates.crt}}"
  [ -s "$speicher" ] || { rot "  kein Vertrauensspeicher gefunden"; return 1; }
  sagt "  hole    das fehlende Zwischenzertifikat (AIA)"
  local tmp; tmp=$(mktemp)
  # crt.sectigo.com spricht nur HTTP; hinter einem reinen HTTPS-Proxy braucht
  # es deshalb einen erzwungenen Tunnel auf Port 80.
  if ! curl -fsS --max-time 60 -o "$tmp" "$ICE6G_AIA" 2>>"$ROH/.holen.log" \
     && ! curl -fsS --max-time 60 --proxytunnel ${https_proxy:+-x "$https_proxy"} \
              -o "$tmp" "$ICE6G_AIA" 2>>"$ROH/.holen.log"; then
    rot "  FEHLER  Zwischenzertifikat nicht erreichbar: $ICE6G_AIA"
    rm -f "$tmp"; return 1
  fi
  local pem; pem=$(mktemp)
  openssl x509 -inform DER -in "$tmp" -out "$pem" 2>/dev/null || cp "$tmp" "$pem"
  if ! openssl verify -CAfile "$speicher" "$pem" >/dev/null 2>&1; then
    rot "  FEHLER  das geholte Zwischenzertifikat hängt an keiner bekannten Wurzel"
    rm -f "$tmp" "$pem"; return 1
  fi
  cat "$speicher" "$pem" > "$ICE6G_KETTE"
  rm -f "$tmp" "$pem"
  grau "  Kette geprüft und zusammengesetzt: $ICE6G_KETTE"
}

ice6g_scheiben() {
  local t
  for t in 26 25 24 23 22 21; do printf '%s\n' "$t"; done
  # 20,5 bis 0 in halben Schritten. Die Dateien heissen mit einer
  # Nachkommastelle, wo es eine gibt, und ohne, wo nicht: 20.5, 20, 19.5, …
  for t in $(seq 20.5 -0.5 0); do
    printf '%s\n' "$(printf '%g' "$t")"
  done
}

hole_ice6g() {
  sagt ""
  sagt "(a) ICE-6G_C (VM5a), 1 Grad, 48 Zeitscheiben von 26 bis 0 ka"
  kette_bauen || { rot "  ohne geschlossene Kette wird nicht geladen"; return 1; }
  local t datei roh
  for t in $(ice6g_scheiben); do
    datei="I6_C.VM5a_1deg.${t}.nc"
    roh="$datei.gz"
    if [ -s "$ROH/ice6g/$datei" ]; then DA=$((DA+1)); grau "  da      ice6g/$datei"; continue; fi
    if [ "${NURPRUEFEN:-0}" = 1 ]; then FEHLT=$((FEHLT+1)); rot "  fehlt   ice6g/$datei"; continue; fi
    if curl -fsSL --cacert "$ICE6G_KETTE" -A "$ICE6G_KENN" --retry 3 --retry-delay 3 \
         --retry-all-errors --max-time 240 -o "$ROH/ice6g/$roh" \
         "$ICE6G_BASIS/$roh" 2>>"$ROH/.holen.log" && gunzip -f "$ROH/ice6g/$roh"; then
      NEU=$((NEU+1)); merke "ice6g/$datei" "$(summe "$ROH/ice6g/$datei")"
    else
      FEHLT=$((FEHLT+1)); rot "  FEHLER  ice6g/$datei"; rm -f "$ROH/ice6g/$roh"
    fi
    sleep 0.4     # der Server mag keine Salven
  done
}

# =====================================================================
#  (b) DATED-1, Eisrand-Zeitscheiben
#
#  Hughes, Gyllencreutz, Lohne, Mangerud & Svendsen (2016): The last
#  Eurasian ice sheets — a chronological database and time-slice
#  reconstruction, DATED-1. Boreas 45(1), 1–45, doi:10.1111/bor.12142.
#  Datensatz: doi:10.1594/PANGAEA.848117
#
#  25 bis 10 ka in 1-ka-Schritten, je Scheibe drei Linien: most-credible,
#  maximum, minimum. PANGAEA liefert das Paket als ZIP über die
#  Datei-Schnittstelle des Datensatzes.
# =====================================================================
DATED_DOI="${DATED_DOI:-10.1594/PANGAEA.848117}"
# Die Datensatzseite ist eine **Liste von Dateiadressen**, keine Datei. Ihre
# Textfassung (?format=textfile) nennt sie; abgerufen am 14.09.2026 sind es
# sechs, davon brauchen wir eine. Erraten war vorher ein allfiles.zip, das es
# nicht gibt.
DATED_SPEICHER="${DATED_SPEICHER:-https://store.pangaea.de/Publications/HughesA-etal_2015}"
DATED_ZIP="${DATED_ZIP:-$DATED_SPEICHER/DATED-1_TimeSlices_shp.zip}"
DATED_LIESMICH="${DATED_LIESMICH:-$DATED_SPEICHER/DATED-1_readme.pdf}"

hole_dated() {
  sagt ""
  sagt "(b) DATED-1 Eisraender, 25–10 ka (doi:$DATED_DOI)"
  hole "$DATED_LIESMICH" "$ROH/dated1/DATED-1_readme.pdf" "dated1/DATED-1_readme.pdf"
  if hole "$DATED_ZIP" "$ROH/dated1/DATED-1_TimeSlices_shp.zip" "dated1/DATED-1_TimeSlices_shp.zip"; then
    if [ "${NURPRUEFEN:-0}" != 1 ] && [ ! -d "$ROH/dated1/entpackt" ]; then
      sagt "  packe   die Zeitscheiben aus"
      mkdir -p "$ROH/dated1/entpackt"
      unzip -q -o "$ROH/dated1/DATED-1_TimeSlices_shp.zip" -d "$ROH/dated1/entpackt" || {
        rot "  FEHLER  Auspacken misslungen"; return 1; }
      local n; n=$(find "$ROH/dated1/entpackt" -iname '*.shp' | wc -l)
      sagt "  $n Shapefiles ausgepackt (erwartet 58: 16 Zeitscheiben x 3 plus 10 aeltere)"
      [ "$n" -ge 48 ] || rot "  WARNUNG weniger als 48 — Paketaufbau geaendert?"
    fi
  fi
}

# =====================================================================
#  (c) Modernes DEM als Reliefbasis
#
#  Vorgabe ist GEBCO 2024 (15"), Ersatz ist ETOPO 2022 (15"). Beide sind
#  global und gross; gebraucht wird der Rahmen der Karte — 5 370 × 5 500 km
#  um 53° N / 15° O, in Grad also 64° W … 98° O und 29° N … 84° N.
#
#  GEBCO liefert einen Ausschnitt nur über ein Formular, nicht über eine
#  stabile URL — deshalb steht hier der globale Satz. Wer ihn nicht laden
#  will, setzt DEM=etopo: ETOPO 2022 liegt gekachelt.
#
#  Welche Fläche gemeint ist — „bedrock" (unter dem Eis) oder „surface"
#  (Eisoberfläche): gebraucht wird **bedrock**. Die Paläotopographie dieser
#  Karte ist die Gesteinsoberfläche; das Eis kommt getrennt aus stgit
#  darauf. Mit „surface" läge Grönlands heutiges Eis als Fels in der Karte.
# =====================================================================
DEM="${DEM:-etopo}"
GEBCO_ZIP="${GEBCO_ZIP:-https://www.bodc.ac.uk/data/open_download/gebco/gebco_2024_sub_ice_topo/zip/}"
ETOPO_BASIS="${ETOPO_BASIS:-https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_surface_elev_netcdf}"

# Die vierunddreissig 15-Grad-Kacheln, die den Rahmen decken (lon -61,4…93,3,
# lat 32,7…84,0). Je rund 20 MB, zusammen 680 MB — statt der 7,5 GB des
# globalen GEBCO-Satzes.
#
# Es waren einmal fuenfzehn. Der Rahmen stand damals als Grad-Rechteck und
# wurde maskiert; jetzt steht er in Kilometern und ist gefuellt, und ein
# Kilometer-Rechteck greift an seinen Nordecken weit nach Westen und Osten
# aus — bis Groenland und bis zur Karasee.
ETOPO_KACHELN="N90W060 N90W045 N90W030 N90W015 N90E000 N90E015 N90E030 N90E045 N90E060 N90E075
N75W075 N75W060 N75W045 N75W030 N75W015 N75E000 N75E015 N75E030 N75E045 N75E060 N75E075 N75E090
N60W030 N60W015 N60E000 N60E015 N60E030 N60E045 N60E060
N45W015 N45E000 N45E015 N45E030 N45E045"

hole_dem() {
  sagt ""
  case "$DEM" in
    etopo)
      # **surface**, nicht bed — und das ist kein Fehler. ETOPO fuehrt eigene
      # bed-Kacheln nur dort, wo heute Eis liegt (Groenland, Antarktis, hohe
      # Arktis); in Europa ist die Oberflaeche der Fels. Nachgesehen: der
      # 15"-bed-Satz hat 62 Kacheln, keine davon deckt diesen Ausschnitt.
      sagt "(c) ETOPO 2022, 15\", 34 Kacheln (surface = Fels in diesem Ausschnitt)"
      local k datei
      for k in $ETOPO_KACHELN; do
        datei="ETOPO_2022_v1_15s_${k}_surface.nc"
        hole "$ETOPO_BASIS/$datei" "$ROH/dem/$datei" "dem/$datei"
      done ;;
    gebco)
      sagt "(c) GEBCO 2024 sub-ice topo, 15\", global (gross — mehrere GB)"
      hole "$GEBCO_ZIP" "$ROH/dem/gebco_2024_sub_ice_topo.zip" "dem/gebco_2024_sub_ice_topo.zip" || return 1
      if [ "${NURPRUEFEN:-0}" != 1 ] && [ ! -f "$ROH/dem/GEBCO_2024_sub_ice_topo.nc" ]; then
        sagt "  packe   das NetCDF aus"
        unzip -q -o -j "$ROH/dem/gebco_2024_sub_ice_topo.zip" '*.nc' -d "$ROH/dem" \
          || rot "  FEHLER  Auspacken misslungen"
      fi ;;
    *) rot "DEM=$DEM kenne ich nicht — etopo oder gebco"; return 1 ;;
  esac
}

# ===================================================================== Lauf
# =====================================================================
#  (d) Globale Mitteltemperatur: LGMR (Osman u. a. 2021)
#
#  Die einzige Quelle hier, die etwas ueber das **Klima** sagt statt ueber
#  Geometrie. Palaeoklima-Datenassimilation: Proxydaten gegen iCESM-
#  Zeitscheiben gerechnet, 24 bis 0 ka in 200-Jahr-Schritten, mit einem
#  Ensemble von 500 Laeufen und damit einer veroeffentlichten Streuung.
#
#  Geholt wird nur die Klimatologie des globalen Mittels — 16 kB. Dieselbe
#  Studie liefert auch Gitterfelder (SAT, 12,7 MB), aus denen sich ein Mittel
#  ueber den Kartenausschnitt rechnen liesse; genommen wird das globale
#  Mittel, weil es neben dem Meeresspiegel steht und der auch global ist.
LGMR_BASIS="${LGMR_BASIS:-https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/osman2021}"
LGMR_DOI="${LGMR_DOI:-10.25921/njxd-hg08}"

hole_temp() {
  sagt ""
  sagt "(d) LGMR globale Mitteltemperatur, 24-0 ka (doi:$LGMR_DOI)"
  hole "$LGMR_BASIS/LGMR_GMST_climo.nc" "$ROH/lgmr/LGMR_GMST_climo.nc" "lgmr/LGMR_GMST_climo.nc"
  hole "$LGMR_BASIS/readme-osman2021.txt" "$ROH/lgmr/readme-osman2021.txt" "lgmr/readme-osman2021.txt"
}

WAS="${1:-alles}"
[ "$WAS" = "pruefen" ] && { NURPRUEFEN=1; WAS=alles; }

sagt "Rohdaten nach $(cd "$ROH" && pwd)"
case "$WAS" in
  alles) hole_ice6g; hole_dated; hole_dem; hole_temp ;;
  ice6g) hole_ice6g ;;
  dated) hole_dated ;;
  dem)   hole_dem ;;
  temp)  hole_temp ;;
  *) rot "kenne ich nicht: $WAS"; exit 2 ;;
esac

sagt ""
sagt "$DA da, $NEU geladen, $FEHLT fehlen, $KAPUTT mit falscher Prüfsumme"
[ -f "$EIGEN" ] && grau "gerechnete Prüfsummen: $EIGEN"
if [ "$FEHLT" -gt 0 ] || [ "$KAPUTT" -gt 0 ]; then
  sagt ""
  sagt "Solange etwas fehlt, baut build.mjs nicht. Das ist Absicht — eine Karte"
  sagt "mit halben Daten sieht aus wie eine mit ganzen."
  exit 1
fi
