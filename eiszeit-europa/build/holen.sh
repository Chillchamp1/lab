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
ICE6G_BASIS="${ICE6G_BASIS:-https://www.atmosp.physics.utoronto.ca/~peltier/datasets/Ice6g_c_VM5a_10min}"

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
  sagt "(a) ICE-6G_C (VM5a), 10', 48 Zeitscheiben von 26 bis 0 ka"
  local t datei
  for t in $(ice6g_scheiben); do
    datei="I6_C.VM5a_10min.${t}.nc"
    hole "$ICE6G_BASIS/$datei" "$ROH/ice6g/$datei" "ice6g/$datei"
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
DATED_ZIP="${DATED_ZIP:-https://download.pangaea.de/dataset/848117/allfiles.zip}"

hole_dated() {
  sagt ""
  sagt "(b) DATED-1 Eisränder, 25–10 ka (doi:$DATED_DOI)"
  if hole "$DATED_ZIP" "$ROH/dated1/allfiles.zip" "dated1/allfiles.zip"; then
    if [ "${NURPRUEFEN:-0}" != 1 ] && [ ! -d "$ROH/dated1/entpackt" ]; then
      sagt "  packe   dated1/allfiles.zip aus"
      mkdir -p "$ROH/dated1/entpackt"
      unzip -q -o "$ROH/dated1/allfiles.zip" -d "$ROH/dated1/entpackt" || {
        rot "  FEHLER  Auspacken misslungen"; return 1; }
      # Die Scheiben liegen als Shapefile-Satz vor; ein einzelnes .shp ohne
      # .dbf und .shx ist wertlos, also wird das gleich nachgesehen.
      local n; n=$(find "$ROH/dated1/entpackt" -iname '*.shp' | wc -l)
      sagt "  $n Shapefiles ausgepackt"
      [ "$n" -gt 0 ] || rot "  WARNUNG keine .shp gefunden — Paketaufbau geändert?"
    fi
  fi
}

# =====================================================================
#  (c) Modernes DEM als Reliefbasis
#
#  Vorgabe ist GEBCO 2024 (15"), Ersatz ist ETOPO 2022 (15"). Beide sind
#  global und gross; gebraucht wird nur 12° W … 45° E, 34° N … 72° N.
#
#  GEBCO liefert einen Ausschnitt nur über ein Formular, nicht über eine
#  stabile URL — deshalb steht hier der globale Satz. Wer ihn nicht laden
#  will, setzt DEM=etopo: ETOPO 2022 liegt gekachelt und der Ausschnitt
#  braucht nur die Kacheln N90W030 und N90E000.
#
#  Welche Fläche gemeint ist — „bedrock" (unter dem Eis) oder „surface"
#  (Eisoberfläche): gebraucht wird **bedrock**. Die Paläotopographie dieser
#  Karte ist die Gesteinsoberfläche; das Eis kommt getrennt aus stgit
#  darauf. Mit „surface" läge Grönlands heutiges Eis als Fels in der Karte.
# =====================================================================
DEM="${DEM:-gebco}"
GEBCO_ZIP="${GEBCO_ZIP:-https://www.bodc.ac.uk/data/open_download/gebco/gebco_2024_sub_ice_topo/zip/}"
ETOPO_BASIS="${ETOPO_BASIS:-https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/15s/15s_bed_elev_netcdf}"

hole_dem() {
  sagt ""
  case "$DEM" in
    gebco)
      sagt "(c) GEBCO 2024 sub-ice topo, 15\", global (gross — mehrere GB)"
      hole "$GEBCO_ZIP" "$ROH/dem/gebco_2024_sub_ice_topo.zip" "dem/gebco_2024_sub_ice_topo.zip" || return 1
      if [ "${NURPRUEFEN:-0}" != 1 ] && [ ! -f "$ROH/dem/GEBCO_2024_sub_ice_topo.nc" ]; then
        sagt "  packe   das NetCDF aus"
        unzip -q -o -j "$ROH/dem/gebco_2024_sub_ice_topo.zip" '*.nc' -d "$ROH/dem" \
          || rot "  FEHLER  Auspacken misslungen"
      fi ;;
    etopo)
      sagt "(c) ETOPO 2022 bed elevation, 15\", zwei Kacheln"
      local k
      for k in N90W030 N90E000; do
        hole "$ETOPO_BASIS/ETOPO_2022_v1_15s_${k}_bed.nc" \
             "$ROH/dem/ETOPO_2022_v1_15s_${k}_bed.nc" "dem/ETOPO_2022_v1_15s_${k}_bed.nc"
      done ;;
    *) rot "DEM=$DEM kenne ich nicht — gebco oder etopo"; return 1 ;;
  esac
}

# ===================================================================== Lauf
WAS="${1:-alles}"
[ "$WAS" = "pruefen" ] && { NURPRUEFEN=1; WAS=alles; }

sagt "Rohdaten nach $(cd "$ROH" && pwd)"
case "$WAS" in
  alles) hole_ice6g; hole_dated; hole_dem ;;
  ice6g) hole_ice6g ;;
  dated) hole_dated ;;
  dem)   hole_dem ;;
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
