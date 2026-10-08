/* Alles, was die Seite zeigt, in einer Abfrage. Der Kasten reicht von
   Amrumer Straße bis Leopoldplatz mit gut 250 m Rand; die globale bbox gilt
   für jede Teilabfrage, deshalb steht unten nirgends ein Kasten. Die Seite
   und build/abruf.mjs lesen beide diese Datei. */
[out:json][timeout:90][bbox:52.5395,13.3460,52.5495,13.3640];
(
  /* unter der Erde */
  way["railway"="subway"];
  nwr["railway"="platform"];
  nwr["public_transport"="platform"]["subway"="yes"];
  node["railway"="subway_entrance"];
  node["entrance"]["level"];
  nwr["highway"="elevator"];
  way["highway"="steps"];
  way["conveying"];
  way["highway"~"^(footway|corridor|pedestrian)$"]["level"];
  way["highway"~"^(footway|corridor|pedestrian)$"]["indoor"];
  way["highway"~"^(footway|corridor|pedestrian)$"]["tunnel"];
  way["indoor"~"^(room|area|corridor)$"];
)->.unten;
.unten out geom;
/* Linien: aus den Routen, in denen Gleise und Bahnsteige stecken */
(
  rel(bw.unten)["route"="subway"];
  rel(bn.unten)["route"="subway"];
);
out body;
/* über der Erde, nur zur Orientierung */
(
  way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|pedestrian)$"]["tunnel"!~"."];
  way["building"];
);
out geom qt;
