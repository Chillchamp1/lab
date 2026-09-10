# Quellen-Inventur

Stand: 10. September 2026. Jede Zeile ist selbst geprüft — abgerufen, geöffnet,
angesehen —, nicht aus dem Gedächtnis notiert. Wo „gesperrt" steht, ist das das
Ergebnis eines wirklichen Abrufversuchs aus dieser Arbeitsumgebung.

## 1. Zeitpunkte

Die Zeitpunkte der Aufgabenstellung, und was davon steht (✓) oder fehlt (—):

| Zeitpunkt | Stichtag | Begriff | Stand |
|---|---|---|---|
| Preussen 1816, 1849, 1864 | wechselnd | ortsanwesend | — braucht Methode C |
| 1871 | 1.12.1871 | ortsanwesend | ✓ GPOP |
| 1880, 1890 | 1.12. | ortsanwesend | — |
| 1900 / 1905 / 1910 | 1.12. | ortsanwesend | ✓ GPOP, je Land ein anderer Termin |
| 1925, 1933 | 16.6. | ortsanwesend | — Saargebiet fehlt in beiden |
| 1939 | 17.5.1939 | Wohnbevölkerung | ✓ GPOP |
| 1946 | 29.10.1946 | Wohnbevölkerung | ✓ GPOP |
| BRD 1950 | 13.9.1950 | Wohnbevölkerung | ✓ GPOP (RP, BW, BY) |
| BRD 1961 | 6.6.1961 | Wohnbevölkerung | ✓ GPOP |
| BRD 1970 | 27.5.1970 | Wohnbevölkerung | — |
| BRD 1987 | 25.5.1987 | Wohnbevölkerung | ✓ GPOP |
| DDR 1950 | 31.8.1950 | Wohnbevölkerung | — |
| DDR 1964 | 31.12.1964 | Wohnbevölkerung | ✓ GPOP |
| DDR 1971, 1981 | 1.1.1971, 31.12.1981 | Wohnbevölkerung | — |
| 1985 (Ost) | 31.12.1985 | Fortschreibung | ✓ GPOP, Gegenstück zu 1987 |
| 1995, 2000 | 31.12. | Fortschreibung | — dafür 1996 ✓ GPOP |
| 2011 | 9.5.2011 | Zensus | ✓ GPOP |
| 2022 | 15.5.2022 | Zensus | — dafür 2019 ✓ GPOP |
| jüngstes Jahr | 31.12.2024 | Fortschreibung | ✓ GV-ISys |

Zehn Bilder stehen damit flächendeckend. Die Paare aus der Zeit der Teilung
werden zu je einem Bild zusammengefasst, ohne die Stichtage anzugleichen.

## 2. Was benutzt wird

### Bevölkerung, das Rückgrat

**GPOP — German Local Population Database, Version 1.0.** Felix Roesel, TU
Braunschweig. Bevölkerung aller 11 007 Gemeinden, 401 Kreise und 16 Länder zu
neun Zeitpunkten zwischen 1871 und 2019, **auf einheitlichem Gebietsstand
31.12.2019**, aus über 50 Quellen zusammengetragen. CC BY 4.0, DOI
10.1515/jbnst-2022-0046.

Die Datei liegt hinter einer Rechenaufgabe gegen Maschinen, die diese
Arbeitsumgebung nicht lösen darf; sie wurde deshalb von Hand heruntergeladen
und beigesteuert. Die Metadaten-Schnittstelle des Publikationsservers
(`/api/v1/objects/dbbs_mods_00071017`) antwortet dagegen ohne Prüfung.

Die Spaltenstruktur bildet die deutsche Zählungsgeschichte ab, statt sie
glattzuziehen: `pop_1900`, `pop_1905` und `pop_1910` decken zusammen alle
Länder ab, weil um die Jahrhundertwende nicht überall zum selben Termin
gezählt wurde; `pop_1946`/`pop_1950`, `pop_1961`/`pop_1964` und
`pop_1985`/`pop_1987` sind die Paare aus der Zeit der Teilung. Roesel schreibt
dazu: „Population growth rates should be carefully calculated, taking the
different census years into account."

Zwei der vier Fallen löst die Quelle selbst: die 1920 nach Gross-Berlin
eingemeindeten Orte sind zurückgerechnet, und für die 1945 geteilten Städte
Görlitz, Frankfurt (Oder), Guben und Forst schätzt sie den Bestand auf heute
deutschem Gebiet.

### Geometrie

**BKG, Verwaltungsgebiete 1:2 500 000 (VG2500)**, Ebene KRS,
`vg2500_01-01-2026.utm32s.shape.zip`, Gebietsstand **1. Januar 2026**,
ETRS89/UTM 32N, 401 Kreise (98 kreisfreie Städte, 42 Kreise, 252 Landkreise,
9 Stadtkreise). Offen abrufbar über
`daten.gdz.bkg.bund.de/produkte/vg/vg2500/aktuell/`.
© GeoBasis-DE / BKG, Datenlizenz Deutschland – Namensnennung 2.0.

Gegen den vorher benutzten VG250-Auszug (Stand 1.1.2019) unterscheiden sich
genau zwei Kreise: Eisenach ist weg (1.7.2021 in den Wartburgkreis
eingegliedert), Hanau ist dazugekommen (1.1.2026 kreisfrei). Zum Umgang mit
Hanau siehe METHODIK.md.

### Gebietsstand und Flächen

**Statistisches Bundesamt, Gemeindeverzeichnis (GV-ISys)**, Tabelle
„Kreisfreie Städte und Landkreise nach Fläche, Bevölkerung und
Bevölkerungsdichte", Stand **31.12.2024**, `04-kreise.xlsx`: 400 Kreise,
83 577 140 Einwohner, 357 677 km². Offen abrufbar.

Ebenfalls geprüft und vorhanden: das **Archiv der Gemeindeverzeichnisse
GV100AD** ab 31.12.1993, Gemeindeebene, Festsatzformat, 220 Zeichen je Satz,
mit Fläche in Hektar und Einwohnerzahl. Satzartenbeschreibung liegt bei. Damit
liesse sich Methode B für alle Länder ab 1993 aufbauen; gebraucht wird dafür
zusätzlich ein Umsteigeschlüssel für die Gemeinden, die es heute nicht mehr
gibt.

### Gegenprobe

**Amt für Statistik Berlin-Brandenburg, Historisches Gemeindeverzeichnis des
Landes Brandenburg 1875 bis 2005.** Fünfzehn Teile, in jedem steht Tabelle 1
mit allen 18 Kreisen. Text-PDF, keine Bildvorlage — die Zahlen werden
ausgelesen, nicht abgeschrieben. Stichtage: 1875, 1890, 1910, 1925, 1933, 1939,
1946, 1950, 1964, 1971, 1981, 1985, 1989, 1990 und dann jährlich bis 2005.
Alles auf Gebietsstand 31.12.2005, und weil Brandenburgs Kreise seit 1993
unverändert sind, ist das der heutige.

Weil es dieselbe Aufgabe unabhängig von Roesel löst — Umrechnung auf einen
einheitlichen Gebietsstand —, taugt es als Gegenprobe: für fünf gemeinsame
Stichtage (1910, 1939, 1946, 1964, 1985) weichen die beiden Rechnungen im
Mittel um 0,07 bis 0,12 Prozent voneinander ab.

**Dasselbe Amt, Bevölkerungsstand — lange Reihe 1990/91 bis 2025**, xlsx.
Geprüft und brauchbar, im jetzigen Stand nicht mehr nötig, weil GPOP und das
Gemeindeverzeichnis die Jahre ab 1996 flächendeckend abdecken.

## 3. Geprüft, erreichbar, noch nicht ausgewertet

| Quelle | Deckt ab | Format | Methode | Zugang |
|---|---|---|---|---|
| Regionaldatenbank Deutschland (`regionalstatistik.de`) | ab 1995, Kreisebene | GENESIS | A/B | offen, Anmeldung für die Schnittstelle nötig |
| GV100AD-Archiv des Bundesamts | ab 1993, Gemeindeebene | Festsatz | B | offen |
| iPEHD, ifo Institut | Preussen 1816–1901, historische Kreise | CSV | C | Beschreibung offen, Datensatz über GESIS |
| Digitales Historisches Ortsverzeichnis Sachsen (`hov.isgv.de`) | Sachsen, Gemeindeebene | Web | B | offen |
| Statistische Bibliothek (`statistischebibliothek.de`) | Digitalisate der Landesämter | PDF | A/B | offen |
| BBSR (`bbsr.bund.de`) | Umsteigeschlüssel ab 1990 | xlsx | A | offen |

## 4. Geprüft und nicht zu bekommen

| Quelle | Warum |
|---|---|
| `www-genesis.destatis.de` | vom Netz-Filter gesperrt |
| `www.mpidr.de` — historische Kreisgrenzen | vom Netz-Filter gesperrt; ohne sie ist Methode C nicht durchführbar |
| `www.verwaltungsgeschichte.de` (Rademacher) | vom Netz-Filter gesperrt |
| `search.gesis.org` | antwortet mit 403 |
| `gemeindeverzeichnis.de` | erreichbar, aber inzwischen ein Dienst für den heutigen Gebietsstand; die historischen Verzeichnisse 1900/1910 von Uli Schubert sind dort nicht mehr zu finden |

## 5. Die vier Fallen, Stand der Bearbeitung

- **Oder-Neisse-Grenze.** Von GPOP behandelt: für Görlitz, Frankfurt (Oder),
  Guben und Forst schätzt die Quelle den Bestand auf heute deutschem Gebiet.
  Das sind die einzigen geschätzten Werte in der Tabelle, jeder mit Vermerk.
- **Gross-Berlin 1920.** Von GPOP behandelt: die 1920 eingemeindeten Orte sind
  zurückgerechnet. Berlin hat 1871 deshalb 931 984 Einwohner und nicht die
  826 000 der damaligen Stadt.
- **Saarland.** Fällt im jetzigen Stand nicht an, weil die Zählungen 1925 und
  1933 noch fehlen. Kommen sie dazu, braucht es Ersatzzählungen des
  Saargebiets.
- **Bevölkerungsbegriff.** Behandelt: je Zeile in der Spalte `begriff`, mit dem
  Bruch bei der Zählung vom 17. Mai 1939.

## 6. Erreichbarkeit der Hosts

Zu Beginn liess die Umgebung nur `raw.githubusercontent.com`, die
Paketregister und die Websuche durch; alle Fachquellen waren gesperrt. Nach
Freischaltung sind offen: BKG, Destatis (ohne GENESIS), Regionalstatistik,
Amt für Statistik Berlin-Brandenburg, ifo, BBSR, Wikipedia, Statistische
Bibliothek, ISGV. Weiter gesperrt: `www-genesis.destatis.de`,
`www.mpidr.de`, `www.verwaltungsgeschichte.de`.
