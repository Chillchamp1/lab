#!/usr/bin/env python3
"""Baut data/bevoelkerung_kreise_long.csv aus den Rohquellen.

Nur dieser Schritt braucht Python und zwei Pakete (pypdf, openpyxl); das
Kartogramm und die Seite entstehen danach allein mit Node. Aufruf aus dem
Ordner `build`:

    pip install pypdf openpyxl
    python3 quellen.py

Welche Dateien danebenliegen müssen, steht in DATEN.md.

Was hier passiert, in einem Satz je Quelle:

* `hgv_brandenburg_1875-2005.pdf` — das Historische Gemeindeverzeichnis des
  Landes Brandenburg. Seine Tabelle 1 führt alle 18 brandenburgischen Kreise
  von 1875 bis 2005 auf einem einheitlichen Gebietsstand (31.12.2005). Das ist
  Methode A: das Landesamt hat die Umrechnung selbst gemacht, jede Gemeinde
  wird betrachtet, „als ob diese veränderte Struktur bereits am 01.12.1875
  bestand". Brandenburgs Kreise sind seit 1993 unverändert, der Stand von 2005
  ist also der heutige.

* `bevoelkerungsstand-lange-reihe.xlsx` — dieselbe Behörde, Fortschreibung
  1990/91 bis 2025, Blatt 1 für Berlin, Blatt 7 für die brandenburgischen
  Kreise, Gebietsstand 31.12.2025. Ebenfalls Methode A.

* `gvisys-04-kreise.xlsx` — das Gemeindeverzeichnis des Statistischen
  Bundesamts. Liefert Fläche und Namen aller Kreise und dient als Gegenprobe.

Der Bevölkerungsbegriff steht nicht in den Quellen, sondern folgt der jeweils
gültigen Zählungsdefinition; siehe METHODIK.md.
"""

import csv
import json
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
    import openpyxl
except ImportError:
    sys.exit('pypdf und openpyxl werden gebraucht:  pip install pypdf openpyxl')

HIER = Path(__file__).resolve().parent
ZIEL = HIER.parent / 'data' / 'bevoelkerung_kreise_long.csv'

HGV = HIER / 'hgv_brandenburg_1875-2005.pdf'
REIHE = HIER / 'bevoelkerungsstand-lange-reihe.xlsx'
GVISYS = HIER / 'gvisys-04-kreise.xlsx'

# Welcher Bevölkerungsbegriff zu welchem Stichtag gehört. Im Kaiserreich und
# in der Weimarer Republik wurde die ortsanwesende Bevölkerung gezählt, also
# wer in der Zählnacht da war, Militär eingeschlossen. Die Zählung vom
# 17. Mai 1939 weist erstmals die Wohnbevölkerung aus, und dabei blieb es.
# Ab 1991 sind es keine Zählungen mehr, sondern die Fortschreibung.
BEGRIFF = {
    '1875-12-01': 'ortsanwesende Bevölkerung',
    '1890-12-01': 'ortsanwesende Bevölkerung',
    '1910-12-01': 'ortsanwesende Bevölkerung',
    '1925-06-16': 'ortsanwesende Bevölkerung',
    '1933-06-16': 'ortsanwesende Bevölkerung',
    '1939-05-17': 'Wohnbevölkerung',
    '1946-10-29': 'Wohnbevölkerung',
    '1950-08-31': 'Wohnbevölkerung',
    '1964-12-31': 'Wohnbevölkerung',
    '1971-01-01': 'Wohnbevölkerung',
    '1981-12-31': 'Wohnbevölkerung',
}
FORTSCHREIBUNG = 'Fortschreibung (Bevölkerung am Ort der Hauptwohnung)'

# Welche Stichtage in die Karte kommen, und wie das Bild heisst.
# Die Zählungen bis 1981 stammen aus dem Historischen Gemeindeverzeichnis,
# die späteren aus der Fortschreibung.
BILDER_HGV = {
    '1875-12-01': '1875', '1890-12-01': '1890', '1910-12-01': '1910',
    '1925-06-16': '1925', '1933-06-16': '1933', '1939-05-17': '1939',
    '1946-10-29': '1946', '1950-08-31': '1950', '1964-12-31': '1964',
    '1971-01-01': '1971', '1981-12-31': '1981',
}
BILDER_REIHE = {1995: '1995', 2000: '2000', 2011: '2011', 2022: '2022', 2025: '2025'}

QUELLE_HGV = ('Amt für Statistik Berlin-Brandenburg, Historisches Gemeindeverzeichnis '
              'des Landes Brandenburg 1875 bis 2005, Tabelle 1 (Gebietsstand 31.12.2005)')
QUELLE_REIHE = ('Amt für Statistik Berlin-Brandenburg, Bevölkerungsstand — lange Reihe '
                '1990/91 bis 2025 (Gebietsstand 31.12.2025)')


def hgv_tabelle1():
    """Tabelle 1 des Historischen Gemeindeverzeichnisses: Kreis x Stichtag."""
    leser = PdfReader(HGV)
    ags = re.compile(r'(\d{2}) (\d) (\d{2}) (\d{3})')
    datum = re.compile(r'\b(\d{2})\.(\d{2})\.(\d{4})\b')
    werte, namen = {}, {}
    for seite in (5, 6, 7, 8):                      # Blätter 6 bis 9 des Hefts
        text = leser.pages[seite].extract_text() or ''
        zeilen = text.split('\n')
        kopf = [f'{j}-{m}-{t}' for t, m, j in max((datum.findall(z) for z in zeilen), key=len)]
        gefunden = []
        for z in zeilen:
            treffer = ags.search(z)
            if not treffer:
                continue
            schluessel = treffer.group(1) + treffer.group(2) + treffer.group(3)
            rest = z[:treffer.start()] + ' ' + z[treffer.end():]
            zahlen = [int(x.replace(' ', '').replace(' ', ''))
                      for x in re.findall(r'(?<![\d,.])((?:\d{1,3})(?:[  ]\d{3})+|\d{4,})', rest)]
            gefunden.append((schluessel, re.sub(r'[\d)(]', '', rest).strip(), zahlen))
        breite = max(len(z[2]) for z in gefunden)
        if breite == len(kopf) + 1:
            # Auf der letzten Seite fehlt der Kopf der letzten Spalte im Text.
            kopf.append('2005-12-31')
        if breite != len(kopf):
            raise SystemExit(f'Seite {seite + 1}: {breite} Zahlen, aber {len(kopf)} Stichtage')
        for schluessel, name, zahlen in gefunden:
            namen.setdefault(schluessel, name)
            for stichtag, wert in zip(kopf, zahlen):
                werte.setdefault(stichtag, {})[schluessel] = wert
    return werte, namen


def pruefe_landsumme(werte):
    """Summe der Kreise gegen die veröffentlichte Landessumme."""
    print('  Gegenprobe Brandenburg: Summe der Kreise gegen die Landeszeile', file=sys.stderr)
    schlimmste = 0.0
    for stichtag in sorted(werte):
        zeile = werte[stichtag]
        land = zeile.get('12000')
        if land is None:
            continue
        summe = sum(v for k, v in zeile.items() if k != '12000')
        abw = abs(summe / land - 1)
        schlimmste = max(schlimmste, abw)
        if abw > 0.0001:
            print(f'    {stichtag}: {summe} gegen {land} — {abw * 100:.3f} %', file=sys.stderr)
    print(f'    grösste Abweichung {schlimmste * 100:.4f} %', file=sys.stderr)
    return schlimmste


def lange_reihe():
    """Berlin (Blatt 1) und die brandenburgischen Kreise (Blatt 7)."""
    wb = openpyxl.load_workbook(REIHE, data_only=True)

    def jahr(v):
        m = re.match(r'(\d{4})', str(v or ''))
        return int(m.group(1)) if m else None

    werte = {}

    bl = wb['1']
    jahre = [jahr(bl.cell(3, c).value) for c in range(3, bl.max_column + 1)]
    for spalte, j in enumerate(jahre, start=3):
        if j in BILDER_REIHE:
            v = bl.cell(6, spalte).value          # Zeile 6: Bevölkerung insgesamt
            if isinstance(v, (int, float)):
                werte.setdefault(f'{j}-12-31', {})['11000'] = int(v)

    bb = wb['7 ']
    jahre = [jahr(bb.cell(6, c).value) for c in range(5, bb.max_column + 1)]
    for zeile in range(8, bb.max_row + 1):
        s = bb.cell(zeile, 2).value
        if not isinstance(s, int) or s % 1000 or s == 12000000:
            continue                              # nur Kreise, nicht Gemeinden
        ags = f'{s // 1000:05d}'
        for spalte, j in enumerate(jahre, start=5):
            if j in BILDER_REIHE:
                v = bb.cell(zeile, spalte).value
                if isinstance(v, (int, float)):
                    # 2011 steht zweimal: vor und nach dem Zensus. Die zweite
                    # Spalte ist die neue Basis, sie überschreibt die erste.
                    werte.setdefault(f'{j}-12-31', {})[ags] = int(v)
    return werte


def gvisys():
    wb = openpyxl.load_workbook(GVISYS, data_only=True)
    ws = wb['Kreisfreie Städte u. Landkreise']
    stamm = {}
    for r in range(3, ws.max_row + 1):
        ags = ws.cell(r, 1).value
        if not isinstance(ags, str) or len(ags.strip()) != 5:
            continue
        stamm[ags.strip()] = {
            'bez': ws.cell(r, 2).value, 'name': ws.cell(r, 3).value,
            'flaeche': ws.cell(r, 5).value, 'bev2024': ws.cell(r, 6).value,
        }
    return stamm


def main():
    for pfad in (HGV, REIHE, GVISYS):
        if not pfad.exists():
            sys.exit(f'{pfad.name} fehlt — siehe DATEN.md')

    hgv, hgv_namen = hgv_tabelle1()
    pruefe_landsumme(hgv)
    reihe = lange_reihe()
    stamm = gvisys()

    zeilen = []

    def name_von(ags):
        return (stamm.get(ags, {}).get('name')
                or hgv_namen.get(ags, '').strip()
                or ags)

    for stichtag, bild in BILDER_HGV.items():
        for ags, wert in sorted(hgv.get(stichtag, {}).items()):
            if ags == '12000':
                continue
            zeilen.append(dict(
                kreis_ags=ags, kreis_name=name_von(ags), jahr=bild, stichtag=stichtag,
                bevoelkerung=wert, begriff=BEGRIFF[stichtag], methode='A',
                anteil_interpoliert=0, quelle=QUELLE_HGV, bemerkung=''))

    for stichtag, zeile in sorted(reihe.items()):
        bild = BILDER_REIHE[int(stichtag[:4])]
        for ags, wert in sorted(zeile.items()):
            zeilen.append(dict(
                kreis_ags=ags, kreis_name=name_von(ags), jahr=bild, stichtag=stichtag,
                bevoelkerung=wert, begriff=FORTSCHREIBUNG, methode='A',
                anteil_interpoliert=0, quelle=QUELLE_REIHE,
                bemerkung=('Basis Zensus 2011' if bild == '2011'
                           else 'Basis Zensus 2022' if bild in ('2022', '2025') else '')))

    zeilen.sort(key=lambda z: (int(re.match(r'(\d{4})', z['jahr']).group(1)), z['kreis_ags']))

    ZIEL.parent.mkdir(exist_ok=True)
    with ZIEL.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, lineterminator='\n', fieldnames=[
            'kreis_ags', 'kreis_name', 'jahr', 'stichtag', 'bevoelkerung',
            'begriff', 'methode', 'anteil_interpoliert', 'quelle', 'bemerkung'])
        w.writeheader()
        w.writerows(zeilen)

    # Stammdaten für den Kartenbau: Name, Bezeichnung und amtliche Fläche.
    # Node liest kein xlsx, deshalb liegt das hier als JSON daneben.
    (HIER / 'stammdaten.json').write_text(json.dumps(
        {a: {'name': v['name'], 'bez': v['bez'], 'flaeche': v['flaeche']}
         for a, v in sorted(stamm.items())}, ensure_ascii=False), encoding='utf-8')

    bilder = sorted({(z['jahr'], z['stichtag']) for z in zeilen})
    print(f'  {len(zeilen)} Zeilen, {len({z["kreis_ags"] for z in zeilen})} Kreise, '
          f'{len({z["jahr"] for z in zeilen})} Bilder -> {ZIEL}', file=sys.stderr)
    for jahr in sorted({z['jahr'] for z in zeilen}, key=int):
        teil = [z for z in zeilen if z['jahr'] == jahr]
        print(f'    {jahr}: {len(teil):3d} Kreise, {sum(z["bevoelkerung"] for z in teil):>10,} '
              f'Menschen, {sorted({z["stichtag"] for z in teil})}'.replace(',', '.'), file=sys.stderr)


if __name__ == '__main__':
    main()
