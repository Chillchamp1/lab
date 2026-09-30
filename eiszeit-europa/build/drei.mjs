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
  kam.position.set(0, -H3 * 0.95, H3 * 0.62);
  kam.up.set(0, 0, 1);
  const steuer = new OrbitControls(kam, leinwand);
  steuer.target.set(0, H3 * 0.04, 0);
  steuer.enableDamping = true;
  steuer.maxPolarAngle = Math.PI * 0.47;
  steuer.minDistance = 0.4; steuer.maxDistance = 12;

  const licht = new THREE.TextureLoader().load('./drei/licht.webp');
  licht.colorSpace = THREE.NoColorSpace;
  licht.anisotropy = r.capabilities.getMaxAnisotropy();

  const sonne = new THREE.Vector3(-0.70, 0.62, 0.36).normalize();   // zur Sonne hin, Nordwest
  const gemein = {
    uHoehe: { value: null }, uFarbe: { value: null }, uLicht: { value: licht },
    uTexel: { value: new THREE.Vector2(1, 1) }, uGroesse: { value: new THREE.Vector2(W3, H3) },
    uSonne: { value: sonne }, uSkala: { value: DREI_UEBER / 1e6 }, uTief: { value: DREI_TIEF },
    uZeit: { value: 0 },
  };
  const GLSL_GEMEIN = [
    'uniform sampler2D uHoehe; uniform sampler2D uFarbe; uniform sampler2D uLicht;',
    'uniform vec2 uTexel; uniform vec2 uGroesse; uniform vec3 uSonne; uniform float uSkala; uniform float uTief; uniform float uZeit;',
    'float hoeheBei(vec2 uv) { return texture2D(uHoehe, vec2(uv.x, 1.0 - uv.y)).r; }',
    'vec4 farbeBei(vec2 uv) { return texture2D(uFarbe, vec2(uv.x, 1.0 - uv.y)); }',
    'float zVon(float h) { return (h >= 0.0 ? h : -uTief * log(1.0 - h / uTief)) * uSkala; }',
    'vec3 himmel(vec3 d) {',
    '  float t = clamp(d.z * 0.5 + 0.5, 0.0, 1.0);',
    '  vec3 c = mix(vec3(0.62, 0.74, 0.90), vec3(0.16, 0.34, 0.72), pow(t, 0.8));',
    '  float s = max(dot(normalize(d), uSonne), 0.0);',
    '  return c + vec3(1.0, 0.93, 0.82) * (pow(s, 900.0) * 40.0 + pow(s, 24.0) * 0.35);',
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
    fragmentShader: GLSL_GEMEIN + [
      'varying vec2 vUv; varying vec3 vWelt;',
      'void main() {',
      '  vec4 f = farbeBei(vUv);',
      '  if (f.a < 0.2) discard;',
      '  float h = hoeheBei(vUv);',
      '  float eis = clamp((f.a - 0.5) * 2.0, 0.0, 1.0);',
      '  vec3 V = normalize(cameraPosition - vWelt);',
      '  vec3 N = normaleBei(vUv);',
      '  vec3 alb = pow(f.rgb, vec3(2.2));',
      // Gelaende: gebackenes Licht aus Blender (Sonne + Himmel + Schatten + Detail)
      '  float lb = texture2D(uLicht, vUv).r; lb = pow(lb, 2.2) * 2.3;',
      '  vec3 fels = alb * lb * vec3(1.0, 0.97, 0.93);',
      // Eis: live, mit Glanz
      '  float t = clamp(h / 2500.0, 0.0, 1.0);',
      '  vec3 eisF = mix(vec3(0.94, 0.95, 0.95), vec3(0.40, 0.64, 0.92), t);',
      '  float nl = max(dot(N, uSonne), 0.0);',
      '  vec3 R = reflect(-V, N);',
      '  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
      // Streulicht gedaempft (sonst frisst die Tonkurve die Kuppenform), dafuer
      // ein kraeftiger, enger Glanz und die Himmelsspiegelung nach Fresnel.
      '  float amb = 0.30 + 0.12 * N.z;',
      '  vec3 eisC = eisF * (nl * 1.55 * vec3(1.0, 0.96, 0.9) + amb * vec3(0.55, 0.68, 0.95))',
      '            + ggx(N, uSonne, V, 0.11) * vec3(1.0, 0.95, 0.85) * 3.2 + himmel(R) * fr * 0.75;',
      '  vec3 c = mix(fels, eisC, eis);',
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
    fragmentShader: GLSL_GEMEIN + [
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
      '  vec2 q = vUv * vec2(uGroesse.x, uGroesse.y) * 420.0;',
      '  float e = 0.0008;',
      '  float a = welle(q + uZeit * 0.6) + 0.5 * welle(q * 2.3 - uZeit * 0.9);',
      '  float ax = welle(q + vec2(e * 1e3, 0.0) + uZeit * 0.6) + 0.5 * welle((q + vec2(e * 1e3, 0.0)) * 2.3 - uZeit * 0.9);',
      '  float ay = welle(q + vec2(0.0, e * 1e3) + uZeit * 0.6) + 0.5 * welle((q + vec2(0.0, e * 1e3)) * 2.3 - uZeit * 0.9);',
      '  vec3 N = normalize(vec3((a - ax) * 0.10, (a - ay) * 0.10, 1.0));',
      '  vec3 R = reflect(-V, N);',
      '  float fr = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
      '  vec3 flach = vec3(0.10, 0.62, 0.62), tief = vec3(0.01, 0.10, 0.34);',
      '  vec3 wasser = mix(flach, tief, 1.0 - exp(-tiefe / 180.0));',
      '  float nl = max(dot(vec3(0.0, 0.0, 1.0), uSonne), 0.0);',
      '  vec3 c = wasser * (0.35 + 0.9 * nl) + himmel(R) * fr + ggx(N, uSonne, V, 0.06) * vec3(1.0, 0.95, 0.85) * 3.0;',
      '  float deck = 1.0 - exp(-tiefe / 25.0);',
      '  gl_FragColor = vec4(c, clamp(0.55 + 0.45 * deck, 0.0, 1.0));',
      '  #include <tonemapping_fragment>',
      '  #include <colorspace_fragment>',
      '}'].join('\\n'),
  });
  meer.toneMapped = true;
  const meerNetz = new THREE.Mesh(meerGeo, meer);
  meerNetz.position.z = 0.0002;
  szene.add(meerNetz);

  drei = { THREE, r, szene, kam, steuer, leinwand, gemein, hoeheTex: null, farbeTex: null, hBuf: null, fBuf: null, w: 0, h: 0 };
  function groesse() {
    const b = feld.clientWidth || breite, h = feld.clientHeight || hoehe;
    r.setSize(b, h, false); kam.aspect = b / Math.max(1, h); kam.updateProjectionMatrix();
  }
  drei.groesse = groesse;
  groesse();
  r.setAnimationLoop((t) => {
    if (!DREID) return;
    gemein.uZeit.value = t / 1000;
    steuer.update();
    r.render(szene, kam);
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
}

async function dreiSchalten(an) {
  DREID = an;
  const knopf = document.getElementById('dreid');
  if (knopf) knopf.setAttribute('aria-pressed', an ? 'true' : 'false');
  if (an) {
    try { await dreiStarten(); }
    catch (e) { DREID = false; if (knopf) { knopf.setAttribute('aria-pressed', 'false'); knopf.title = 'WebGL not available: ' + e.message; } return; }
    drei.leinwand.style.display = 'block';
    cv.style.visibility = 'hidden';
    drei.groesse();
  } else if (drei) {
    drei.leinwand.style.display = 'none';
    cv.style.visibility = '';
  }
  zeichne();
}
`;
}
