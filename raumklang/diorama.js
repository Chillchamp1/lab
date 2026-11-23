// 3D-Diorama der Meer-Szene: isometrisch, feste Perspektive, gemütliche Comic-Optik, Tilt-Shift-Unschärfe.
// Bewegt aus denselben Ortsdaten wie die Szenenkarte (audio/boot_karte.json): jede Möwe, jeder
// Wellenkamm, jeder Brecher erscheint dort und dann, wo und wann man ihn hört.
// Leicht gehalten fürs Handy: wenige hundert Dreiecke je Figur, keine Schatten, keine Texturen,
// höchstens 30 Bilder/s, Auflösung begrenzt, pausiert, wenn die Seite nicht sichtbar ist.
import * as THREE from './vendor/three.module.min.js';
import { ort } from './karte.js';

THREE.ColorManagement.enabled = false;          // Farben so, wie sie hier stehen (Comic-Palette)

const F = {
  himmel: 0x5fb9c2, wasser: 0x4fb3bd, wasserHell: 0x8fdccf, schaum: 0xfffaf0,
  holz: 0xd2915a, holzDunkel: 0x9a6640, holzInnen: 0xe7b07a, segel: 0xfff2d8, mast: 0x8a5a36,
  fels: 0x8f8ca6, felsHell: 0xb1aec6, moos: 0x95c47f, linie: 0x3b3550,
  moewe: 0xffffff, fluegel: 0xc7d0d9, spitze: 0x4b4f5c, schnabel: 0xffab4a,
  gans: 0x9c8a74, gansHals: 0x3e3631, kissen: 0xf59a8f, haut: 0xffd3ad, hemd: 0x7fb6e6, haare: 0x6b4a3a,
  kopfhoerer: 0x4a5690, wolke: 0xffffff,
};

// ---------- Hilfen
const GRAD = (() => {             // drei Tonstufen für die Comic-Schattierung
  const t = new THREE.DataTexture(new Uint8Array([155, 155, 155, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...o });
function umriss(mesh, dicke = 1.06, farbe = F.linie) {   // Comic-Kontur: Rückseiten etwas größer, dunkel
  const m = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: farbe, side: THREE.BackSide }));
  m.scale.setScalar(dicke); mesh.add(m); return mesh;
}
// Karte (Bootsbezug: x Bug, y links, z oben) → three (x Bug, y oben, z rechts), Entfernungen gestaucht
// nah (bis 5 m) maßstäblich, dahinter logarithmisch: Fels in 18 m bei ~8, Kolonie in 230 m bei ~13 Einheiten
const R0 = 5;
function stauche(p, aus = new THREE.Vector3()) {
  const r = Math.hypot(p[0], p[1]);
  const rr = r < R0 ? r : R0 + 2.0 * Math.log(1 + (r - R0) / 4);
  const f = r > 1e-6 ? rr / r : 1;
  const z = p[2] < 3 ? p[2] : 3 + 1.8 * Math.log(1 + (p[2] - 3) / 4);
  return aus.set(p[0] * f, z, -p[1] * f);
}
function zufall(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const imKreis = (K, ts, a, b) => { for (const k of [0, -K.dauer, K.dauer]) { const x = ts + k; if (x >= a && x <= b) return x; } return null; };

// ---------- Bausteine
function rumpf(a = 3.2, b = 1.0) {
  // Rumpf aus Spanten: je Station ein U-Querschnitt, Bordkante zu den Enden hin etwas höher (Sprung)
  const N = 18, pos = [], idx = [];
  const prof = [[1, 0.82], [0.8, 0.12], [0, -0.32], [-0.8, 0.12], [-1, 0.82]];
  for (let i = 0; i <= N; i++) {
    const x = -a + 2 * a * i / N, u = x / a;
    const w = b * Math.pow(Math.max(0, 1 - u * u), 0.65) * (u > 0 ? 1 : 0.92 + 0.08 * (1 + u));
    const sprung = 0.22 * u * u;
    for (const [q, z] of prof) pos.push(x, (z + (z > 0.5 ? sprung : 0)) * (z < 0 ? 1 - 0.5 * u * u : 1), q * w * (z > 0.5 ? 1 : 0.85));
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < 4; j++) {
    const a0 = i * 5 + j, a1 = a0 + 1, b0 = a0 + 5, b1 = b0 + 1;
    idx.push(a0, b0, a1, a1, b0, b1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function vogel(farbe, fluegelFarbe, schnabel, gross = 1) {
  const g = new THREE.Group();
  const koerper = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), toon(farbe));
  koerper.scale.set(2.3, 0.95, 0.95); g.add(koerper);
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), toon(farbe)); kopf.position.set(0.34, 0.07, 0); g.add(kopf);
  const sch = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 5), toon(schnabel)); sch.rotation.z = -Math.PI / 2; sch.position.set(0.5, 0.05, 0); g.add(sch);
  const fl = new THREE.BufferGeometry();     // Flügel: flaches Dreieck, Spitze dunkel
  fl.setAttribute('position', new THREE.Float32BufferAttribute([0.12, 0, 0, -0.2, 0, 0, -0.05, 0, 0.75], 3));
  fl.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 0.45, 0.47, 0.52], 3));
  fl.computeVertexNormals();
  const mat = toon(fluegelFarbe, { side: THREE.DoubleSide, vertexColors: true });
  const links = new THREE.Mesh(fl, mat), rechts = new THREE.Mesh(fl, mat);
  rechts.scale.z = -1;
  const gl = new THREE.Group(), gr = new THREE.Group(); gl.add(links); gr.add(rechts); g.add(gl, gr);
  g.userData.fluegel = [gl, gr];
  g.scale.setScalar(gross);
  return g;
}

function figur() {      // die liegende Figur im Boot, mit Kopfhörern
  const g = new THREE.Group();
  const kissen = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.75), toon(F.kissen)); kissen.position.set(-2.42, 0.42, 0); g.add(kissen);
  const leib = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.95, 3, 7), toon(F.hemd)); leib.rotation.z = Math.PI / 2 - 0.18; leib.position.set(-1.55, 0.47, 0); g.add(leib);
  const beine = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.7, 3, 6), toon(0x5d6f9e)); beine.rotation.z = Math.PI / 2; beine.position.set(-0.6, 0.33, 0); g.add(beine);
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), toon(F.haut)); kopf.position.set(-2.22, 0.72, 0); g.add(kopf);
  const haare = new THREE.Mesh(new THREE.SphereGeometry(0.215, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(F.haare)); haare.rotation.z = Math.PI / 2 + 0.5; haare.position.copy(kopf.position).add(new THREE.Vector3(-0.02, 0.02, 0)); g.add(haare);
  const buegel = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 5, 12, Math.PI), toon(F.kopfhoerer)); buegel.position.copy(kopf.position); buegel.rotation.y = Math.PI / 2; buegel.rotation.x = -0.5; g.add(buegel);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), toon(F.kopfhoerer));
    m.rotation.x = Math.PI / 2; m.position.copy(kopf.position).add(new THREE.Vector3(0, 0, 0.21 * s)); g.add(m);
  }
  return g;
}

function boot() {
  const g = new THREE.Group();
  const huelle = umriss(new THREE.Mesh(rumpf(), toon(F.holz, { side: THREE.DoubleSide })), 1.03, 0x5a3a26);
  g.add(huelle);
  // Bodenbretter, Duchten
  const boden = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.06, 1.3), toon(F.holzInnen)); boden.position.set(-0.1, 0.18, 0); g.add(boden);
  for (const [x, l] of [[-2.65, 1.25], [0.5, 1.75]]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, l), toon(F.holzDunkel)); d.position.set(x, 0.55, 0); g.add(d);
  }
  const reling = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 4, 40), toon(F.holzDunkel));   // Bordkante
  reling.scale.set(3.2, 1.0, 1); reling.rotation.x = Math.PI / 2; reling.position.y = 0.84; g.add(reling);
  // Mast und schlaffes Segel
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 6), toon(F.mast)); mast.position.set(0.9, 2.3, 0); g.add(mast);
  const sg = new THREE.PlaneGeometry(1.7, 3.3, 4, 6); sg.translate(0.85, 1.65, 0);
  const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setX(i, x * (1 - 0.82 * y / 3.3)); }  // dreieckig
  const segel = new THREE.Mesh(sg, toon(F.segel, { side: THREE.DoubleSide })); segel.position.set(0.95, 0.75, 0); g.add(segel);
  g.userData.segel = segel; g.userData.segelRuhe = Float32Array.from(sp.array);
  g.add(figur());
  return g;
}

function fels() {
  const g = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(1.2, 0);
  const s = geo.attributes.position;
  for (let i = 0; i < s.count; i++) s.setY(i, s.getY(i) * (s.getY(i) > 0 ? 1.35 : 0.6));
  geo.computeVertexNormals();
  const m = umriss(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: F.fels, flatShading: true })), 1.05); g.add(m);
  const klein = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshLambertMaterial({ color: F.felsHell, flatShading: true })); klein.position.set(0.9, -0.1, 0.6); g.add(klein);
  const moos = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: F.moos, flatShading: true }));
  moos.scale.set(1.2, 0.35, 1); moos.position.y = 1.45; g.add(moos);
  return g;
}

function wolke(rng) {
  const g = new THREE.Group(), mat = toon(F.wolke);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rng() * 0.7, 1), mat);
    b.position.set(i * 0.9 - 1.8, rng() * 0.5, (rng() - 0.5) * 1.2); g.add(b);
  }
  return g;
}

// ---------- Szene
export function starteDiorama(canvas, K, holeZeit) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const szene = new THREE.Scene();
  szene.background = new THREE.Color(F.himmel);
  szene.add(new THREE.HemisphereLight(0xfff3e0, 0x4f9fb0, 1.7));
  const sonne = new THREE.DirectionalLight(0xffeccc, 1.9); sonne.position.set(-6, 12, 8); szene.add(sonne);

  // Kamera: isometrisch von schräg hinten rechts oben, Bug zeigt nach rechts oben
  const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 220);
  kamera.position.set(-44, 52, 56); kamera.lookAt(0, 0, 0);
  const SICHT = 9.2;           // halbe sichtbare Höhe in Einheiten (Hochformat: halbe Breite)

  // Wasser
  const wg = new THREE.PlaneGeometry(64, 64, 40, 40); wg.rotateX(-Math.PI / 2);
  const wasserMat = new THREE.MeshLambertMaterial({ color: F.wasser, flatShading: true });
  const wasser = new THREE.Mesh(wg, wasserMat); szene.add(wasser);
  const wRuhe = Float32Array.from(wg.attributes.position.array);
  const welle = (x, z, t) => 0.2 * Math.sin(0.45 * x + 1.05 * t) + 0.15 * Math.sin(0.6 * z - 0.8 * t) + 0.08 * Math.sin(1.1 * (x + z) + 1.7 * t);

  const b = boot(); szene.add(b);
  const felsGr = fels(); szene.add(felsGr);
  const insel = fels(); insel.scale.setScalar(1.6); szene.add(insel);      // Felsen der Möwenkolonie, weit draußen
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const wolken = [0, 1, 2, 3].map(i => { const w = wolke(rnd); w.position.set(-30 + i * 19, 13 + rnd() * 3, -22 + rnd() * 40); szene.add(w); return w; });

  // ---------- Daten aufbereiten
  const nachGruppe = n => K.quellen.filter(q => q.g === n);
  const lang = q => q.n * q.dt > 20;
  const felsQ = nachGruppe('felsen');
  const felsSpur = felsQ.map(q => [q.t0 + (q.ende - q.t0) / 2, q.p[Math.floor(q.n / 2)]]).sort((x, y) => x[0] - y[0]);
  function spurBei(spur, ts) {        // kreisförmig zwischen zwei Stützstellen
    if (!spur.length) return null;
    let i = spur.findIndex(s => s[0] > ts); if (i < 0) i = 0;
    const [t1, p1] = spur[i], [t0, p0] = spur[(i - 1 + spur.length) % spur.length];
    let d = t1 - t0; if (d <= 0) d += K.dauer; let u = ts - t0; if (u < 0) u += K.dauer;
    const w = Math.min(Math.max(u / d, 0), 1);
    return p0.map((v, k) => v + w * (p1[k] - v));
  }
  const kolonie = nachGruppe('moewen_fern').filter(lang);
  const kolonieSpur = kolonie.length ? null : nachGruppe('moewen_weit').map(q => [q.t0, q.p[0]]).sort((x, y) => x[0] - y[0]);
  const vogelQ = ['moewen', 'ueberflug', 'moewen_weit'].flatMap(nachGruppe).map(q => {
    const d = Math.max(q.ende - q.t0, 0.5), a = q.p[0], e = q.p[q.n - 1];
    return { q, v: [(e[0] - a[0]) / d, (e[1] - a[1]) / d, (e[2] - a[2]) / d], gross: q.g === 'ueberflug' ? 1.25 : q.g === 'moewen' ? 1.05 : 0.9 };
  });
  const zuege = ['zug', 'gaense'].flatMap(n => nachGruppe(n).filter(lang));
  const wellenQ = nachGruppe('wellen');
  const rumpfQ = nachGruppe('rumpf').filter(q => Math.abs(q.p[0][1]) > 0.85);       // nur außen am Rumpf

  // ---------- Figuren-Vorrat
  const pool = (n, mk) => { const a = []; for (let i = 0; i < n; i++) { const o = mk(i); o.visible = false; szene.add(o); a.push(o); } return a; };
  const moewen = pool(22, () => vogel(F.moewe, F.fluegel, F.schnabel, 1.6));
  const gaense = pool(14, () => vogel(F.gans, F.gans, F.gansHals, 1.7));
  const zugMoewen = pool(14, () => vogel(F.moewe, F.fluegel, F.schnabel, 1.4));
  const kugel = new THREE.IcosahedronGeometry(0.5, 0);
  const schaum = new THREE.InstancedMesh(kugel, new THREE.MeshLambertMaterial({ color: F.schaum, emissive: 0x6a6a64, flatShading: true }), 220);
  schaum.instanceMatrix.setUsage(THREE.DynamicDrawUsage); szene.add(schaum);

  // ---------- Tilt-Shift: Szene in ein Bild rendern, dann oben und unten weichzeichnen
  const ziel = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });
  const nachMat = new THREE.ShaderMaterial({
    uniforms: { bild: { value: ziel.texture }, px: { value: new THREE.Vector2() }, fokus: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D bild; uniform vec2 px; uniform float fokus; varying vec2 vUv;
      vec3 t(vec2 o){ return texture2D(bild, vUv + o).rgb; }
      void main(){
        float r = smoothstep(0.13, 0.48, abs(vUv.y - fokus)) * 6.5;
        vec2 o = px * r;
        vec3 c = t(vec2(0.0)) * 2.0;
        c += t(vec2( 1.0, 0.0)*o) + t(vec2(-1.0, 0.0)*o) + t(vec2(0.0, 1.0)*o) + t(vec2(0.0,-1.0)*o);
        c += t(vec2( 0.7, 0.7)*o) + t(vec2(-0.7, 0.7)*o) + t(vec2(0.7,-0.7)*o) + t(vec2(-0.7,-0.7)*o);
        c += t(vec2( 1.9, 0.6)*o) + t(vec2(-1.9,-0.6)*o) + t(vec2(0.6,-1.9)*o) + t(vec2(-0.6, 1.9)*o);
        c /= 14.0;
        c = mix(c, c * vec3(1.05, 1.0, 0.93), 0.4);                       // warm, gemütlich
        float v = smoothstep(0.95, 0.35, length(vUv - 0.5)); c *= mix(0.9, 1.0, v);   // sanfte Vignette
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const nachSzene = new THREE.Scene(); nachSzene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nachMat));
  const nachKamera = new THREE.Camera();

  function groesse() {
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    ziel.setSize(Math.round(w * dpr), Math.round(h * dpr));
    nachMat.uniforms.px.value.set(1 / (w * dpr), 1 / (h * dpr));
    const asp = w / h, hh = asp < 1 ? SICHT / asp : SICHT;
    kamera.left = -hh * asp; kamera.right = hh * asp; kamera.top = hh; kamera.bottom = -hh; kamera.updateProjectionMatrix();
  }
  groesse();
  const beob = new ResizeObserver(groesse); beob.observe(canvas);

  // ---------- Bild für Bild
  const v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), eul = new THREE.Euler();
  let n_schaum = 0;
  function schaumKugel(pos, groesse) {
    if (n_schaum >= schaum.count || groesse <= 0.01) return;
    m4.compose(pos, qn.identity(), sc.setScalar(groesse)); schaum.setMatrixAt(n_schaum++, m4);
  }
  function setzeVogel(o, pos, richtung, t, phase, schlag) {
    o.visible = true; o.position.copy(pos);
    o.rotation.set(0, Math.atan2(-richtung.z, richtung.x), Math.max(-0.5, Math.min(0.5, richtung.y * 0.08)));
    const w = schlag ? 0.75 * Math.sin(t * 11 + phase) : 0.35 * Math.sin(t * 2.2 + phase) * (Math.sin(t * 0.7 + phase) > 0.4 ? 1 : 0.25);
    o.userData.fluegel[0].rotation.x = -w; o.userData.fluegel[1].rotation.x = w;
  }

  let laeuft = true, letzt = 0, uhr = 0;
  function bild(jetzt) {
    if (!laeuft) return;
    requestAnimationFrame(bild);
    if (document.hidden || jetzt - letzt < 33) return;           // höchstens 30 Bilder/s
    const dt = Math.min((jetzt - letzt) / 1000, 0.1); letzt = jetzt; uhr += dt;
    const ts = ((holeZeit() + K.start_s) % K.dauer + K.dauer) % K.dauer;

    // Wasser wogt (eigene Uhr, läuft auch im Stillstand weiter)
    const pa = wg.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) pa[i + 1] = welle(wRuhe[i], wRuhe[i + 2], uhr);
    wg.attributes.position.needsUpdate = true;
    // Boot schaukelt
    b.position.y = welle(0, 0, uhr) * 0.8;
    b.rotation.x = 0.06 * Math.sin(uhr * 2 * Math.PI / 5.2); b.rotation.z = 0.035 * Math.sin(uhr * 2 * Math.PI / 4.2 + 1);
    const sp = b.userData.segel.geometry.attributes.position, ruhe = b.userData.segelRuhe;
    for (let i = 0; i < sp.count; i++) {
      const x = ruhe[i * 3], y = ruhe[i * 3 + 1];
      sp.setZ(i, 0.18 * Math.sin(Math.PI * Math.min(x / 1.7, 1)) * (0.6 + 0.4 * Math.sin(uhr * 1.3 + y * 0.8)));
    }
    sp.needsUpdate = true;
    for (const w of wolken) { w.position.x += dt * 0.35; if (w.position.x > 45) w.position.x = -45; }

    // Fels und Kolonie wandern mit der langsamen Drehung des Boots
    const fp = spurBei(felsSpur, ts);
    if (fp) { stauche([fp[0], fp[1], 0], felsGr.position); felsGr.position.y = -0.2; felsGr.visible = true; } else felsGr.visible = false;
    let kp = null;
    if (kolonie.length) { for (const q of kolonie) { kp = ort(K, q, ts); if (kp) break; } }
    else kp = spurBei(kolonieSpur, ts);
    if (kp) { stauche([kp[0], kp[1], 0], insel.position); insel.position.y = -0.3; insel.visible = true; } else insel.visible = false;

    n_schaum = 0;
    // Brecher am Felsen: Gischt steigt auf und fällt zurück
    for (const q of felsQ) {
      const x = imKreis(K, ts, q.t0, q.t0 + 3.2); if (x === null || !fp) continue;
      const a = x - q.t0, k0 = q.t0 * 13.7;
      for (let i = 0; i < 16; i++) {
        const w = zufall(k0 + i) * Math.PI * 2, s = 0.8 + 1.6 * zufall(k0 + i + 50), hoch = 5 + 4 * zufall(k0 + i + 90);
        v3.set(felsGr.position.x + Math.cos(w) * s * a * 1.4, -0.2 + hoch * a - 4.9 * a * a, felsGr.position.z + Math.sin(w) * s * a * 1.4);
        if (v3.y > -0.3) schaumKugel(v3, (0.55 + 0.4 * zufall(k0 + i + 7)) * Math.max(0, 1 - a / 3.2));
      }
      for (let i = 0; i < 8; i++) {       // Schaumkranz am Fuß
        const w = i / 8 * Math.PI * 2;
        v3.set(felsGr.position.x + Math.cos(w) * (1.3 + a), 0.05, felsGr.position.z + Math.sin(w) * (1.3 + a));
        schaumKugel(v3, 0.45 * Math.max(0, 1 - a / 3));
      }
    }
    // Wellenkämme: weiße Schaumkrone, die aufsteigt und vergeht
    for (const q of wellenQ) {
      const x = imKreis(K, ts, q.t0, q.ende + 0.5); if (x === null) continue;
      const p = ort(K, q, Math.min(x, q.ende)); if (!p) continue;
      const u = (x - q.t0) / (q.ende - q.t0 + 0.5), h = Math.sin(Math.PI * u);
      stauche([p[0], p[1], 0], v4);
      for (let i = 0; i < 4; i++) {
        const k = q.t0 * 7.1 + i;
        v3.set(v4.x + (zufall(k) - 0.5) * 1.4, welle(v4.x, v4.z, uhr) + 0.15 + 0.25 * h, v4.z + (zufall(k + 3) - 0.5) * 1.4);
        schaumKugel(v3, 0.5 * h * (0.6 + 0.4 * zufall(k + 5)));
      }
    }
    // Wasser am Rumpf: kleine Spritzer an der Bordwand
    for (const q of rumpfQ) {
      const x = imKreis(K, ts, q.t0, q.t0 + 0.8); if (x === null) continue;
      const a = x - q.t0, p = q.p[0];
      for (let i = 0; i < 5; i++) {
        const k = q.t0 * 3.3 + i, seite = Math.sign(p[1]);
        v3.set(p[0] + (zufall(k) - 0.5) * 0.6, 0.1 + (2.2 + zufall(k + 1)) * a - 4.9 * a * a, -(p[1] + seite * (0.1 + 0.8 * a * zufall(k + 2))));
        v3.applyEuler(eul.set(b.rotation.x, 0, b.rotation.z)); v3.y += b.position.y;
        if (v3.y > -0.1) schaumKugel(v3, 0.16 * (1 - a / 0.8));
      }
    }
    schaum.count = n_schaum; schaum.instanceMatrix.needsUpdate = true;

    // Möwen: sichtbar um ihren Ruf herum, auf ihrer Bahn weitergeführt
    let nm = 0;
    for (const { q, v, gross } of vogelQ) {
      const x = imKreis(K, ts, q.t0 - 3, q.ende + 3); if (x === null || nm >= moewen.length) continue;
      const tt = Math.min(Math.max(x, q.t0), q.ende), p = ort(K, q, tt); if (!p) continue;
      const ue = x - tt;
      const pp = [p[0] + v[0] * ue, p[1] + v[1] * ue, Math.max(1.5, p[2] + v[2] * ue)];
      stauche(pp, v3);
      stauche([pp[0] + v[0] * 0.5, pp[1] + v[1] * 0.5, pp[2] + v[2] * 0.5], v4).sub(v3);
      const o = moewen[nm++];
      setzeVogel(o, v3, v4.lengthSq() > 1e-6 ? v4 : v4.set(1, 0, 0), uhr, q.t0, false);
      const rand = Math.min(1, (x - q.t0 + 3) / 1.2, (q.ende + 3 - x) / 1.2);
      o.scale.setScalar(1.6 * gross * Math.max(0.05, rand));
    }
    for (let i = nm; i < moewen.length; i++) moewen[i].visible = false;
    // Züge: Schwarm in lockerer Keilform um die Mitte des Stimmengewirrs
    let ng = 0, nz = 0;
    for (const q of zuege) {
      const x = imKreis(K, ts, q.t0, q.ende); if (x === null) continue;
      const p = ort(K, q, x), p2 = ort(K, q, Math.min(x + 1, q.ende)) || p; if (!p) continue;
      const rv = [p2[0] - p[0], p2[1] - p[1]], l = Math.hypot(...rv) || 1, r = [rv[0] / l, rv[1] / l], quer = [-r[1], r[0]];
      const gans = q.g === 'gaense', liste = gans ? gaense : zugMoewen, anz = gans ? 11 : 9;
      const rand = Math.min(1, (x - q.t0) / 6, (q.ende - x) / 6);
      for (let i = 0; i < anz; i++) {
        const o = liste[gans ? ng++ : nz++]; if (!o) break;
        const reihe = Math.ceil(i / 2), seite = i % 2 ? 1 : -1;
        const hinten = gans ? reihe * 9 : reihe * 7 + zufall(i) * 6, seitlich = gans ? seite * reihe * 7 : seite * (reihe * 5 + zufall(i + 9) * 6);
        const pp = [p[0] - r[0] * hinten + quer[0] * seitlich, p[1] - r[1] * hinten + quer[1] * seitlich, p[2] + (zufall(i + 4) - 0.5) * 4];
        stauche(pp, v3);
        setzeVogel(o, v3, v4.set(r[0], 0, -r[1]), uhr, i * 1.7, gans);
        o.scale.setScalar((gans ? 1.7 : 1.4) * Math.max(0.05, rand));
      }
    }
    for (let i = ng; i < gaense.length; i++) gaense[i].visible = false;
    for (let i = nz; i < zugMoewen.length; i++) zugMoewen[i].visible = false;

    renderer.setRenderTarget(ziel); renderer.render(szene, kamera);
    renderer.setRenderTarget(null); renderer.render(nachSzene, nachKamera);
  }
  requestAnimationFrame(bild);
  return {
    stopp() { laeuft = false; beob.disconnect(); renderer.dispose(); },
  };
}
