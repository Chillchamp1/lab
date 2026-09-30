// Die 3D-Ansicht (Knopf "3D"): dieselben Felder wie die Karte, gezeichnet mit
// WebGL (three.js, liegt unter ../drei/ und wird erst beim Einschalten geladen).
//
// Warum ueberhaupt: die flache Karte und der Scheibenstapel sind Canvas-2D und
// koennen kein Material — Eis glaenzt dort nicht, Wasser spiegelt nicht, und
// beim Drehen wandert kein Licht. Hier:
//
//   Gelaende   Licht aus Blender gebacken (Cycles: Sonne aus Nordwest wie im
//              Film, Himmelslicht, Schlagschatten, dazu das 1,5-km-Relief als
//              Bump) -> drei/licht.webp. Die Karte bewegt das Gelaende nur um
//              die Krustenlage; die Schattierung von heute passt dazu.
//   Eis        live: Lambert + Himmel, GGX-Glanz der Sonne, Fresnel-Spiegelung
//              des Himmels, Blau nach Hoehe wie die Eisleiter. Der Glanz haengt
//              am Blick und wandert beim Drehen ueber die Kuppen.
//   Meer       eigene Flaeche auf Hoehe null: Tiefe aus dem Feld, Farbe nach
//              Tiefe, Sonnenglitzern und Himmelsspiegelung.
//
// Die Ueberhoehung (24-fach, Tiefsee logarithmisch gestaucht) ist dieselbe wie
// beim Backen, sonst passten Schatten und Relief nicht zusammen.

export function dreiD() {
  return `
/* ================================================================ 3D (WebGL) */
let DREID = false, drei = null;
const DREI_UEBER = 24, DREI_TIEF = 1500;      // wie beim Backen in Blender

function dreiHalbfloat(THREE, src, dst) {
  for (let i = 0; i < src.length; i++) dst[i] = THREE.DataUtils.toHalfFloat(src[i]);
}

async function dreiStarten() {
  if (drei) return drei;
  const THREE = await import('three');
  const { OrbitControls } = await import('./drei/OrbitControls.js');
  const { EffectComposer } = await import('./drei/postprocessing/EffectComposer.js');
  const { RenderPass } = await import('./drei/postprocessing/RenderPass.js');
  const { UnrealBloomPass } = await import('./drei/postprocessing/UnrealBloomPass.js');
  const { OutputPass } = await import('./drei/postprocessing/OutputPass.js');
  const feld = cv.parentElement;
  const leinwand = document.createElement('canvas');
  leinwand.id = 'drei';
  leinwand.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:none';
  feld.appendChild(leinwand);
  const r = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  r.toneMapping = THREE.AgXToneMapping;
  r.toneMappingExposure = 0.95;
  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  const W3 = GW * D.g.s / 1000, H3 = GH * D.g.s / 1000;   // Tausend Kilometer
  kam.position.set(0, -H3 * 1.28, H3 * 0.95);
  kam.up.set(0, 0, 1);
  const steuer = new OrbitControls(kam, leinwand);
  steuer.target.set(0, H3 * 0.02, 0);
  steuer.enableDamping = true;
  steuer.maxPolarAngle = Math.PI * 0.47;
  steuer.minDistance = 0.4; steuer.maxDistance = 12;

  const licht = new THREE.TextureLoader().load('./drei/licht.webp');
  licht.colorSpace = THREE.NoColorSpace;
  licht.anisotropy = r.capabilities.getMaxAnisotropy();

  // Zur Sonne hin: Nord-Nordost, 15 Grad hoch. Im Standardblick nach Norden
  // steht sie damit im Gegenlicht, und Eis und Meer glaenzen ohne Drehen.
  // Muss zur gebackenen Lichtkarte passen (licht_backen.py, LICHT_SONNE).
  const sonne = new THREE.Vector3(0.34, 0.94, 0.27).normalize();
  /* Die heutige Kuestenlinie: das moderne DEM als Textur, die Linie zieht der
     Shader bei null (Polder als Land, wie in der flachen Karte). Das DEM kommt
     in 10-m-Stufen; die Schwelle liegt deshalb bei 5 m, zwischen null und der
     ersten Landstufe. */
  const heuteDem = new Uint16Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) {
    let v = MASKE[i] ? DEM[i] : -4000;
    if (POLDER[i] && v < 10) v = 10;
    heuteDem[i] = THREE.DataUtils.toHalfFloat(v);
  }
  const heuteTex = new THREE.DataTexture(heuteDem, GW, GH, THREE.RedFormat, THREE.HalfFloatType);
  heuteTex.magFilter = heuteTex.minFilter = THREE.LinearFilter;
  heuteTex.needsUpdate = true;

  const gemein = {
    uHeuteDem: { value: heuteTex }, uHeute: { value: 1 },
    uHoehe: { value: null }, uFarbe: { value: null }, uLicht: { value: licht },
    uTexel: { value: new THREE.Vector2(1, 1) }, uGroesse: { value: new THREE.Vector2(W3, H3) },
    uSonne: { value: sonne }, uSkala: { value: DREI_UEBER / 1e6 }, uTief: { value: DREI_TIEF },
    uZeit: { value: 0 },
  };
  const GLSL_GEMEIN = [
    'uniform sampler2D uHoehe; uniform sampler2D uFarbe; uniform sampler2D uLicht; uniform sampler2D uHeuteDem; uniform float uHeute;',
    'uniform vec2 uTexel; uniform vec2 uGroesse; uniform vec3 uSonne; uniform float uSkala; uniform float uTief; uniform float uZeit;',
    'float hoeheBei(vec2 uv) { return texture2D(uHoehe, vec2(uv.x, 1.0 - uv.y)).r; }',
    'vec4 farbeBei(vec2 uv) { return texture2D(uFarbe, vec2(uv.x, 1.0 - uv.y)); }',
    'float zVon(float h) { return (h >= 0.0 ? h : -uTief * log(1.0 - h / uTief)) * uSkala; }',
    'vec3 himmel(vec3 d) {',
    '  float t = clamp(d.z * 0.5 + 0.5, 0.0, 1.0);',
    '  vec3 c = mix(vec3(0.62, 0.74, 0.90), vec3(0.16, 0.34, 0.72), pow(t, 0.8));',
    '  float s = max(dot(normalize(d), uSonne), 0.0);',
    '  return c + vec3(1.0, 0.93, 0.82) * (pow(s, 900.0) * 10.0 + pow(s, 24.0) * 0.2);',
    '}',
    'float ggx(vec3 n, vec3 l, vec3 v, float a) {',
    '  vec3 h = normalize(l + v); float nh = max(dot(n, h), 0.0); float a2 = a * a;',
    '  float d = nh * nh * (a2 - 1.0) + 1.0; float nl = max(dot(n, l), 0.0);',
    '  return a2 / (3.14159 * d * d) * nl * 0.25;',
    '}',
    'vec3 normaleBei(vec2 uv) {',
    '  float hx = zVon(hoeheBei(uv + vec2(uTexel.x, 0.0))) - zVon(hoeheBei(uv - vec2(uTexel.x, 0.0)));',
    '  float hy = zVon(hoeheBei(uv + vec2(0.0, uTexel.y))) - zVon(hoeheBei(uv - vec2(0.0, uTexel.y)));',
    '  return normalize(vec3(-hx / (2.0 * uTexel.x * uGroesse.x), -hy / (2.0 * uTexel.y * uGroesse.y), 1.0));',
    '}',
    // Warme, tiefe Sonne und kuehles Himmelslicht - dieselben Farben wie beim Backen.
    'const vec3 SONNENFARBE = vec3(1.0, 0.80, 0.62);',
    'const vec3 DUNST = vec3(0.50, 0.60, 0.76);',
    // Schatten der Eiskuppen zur Laufzeit: Strahl zur Sonne ueber das Hoehenfeld,
    // mit wachsender Schrittweite (4 bis 350 km) und weichem Halbschatten.
    // Zurueck: Schattenfaktor (1 = Sonne) und ob der Werfer Eis ist.
    'vec2 schatten(vec2 uv, float z0) {',
    '  float horiz = length(uSonne.xy); vec2 dir = uSonne.xy / horiz; float steig = uSonne.z / horiz;',
    '  float s = 1.0, werferEis = 0.0, t = 0.004;',
    '  for (int i = 0; i < 28; i++) {',
    '    vec2 p = uv + dir * t / uGroesse;',
    '    if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) break;',
    '    float zt = zVon(hoeheBei(p));',
    '    float o = clamp((z0 + steig * t - zt) / (0.0015 + t * 0.03) + 0.5, 0.0, 1.0);',
    '    if (o < s) { s = o; werferEis = farbeBei(p).a; }',
    '    t *= 1.18;',
    '  }',
    '  return vec2(s, step(0.55, werferEis));',
    '}',
    // Luftperspektive: was weit weg liegt, verblasst leicht ins Himmelsblau.
    'vec3 dunst(vec3 c, vec3 welt) {',
    '  float d = length(cameraPosition - welt);',
    '  return mix(c, DUNST * 0.55, (1.0 - exp(-max(d - 6.5, 0.0) * 0.12)) * 0.35);',
    '}',
  ].join('\\n');
  // Haarfeine heutige Kuestenlinie, etwa ein Bildpunkt breit, egal wie nah.
  // Nur im Fragment-Shader: fwidth gibt es im Vertex-Shader nicht.
  const GLSL_KUESTE = [
    'float kueste(vec2 uv) {',
    '  float d = texture2D(uHeuteDem, vec2(uv.x, 1.0 - uv.y)).r - 5.0;',
    '  float w = max(fwidth(d), 1e-3);',
    '  return uHeute * (1.0 - smoothstep(0.0, w * 0.6, abs(d)));',
    '}',
  ].join('\\n');

  // ---------------------------------------------------------------- Gelaende
  const n = Math.min(rW, 700), m = Math.round(n * GH / GW);
  const geo = new THREE.PlaneGeometry(W3, H3, n - 1, m - 1);
  const gelaende = new THREE.ShaderMaterial({
    uniforms: gemein, transparent: false,
    vertexShader: GLSL_GEMEIN + [
      'varying vec2 vUv; varying vec3 vWelt;',
      'void main() {',
      '  vUv = uv; vec3 p = position; p.z = zVon(hoeheBei(uv));',
      '  vec4 w = modelMatrix * vec4(p, 1.0); vWelt = w.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'].join('\\n'),
    fragmentShader: GLSL_GEMEIN + '\\n' + GLSL_KUESTE + [
      '',
      'varying vec2 vUv; varying vec3 vWelt;',
      'void main() {',
      '  vec4 f = farbeBei(vUv);',
      '  if (f.a < 0.2) discard;',
      '  float h = hoeheBei(vUv);',
      // Eisrand scharf: die Maske ist bilinear gefiltert, geschnitten wird sie
      // an einer schmalen Schwelle statt ueber die ganze Rampe gemischt.
      '  float eis = smoothstep(0.54, 0.60, f.a);',
      '  vec3 V = normalize(cameraPosition - vWelt);',
      '  vec3 N = normaleBei(vUv);',
      '  vec3 alb = pow(f.rgb, vec3(2.2));',
      // Gelaende: gebackenes, farbiges Licht aus Blender (warme Sonne, blauer
      // Himmel in den Schatten, Schlagschatten, 1,5-km-Relief)
      '  vec3 lb = pow(texture2D(uLicht, vUv).rgb, vec3(2.2)) * 3.5;',
      // Das Blau der Schatten nur zur Haelfte: voll entsaettigte es das Gruen.
      '  lb = mix(vec3(dot(lb, vec3(0.3333))), lb, 0.5);',
      '  float lum = dot(alb, vec3(0.2126, 0.7152, 0.0722));',
      '  alb = max(mix(vec3(lum), alb, 1.25), 0.0);',
      '  vec2 sch = schatten(vUv, zVon(h) + 0.0004);',
      // Schatten, den Eis zur Laufzeit wirft (das heutige Gelaende steckt schon im Backen)
      '  float eisSchatten = mix(1.0, sch.x, sch.y * (1.0 - smoothstep(0.54, 0.60, f.a)));',
      '  vec3 fels = alb * lb * mix(vec3(0.42, 0.50, 0.66), vec3(1.0), eisSchatten);',
      // Eis: live. Fuer die Schattierung wird die Neigung verstaerkt (die Kuppen
      // sind auch ueberhoeht nur wenige Grad steil), dazu eine Mulde aus dem
      // Vergleich mit der Umgebung: das macht flache Eisflaechen plastisch.
      '  vec3 Ne = normalize(vec3(N.xy * 1.4, N.z));',
      '  vec2 r1 = uTexel * 6.0, r2 = uTexel * 18.0;',
      '  float umg = 0.125 * (hoeheBei(vUv + vec2(r1.x, 0.0)) + hoeheBei(vUv - vec2(r1.x, 0.0)) + hoeheBei(vUv + vec2(0.0, r1.y)) + hoeheBei(vUv - vec2(0.0, r1.y))',
      '            + hoeheBei(vUv + vec2(r2.x, 0.0)) + hoeheBei(vUv - vec2(r2.x, 0.0)) + hoeheBei(vUv + vec2(0.0, r2.y)) + hoeheBei(vUv - vec2(0.0, r2.y)));',
      '  float mulde = clamp(1.0 - (umg - h) / 420.0, 0.75, 1.08);',
      '  float t = clamp(h / 2500.0, 0.0, 1.0);',
      '  vec3 eisF = mix(vec3(0.92, 0.94, 0.95), vec3(0.40, 0.64, 0.92), t);',
      '  float nl = max(dot(Ne, uSonne), 0.0);',
      '  vec3 R = reflect(-V, Ne);',
      '  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(Ne, V), 0.0), 5.0);',
      '  float amb = (0.26 + 0.14 * Ne.z) * mulde;',
      '  float sonneEis = sch.x;',
      '  vec3 eisC = eisF * (nl * 2.3 * SONNENFARBE * mulde * sonneEis + amb * vec3(0.50, 0.64, 0.95))',
      '            + ggx(Ne, uSonne, V, 0.12) * SONNENFARBE * 1.8 * sonneEis + himmel(R) * fr * 0.55;',
      // Ein schmaler dunkler Saum am Eisrand: die Kante liest sich als Stufe.
      '  float saum = smoothstep(0.54, 0.62, f.a) - smoothstep(0.62, 0.74, f.a);',
      '  eisC *= 1.0 - 0.35 * saum;',
      '  vec3 c = mix(fels, eisC, eis);',
      '  c = mix(c, vec3(0.92, 0.94, 0.96) * max(lb.g, 0.7), 0.26 * kueste(vUv));',
      '  c = dunst(c, vWelt);',
      '  gl_FragColor = vec4(c, 1.0);',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'].join('\\n'),
  });
  gelaende.toneMapped = true;
  const netz = new THREE.Mesh(geo, gelaende);
  szene.add(netz);

  // ------------------------------------------------------------------- Meer
  const meerGeo = new THREE.PlaneGeometry(W3, H3, 1, 1);
  const meer = new THREE.ShaderMaterial({
    uniforms: gemein, transparent: true, depthWrite: false,
    vertexShader: [
      'varying vec2 vUv; varying vec3 vWelt;',
      'void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWelt = w.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * w; }'].join('\\n'),
    fragmentShader: GLSL_GEMEIN + '\\n' + GLSL_KUESTE + [
      '',
      'varying vec2 vUv; varying vec3 vWelt;',
      'float rausch(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
      'float welle(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(rausch(i), rausch(i + vec2(1, 0)), f.x), mix(rausch(i + vec2(0, 1)), rausch(i + vec2(1, 1)), f.x), f.y); }',
      'void main() {',
      '  vec4 f = farbeBei(vUv);',
      '  if (f.a < 0.2) discard;',
      '  float h = hoeheBei(vUv);',
      '  if (h >= 0.0) discard;',
      '  float tiefe = -h;',
      '  vec3 V = normalize(cameraPosition - vWelt);',
      // feine Wellen fuer das Glitzern: zwei Oktaven, langsam bewegt
      '  vec2 q = vUv * vec2(uGroesse.x, uGroesse.y) * 150.0;',
      '  float e = 0.0008;',
      '  float a = welle(q + uZeit * 0.6) + 0.5 * welle(q * 2.3 - uZeit * 0.9);',
      '  float ax = welle(q + vec2(e * 1e3, 0.0) + uZeit * 0.6) + 0.5 * welle((q + vec2(e * 1e3, 0.0)) * 2.3 - uZeit * 0.9);',
      '  float ay = welle(q + vec2(0.0, e * 1e3) + uZeit * 0.6) + 0.5 * welle((q + vec2(0.0, e * 1e3)) * 2.3 - uZeit * 0.9);',
      '  vec3 N = normalize(vec3((a - ax) * 0.035, (a - ay) * 0.035, 1.0));',
      '  vec3 R = reflect(-V, N);',
      '  float fr = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
      '  vec3 flach = vec3(0.10, 0.62, 0.62), tief = vec3(0.01, 0.10, 0.34);',
      '  vec3 wasser = mix(flach, tief, 1.0 - exp(-tiefe / 180.0));',
      '  float nl = max(dot(vec3(0.0, 0.0, 1.0), uSonne), 0.0);',
      '  float sw = schatten(vUv, 0.0004).x;',
      '  vec3 c = wasser * (0.35 + 0.9 * nl * sw) + himmel(R) * fr * 0.8 + ggx(N, uSonne, V, 0.07) * SONNENFARBE * 1.6 * sw;',
      '  float deck = 1.0 - exp(-tiefe / 25.0);',
      '  float kl = kueste(vUv);',
      '  c = mix(c, vec3(0.85, 0.90, 0.95), 0.26 * kl);',
      '  gl_FragColor = vec4(dunst(c, vWelt), clamp(0.55 + 0.45 * deck + 0.3 * kl, 0.0, 1.0));',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'].join('\\n'),
  });
  meer.toneMapped = true;
  const meerNetz = new THREE.Mesh(meerGeo, meer);
  meerNetz.position.z = 0.0002;
  szene.add(meerNetz);

  // ------------------------------------------------------------ Himmel
  // Eine grosse Kugel von innen: ueber dem Horizont Himmelsblau mit Schein zur
  // Sonne hin, darunter ein dunkler Grund, in dem das Modell steht.
  const himmelKugel = new THREE.Mesh(new THREE.SphereGeometry(30, 48, 24), new THREE.ShaderMaterial({
    uniforms: gemein, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vR; void main() { vR = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLSL_GEMEIN + [
      'varying vec3 vR;',
      'void main() {',
      '  vec3 d = normalize(vR);',
      '  float s = max(dot(d, uSonne), 0.0);',
      '  vec3 oben = mix(vec3(0.20, 0.36, 0.70), vec3(0.04, 0.10, 0.30), smoothstep(0.0, 0.6, d.z));',
      '  vec3 unten = vec3(0.018, 0.022, 0.035);',
      '  vec3 c = mix(unten, oben, smoothstep(-0.12, 0.04, d.z));',
      '  c += SONNENFARBE * (pow(s, 8.0) * 0.12 + pow(s, 80.0) * 0.3) * smoothstep(-0.2, 0.05, d.z);',
      '  gl_FragColor = vec4(c, 1.0);',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'].join('\\n'),
  }));
  szene.add(himmelKugel);

  // ------------------------------------------------------------- Sockel
  // Die Karte als Reliefmodell: Seitenwaende vom Gelaenderand bis zu einem
  // Boden unter der tiefsten Tiefsee. Oben folgt die Wand dem Rand des Feldes.
  {
    const seg = 400, pos = [], uvs = [], oben = [], nor = [], idx = [];
    const kanten = [[[0, 0], [1, 0], [0, -1, 0]], [[1, 0], [1, 1], [1, 0, 0]], [[1, 1], [0, 1], [0, 1, 0]], [[0, 1], [0, 0], [-1, 0, 0]]];
    for (const [[u0, v0], [u1, v1], nn] of kanten) {
      const basis = pos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const u = u0 + (u1 - u0) * i / seg, v = v0 + (v1 - v0) * i / seg;
        for (const o of [1, 0]) {
          pos.push((u - 0.5) * W3, (v - 0.5) * H3, 0); uvs.push(u, v); oben.push(o); nor.push(...nn);
        }
        if (i < seg) { const a = basis + 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('oben', new THREE.Float32BufferAttribute(oben, 1));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    const sockel = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: gemein, side: THREE.DoubleSide,
      vertexShader: GLSL_GEMEIN + [
        'attribute float oben; varying float vOben; varying vec3 vN; varying vec3 vWelt;',
        'void main() {',
        '  vec2 uvi = clamp(uv, uTexel * 0.5, 1.0 - uTexel * 0.5);',
        '  vec3 p = position; p.z = oben > 0.5 ? zVon(hoeheBei(uvi)) : -0.095;',
        '  vOben = oben; vN = normal; vec4 w = modelMatrix * vec4(p, 1.0); vWelt = w.xyz;',
        '  gl_Position = projectionMatrix * viewMatrix * w;',
        '}'].join('\\n'),
      fragmentShader: GLSL_GEMEIN + [
        'varying float vOben; varying vec3 vN; varying vec3 vWelt;',
        'void main() {',
        '  float z = vWelt.z;',
        '  vec3 erde = mix(vec3(0.05, 0.045, 0.04), vec3(0.20, 0.16, 0.12), smoothstep(-0.095, 0.0, z));',
        '  erde *= 0.85 + 0.15 * sin(z * 900.0);',
        '  float l = 0.35 + 0.9 * max(dot(normalize(vN), uSonne), 0.0);',
        '  gl_FragColor = vec4(dunst(erde * l, vWelt), 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}'].join('\\n'),
    }));
    szene.add(sockel);
  }

  // ------------------------------------------------ Nachbearbeitung: Bloom
  // Die Glanzpunkte auf Eis und Meer strahlen leicht ueber. Tonkurve und
  // Farbraum macht dann der OutputPass, nicht mehr das Material.
  const komponist = new EffectComposer(r);
  komponist.addPass(new RenderPass(szene, kam));
  // Nutzer 30.09.2026: "Blendung zu stark" -> schwaecher und erst ab hellerem Licht
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.08, 0.25, 1.3);
  komponist.addPass(bloom);
  komponist.addPass(new OutputPass());

  // ------------------------------------------------------------- Staedte
  // Wie in der flachen Karte: Punkt, Name und, wo gerade Eis liegt, dessen
  // Maechtigkeit. HTML ueber der Leinwand, je Bild auf den Schirm projiziert —
  // die Schrift bleibt scharf und gleich gross, egal wie gedreht wird.
  // Alle Masse in em: die Schriftgroesse setzt das CSS (.orte3d), auf dem
  // Telefon halb so gross (Nutzer 30.09.2026).
  const orteBox = document.createElement('div');
  orteBox.className = 'orte3d';
  orteBox.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;display:none';
  feld.appendChild(orteBox);
  const schmal = matchMedia('(max-width: 700px)');
  const orte3 = ORTE.map(o => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;font-weight:600;line-height:1.2;font-family:system-ui,sans-serif;'
      + 'color:#f4f6f8;text-shadow:0 0 3px rgba(0,0,0,.9),0 1px 2px rgba(0,0,0,.8);will-change:transform';
    el.innerHTML = '<span style="display:inline-block;width:.44em;height:.44em;border-radius:50%;background:#fff;'
      + 'box-shadow:0 0 0 .13em rgba(0,0,0,.55);margin-right:.44em;vertical-align:.08em"></span>'
      + '<span></span><div style="font-weight:500;font-size:.87em;opacity:.85;margin-left:1em"></div>';
    orteBox.appendChild(el);
    return { o, el, name: el.children[1], zweit: el.children[2], x: (o.x / GW - 0.5) * W3, y: (0.5 - o.y / GH) * H3, z: 0, eis: 0, text: '' };
  });
  orte3.forEach(s => { s.name.textContent = s.o.name; });
  const pv = new THREE.Vector3();
  function orteSetzen() {
    if (!HEUTE) { orteBox.style.display = 'none'; return; }
    orteBox.style.display = 'block';
    const b = leinwand.clientWidth, h = leinwand.clientHeight;
    for (const s of orte3) {
      pv.set(s.x, s.y, s.z + 0.002).project(kam);
      if (pv.z > 1 || pv.x < -1.05 || pv.x > 1.05 || pv.y < -1.05 || pv.y > 1.05) { s.el.style.display = 'none'; continue; }
      s.el.style.display = 'block';
      const k = schmal.matches ? 0.5 : 1;
      s.el.style.transform = 'translate(' + ((pv.x + 1) / 2 * b - 2.5 * k).toFixed(1) + 'px,' + ((1 - pv.y) / 2 * h - 8 * k).toFixed(1) + 'px)';
      const t = s.eis >= EISSCHWELLE ? nfm.format(Math.round(s.eis / 10) * 10) + ' m under ice' : '';
      if (t !== s.text) { s.zweit.textContent = t; s.text = t; }
    }
  }

  drei = { THREE, r, szene, kam, steuer, leinwand, gemein, hoeheTex: null, farbeTex: null, hBuf: null, fBuf: null, w: 0, h: 0, orte3, orteBox };
  function groesse() {
    const b = feld.clientWidth || breite, h = feld.clientHeight || hoehe;
    r.setSize(b, h, false); kam.aspect = b / Math.max(1, h); kam.updateProjectionMatrix();
    komponist.setPixelRatio(r.getPixelRatio()); komponist.setSize(b, h);
  }
  drei.groesse = groesse;
  groesse();
  r.setAnimationLoop((t) => {
    if (!DREID) return;
    gemein.uZeit.value = t / 1000;
    steuer.update();
    komponist.render();
    orteSetzen();
  });
  return drei;
}

/* Die Felder des Augenblicks in die Texturen: Hoehe (Oberflaeche, Halbfloat)
   und Farbe (RGB: Land- bzw. Biomfarbe, Tiefenfarbe unter Wasser; A: 0 aussen,
   0,5 Land, bis 1 Eis). */
function dreiFelder() {
  if (!drei) return;
  const { THREE, gemein } = drei;
  const n = rW * rH;
  if (drei.w !== rW || drei.h !== rH) {
    drei.hBuf = new Uint16Array(n); drei.fBuf = new Uint8Array(n * 4);
    drei.hoeheTex = new THREE.DataTexture(drei.hBuf, rW, rH, THREE.RedFormat, THREE.HalfFloatType);
    drei.hoeheTex.magFilter = drei.hoeheTex.minFilter = THREE.LinearFilter;
    drei.farbeTex = new THREE.DataTexture(drei.fBuf, rW, rH, THREE.RGBAFormat, THREE.UnsignedByteType);
    drei.farbeTex.magFilter = drei.farbeTex.minFilter = THREE.LinearFilter;
    drei.w = rW; drei.h = rH;
    gemein.uHoehe.value = drei.hoeheTex; gemein.uFarbe.value = drei.farbeTex;
    gemein.uTexel.value.set(1 / rW, 1 / rH);
  }
  if (BIOM) biomRechnen();
  /* Die Eisoberflaeche bleibt, wie die Karte sie rechnet (heutiges DEM plus
     Differenzfeld): das Relief darunter scheint durch. Eine Glaettung nach
     Maechtigkeit war kurz drin und ist wieder raus — das Eis wirkte damit wie
     ein anderer Datensatz, weich und ohne die Rauheit (Nutzer, 30.09.2026). */
  const hb = drei.hBuf, fb = drei.fBuf;
  for (let i = 0; i < n; i++) {
    const j = i << 2;
    hb[i] = THREE.DataUtils.toHalfFloat(maskeR[i] ? flaeche[i] : -4000);
    if (!maskeR[i]) { fb[j + 3] = 0; continue; }
    let r, g, b;
    if (BIOM && rock[i] >= 0) { r = biomF[3 * i]; g = biomF[3 * i + 1]; b = biomF[3 * i + 2]; }
    else {
      const k = Math.max(0, Math.min(NBAND - 1, Math.floor(gesteinLeiter(rock[i]) * NBAND)));
      r = GR[k]; g = GG[k]; b = GB[k];
    }
    fb[j] = r; fb[j + 1] = g; fb[j + 2] = b;
    const e = eisD[i] < EISSCHWELLE ? 0 : Math.min(1, (eisD[i] - EISSCHWELLE) / 60);
    fb[j + 3] = 128 + Math.round(127 * e);
  }
  drei.hoeheTex.needsUpdate = true;
  drei.farbeTex.needsUpdate = true;
  gemein.uHeute.value = HEUTE ? 1 : 0;
  // Hoehe und Eis an den Staedten fuer die Beschriftung
  for (const s of drei.orte3) {
    const fx = Math.max(0, Math.min(rW - 1, Math.round(s.o.x / GW * rW)));
    const fy = Math.max(0, Math.min(rH - 1, Math.round(s.o.y / GH * rH)));
    const fi = fy * rW + fx, hh = Math.max(0, flaeche[fi]);
    s.z = hh * DREI_UEBER / 1e6;
    s.eis = maskeR[fi] ? eisD[fi] : 0;
  }
}

async function dreiSchalten(an) {
  DREID = an;
  const knopf = document.getElementById('dreid');
  if (knopf) knopf.setAttribute('aria-pressed', an ? 'true' : 'false');
  if (an) {
    // Die flache Karte gar nicht erst zeigen, solange 3D laedt: 3D ist die Vorgabe.
    cv.style.visibility = 'hidden';
    let hinweis = document.getElementById('dreiLaedt');
    if (!drei && !hinweis) {
      hinweis = document.createElement('div');
      hinweis.id = 'dreiLaedt';
      hinweis.textContent = 'Loading 3D\\u2026';
      hinweis.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-size:13px;pointer-events:none';
      cv.parentElement.appendChild(hinweis);
    }
    try { await dreiStarten(); }
    catch (e) {
      DREID = false; cv.style.visibility = '';
      if (hinweis) hinweis.remove();
      if (knopf) { knopf.setAttribute('aria-pressed', 'false'); knopf.title = 'WebGL not available: ' + e.message; }
      zeichne(); return;
    }
    if (hinweis) hinweis.remove();
    drei.leinwand.style.display = 'block';
    drei.groesse();
  } else if (drei) {
    drei.leinwand.style.display = 'none';
    drei.orteBox.style.display = 'none';
    cv.style.visibility = '';
  }
  zeichne();
}
`;
}
