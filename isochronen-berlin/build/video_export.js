/* ============================================================================================================
 * video_export.js – deterministic MP4 export of the isochrone animation (template_v6 page)
 * ------------------------------------------------------------------------------------------------------------
 * USAGE
 *   1. python -I video_server.py            (serves this folder on http://127.0.0.1:8767/, frame sink → ffmpeg)
 *   2. Open the assembled page, ideally via the server (http://127.0.0.1:8767/<page>.html; file:// also works,
 *      the server sends CORS headers). Load this script: append <script src="video_export.js"></script> at the
 *      end of the page, or paste the file into the console (it only defines window.VIDEO, nothing runs).
 *   3. Quick look at single frames (no video):
 *        await VIDEO.preview({T:45})                    // renders T=45 min into the overlay canvas (camera jumped)
 *        await VIDEO.snapshot({T:200,name:'snap200.png'}) // same, saved as PNG into the output folder
 *   4. Short test run:   await VIDEO.start({to:30, name:'test30.mp4'})       // first 30 map-minutes
 *                        await VIDEO.start({maxFrames:300, name:'t300.mp4'}) // or a frame budget
 *                        await VIDEO.start({dryRun:true, maxFrames:300})     // render speed only, no upload
 *   5. Full export:      await VIDEO.start({fps:60, name:'isochronen-hbf-5h.mp4', from:0, to:AX})
 *      VIDEO.stop()   → ends after the current frame and finalises the mp4 with the frames so far
 *      VIDEO.abort()  → ends and deletes the partial mp4
 *      VIDEO.progress → {i, N, T, fps, eta_s, fulls, ...}; also logged every `logEvery` frames + document.title
 *      VIDEO.restore()→ puts the page back (size, panels, tile layers, DPR) – done automatically after start()
 *
 * WHAT IT DOES
 *   - Map container fixed to w×h CSS px (1920×1080), devicePixelRatio overridden to `ss` (1 = output size),
 *     page panels + Leaflet controls hidden, Leaflet tile/label GridLayers removed (drawn here from TILES/LTILES).
 *   - Time: the page's playback rule (dur s per 90 map-min, adaptive speedTarget() smoothed with τ=1.2 s) with a
 *     fixed dt = 1/fps; holdStart s at `from`, holdEnd s at `to`. The whole T schedule is precomputed (→ exact N).
 *   - Camera: same two-stage low-pass as the page's camStep() (τ 1.6/1.0/0.6 s) with dt = 1/fps, target from
 *     layer.extent(T) like camTarget(), but padded for the video HUD instead of the page's DOM panels.
 *   - Streets: page's base canvas (incremental, CSS-transform logic untouched; a pending background rebuild or a
 *     scale outside `sharpK` is replaced by a synchronous layer.full() → deterministic frames) + an overlay of the
 *     next bucket(s) drawn with layer.strokeBucket() at alpha = progress within the 10-s bucket (`fadeW`).
 *   - Composite (page z-order): tiles → fog → base → next-bucket overlay → edge → rail → zones (+labels, pulse and
 *     fade emulated in video time from the page's own class changes) → place-label tiles → home pin → HUD.
 *   - Each frame: canvas.toBlob(JPEG q) → POST /frame?i=n (sequential; encode of n+1 overlaps upload of n).
 * ========================================================================================================== */
(function () {
  'use strict';
  if (window.VIDEO && window.VIDEO.running) { console.warn('[video] export running – not redefined'); return; }

  const DEF = {
    fps: 60, w: 1920, h: 1080, ss: 1,              // ss: render scale (devicePixelRatio during export), >1 = supersampling
    name: 'isochronen-hbf-5h.mp4', from: 0, to: null, maxFrames: Infinity,
    dur: 75, holdStart: 1.5, holdEnd: 3,
    quality: 0.92, format: 'jpeg',                 // 'jpeg' | 'png'
    server: 'http://127.0.0.1:8767', crf: 17, preset: 'slow',
    fadeW: 1,                                      // fade window in buckets: 1 = next bucket only, 2 = also the one after
    sharpK: [0.75, 1.3],                           // base-canvas CSS scale range before a synchronous full() redraw
    railAboveZones: false,                         // page order: rail canvas (overlayPane 400) below zones (440)
    hud: true, title: null, subtitle: null, lang: null,
    pageCamera: true,                              // use ISO.camStep/ISO.camJump (page code); false = built-in copy
    show: true, dryRun: false, logEvery: 120, keep: false, tileCache: 520
  };
  const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  const INK = '#eceae6', MUTED = '#8b9099', LINE = 'rgba(255,255,255,.09)', GLASS = 'rgba(14,16,19,.86)', ACCENT = '#ffb340', BG = '#0b0c0e';
  const VMC = ['#9ea4ad', '#2fb34a', '#2f86e6', '#ef3b3b', '#ff9a1f', '#b061e0', '#27c6d9', '#f2d64b'];
  const STOPS = [[0, [255, 246, 170]], [15, [255, 210, 63]], [30, [255, 150, 40]], [45, [255, 84, 92]], [60, [225, 40, 150]], [75, [150, 70, 230]], [90, [70, 110, 255]]];
  const TXT = {
    de: { loc: 'de-DE', title: 'ÖPNV + Rad · Berlin Hauptbahnhof', time: 'Reisezeit', area: 'Erreichte Fläche',
          leg: 'Straße erreicht per Rad ab …', legT: 'Straßenfarbe: Reisezeit',
          modes: ['Start', 'S-Bahn', 'U-Bahn', 'Tram', 'Regionalbahn', 'Bus', 'Fähre', 'Fernzug'],
          attr: '© OpenStreetMap · OpenFreeMap · VBB · DELFI' },
    en: { loc: 'en-GB', title: 'Transit + bike · Berlin Central Station', time: 'Travel time', area: 'Area reached',
          leg: 'Street reached by bike from …', legT: 'Street colour: travel time',
          modes: ['Start', 'S-Bahn', 'U-Bahn', 'Tram', 'Regional train', 'Bus', 'Ferry', 'Long-distance train'],
          attr: '© OpenStreetMap · OpenFreeMap · VBB · DELFI' }
  };

  // ---------------------------------------------------------------------------------------------------------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const merc = (lon, lat) => { const s = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)]; };
  const unmerc = (x, y) => L.latLng(Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI, x * 360 - 180);
  const hasCls = (s, c) => (' ' + (s || '') + ' ').indexOf(' ' + c + ' ') >= 0;
  const G = name => { try { return (0, eval)(name); } catch (e) { return undefined; } };   // script-scope consts (STREETS, TILES, …)
  function bezier(x1, y1, x2, y2) {                // CSS cubic-bezier timing function
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return p => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      let t = p;
      for (let i = 0; i < 8; i++) { const e = X(t) - p, d = dX(t); if (Math.abs(e) < 1e-6) break; if (Math.abs(d) < 1e-6) break; t -= e / d; }
      if (t < 0 || t > 1 || Math.abs(X(t) - p) > 1e-4) { let a = 0, b = 1; t = p; for (let i = 0; i < 30; i++) { if (X(t) < p) a = t; else b = t; t = (a + b) / 2; } }
      return Y(t);
    };
  }
  const EIO = bezier(.42, 0, .58, 1), EASE = bezier(.25, .1, .25, 1);
  const kf = (list, p) => { for (let i = 1; i < list.length; i++) if (p <= list[i][0]) { const [a, va] = list[i - 1], [b, vb] = list[i]; return va + (vb - va) * EIO((p - a) / (b - a)); } return list[list.length - 1][1]; };

  // ---------------------------------------------------------------------------------------------------------
  const S = { o: null, setup: false, running: false, stopReq: null, saved: null, cv: null, ctx: null };
  const map = () => window.ISO.map, layer = () => window.ISO.layer;
  const lang = () => (S.o && S.o.lang) || (document.documentElement.lang === 'en' ? 'en' : 'de');
  function originData() { const st = G('STREETS'), k = Object.keys(st.origins)[0]; return st.origins[k].modes.biketransit; }
  const STEP = () => G('STREETS').step;
  const AXv = () => Math.round(G('STREETS').origins[Object.keys(G('STREETS').origins)[0]].modes.biketransit.tmax / 60);

  // ---- HUD geometry (also defines the camera padding) -------------------------------------------------------
  // The page's camPadding() reads #info/#timebar rects; during export they become invisible proxies at the HUD's
  // place (#info = HUD panel column, #timebar = 32 px strip at the bottom) → page padding = camPad() below.
  // Querformat: Panel links oben (460 px); Hochformat (h > w): Panel über die ganze Breite oben, Karte darunter
  let PANEL = { x: 32, y: 32, w: 460, pad: 24, hgt: 0, portrait: false }, BOT = 32;
  const camPad = () => PANEL.portrait
    ? ({ paddingTopLeft: [40, PANEL.y + PANEL.hgt + 28], paddingBottomRight: [40, BOT + 150] })
    : ({ paddingTopLeft: [PANEL.x + PANEL.w + 24, 36], paddingBottomRight: [56, BOT + 24] });

  // ---- time: page rule (tick/speedTarget) with fixed dt -----------------------------------------------------
  function zp(t) { const [x0, x1, y0, y1] = layer().extent(t); return -Math.log2(Math.max(x1 - x0, (y1 - y0) * 1.4, 1e-6)); }
  function spdTarget(t) { const d = layer().d; if (d.zRef === undefined) d.zRef = zp(78); return Math.min(4, Math.pow(2, 1.3 * Math.max(0, d.zRef - zp(t)))); }
  function schedule(o) {
    const dt = 1 / o.fps, k = 90 / o.dur, out = [];
    let T = 0, spd = 1;
    while (T < o.from - 1e-12) { spd += (spdTarget(T) - spd) * (1 - Math.exp(-dt / 1.2)); T = Math.min(o.from, T + dt * k * spd); }  // speed state at `from`
    T = o.from;
    const push = v => { if (out.length < o.maxFrames) out.push(v); };
    for (let i = 0; i < Math.round(o.holdStart * o.fps); i++) push(T);
    while (T < o.to - 1e-12 && out.length < o.maxFrames) { spd += (spdTarget(T) - spd) * (1 - Math.exp(-dt / 1.2)); T = Math.min(o.to, T + dt * k * spd); push(T); }
    for (let i = 0; i < Math.round(o.holdEnd * o.fps); i++) push(o.to);
    return Float64Array.from(out);
  }

  // ---- camera: page camTarget/camStep/camMove with video padding and fixed dt ------------------------------
  const CAM = { s: null, f: null };
  function camTarget(T) {
    const m = map(), [x0, x1, y0, y1] = layer().extent(T), pad = Math.max(x1 - x0, y1 - y0) * .04 + 2e-5;
    const b = L.latLngBounds(unmerc(x0 - pad, y1 + pad), unmerc(x1 + pad, y0 - pad));
    const r = m._getBoundsCenterZoom(b, { ...camPad(), maxZoom: 14.25 });
    r.zoom = Math.max(m.getMinZoom(), Math.min(14.25, r.zoom));
    return r;
  }
  function camMove(center, zoom) {
    const m = map(); if (m._animatingZoom) return;
    zoom = m._limitZoom(zoom); center = m._limitCenter(center, zoom, m.options.maxBounds);
    const zc = zoom !== m.getZoom();
    m._stop()._moveStart(zc, false)._move(center, zoom, { pinch: true })._moveEnd(zc);
  }
  function camJump(T) {
    const t = camTarget(T), mm = merc(t.center.lng, t.center.lat);
    CAM.f = { x: mm[0], y: mm[1], z: t.zoom }; CAM.s = null;
    map().setView(t.center, t.zoom, { animate: false });
  }
  function camStep(dt, T) {
    const m = map(), t = camTarget(T), z = m.getZoom(), c = m.getCenter(), cc = merc(c.lng, c.lat), Sc = 256 * Math.pow(2, z);
    let s = CAM.s;
    if (!s || s.z !== z || Math.abs(s.x - cc[0]) * Sc > 1 || Math.abs(s.y - cc[1]) * Sc > 1) s = CAM.s = { x: cc[0], y: cc[1], z };
    const tc = merc(t.center.lng, t.center.lat);
    if (!CAM.f) CAM.f = { x: tc[0], y: tc[1], z: t.zoom };
    const F = CAM.f, f1 = 1 - Math.exp(-dt / 1.6), fz = 1 - Math.exp(-dt / 1.0), a = 1 - Math.exp(-dt / .6);
    F.x += (tc[0] - F.x) * f1; F.y += (tc[1] - F.y) * f1; F.z += (t.zoom - F.z) * fz;
    const nz = z + (F.z - z) * a, nx = s.x + (F.x - s.x) * a, ny = s.y + (F.y - s.y) * a;
    if (Math.abs(nz - z) > 1e-4 || Math.abs(nx - s.x) * Sc > .05 || Math.abs(ny - s.y) * Sc > .05) {
      camMove(unmerc(nx, ny), nz);
      CAM.s = { x: nx, y: ny, z: m.getZoom() };
    }
  }

  // ---- tiles (TILES z8–14 with parent fallback; LTILES z6–14, z11 only in the core area) --------------------
  const TC = { m: new Map(), frame: 0 };
  function tileSrc(kind, z, x, y) {
    const D = kind === 'b' ? G('TILES') : G('LTILES'); if (!D) return null;
    let zz = z, xx = x, yy = y;
    if (kind === 'b') {
      while (zz >= 8) { const k = zz + '/' + xx + '/' + yy; if (k in D) return { D, k, d: z - zz, xx, yy }; xx >>= 1; yy >>= 1; zz--; }
      return null;
    }
    if (zz > 14) { const s = zz - 14; xx >>= s; yy >>= s; zz = 14; }
    if (zz === 11 && !(xx >= 1080 && xx <= 1113 && yy >= 656 && yy <= 687)) { xx >>= 1; yy >>= 1; zz = 10; }
    if (zz < 6) return null;
    const k = zz + '/' + xx + '/' + yy;
    return (k in D) ? { D, k, d: z - zz, xx, yy } : null;
  }
  function tileEntry(kind, z, x, y, res) {
    const ck = kind + z + '/' + x + '/' + y + '@' + res;
    let e = TC.m.get(ck);
    if (e) { TC.m.delete(ck); TC.m.set(ck, e); e.f = TC.frame; return e; }
    const src = tileSrc(kind, z, x, y);
    e = { f: TC.frame, bmp: null, none: !src, p: null };
    TC.m.set(ck, e);
    if (src) e.p = (async () => {
      const blob = await (await fetch('data:image/webp;base64,' + src.D[src.k])).blob();
      const full = await createImageBitmap(blob);
      const n = 1 << src.d, sz = full.width / n, sx = (x - (src.xx << src.d)) * sz, sy = (y - (src.yy << src.d)) * sz;
      if (src.d === 0 && full.width === res) { e.bmp = full; return; }
      e.bmp = await createImageBitmap(full, sx, sy, sz, sz, { resizeWidth: res, resizeHeight: res, resizeQuality: 'high' });
      full.close();
    })().catch(err => { e.none = true; console.warn('[video] tile', ck, err); });
    return e;
  }
  function tileJobs(kind, v, ss) {
    const Z = v.z, zr = Math.round(Z);
    if (kind === 'l' && zr < 6) return [];
    const zt = kind === 'b' ? clamp(zr, 8, 14) : clamp(zr, 6, 14), ts = 256 * Math.pow(2, Z - zt), n = 1 << zt;
    const dev = ts * ss, res = dev >= 170 ? 512 : clamp(Math.pow(2, Math.ceil(Math.log2(dev))), 64, 512);
    const W = v.size.x, H = v.size.y, out = [];
    const x0 = Math.floor(v.ox / ts), x1 = Math.floor((v.ox + W - 1e-6) / ts), y0 = Math.max(0, Math.floor(v.oy / ts)), y1 = Math.min(n - 1, Math.floor((v.oy + H - 1e-6) / ts));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || tx >= n) continue;
      const X0 = Math.round((tx * ts - v.ox) * ss), X1 = Math.round(((tx + 1) * ts - v.ox) * ss), Y0 = Math.round((ty * ts - v.oy) * ss), Y1 = Math.round(((ty + 1) * ts - v.oy) * ss);
      out.push({ e: tileEntry(kind, zt, tx, ty, res), X0, Y0, w: X1 - X0, h: Y1 - Y0 });
    }
    return out;
  }
  function drawTiles(ctx, jobs) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    for (const j of jobs) if (j.e.bmp) ctx.drawImage(j.e.bmp, j.X0, j.Y0, j.w, j.h);
    ctx.restore();
  }
  function tileEvict(max) {
    if (TC.m.size <= max) return;
    for (const [k, e] of TC.m) {
      if (TC.m.size <= max) break;
      if (e.f >= TC.frame || (!e.bmp && !e.none)) continue;     // in use this frame or still decoding
      if (e.bmp) e.bmp.close();
      TC.m.delete(k);
    }
  }

  // ---- zones: geometry/styles from the page's Leaflet layers, state from their class changes ----------------
  const ZN = { paths: [], labs: [], st: new Map(), obs: null, t: 0 };
  function zoneState(el) { const on = !hasCls(el.getAttribute('class'), 'zone-off'); return { on, from: on ? 1 : 0, to: on ? 1 : 0, t0: -1e9, pulse: -1e9 }; }
  const zOpacity = (st, t) => st.t0 < -1e8 ? st.to : st.from + (st.to - st.from) * EASE(clamp((t - st.t0) / 1.6, 0, 1));
  function zonesProcess(recs, t) {
    const by = new Map();
    for (const r of recs) { if (!by.has(r.target)) by.set(r.target, []); by.get(r.target).push(r.oldValue || ''); }
    for (const [el, olds] of by) {
      const st = ZN.st.get(el); if (!st) continue;
      const cur = el.getAttribute('class') || '', vals = olds.slice(1).concat([cur]);
      for (let i = 0; i < olds.length; i++) if (hasCls(vals[i], 'pulse') && !hasCls(olds[i], 'pulse')) st.pulse = t;
      const on = !hasCls(cur, 'zone-off');
      if (on !== st.on) { st.from = zOpacity(st, t); st.to = on ? 1 : 0; st.t0 = t; st.on = on; }
    }
  }
  function zonesDiscover() {
    ZN.paths = []; ZN.labs = []; ZN.st = new Map();
    if (ZN.obs) ZN.obs.disconnect();
    ZN.obs = new MutationObserver(recs => zonesProcess(recs, ZN.t));
    const m = map(), paths = [], labs = [];
    m.eachLayer(l => {
      const cn = (l.options && l.options.className) || '';
      if (l instanceof L.Polyline && /\bzone-(path|cas)\b/.test(cn) && l._path) paths.push(l);
      else if (l instanceof L.Marker && l.options.pane === 'zones' && l._icon) labs.push(l);
    });
    paths.sort((a, b) => L.stamp(a) - L.stamp(b)); labs.sort((a, b) => L.stamp(a) - L.stamp(b));
    for (const l of paths) {
      const rings = [], closed = l instanceof L.Polygon;
      const walk = a => { if (!a.length) return; if (a[0] instanceof L.LatLng) { const xy = new Float64Array(a.length * 2); let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
          a.forEach((p, i) => { const q = merc(p.lng, p.lat); xy[2 * i] = q[0]; xy[2 * i + 1] = q[1]; x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
          rings.push({ xy, bb: [x0, x1, y0, y1] }); } else a.forEach(walk); };
      walk(l.getLatLngs());
      const o = l.options, el = l._path;
      ZN.paths.push({ el, rings, closed, cas: /\bzone-cas\b/.test(o.className), color: o.color, weight: o.weight, opacity: o.opacity,
        dash: o.dashArray ? String(o.dashArray).split(/[\s,]+/).map(Number).filter(v => v >= 0) : [], cap: o.lineCap || 'round', join: o.lineJoin || 'round' });
      ZN.st.set(el, zoneState(el)); ZN.obs.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
    for (const l of labs) {
      const el = l._icon, span = el.querySelector('span') || el, cs = getComputedStyle(span), ia = l.options.icon.options.iconAnchor || [0, 0];
      const sh = cs.textShadow && cs.textShadow !== 'none' ? cs.textShadow : '';
      const shc = (sh.match(/^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)/i) || [])[1] || 'transparent', shn = (sh.replace(/^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)/i, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
      const fs = parseFloat(cs.fontSize) || 13.5, hgt = span.offsetHeight || fs * 1.45;
      ZN.labs.push({ el, span, ll: l.getLatLng(), ax: Array.isArray(ia) ? ia[0] : ia.x, ay: Array.isArray(ia) ? ia[1] : ia.y,
        top: span.offsetHeight ? span.offsetTop : 0, h: hgt, upper: cs.textTransform === 'uppercase',
        font: cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, ls: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
        color: cs.color, sw: parseFloat(cs.webkitTextStrokeWidth) || 0, sc: cs.webkitTextStrokeColor || 'rgba(5,6,8,.92)',
        shc, shx: shn[0] || 0, shy: shn[1] || 0, shb: shn[2] || 0 });
      ZN.st.set(el, zoneState(el)); ZN.obs.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
  }
  const PULSE = {
    path: o => [[[0, .6], [.08, 1], [.6, 1], [1, o.opacity]], [[0, o.weight], [.08, 5], [.6, 4.5], [1, o.weight]]],
    cas: o => [[[0, o.opacity], [.08, .75], [.6, .7], [1, o.opacity]], [[0, o.weight], [.08, 9], [.6, 8.5], [1, o.weight]]]
  };
  function drawZonePaths(ctx, v, t) {
    const Sv = v.S, ox = v.ox, oy = v.oy, mx = 40 / Sv, vx0 = ox / Sv - mx, vx1 = (ox + v.size.x) / Sv + mx, vy0 = oy / Sv - mx, vy1 = (oy + v.size.y) / Sv + mx;
    for (const P of ZN.paths) {
      const st = ZN.st.get(P.el), op = zOpacity(st, t); if (op < .003) continue;
      let sop = P.opacity, sw = P.weight; const p = (t - st.pulse) / 6;
      if (p >= 0 && p < 1) { const [ko, kw] = PULSE[P.cas ? 'cas' : 'path'](P); sop = kf(ko, p); sw = kf(kw, p); }
      const path = new Path2D(); let any = false;
      for (const r of P.rings) {
        const b = r.bb; if (b[1] < vx0 || b[0] > vx1 || b[3] < vy0 || b[2] > vy1) continue;
        const xy = r.xy; let lx = 0, ly = 0;
        for (let i = 0; i < xy.length; i += 2) {
          const X = xy[i] * Sv - ox, Y = xy[i + 1] * Sv - oy;
          if (i === 0) { path.moveTo(X, Y); lx = X; ly = Y; } else if ((X - lx) * (X - lx) + (Y - ly) * (Y - ly) > .36 || i === xy.length - 2) { path.lineTo(X, Y); lx = X; ly = Y; }
        }
        if (P.closed) path.closePath(); any = true;
      }
      if (!any) continue;
      ctx.globalAlpha = op * sop; ctx.strokeStyle = P.color; ctx.lineWidth = sw; ctx.setLineDash(P.dash); ctx.lineCap = P.cap; ctx.lineJoin = P.join;
      ctx.stroke(path);
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  function drawZoneLabels(ctx, v, t, ss) {
    for (const Lb of ZN.labs) {
      const st = ZN.st.get(Lb.el), op = zOpacity(st, t); if (op < .003) continue;
      let sop = .85, sc = 1; const p = (t - st.pulse) / 6;
      if (p >= 0 && p < 1) { sop = kf([[0, .85], [.08, 1], [.6, 1], [1, .85]], p); sc = kf([[0, 1], [.08, 1.7], [.6, 1.6], [1, 1]], p); }
      const q = merc(Lb.ll.lng, Lb.ll.lat), X = q[0] * v.S - v.ox - Lb.ax, top = q[1] * v.S - v.oy - Lb.ay + Lb.top, bot = top + Lb.h, mid = top + Lb.h / 2;
      if (X < -400 || X > v.size.x + 400 || mid < -100 || mid > v.size.y + 100) continue;
      let txt = Lb.span.textContent || ''; if (Lb.upper) txt = txt.toUpperCase();
      ctx.save();
      ctx.translate(X, bot); ctx.scale(sc, sc); ctx.translate(-X, -bot);
      ctx.globalAlpha = op * sop; ctx.font = Lb.font; ctx.letterSpacing = Lb.ls; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (Lb.sw > 0) {
        ctx.shadowColor = Lb.shc; ctx.shadowBlur = Lb.shb * ss * sc; ctx.shadowOffsetX = Lb.shx * ss * sc; ctx.shadowOffsetY = Lb.shy * ss * sc;
        ctx.lineWidth = Lb.sw; ctx.strokeStyle = Lb.sc; ctx.lineJoin = 'round'; ctx.strokeText(txt, X, mid);
        ctx.shadowColor = 'transparent';
      }
      ctx.fillStyle = Lb.color; ctx.fillText(txt, X, mid);
      ctx.restore();
    }
  }

  // ---- home pin --------------------------------------------------------------------------------------------
  let PIN = null;
  function findPin() {
    PIN = null;
    map().eachLayer(l => { if (l instanceof L.Marker && l.options.icon && /start-pin/.test(l.options.icon.options.html || '')) PIN = l.getLatLng(); });
    if (!PIN) { const o = originData(); if (o && o.origin) PIN = L.latLng(o.origin[0], o.origin[1]); }
  }
  function drawPin(ctx, v) {
    if (!PIN) return;
    const q = merc(PIN.lng, PIN.lat), X = q[0] * v.S - v.ox, Y = q[1] * v.S - v.oy;
    ctx.beginPath(); ctx.arc(X, Y, 7.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fillStyle = BG; ctx.fill();
    ctx.beginPath(); ctx.arc(X, Y, 3.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
  }

  // ---- HUD ---------------------------------------------------------------------------------------------------
  const tabW = {};
  function digitW(ctx) { const f = ctx.font; if (!tabW[f]) { let m = 0; for (let d = 0; d < 10; d++) m = Math.max(m, ctx.measureText(String(d)).width); tabW[f] = m; } return tabW[f]; }
  function drawTab(ctx, s, x, y, draw = true) {       // tabular figures (canvas has no font-variant-numeric)
    const dw = digitW(ctx); let w = 0;
    for (const ch of s) { const isD = ch >= '0' && ch <= '9', cw = isD ? dw : ctx.measureText(ch).width;
      if (draw) { ctx.textAlign = isD ? 'center' : 'left'; ctx.fillText(ch, isD ? x + w + dw / 2 : x + w, y); } w += cw; }
    ctx.textAlign = 'left'; return w;
  }
  function wrap(ctx, text, maxW) {
    const out = []; let line = '';
    for (const wd of String(text || '').split(/\s+/).filter(Boolean)) { const t = line ? line + ' ' + wd : wd; if (line && ctx.measureText(t).width > maxW) { out.push(line); line = wd; } else line = t; }
    if (line) out.push(line); return out;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function glass(ctx, x, y, w, h, r, ss) {
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
    ctx.filter = 'blur(' + (10 * ss).toFixed(1) + 'px)';                // backdrop-filter: blur(10px)
    const m = 24; ctx.drawImage(S.cv, (x - m) * ss, (y - m) * ss, (w + 2 * m) * ss, (h + 2 * m) * ss, x - m, y - m, w + 2 * m, h + 2 * m);
    ctx.restore();
    rr(ctx, x, y, w, h, r); ctx.fillStyle = GLASS; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = LINE; rr(ctx, x + .5, y + .5, w - 1, h - 1, r); ctx.stroke();
  }
  let usedModes = null;
  function modesUsed() {
    if (usedModes) return usedModes;
    const d = layer().d, NM = 8, u = [0];
    for (let m = 1; m < NM; m++) for (let b = 1; b <= d.nb; b++) if (d.len[b * NM + m] > 0) { u.push(m); break; }
    return (usedModes = u);
  }
  const rgbAt = t => { for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], f = (t - a) / (b - a); return ca.map((c, k) => Math.round(c + (cb[k] - c) * f)); } return STOPS[STOPS.length - 1][1]; };
  function panelBody(ctx, x0, y0, iw, T, draw) {
    const X = TXT[lang()], AX = AXv(), o = S.o;
    let y = y0;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
    ctx.font = '600 27px ' + FONT; ctx.letterSpacing = '-0.2px';
    if (draw) { ctx.fillStyle = INK; ctx.fillText(o.title || X.title, x0, y + 25); }
    y += 36; ctx.letterSpacing = '0px';
    ctx.font = '400 16px ' + FONT;
    const subtxt = o.subtitle != null ? o.subtitle : ((document.getElementById('subtitle') || {}).textContent || '');
    for (const ln of wrap(ctx, subtxt, iw)) { if (draw) { ctx.fillStyle = MUTED; ctx.fillText(ln, x0, y + 15); } y += 22; }
    y += 12; if (draw) { ctx.fillStyle = LINE; ctx.fillRect(x0, y, iw, 1); } y += 20;
    // Reisezeit + Fläche
    const c2 = x0 + Math.round(iw * .5);
    ctx.font = '500 14px ' + FONT;
    if (draw) { ctx.fillStyle = MUTED; ctx.fillText(X.time, x0, y + 12); ctx.fillText(X.area, c2, y + 12); }
    y += 18;
    const base = y + 58;
    if (draw) {
      const mins = Math.floor(T + 1e-9), ts = Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0');
      ctx.font = '600 66px ' + FONT; ctx.fillStyle = INK; const w1 = drawTab(ctx, ts, x0 - 2, base);
      ctx.font = '500 22px ' + FONT; ctx.fillStyle = MUTED; ctx.fillText('h', x0 + w1 + 6, base);
      const area = originData().area, d = layer().d, u = T * 60 / STEP(), k = clamp(Math.floor(u + 1e-9), 0, d.nb), f = clamp(u - k, 0, 1);
      const a0 = k > 0 ? area[Math.min(k, d.nb) - 1] : 0, a1 = k < d.nb ? area[k] : a0, a = a0 + (a1 - a0) * f;
      const as = a.toLocaleString(X.loc, { maximumFractionDigits: a < 10 ? 1 : 0, minimumFractionDigits: a < 10 ? 1 : 0 });
      ctx.font = '600 40px ' + FONT; ctx.fillStyle = INK; const w2 = drawTab(ctx, as, c2, base);
      ctx.font = '500 18px ' + FONT; ctx.fillStyle = MUTED; ctx.fillText('km²', c2 + w2 + 7, base);
    }
    y = base + 20;
    // Fortschritt 0 … AX
    if (draw) {
      rr(ctx, x0, y, iw, 6, 3); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
      const fw = iw * clamp(T / AX, 0, 1); if (fw > .5) { rr(ctx, x0, y, Math.max(6, fw), 6, 3); ctx.fillStyle = ACCENT; ctx.fill(); }
      ctx.font = '500 12px ' + FONT; ctx.fillStyle = MUTED; const st = AX <= 180 ? 30 : 60;
      for (let m = 0; m <= AX; m += st) { const tx = x0 + iw * m / AX; ctx.textAlign = m === 0 ? 'left' : (m >= AX ? 'right' : 'center'); ctx.fillText(m === 0 ? '0' : (m % 60 === 0 ? m / 60 + ' h' : String(m)), tx, y + 24); }
      ctx.textAlign = 'left';
    }
    y += 34; if (draw) { ctx.fillStyle = LINE; ctx.fillRect(x0, y, iw, 1); } y += 18;
    // Legende
    const byTime = (document.querySelector('[data-c="time"]') || { getAttribute: () => null }).getAttribute('aria-pressed') === 'true';
    ctx.font = '500 14px ' + FONT;
    if (draw) { ctx.fillStyle = MUTED; ctx.fillText(byTime ? X.legT : X.leg, x0, y + 12); }
    y += 22;
    if (byTime) {
      if (draw) {
        const g = ctx.createLinearGradient(x0, 0, x0 + iw, 0); for (const [s, c] of STOPS) g.addColorStop(s / 90, 'rgb(' + c.join(',') + ')');
        rr(ctx, x0, y + 4, iw, 7, 3.5); ctx.fillStyle = g; ctx.fill();
        ctx.font = '500 12px ' + FONT; ctx.fillStyle = MUTED;
        for (let m = 0; m <= AX; m += 60) { ctx.textAlign = m === 0 ? 'left' : (m >= AX ? 'right' : 'center'); ctx.fillText(m === 0 ? '0' : m / 60 + ' h', x0 + iw * m / AX, y + 28); }
        ctx.textAlign = 'left';
      }
      y += 34;
    } else {
      const ms = modesUsed(), nc = PANEL.portrait ? 3 : 2, cw = iw / nc;
      ms.forEach((m, i) => {
        const cx = x0 + (i % nc) * cw, cy = y + Math.floor(i / nc) * 25;
        if (draw) { rr(ctx, cx, cy + 7, 20, 6, 3); ctx.fillStyle = VMC[m]; ctx.fill(); ctx.font = '400 15px ' + FONT; ctx.fillStyle = '#c9ccd2'; ctx.fillText(X.modes[m], cx + 30, cy + 15); }
      });
      y += Math.ceil(ms.length / nc) * 25;
    }
    return y;
  }
  function drawHUD(ctx, T, v, ss) {
    const P = PANEL, iw = P.w - 2 * P.pad;
    const hgt = panelBody(ctx, P.x + P.pad, P.y + P.pad, iw, T, false) - P.y + P.pad - 6;
    glass(ctx, P.x, P.y, P.w, hgt, 16, ss);
    panelBody(ctx, P.x + P.pad, P.y + P.pad, iw, T, true);
    // Maßstab (wie ScaleBar.update, bis 240 px)
    const W = v.size.x, H = v.size.y, lat = map().getCenter().lat, mpp = 40075016.686 * Math.cos(lat * Math.PI / 180) / v.S, max = mpp * 340;
    const p10 = Math.pow(10, Math.floor(Math.log10(max))), f = max / p10, dist = (f >= 5 ? 5 : f >= 2 ? 2 : 1) * p10, bw = dist / mpp;
    const sw = Math.max(190, bw + 44), sh = 82, sx = P.x, sy = H - 32 - sh;
    glass(ctx, sx, sy, sw, sh, 13, ss);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    ctx.font = '500 17px ' + FONT; ctx.fillStyle = MUTED; ctx.fillText('0', sx + 22, sy + 36);
    ctx.font = '700 28px ' + FONT; ctx.fillStyle = INK; ctx.textAlign = 'right';
    ctx.fillText(dist >= 1000 ? (dist / 1000).toLocaleString(TXT[lang()].loc) + ' km' : dist + ' m', sx + sw - 22, sy + 38); ctx.textAlign = 'left';
    const bx = sx + 22, by = sy + 52, bh = 13;
    ctx.fillStyle = INK; for (let i = 0; i < 4; i += 2) ctx.fillRect(bx + bw * i / 4, by, bw / 4, bh);
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(bx, by, bw, bh);
    // Attribution
    ctx.font = '400 12.5px ' + FONT; const at = TXT[lang()].attr, aw = ctx.measureText(at).width;
    ctx.fillStyle = 'rgba(11,12,14,.7)'; ctx.fillRect(W - aw - 20, H - 24, aw + 20, 24);
    ctx.fillStyle = '#8f959e'; ctx.fillText(at, W - aw - 10, H - 7.5);
  }

  // ---- export mode (resize, DPR, hide UI) ------------------------------------------------------------------
  async function waitFor(fn, ms) { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) throw new Error('[video] page not ready (window.ISO.layer)'); await sleep(100); } }
  async function setup(o) {
    if (S.setup) { S.o = o; return; }
    await waitFor(() => window.ISO && window.ISO.layer && window.ISO.map && window.ISO.map._loaded, 30000);
    while (performance.now() < 1500) await sleep(50);              // page autostarts playback after 700 ms
    const ISO = window.ISO, m = ISO.map;
    ISO.setPlaying(false);
    if (ISO.setAuto) ISO.setAuto(false); else m.fire('movestart');  // page handler turns the follow camera off
    if (o.lang && ISO.setLang && o.lang !== document.documentElement.lang) ISO.setLang(o.lang);
    const el = m.getContainer(), sv = S.saved = { css: el.style.cssText, hidden: [], grid: [], dpr: Object.getOwnPropertyDescriptor(window, 'devicePixelRatio'), T: ISO.T };
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => o.ss });
    for (const q of ['#info', '#timebar', '.leaflet-control-container']) document.querySelectorAll(q).forEach(e => { sv.hidden.push([e, e.style.cssText]); });
    document.querySelectorAll('.leaflet-control-container').forEach(e => { e.style.display = 'none'; });
    const info = document.getElementById('info'), tb = document.getElementById('timebar');
    if (o.h > o.w) {                                   // Hochformat
      S.o = o;
      PANEL = { x: 28, y: 28, w: o.w - 56, pad: 28, hgt: 0, portrait: true };
      const mc = document.createElement('canvas').getContext('2d');
      PANEL.hgt = panelBody(mc, PANEL.x + PANEL.pad, PANEL.y + PANEL.pad, PANEL.w - 2 * PANEL.pad, 0, false) - PANEL.y + PANEL.pad - 6;
    } else PANEL = { x: 32, y: 32, w: 460, pad: 24, hgt: 0, portrait: false };
    if (info) Object.assign(info.style, { visibility: 'hidden', left: PANEL.x + 'px', top: PANEL.y + 'px', right: 'auto', width: PANEL.w + 'px', maxWidth: 'none' },
                            PANEL.portrait ? { height: PANEL.hgt + 'px', maxHeight: 'none', overflow: 'hidden' } : {});
    if (tb) Object.assign(tb.style, { visibility: 'hidden', top: (o.h - BOT) + 'px', bottom: 'auto', height: BOT + 'px', overflow: 'hidden' });
    m.eachLayer(l => { if (l instanceof L.GridLayer) sv.grid.push(l); });
    sv.grid.forEach(l => m.removeLayer(l));
    Object.assign(el.style, { position: 'absolute', left: '0px', top: '0px', right: 'auto', bottom: 'auto', width: o.w + 'px', height: o.h + 'px' });
    m.invalidateSize({ animate: false, pan: false });
    layer().full();
    S.pageCam = o.pageCamera !== false && typeof ISO.camStep === 'function' && typeof ISO.camJump === 'function';
    if (!S.pageCam) console.warn('[video] ISO.camStep/camJump missing – using the built-in copy of the camera code');
    findPin(); zonesDiscover(); usedModes = null;
    S.cv = document.createElement('canvas'); S.cv.width = Math.round(o.w * o.ss); S.cv.height = Math.round(o.h * o.ss);
    S.ctx = S.cv.getContext('2d', { alpha: false });
    S.cv.style.cssText = 'position:fixed;left:0;top:0;width:min(100vw,calc(100vh*' + (o.w / o.h).toFixed(5) + '));height:auto;z-index:100000;pointer-events:none;background:#000;box-shadow:0 0 0 1px #333';
    if (o.show) document.body.appendChild(S.cv);
    // Gegenprobe: eigene Tempo-Regel = Seitenregel?
    try { if (ISO.speedTarget) { const a = ISO.speedTarget(), b = spdTarget(ISO.T); if (Math.abs(a - b) > 1e-9) console.warn('[video] speedTarget differs from page:', a, b); } } catch (e) { /* ignore */ }
    S.setup = true;
  }
  function restore() {
    if (!S.setup) return;
    const m = map(), sv = S.saved;
    if (ZN.obs) ZN.obs.disconnect();
    if (sv.dpr) Object.defineProperty(window, 'devicePixelRatio', sv.dpr); else delete window.devicePixelRatio;
    m.getContainer().style.cssText = sv.css;
    for (const [e, css] of sv.hidden) e.style.cssText = css;
    sv.grid.forEach(l => l.addTo(m));
    m.invalidateSize({ animate: false, pan: false });
    layer().full();
    if (S.cv && S.cv.parentNode) S.cv.remove();
    for (const e of TC.m.values()) if (e.bmp) e.bmp.close();
    TC.m.clear();
    S.setup = false;
    console.log('[video] page restored (follow camera stays off – click "Kamera folgt" to re-enable)');
  }

  // ---- one frame ---------------------------------------------------------------------------------------------
  function ensureSharp(o) {
    const ly = layer(), v = ly.view(), k = v.S / ly.bS, s = v.size;
    const cover = ly.box * k - v.ox <= 1 && ly.boy * k - v.oy <= 1 && (ly.box + ly.bW) * k - v.ox >= s.x - 1 && (ly.boy + ly.bH) * k - v.oy >= s.y - 1;
    if (ly.pend || !cover || k < o.sharpK[0] || k > o.sharpK[1]) { ly.full(); return 1; }
    return 0;
  }
  async function renderFrame(T, t, dt, o, jump) {
    const ly = layer(), ISO = window.ISO;
    ZN.t = t;
    ly.T = T;                                       // redraws triggered by camera events already use the new T (rail drawn once)
    if (S.pageCam) {
      // page camera code. Order as in the page's tick() except that camStep's target still sees the previous
      // frame's T (1/fps lag, invisible behind τ ≥ 0.6 s); saves a second rail redraw per frame.
      if (jump) { ISO.T = T; ISO.camJump(); } else ISO.camStep(dt);
      ISO.T = T;                                    // page renderAll(): zones, base (incremental), rail
    } else {
      if (jump) camJump(T); else camStep(dt, T);
      ISO.T = T;
    }
    const mp = map(); if (!mp._animatingZoom) mp._moveEnd(true);   // settle Leaflet (SVG, markers, zoneCheck) every frame
    clearTimeout(ly._t);                            // no asynchronous settle()-full() between frames
    const fulls = ensureSharp(o);
    if (ZN.obs) zonesProcess(ZN.obs.takeRecords(), t);
    const v = ly.view(), ss = o.ss;
    TC.frame++;
    const jb = tileJobs('b', v, ss), jl = tileJobs('l', v, ss);
    const pend = []; for (const j of jb.concat(jl)) if (!j.e.bmp && !j.e.none && j.e.p) pend.push(j.e.p);
    if (pend.length) await Promise.all(pend);
    // --- composite
    const ctx = S.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = BG; ctx.fillRect(0, 0, S.cv.width, S.cv.height);
    drawTiles(ctx, jb);
    ctx.setTransform(ss, 0, 0, ss, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const k = v.S / ly.bS, dx = ly.box * k - v.ox, dy = ly.boy * k - v.oy, bw = ly.bW * k, bh = ly.bH * k;
    ctx.drawImage(ly.fog, dx, dy, bw, bh);
    ctx.drawImage(ly.base, dx, dy, bw, bh);
    // nächster 10-s-Takt (und ggf. der danach) weich einblenden – gleiche Daten/Farben/Ebenen/Ausschnitt wie das Basis-Canvas
    const u = T * 60 / STEP(), kb = ly.drawn, W = Math.max(1e-6, o.fadeW);
    ctx.save(); ctx.setTransform(ss * k, 0, 0, ss * k, ss * dx, ss * dy); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let b = kb + 1; b <= Math.min(ly.d.nb, kb + Math.ceil(W)); b++) { const a = clamp(1 - (b - u) / W, 0, 1); if (a < .003) continue; ctx.globalAlpha = a; ly.strokeBucket(ctx, b); }
    ctx.restore();
    if (ly.edge) ctx.drawImage(ly.edge, dx, dy, bw, bh);
    if (!o.railAboveZones) ctx.drawImage(ly.rail, 0, 0, v.size.x, v.size.y);
    drawZonePaths(ctx, v, t);
    drawZoneLabels(ctx, v, t, ss);
    if (o.railAboveZones) ctx.drawImage(ly.rail, 0, 0, v.size.x, v.size.y);
    drawTiles(ctx, jl);
    drawPin(ctx, v);
    if (o.hud) drawHUD(ctx, T, v, ss);
    tileEvict(o.tileCache);
    return fulls;
  }

  // ---- networking ----------------------------------------------------------------------------------------------
  async function post(o, path, body, ctype) {
    let last;
    for (let a = 0; a < 4; a++) {
      try {
        const r = await fetch(o.server + path, { method: 'POST', body: body || '', headers: ctype ? { 'Content-Type': ctype } : {} });
        const j = await r.json().catch(() => ({}));
        if (r.ok) return j;
        const e = new Error(path.split('?')[0] + ' → HTTP ' + r.status + ' ' + (j.error || '')); e.status = r.status; e.j = j;
        if (r.status < 500 || r.status === 507) throw e;
        last = e;
      } catch (e) { if (e.status && (e.status < 500 || e.status === 507)) throw e; last = e; }
      await sleep(400 * (a + 1));
    }
    throw last;
  }
  const toBlob = (cv, type, q) => new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), type, q));
  const fmtT = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---- public API --------------------------------------------------------------------------------------------------
  function opts(user) {
    const o = Object.assign({}, DEF, user || {});
    if (o.to == null) o.to = AXv();
    o.to = Math.min(o.to, AXv()); o.from = clamp(o.from, 0, o.to);
    if (o.format === 'png') o.quality = undefined;
    return o;
  }
  async function start(user) {
    if (S.running) throw new Error('[video] already running');
    const o = opts(user);
    S.running = true; S.stopReq = null; VIDEO.running = true;
    const docTitle = document.title, P = VIDEO.progress = { i: 0, N: 0, T: o.from, fps: 0, eta_s: 0, fulls: 0, name: o.name, done: false };
    let result = null;
    try {
      await setup(o); S.o = o;
      const sched = schedule(o), N = P.N = sched.length, dt = 1 / o.fps;
      console.log(`[video] ${N} frames = ${(N / o.fps).toFixed(1)} s video, T ${o.from}→${o.to} min, ${o.w}×${o.h}@${o.fps}${o.dryRun ? ' (dry run)' : ''}`);
      const mime = o.format === 'png' ? 'image/png' : 'image/jpeg';
      if (!o.dryRun) await post(o, `/start?w=${o.w}&h=${o.h}&fps=${o.fps}&name=${encodeURIComponent(o.name)}&fmt=${o.format === 'png' ? 'png' : 'jpeg'}&crf=${o.crf}&preset=${o.preset}`);
      CAM.s = CAM.f = null;
      const t0 = performance.now(); let prev = Promise.resolve(), inflight = [];
      for (let i = 0; i < N; i++) {
        if (S.stopReq) break;
        P.fulls += await renderFrame(sched[i], i / o.fps, dt, o, i === 0);
        const blobP = toBlob(S.cv, mime, o.quality);      // bitmap is copied now; encoding runs while the next frame renders
        const idx = i, before = prev;
        const up = (async () => { const b = await blobP; await before; if (!o.dryRun) await post(o, '/frame?i=' + idx, b, mime); P.bytes = (P.bytes || 0) + b.size; })();
        prev = up; inflight.push(up);
        if (inflight.length > 2) await inflight.shift();
        P.i = i + 1; P.T = sched[i];
        const el = (performance.now() - t0) / 1000; P.fps = P.i / el; P.eta_s = (N - P.i) / P.fps;
        if (P.i % o.logEvery === 0 || P.i === N) {
          console.log(`[video] ${P.i}/${N}  T=${sched[i].toFixed(2)}  ${P.fps.toFixed(1)} fps  ETA ${fmtT(P.eta_s)}  full redraws ${P.fulls}  ${(P.bytes / 1e6 || 0).toFixed(0)} MB`);
          document.title = `● ${Math.round(P.i / N * 100)}% ${P.i}/${N} · ETA ${fmtT(P.eta_s)}`;
        }
      }
      await Promise.all(inflight);
      if (S.stopReq === 'abort') { if (!o.dryRun) result = await post(o, '/abort'); console.warn('[video] aborted', result); }
      else if (!o.dryRun) { result = await post(o, '/finish'); console.log(`[video] done: ${result.path}  ${(result.size / 1e6).toFixed(1)} MB, ${result.frames} frames, ffmpeg code ${result.code}`); if (result.code !== 0) console.warn(result.log); }
      else result = { dryRun: true, frames: P.i, fps: P.fps };
      P.done = true; P.result = result;
      return result;
    } catch (e) {
      console.error('[video] export failed:', e);
      if (!o.dryRun) { try { const r = await post(o, '/finish'); console.warn('[video] partial video kept:', r.path, r.frames, 'frames'); P.result = r; } catch (e2) { /* nothing running */ } }
      throw e;
    } finally {
      S.running = false; VIDEO.running = false; document.title = docTitle;
      if (!o.keep) restore();
    }
  }
  async function still(user, upload) {
    if (S.running) throw new Error('[video] export running');
    const o = opts(Object.assign({ show: true }, user));
    await setup(o); S.o = o;
    const T = clamp(o.T != null ? o.T : window.ISO.T, 0, AXv());
    CAM.s = CAM.f = null;
    await renderFrame(T, 0, 1 / o.fps, o, true);
    await renderFrame(T, 0, 1 / o.fps, o, false);     // second pass: base canvas/tiles settled at the final view
    if (o.show && !S.cv.parentNode) document.body.appendChild(S.cv);
    if (!upload) return S.cv;
    const png = !/\.jpe?g$/i.test(o.name || ''), b = await toBlob(S.cv, png ? 'image/png' : 'image/jpeg', png ? undefined : o.quality);
    return post(o, '/snapshot?name=' + encodeURIComponent(o.name || ('snap_T' + Math.round(T) + '.png')), b, png ? 'image/png' : 'image/jpeg');
  }

  const VIDEO = window.VIDEO = {
    defaults: DEF, running: false, progress: null,
    start,
    stop() { if (S.running) S.stopReq = 'stop'; },
    abort() { if (S.running) S.stopReq = 'abort'; },
    preview: user => still(Object.assign({ keep: true }, user), false),
    snapshot: user => still(Object.assign({ name: null }, user), true),
    restore,
    show(on) { if (!S.cv) return; if (on) document.body.appendChild(S.cv); else S.cv.remove(); },
    get canvas() { return S.cv; },
    _internals: { schedule: u => schedule(opts(u)), camTarget, spdTarget, tileSrc, ZN, TC }
  };
  console.log('[video] ready – VIDEO.preview({T:45}), VIDEO.snapshot({T:200,name:"s.png"}), VIDEO.start({to:30,name:"test.mp4"})');
})();
