// Staatsgrenzen aus den Countygrenzen ableiten.
//
// Eine gerichtete Kante gehört genau einem County. Findet sich die Gegenkante
// bei einem County desselben Staates, ist es eine Binnengrenze; gehört sie zu
// einem anderen Staat oder fehlt sie ganz (Küste, Landesgrenze), verläuft dort
// eine Staatsgrenze.
//
// Die Kanten werden anschliessend zu Zügen verkettet, damit die Zeichnung
// wenige lange Linien statt tausender Einzelstriche enthält — das spart Platz
// und vermeidet ausgefranste Ecken.

export function staatsGrenzen(gebiete, staatVon) {
  const kante = new Map();                 // "a:b" -> Gebietsindex
  gebiete.forEach((ringe, gi) => {
    for (const r of ringe) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        kante.set(r[j] + ':' + r[i], gi);
      }
    }
  });

  // Ungerichtete Kandidaten sammeln, jede nur einmal
  const gesehen = new Set();
  const stuecke = [];
  for (const [schluessel, gi] of kante) {
    const [a, b] = schluessel.split(':').map(Number);
    const paar = a < b ? a + ':' + b : b + ':' + a;
    if (gesehen.has(paar)) continue;
    gesehen.add(paar);
    const gegen = kante.get(b + ':' + a);
    if (gegen !== undefined && staatVon[gegen] === staatVon[gi]) continue;
    stuecke.push([a, b]);
  }

  // Zu Zügen verketten: von jedem Knoten aus weiterlaufen, solange es
  // genau eine unbenutzte Fortsetzung gibt.
  const nachbarn = new Map();
  for (const [a, b] of stuecke) {
    if (!nachbarn.has(a)) nachbarn.set(a, []);
    if (!nachbarn.has(b)) nachbarn.set(b, []);
    nachbarn.get(a).push(b);
    nachbarn.get(b).push(a);
  }
  const benutzt = new Set();
  const marke = (a, b) => a < b ? a + ':' + b : b + ':' + a;
  const zuege = [];

  const laufe = start => {
    const zug = [start];
    let hier = start;
    for (;;) {
      const weiter = (nachbarn.get(hier) ?? []).find(n => !benutzt.has(marke(hier, n)));
      if (weiter === undefined) break;
      benutzt.add(marke(hier, weiter));
      zug.push(weiter);
      hier = weiter;
    }
    return zug;
  };

  // Erst an Enden und Kreuzungen beginnen, dann geschlossene Ringe einsammeln
  for (const [knoten, liste] of nachbarn) {
    if (liste.length === 2) continue;
    for (const n of liste) {
      if (benutzt.has(marke(knoten, n))) continue;
      benutzt.add(marke(knoten, n));
      zuege.push([knoten, ...laufe(n)]);
    }
  }
  for (const [a, b] of stuecke) {
    if (benutzt.has(marke(a, b))) continue;
    benutzt.add(marke(a, b));
    zuege.push([a, ...laufe(b)]);
  }

  return { zuege, kanten: stuecke.length };
}
