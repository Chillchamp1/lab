// Stammdaten der Kreise: Name, Bezeichnung, amtliche Fläche.
//
// Aus dem Gemeindeverzeichnis des Statistischen Bundesamts (Stand 31.12.2024),
// von `quellen.py` als JSON abgelegt, weil Node kein xlsx liest. Die Fläche
// wird für die Dichte gebraucht — und zwar die wirkliche, nicht die im
// Kartogramm verzogene.

import { existsSync, readFileSync } from 'node:fs';

const DATEI = 'stammdaten.json';

export function kreisStammdaten() {
  if (!existsSync(DATEI)) return new Map();
  const roh = JSON.parse(readFileSync(DATEI, 'utf8'));
  return new Map(Object.entries(roh).map(([ags, v]) => [ags, {
    name: v.name, bez: v.bez, flaeche: v.flaeche,
  }]));
}
