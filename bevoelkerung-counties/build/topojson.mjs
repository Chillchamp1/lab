// Ein kleiner TopoJSON-Leser, weil das Format genau das mitbringt, was diese
// Karte braucht — und weil eine Abhängigkeit dafür nicht lohnt.
//
// **Warum TopoJSON und nicht ein Shapefile.** In einem Shapefile trägt jedes
// Gebiet seine Grenze selbst; benachbarte Countys haben dieselbe Linie zweimal,
// und `topologie.mjs` muss sie über exakte Gleichheit wieder zusammenschweissen.
// TopoJSON speichert jede Grenze **einmal** als Bogen und lässt beide Nachbarn
// darauf zeigen. Die Topologie ist also schon da, statt rekonstruiert zu werden.
// Wir geben die Ringe trotzdem als Punktfolgen zurück und lassen das
// Verschweissen laufen: die Bogenenden sind dann bitgleich, und der bestehende
// Weg bleibt unverändert.
//
// Zwei Eigenheiten des Formats:
//
// - **Quantisiert.** Koordinaten stehen als ganze Zahlen auf einem Gitter, das
//   `transform` mit `scale` und `translate` auf Länge und Breite zurückrechnet.
// - **Differenzkodiert.** Innerhalb eines Bogens ist jeder Punkt die Differenz
//   zum vorigen. Deshalb wird aufsummiert.
//
// Ein Bogenindex darf negativ sein: `~i` heisst „Bogen i, rückwärts gelesen".

export function bogenPunkte(topo) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  return topo.arcs.map(bogen => {
    const punkte = new Array(bogen.length * 2);
    let x = 0, y = 0;
    for (let i = 0; i < bogen.length; i++) {
      x += bogen[i][0]; y += bogen[i][1];
      punkte[i * 2] = x * sx + tx;
      punkte[i * 2 + 1] = y * sy + ty;
    }
    return punkte;
  });
}

// Ein Ring aus einer Liste von Bogenindizes. Aneinandergehängt, Nahtpunkte
// nur einmal — der letzte Punkt eines Bogens ist der erste des nächsten.
function ringAus(indizes, bogen) {
  const aus = [];
  for (const idx of indizes) {
    const rueck = idx < 0;
    const p = bogen[rueck ? ~idx : idx];
    const n = p.length / 2;
    for (let k = 0; k < n; k++) {
      const i = rueck ? n - 1 - k : k;
      const x = p[i * 2], y = p[i * 2 + 1];
      if (aus.length >= 2 && aus[aus.length - 2] === x && aus[aus.length - 1] === y) continue;
      aus.push(x, y);
    }
  }
  return aus;
}

// Alle Gebiete einer Sammlung als { id, name, ringe } mit flachen
// Punktfolgen — dasselbe, was der Shapefile-Weg der deutschen Karte liefert.
export function gebiete(topo, name) {
  const bogen = bogenPunkte(topo);
  return topo.objects[name].geometries.map(g => {
    const teile = g.type === 'Polygon' ? [g.arcs] : g.arcs;
    const ringe = [];
    for (const teil of teile) for (const r of teil) {
      const ring = ringAus(r, bogen);
      if (ring.length >= 6) ringe.push(ring);
    }
    return { id: String(g.id).padStart(5, '0'), name: g.properties?.name ?? '?', ringe };
  });
}
