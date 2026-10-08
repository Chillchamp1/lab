# Unter dem Wedding

Prototyp nach dem Vorbild von [metroskop.cz](https://metroskop.cz/), dem
3D-Modell der Prager Metro: die U-Bahnhöfe **Amrumer Straße** und
**Leopoldplatz** und der U9-Tunnel dazwischen, mit Bahnsteigen, Treppen,
Rolltreppen, Aufzügen und Zugängen auf ihren Ebenen unter der Straße.

## Woher die Daten kommen

Ein offenes amtliches 3D-Modell der Berliner U-Bahnhöfe gibt es nicht. Die BVG
veröffentlicht Bahnhofspläne nur als PDF, das 3D-Stadtmodell des Landes zeigt
nur Gebäude über der Erde. Die Quelle ist deshalb **OpenStreetMap** (ODbL):
Dort sind viele Berliner Bahnhöfe auch innen erfasst, mit `level=*` an
Bahnsteigen, Gängen und Treppen, `highway=elevator`, `conveying=*` für
Rolltreppen und `railway=subway_entrance` für die Zugänge.

- `abfrage.overpassql` — die eine Overpass-Abfrage für alles, was die Seite
  zeigt, im Kasten um beide Bahnhöfe.
- `data/osm.json` — eingefrorener Stand der Antwort, erzeugt mit
  `node berlin-untergrund/build/abruf.mjs`. **Fehlt die Datei, fragt die Seite
  Overpass live im Browser ab.** Für den ersten Wurf fehlt sie: Die Umgebung,
  in der die Seite gebaut wurde, durfte overpass-api.de nicht erreichen.
- Bahnhofspunkte und Eckdaten (Eröffnung, Bahnsteigform) aus der
  deutschsprachigen Wikipedia.

## Was geschätzt ist

- **Tiefen.** OSM kennt Ebenen (−1, −2), keine Meter. Eine Ebene ist hier
  4,5 m, die Schienen liegen 1 m unter dem Bahnsteig. Echte Tiefen müssten
  pro Bahnhof nachgetragen werden; keine offene Quelle führt sie.
- **Treppenrichtung.** Eine Treppe mit `level=-1;0` sagt nicht, welches Ende
  oben ist. Die Seite nimmt die Ebene der Knoten, an denen die Treppe hängt
  (Bahnsteig, Gang, Zugang), sonst `incline=*`. Wo beides fehlt, rät sie und
  schreibt beim Antippen „geschätzt“ dazu.
- **Gleishöhe zwischen den Bahnhöfen** wird aus den Bahnsteigen derselben
  Linie interpoliert.
- Die **Überhöhung** (Regler „Tiefe“) streckt nur, was unter der Erde liegt.
  Im Überblick ist sie 3×, an den Bahnhöfen 1,5×.

## Was der Prototyp nicht kann

Keine Wände, Decken und Tunnelröhren als Körper, nur angedeutet. Hallen
erscheinen nur, wo jemand sie in OSM als `indoor=*`-Fläche gezeichnet hat.
Wie vollständig ein Bahnhof erfasst ist, zeigt die Seite in der Zählung unter
der Bahnhofsbeschreibung.

## Bauen

Keine Build-Pipeline. three.js r186 liegt in `drei/` (MIT, siehe
`drei/LICENSE`), übernommen aus `eiszeit-europa/drei/`.
