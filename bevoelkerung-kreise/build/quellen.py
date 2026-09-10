#!/usr/bin/env python3
"""Baut data/bevoelkerung_kreise_long.csv aus den Rohquellen.

Nur dieser Schritt braucht Python und zwei Pakete (pypdf, openpyxl); das
Kartogramm und die Seite entstehen danach allein mit Node. Aufruf aus dem
Ordner `build`:

    pip install pypdf openpyxl
    python3 quellen.py

Welche Dateien danebenliegen müssen, steht in DATEN.md.

Die Quellen und was sie beitragen:

* `gpop_county.csv` — die German Local Population Database von Felix Roesel
  (TU Braunschweig, CC BY 4.0). Bevölkerung aller 401 Kreise zu neun
  Zeitpunkten zwischen 1871 und 2019, **auf einheitlichem Gebietsstand**
  (31.12.2019), aus über 50 Quellen zusammengetragen. Das ist Methode A und
  das Rückgrat dieser Karte. Roesel löst dabei auch zwei der vier Fallen:
  Gross-Berlin von 1920 — die 1920 eingemeindeten Orte sind zurückgerechnet,
  Berlin hat 1871 deshalb 931 984 Einwohner und nicht die 826 000 der
  damaligen Stadt — und die an der Oder-Neisse geteilten Städte, für die er
  den Bestand auf heutigem deutschem Gebiet schätzt.

* `gvisys-04-kreise.xlsx` — Gemeindeverzeichnis des Statistischen
  Bundesamts, Stand 31.12.2024. Liefert den jüngsten Zeitpunkt sowie Namen
  und amtliche Flächen aller Kreise.

* `gpop_state.csv` und `hgv_brandenburg_1875-2005.pdf` — zwei voneinander
  unabhängige Gegenproben, siehe `pruefungen()`. Die zweite ist das
  Historische Gemeindeverzeichnis des Landes Brandenburg: für fünf Stichtage
  lässt sich GPOP damit gegen die eigene Umrechnung des Landesamtes halten.

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

GPOP_KREISE = HIER / 'gpop_county.csv'
GPOP_LAENDER = HIER / 'gpop_state.csv'
GVISYS = HIER / 'gvisys-04-kreise.xlsx'
HGV = HIER / 'hgv_brandenburg_1875-2005.pdf'          # nur Gegenprobe

# Gebietsstand. GPOP steht auf dem 31.12.2019 und führt Eisenach noch als
# eigenen Kreis; die Stadt ist am 1.7.2021 in den Wartburgkreis eingegliedert
# worden. Beide Zahlen zu addieren ist exakt und kein Schätzen — der heutige
# Kreis ist genau die Vereinigung der beiden alten.
UMSCHLUESSELUNG = {'16056': '16063'}

ANWESEND = 'ortsanwesende Bevölkerung'
WOHN = 'Wohnbevölkerung'
FORT = 'Fortschreibung (Bevölkerung am Ort der Hauptwohnung)'

# Die Spalten von GPOP, jeweils mit Stichtag und Bevölkerungsbegriff. Wo Ost
# und West zu verschiedenen Tagen gezählt haben, führt GPOP zwei Spalten; sie
# ergänzen einander und bilden zusammen ein Bild. Angeglichen wird nichts:
# jede Zeile behält ihren eigenen Stichtag, und die Karte nennt beide.
GPOP_SPALTEN = {
    'pop_1871': ('1871', '1871-12-01', ANWESEND, 'Volkszählung im Deutschen Reich'),
    'pop_1900': ('1900–1910', '1900-12-01', ANWESEND, 'Volkszählung, Bayern'),
    'pop_1905': ('1900–1910', '1905-12-01', ANWESEND, 'Volkszählung'),
    'pop_1910': ('1900–1910', '1910-12-01', ANWESEND, 'Volkszählung'),
    'pop_1939': ('1939', '1939-05-17', WOHN, 'Volkszählung im Deutschen Reich'),
    'pop_1946': ('1946–1950', '1946-10-29', WOHN, 'Volkszählung in den Besatzungszonen'),
    'pop_1950': ('1946–1950', '1950-09-13', WOHN, 'Volkszählung in der Bundesrepublik'),
    'pop_1961': ('1961–1964', '1961-06-06', WOHN, 'Volkszählung in der Bundesrepublik'),
    'pop_1964': ('1961–1964', '1964-12-31', WOHN, 'Volkszählung in der DDR'),
    'pop_1985': ('1985–1987', '1985-12-31', FORT, 'Fortschreibung in der DDR'),
    'pop_1987': ('1985–1987', '1987-05-25', WOHN, 'Volkszählung in der Bundesrepublik'),
    'pop_1996': ('1996', '1996-12-31', FORT, ''),
    'pop_2011': ('2011', '2011-05-09', WOHN, 'Zensus 2011'),
    'pop_2019': ('2019', '2019-12-31', FORT, ''),
}
QUELLE_GPOP = ('Roesel, Felix (2022): The German Local Population Database (GPOP), '
               '1871 to 2019, Jahrbücher für Nationalökonomie und Statistik, '
               'DOI 10.1515/jbnst-2022-0046; Datei county.csv, Gebietsstand 31.12.2019')
QUELLE_GVISYS = ('Statistisches Bundesamt, Gemeindeverzeichnis (GV-ISys), Kreisfreie '
                 'Städte und Landkreise, Stand 31.12.2024')

# Kreise, in denen eine 1945 geteilte Stadt liegt. Für die Zeit davor schätzt
# GPOP den Bestand auf heutigem deutschem Gebiet; das wird in der Bemerkung
# festgehalten, damit es niemand für eine gezählte Zahl hält.
GETEILTE_STAEDTE = {
    '14626': 'Görlitz',
    '12053': 'Frankfurt (Oder)',
    '12071': 'Guben und Forst (Lausitz)',
}


def lies_csv(pfad):
    with pfad.open(encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


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


def hgv_tabelle1():
    """Tabelle 1 des Historischen Gemeindeverzeichnisses Brandenburg.

    Alle 18 Kreise des Landes von 1875 bis 2005, gerechnet auf den
    Gebietsstand 31.12.2005 — und weil Brandenburgs Kreise seit 1993
    unverändert sind, ist das der heutige. Wird hier nur zur Gegenprobe
    gebraucht. Die Vorlage ist ein Text-PDF, keine Bildvorlage; die Zahlen
    werden ausgelesen, nicht abgeschrieben.
    """
    if not HGV.exists():
        return None
    leser = PdfReader(HGV)
    ags = re.compile(r'(\d{2}) (\d) (\d{2}) (\d{3})')
    datum = re.compile(r'\b(\d{2})\.(\d{2})\.(\d{4})\b')
    werte = {}
    for seite in (5, 6, 7, 8):
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
            zahlen = [int(x.replace(' ', '').replace(' ', ''))
                      for x in re.findall(r'(?<![\d,.])((?:\d{1,3})(?:[  ]\d{3})+|\d{4,})', rest)]
            gefunden.append((schluessel, zahlen))
        breite = max(len(z[1]) for z in gefunden)
        if breite == len(kopf) + 1:
            kopf.append('2005-12-31')     # auf der letzten Seite fehlt der letzte Spaltenkopf
        if breite != len(kopf):
            raise SystemExit(f'HGV Seite {seite + 1}: {breite} Zahlen, {len(kopf)} Stichtage')
        for schluessel, zahlen in gefunden:
            for stichtag, wert in zip(kopf, zahlen):
                werte.setdefault(stichtag, {})[schluessel] = wert
    return werte


def pruefungen(kreise, laender, hgv, stamm):
    """Drei Gegenproben, sie laufen bei jedem Bauen mit."""
    print('  Gegenproben', file=sys.stderr)

    # 1. Innerhalb von GPOP: die Kreise müssen die Länder ergeben.
    schlimmste = 0.0
    for spalte in GPOP_SPALTEN:
        je_land = {}
        for k in kreise:
            if k[spalte].strip():
                je_land[k['state_id']] = je_land.get(k['state_id'], 0) + int(k[spalte])
        for l in laender:
            if not l[spalte].strip():
                continue
            soll, ist = int(l[spalte]), je_land.get(l['id'], 0)
            abw = abs(ist / soll - 1)
            schlimmste = max(schlimmste, abw)
            if abw > 0.0001:
                print(f'    GPOP {spalte} {l["name"]}: {ist} gegen {soll} — {abw*100:.3f} %',
                      file=sys.stderr)
    print(f'    Kreise gegen Länder in GPOP: grösste Abweichung {schlimmste*100:.4f} %',
          file=sys.stderr)

    # 2. GPOP gegen das Historische Gemeindeverzeichnis Brandenburgs, für die
    #    Stichtage, die beide führen. Zwei voneinander unabhängige
    #    Umrechnungen auf heutigen Gebietsstand: eine vom Landesamt, eine von
    #    Roesel. Wo sie zusammenpassen, stimmt sehr wahrscheinlich beides.
    if hgv:
        paare = {'1910-12-01': 'pop_1910', '1939-05-17': 'pop_1939',
                 '1946-10-29': 'pop_1946', '1964-12-31': 'pop_1964',
                 '1985-12-31': 'pop_1985'}
        nach_ags = {k['id'].zfill(5): k for k in kreise}
        for stichtag, spalte in sorted(paare.items()):
            if stichtag not in hgv:
                continue
            liste = []
            for a, wert in hgv[stichtag].items():
                if a == '12000' or a not in nach_ags:
                    continue
                g = nach_ags[a][spalte].strip()
                if g:
                    liste.append((abs(int(g) / wert - 1), a, int(g), wert))
            if not liste:
                continue
            liste.sort()
            schnitt = sum(x[0] for x in liste) / len(liste)
            gross = liste[-1]
            print(f'    GPOP gegen Brandenburg {stichtag}: {len(liste)} Kreise, '
                  f'Mittel {schnitt*100:.2f} %, grösste {gross[0]*100:.2f} % bei '
                  f'{gross[1]} ({gross[2]} gegen {gross[3]})', file=sys.stderr)

    # 3. GPOP 2019 gegen das Gemeindeverzeichnis 2024 — kein Gleichstand zu
    #    erwarten, aber ein Sprung von mehr als zehn Prozent in fünf Jahren
    #    wäre ein Hinweis auf einen Schlüsselfehler.
    nach_ags = {}
    for k in kreise:
        a = k['id'].zfill(5)
        a = UMSCHLUESSELUNG.get(a, a)
        if k['pop_2019'].strip():
            nach_ags[a] = nach_ags.get(a, 0) + int(k['pop_2019'])
    auffaellig = [(abs(stamm[a]['bev2024'] / v - 1), a, v, stamm[a]['bev2024'])
                  for a, v in nach_ags.items() if a in stamm and stamm[a]['bev2024']]
    auffaellig.sort(reverse=True)
    print(f'    GPOP 2019 gegen GV-ISys 2024: {len(auffaellig)} Kreise, grösste Änderung '
          f'{auffaellig[0][0]*100:.1f} % bei {auffaellig[0][1]}', file=sys.stderr)
    return schlimmste


def main():
    for pfad in (GPOP_KREISE, GPOP_LAENDER, GVISYS):
        if not pfad.exists():
            sys.exit(f'{pfad.name} fehlt — siehe DATEN.md')

    kreise = lies_csv(GPOP_KREISE)
    laender = lies_csv(GPOP_LAENDER)
    stamm = gvisys()
    hgv = hgv_tabelle1()
    pruefungen(kreise, laender, hgv, stamm)

    zeilen = []
    name_von = lambda ags: stamm.get(ags, {}).get('name') or ags

    for spalte, (bild, stichtag, begriff, bem) in GPOP_SPALTEN.items():
        gesammelt = {}
        for k in kreise:
            roh = k[spalte].strip()
            if not roh:
                continue
            ags = k['id'].zfill(5)
            ags = UMSCHLUESSELUNG.get(ags, ags)
            gesammelt[ags] = gesammelt.get(ags, 0) + int(roh)
        for ags, wert in sorted(gesammelt.items()):
            bemerkung = bem
            if ags in GETEILTE_STAEDTE and stichtag < '1945':
                bemerkung = ((bem + '; ') if bem else '') + GETEILTE_STAEDTE[ags] \
                    + ' 1945 geteilt, Bestand auf heutigem deutschem Gebiet von der Quelle geschätzt'
            zeilen.append(dict(
                kreis_ags=ags, kreis_name=name_von(ags), jahr=bild, stichtag=stichtag,
                bevoelkerung=wert, begriff=begriff, methode='A',
                anteil_interpoliert=0, quelle=QUELLE_GPOP, bemerkung=bemerkung))

    for ags, v in sorted(stamm.items()):
        if not v['bev2024']:
            continue
        zeilen.append(dict(
            kreis_ags=ags, kreis_name=v['name'], jahr='2024', stichtag='2024-12-31',
            bevoelkerung=int(v['bev2024']), begriff=FORT, methode='A',
            anteil_interpoliert=0, quelle=QUELLE_GVISYS, bemerkung='Basis Zensus 2022'))

    zeilen.sort(key=lambda z: (int(z['jahr'][:4]), z['stichtag'], z['kreis_ags']))

    ZIEL.parent.mkdir(exist_ok=True)
    with ZIEL.open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, lineterminator='\n', fieldnames=[
            'kreis_ags', 'kreis_name', 'jahr', 'stichtag', 'bevoelkerung',
            'begriff', 'methode', 'anteil_interpoliert', 'quelle', 'bemerkung'])
        w.writeheader()
        w.writerows(zeilen)

    (HIER / 'stammdaten.json').write_text(json.dumps(
        {a: {'name': v['name'], 'bez': v['bez'], 'flaeche': v['flaeche']}
         for a, v in sorted(stamm.items())}, ensure_ascii=False), encoding='utf-8')

    print(f'  {len(zeilen)} Zeilen, {len({z["kreis_ags"] for z in zeilen})} Kreise, '
          f'{len({z["jahr"] for z in zeilen})} Bilder -> {ZIEL}', file=sys.stderr)
    for jahr in sorted({z['jahr'] for z in zeilen}, key=lambda j: int(j[:4])):
        teil = [z for z in zeilen if z['jahr'] == jahr]
        tage = sorted({z['stichtag'] for z in teil})
        print(f'    {jahr:10} {len(teil):3d} Kreise, {sum(z["bevoelkerung"] for z in teil):>11,} '
              f'Menschen, {", ".join(tage)}'.replace(',', '.'), file=sys.stderr)


if __name__ == '__main__':
    main()
