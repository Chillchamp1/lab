# Quellen-Inventur

Stand: 10. September 2026. Jede Zeile ist selbst geprüft — abgerufen, geöffnet,
angesehen —, nicht aus dem Gedächtnis notiert. Wo „gesperrt" steht, ist das das
Ergebnis eines wirklichen Abrufversuchs aus dieser Arbeitsumgebung.

## 1. Zeitpunkte

| Zeitpunkt | Stichtag | Geltungsbereich | Begriff |
|---|---|---|---|
| 1816, 1849, 1864 | wechselnd | nur Preussen | ortsanwesend |
| 1871, 1880, 1890, 1900, 1910 | 1.12. | Deutsches Reich | ortsanwesend |
| 1925, 1933 | 16.6. | Reich, ohne Saargebiet | ortsanwesend |
| 1939 | 17.5.1939 | Reich | Wohnbevölkerung |
| 1946 | 29.10.1946 | vier Zonen | Wohnbevölkerung |
| BRD 1950, 1961, 1970, 1987 | 13.9.1950, 6.6.1961, 27.5.1970, 25.5.1987 | Bundesgebiet | Wohnbevölkerung |
| DDR 1950, 1964, 1971, 1981 | 31.8.1950, 31.12.1964, 1.1.1971, 31.12.1981 | DDR | Wohnbevölkerung |
| 1995, 2000 | 31.12. | Deutschland | Fortschreibung |
| 2011, 2022 | 9.5.2011, 15.5.2022 | Deutschland | Zensus |
| jüngstes Jahr | 31.12.2025 | Deutschland | Fortschreibung |

Zusätzlich führt das brandenburgische Verzeichnis **1875** statt 1871/1880 und
lässt 1900 aus. Es wird genommen, wie es ist: der Stichtag steht in der Zeile.

## 2. Was benutzt wird

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

### Bevölkerung im Pilotgebiet — Methode A

**Amt für Statistik Berlin-Brandenburg, Historisches Gemeindeverzeichnis des
Landes Brandenburg 1875 bis 2005.** Fünfzehn Teile, in jedem steht Tabelle 1
mit allen 18 Kreisen. Text-PDF, keine Bildvorlage — die Zahlen werden
ausgelesen, nicht abgeschrieben. Stichtage: 1875, 1890, 1910, 1925, 1933, 1939,
1946, 1950, 1964, 1971, 1981, 1985, 1989, 1990 und dann jährlich bis 2005.
Alles auf Gebietsstand 31.12.2005, und weil Brandenburgs Kreise seit 1993
unverändert sind, ist das der heutige.

**Dasselbe Amt, Bevölkerungsstand — lange Reihe 1990/91 bis 2025**, xlsx.
Blatt 1: Berlin, jährlich ab 1991. Blatt 7: die brandenburgischen Kreise und
Gemeinden, jährlich ab 1990, Gebietsstand 31.12.2025.

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
| **GPOP**, German Local Population Database, TU Braunschweig | Der Datensatz liegt hinter einer Rechenaufgabe gegen Maschinen (Proof of Work). Die Metadaten-Schnittstelle antwortet, der Dateiabruf nicht. Diese Umgebung darf weder einen Browser starten noch die Prüfaufgabe lösen. **Das ist die grösste einzelne Lücke** — GPOP hätte 1871, 1910, 1939, 1946, 1961, 1987, 1996, 2011 und 2019 für alle Gemeinden und Kreise Deutschlands auf einheitlichem Gebietsstand geliefert, also neun Zeitpunkte nach Methode A auf einen Schlag. CC-BY 4.0, DOI 10.24355/dbbs.084-…, Objekt `dbbs_mods_00071017`, Ableitung `dbbs_derivate_00049631`. |
| `www-genesis.destatis.de` | vom Netz-Filter gesperrt |
| `www.mpidr.de` — historische Kreisgrenzen | vom Netz-Filter gesperrt; ohne sie ist Methode C nicht durchführbar |
| `www.verwaltungsgeschichte.de` (Rademacher) | vom Netz-Filter gesperrt |
| `search.gesis.org` | antwortet mit 403 |
| `gemeindeverzeichnis.de` | erreichbar, aber inzwischen ein Dienst für den heutigen Gebietsstand; die historischen Verzeichnisse 1900/1910 von Uli Schubert sind dort nicht mehr zu finden |

## 5. Die vier Fallen, Stand der Bearbeitung

- **Oder-Neisse-Grenze.** Im Pilotgebiet gelöst, weil die Quelle selbst auf den
  heutigen, westlichen Gebietsstand rechnet: die östlichen Teile geteilter
  Kreise und der östliche Teil Frankfurts sind nicht enthalten. Für Görlitz und
  Guben, ausserhalb des Pilotgebiets, offen.
- **Gross-Berlin 1920.** Offen. Keine erreichbare Quelle weist die 1920
  eingemeindeten Orte für die Zeit davor aus. Berlin steht deshalb erst ab 1995
  in den Daten; die Zahlen des alten Berlin (66,9 km²) werden **nicht**
  eingesetzt, weil sie keine Zahlen für das heutige Berlin (891 km²) sind.
- **Saarland.** Ausserhalb des Pilotgebiets, offen.
- **Bevölkerungsbegriff.** Behandelt: je Zeile in der Spalte `begriff`, mit dem
  Bruch bei der Zählung vom 17. Mai 1939.

## 6. Erreichbarkeit der Hosts

Zu Beginn liess die Umgebung nur `raw.githubusercontent.com`, die
Paketregister und die Websuche durch; alle Fachquellen waren gesperrt. Nach
Freischaltung sind offen: BKG, Destatis (ohne GENESIS), Regionalstatistik,
Amt für Statistik Berlin-Brandenburg, ifo, BBSR, Wikipedia, Statistische
Bibliothek, ISGV. Weiter gesperrt: `www-genesis.destatis.de`,
`www.mpidr.de`, `www.verwaltungsgeschichte.de`.
