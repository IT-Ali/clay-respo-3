// shared/clay.js: the Soft Clay kit (rebuilt exactly from the reference style source: claySurface(), clay(), lumpy())
// and the shape helpers every model in this series is built from.
// Classic script. Needs the globals THREE and K (lib/stage.js). Defines window.CLAY.
// Units: 1 world unit = 10 cm (a decimetre), so a finger nail is about 0.12 units and the bed about 20 units long.
//
//   CLAY.surface(kind)            the tiling height map of what hands and tools leave behind. kind: 'full' (as in the
//                                 reference: fingerprints, knife drags with a burr, joins, pits and specks, fine tooth),
//                                 'skin' (fine tooth only: used on the patient's skin and hair, where prints and pits
//                                 would read as skin lesions), 'flat' (nothing: clean nail plates)
//   CLAY.clay(colour, opts)       the reference plasticine material for ANY geometry (no UVs): triplanar surface map in
//                                 object space, soft dents, a second colour streaked through, pressed places darker and
//                                 shinier, waxy sheen. opts as in the reference (marble, marbleAmount, marbleSize, bump,
//                                 lump, lumpSize, roughness, sheen, tile) plus: surface ('full'|'skin'|'flat'), palm
//                                 (a second base colour on one side: palms and soles, grey hair at the sides), palmDir,
//                                 palmAbs, palmLo, palmHi, palmK, palmX, roughVar (broad roughness variation, default 0.12), side.
//   CLAY.lumpy(geo, opts)         the reference "hands": a copy of a geometry shaped by fingers (smooth warp + thumb dents)
//   CLAY.mat(a, b, opts)          shorthand used by the series models: CLAY.clay([a, b], ...) with rough/streak/freq/bump/
//                                 prints names (prints: 0 -> the 'skin' surface)
//   CLAY.loft(sections, opts)     a smooth closed tube through cross-sections (bodies, limbs, fingers). See below.
//   CLAY.ellipsoid(rx, ry, rz)    a sphere geometry with three radii.
(function (root) {
  const THREE = root.THREE, K = root.K;
  const CLAY = (root.CLAY = {});

  // ---------------------------------------------------------------- 1. THE SURFACE (reference claySurface())
  const SURF = {};
  function claySurface(kind = 'full') {
    if (SURF[kind]) return SURF[kind];
    const N = 1024, r = K.rng(3);
    SURF[kind] = K.canvasTex(N, N, (ctx) => {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, N, N);
      if (kind === 'flat') return;
      // draw something at (x, y) and again wherever it crosses the edge, so the map tiles
      const tiled = (x, y, pad, draw) => { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { if (x + ox < -pad || x + ox > N + pad || y + oy < -pad || y + oy > N + pad) continue; ctx.save(); ctx.translate(x + ox, y + oy); draw(); ctx.restore(); } };
      const pc = document.createElement('canvas'); pc.width = pc.height = 440; const p = pc.getContext('2d');
      const full = kind === 'full';
      for (let i = 0; i < 8; i++) {                                   // fingerprints
        const R = r.range(80, 160), sp = r.range(13, 17), ph = [r.range(0, 6.3), r.range(0, 6.3)], sx = r.range(0.62, 0.82);
        p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over'; p.clearRect(0, 0, 440, 440);
        p.translate(220, 220); p.rotate(r.range(0, 6.3));
        let g = p.createRadialGradient(0, 0, 0, 0, 0, R); g.addColorStop(0, 'rgba(0,0,0,0.26)'); g.addColorStop(0.75, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        p.fillStyle = g; p.fillRect(-220, -220, 440, 440);            // the press: a shallow dent
        p.strokeStyle = 'rgba(255,255,255,0.5)'; p.lineWidth = sp * 0.4; p.lineJoin = 'round';
        for (let k = 1; k * sp < R * 1.6; k++) {                      // the ridges: loops that crowd toward one side, like a real print
          p.beginPath();
          for (let a = 0; a < 6.283; a += 0.05) { const rr = k * sp * (1 + 0.07 * Math.sin(3 * a + ph[0]) + 0.04 * Math.sin(5 * a + ph[1] + k * 0.4)), X = rr * Math.cos(a) * sx, Y = rr * Math.sin(a) * 1.15 + k * sp * 0.42; if (a === 0) p.moveTo(X, Y); else p.lineTo(X, Y); }
          p.closePath(); p.stroke();
        }
        p.globalCompositeOperation = 'destination-in'; g = p.createRadialGradient(0, 0, R * 0.25, 0, 0, R); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        p.fillStyle = g; p.fillRect(-220, -220, 440, 440);
        const x = r.range(0, N), y = r.range(0, N);
        if (full) tiled(x, y, 230, () => ctx.drawImage(pc, -220, -220));
      }
      ctx.lineCap = 'round';
      for (let i = 0; i < 10; i++) {                                  // tool marks: a drag with a raised burr beside it
        const L = r.range(120, 430), a = r.range(0, 6.3), w = r.range(2, 5), bend = r.range(-30, 30), x = r.range(0, N), y = r.range(0, N);
        if (full) tiled(x, y, 460, () => {
          ctx.rotate(a);
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.quadraticCurveTo(0, bend, L / 2, 0); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = w * 0.8; ctx.beginPath(); ctx.moveTo(-L / 2, w); ctx.quadraticCurveTo(0, bend + w, L / 2, w); ctx.stroke();
        });
      }
      for (let i = 0; i < 4; i++) {                                   // joins: two pieces pushed together and smoothed over
        const a = r.range(0, 6.3), pts = Array.from({ length: 9 }, (_, k) => [(k - 4) * 85, r.range(-26, 26)]), x = r.range(0, N), y = r.range(0, N);
        if (full) tiled(x, y, 420, () => {
          ctx.rotate(a);
          for (const [dy, style, w] of [[0, 'rgba(0,0,0,0.4)', 3.5], [5, 'rgba(255,255,255,0.22)', 5]]) { ctx.strokeStyle = style; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x2, y2], k) => (k ? ctx.lineTo(x2, y2 + dy) : ctx.moveTo(x2, y2 + dy))); ctx.stroke(); }
        });
      }
      for (let i = 0; i < 170; i++) {                                 // pits (dark) and specks of stuck clay (light)
        const rad = r.range(1.5, 4.5) * (r.chance(0.08) ? 2.4 : 1), up = r.chance(0.22), x = r.range(0, N), y = r.range(0, N);
        if (full) tiled(x, y, 16, () => { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad); g.addColorStop(0, up ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.8)'); g.addColorStop(1, up ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill(); });
      }
      const im = ctx.getImageData(0, 0, N, N), d = im.data;           // a fine tooth over everything
      for (let i = 0; i < d.length; i += 4) { const v = d[i] + r.range(-7, 7); d[i] = d[i + 1] = d[i + 2] = v; }
      ctx.putImageData(im, 0, 0);
    }, { data: true, repeat: [1, 1] });
    return SURF[kind];
  }
  CLAY.surface = claySurface;

  // ---------------------------------------------------------------- 2. THE MATERIAL (reference clay())
  const CLAY_GLSL = `
    uniform sampler2D uSurf; uniform vec3 uOff, uMarble; uniform float uTile, uBump, uLump, uLumpSize, uMarbleAmt, uMarbleSize;
    uniform vec3 uPalm, uPalmDir; uniform float uPalmK, uPalmAbs, uPalmLo, uPalmHi, uRoughVar; uniform vec2 uPalmX;
    varying vec3 vClayP, vClayN;
    float cHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float cNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
      return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    // x: height of the surface in world units (fine marks + soft dents), y: the fine marks alone, -0.5..0.5
    vec2 clayH(vec3 p, vec3 w){
      vec3 q = p / uTile + uOff;
      float fine = dot(w, vec3(texture2D(uSurf, q.zy).r, texture2D(uSurf, q.xz).r, texture2D(uSurf, q.xy).r)) - 0.5;
      vec3 l = p / uLumpSize + uOff * 9.0;
      return vec2(uBump * fine + uLump * (cNoise(l) + 0.5 * cNoise(l * 2.3 + 5.0) - 0.75), fine);
    }
    // bend the normal by a height difference per pixel (Mikkelsen's bump mapping, in true units so it holds at any distance)
    vec3 clayBump(vec3 pos, vec3 n, vec2 dH, float face){
      vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, n), r2 = cross(n, sx);
      float det = dot(sx, r1) * face;
      return normalize(abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2));
    }`;
  let clayCount = 0;
  function clay(colour, o = {}) {
    const [base, mix] = Array.isArray(colour) ? colour : [colour, o.marble || colour], c = new THREE.Color(base), r = K.rng(101 + clayCount++);
    const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: o.roughness == null ? 0.6 : o.roughness, metalness: 0,
      sheen: o.sheen == null ? 0.4 : o.sheen, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.2),
      side: o.side || THREE.FrontSide });
    const u = { uSurf: { value: claySurface(o.surface || 'full') }, uOff: { value: new THREE.Vector3(r(), r(), r()) }, uMarble: { value: new THREE.Color(mix) },
      uTile: { value: o.tile || 1.5 }, uBump: { value: o.bump == null ? 0.007 : o.bump }, uLump: { value: o.lump == null ? 0.02 : o.lump }, uLumpSize: { value: o.lumpSize || 0.3 },
      uMarbleAmt: { value: o.marbleAmount == null ? 0.4 : o.marbleAmount }, uMarbleSize: { value: o.marbleSize || 0.5 },
      // series addition: a second base colour on one side of the object (palms, soles; grey hair at the sides)
      uPalm: { value: new THREE.Color(o.palm || base) }, uPalmK: { value: o.palm ? (o.palmK == null ? 1 : o.palmK) : 0 },
      uPalmDir: { value: new THREE.Vector3(...(o.palmDir || [0, -1, 0])) }, uPalmAbs: { value: o.palmAbs ? 1 : 0 }, uPalmLo: { value: o.palmLo == null ? 0.05 : o.palmLo }, uPalmHi: { value: o.palmHi == null ? 0.55 : o.palmHi },
      uPalmX: { value: new THREE.Vector2(...(o.palmX || [0, 0])) },
      uRoughVar: { value: o.roughVar == null ? 0.12 : o.roughVar } };   // palmX [x0, x1]: the tint fades in along object X (toward the wrist it fades out); roughVar: how much the broad marble noise varies the roughness
    m.userData.clay = u;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vClayP, vClayN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvClayP = position; vClayN = normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + CLAY_GLSL)
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 cW = pow(abs(normalize(vClayN)), vec3(4.0)); cW /= cW.x + cW.y + cW.z;   // (skin: the 'skin' map is the fine tooth only)
          vec2 cH = clayH(vClayP, cW);
          vec2 cD = vec2(clayH(vClayP + dFdx(vClayP), cW).x, clayH(vClayP + dFdy(vClayP), cW).x) - cH.x;
          float cM = cNoise(vClayP * 0.7 / uMarbleSize + uOff * 5.0);
          if (uPalmK > 0.0) { float dd = dot(normalize(vClayN), uPalmDir); if (uPalmAbs > 0.5) dd = abs(dd); float px = uPalmX.y > uPalmX.x ? smoothstep(uPalmX.x, uPalmX.y, vClayP.x) : 1.0; diffuseColor.rgb = mix(diffuseColor.rgb, uPalm, smoothstep(uPalmLo, uPalmHi, dd + (cM - 0.5) * 0.08 * uPalmAbs) * uPalmK * px); }
          float cS = smoothstep(0.3, 0.95, sin(dot(vClayP, vec3(1.1, 1.8, 0.9)) / uMarbleSize + cM * 9.0 + uOff.x * 40.0)) * (0.35 + cM);
          diffuseColor.rgb = mix(diffuseColor.rgb, uMarble, clamp(uMarbleAmt * cS, 0.0, 1.0));
          diffuseColor.rgb *= 1.0 + 0.3 * cH.y;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + 0.55 * cH.y + uRoughVar * (cM - 0.5), 0.32, 1.0);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = clayBump(-vViewPosition, normal, cD, faceDirection);');
    };
    m.customProgramCacheKey = () => 'soft-clay';
    return m;
  }
  CLAY.clay = clay;

  // ---------------------------------------------------------------- 3. THE HANDS (reference lumpy())
  function lumpy(geo, o = {}) {
    const amount = o.amount == null ? 0.03 : o.amount, f = 1 / (o.size || 0.6), seed = o.seed || 1;
    const g = geo.clone(), n = K.noise(seed), r = K.rng(seed + 77), P = g.attributes.position, N = g.attributes.normal, dents = [];
    for (let i = 0; i < (o.dents || 0); i++) { const k = r.int(0, P.count - 1); dents.push([P.getX(k), P.getY(k), P.getZ(k), N.getX(k), N.getY(k), N.getZ(k), (o.dentSize || 0.25) * r.range(0.7, 1.3), (o.dentDepth || 0.04) * r.range(0.6, 1.2)]); }
    const warp = (x, y, z, out) => {
      let dx = 2 * amount * n.n3(x * f + 31.4, y * f, z * f), dy = 2 * amount * n.n3(x * f, y * f + 47.2, z * f), dz = 2 * amount * n.n3(x * f, y * f, z * f + 12.9);
      for (const d of dents) { const q = Math.hypot(x - d[0], y - d[1], z - d[2]) / d[6]; if (q < 1) { const k = d[7] * (1 - q * q) * (1 - q * q); dx -= d[3] * k; dy -= d[4] * k; dz -= d[5] * k; } }
      return out.set(x + dx, y + dy, z + dz);
    };
    const p = new THREE.Vector3(), nn = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), E = 2e-3;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i);
      t1.set(0, 1, 0); if (Math.abs(nn.y) > 0.9) t1.set(1, 0, 0);
      t1.crossVectors(nn, t1).normalize(); t2.crossVectors(nn, t1);                       // two directions lying in the surface
      warp(p.x, p.y, p.z, a); warp(p.x + t1.x * E, p.y + t1.y * E, p.z + t1.z * E, b); warp(p.x + t2.x * E, p.y + t2.y * E, p.z + t2.z * E, c);
      b.sub(a); c.sub(a); nn.crossVectors(b, c).normalize();                              // the warped surface's own normal
      P.setXYZ(i, a.x, a.y, a.z); N.setXYZ(i, nn.x, nn.y, nn.z);
    }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  CLAY.lumpy = lumpy;

  // the series shorthand: CLAY.mat(colourA, colourB, { rough, sheen, streak, freq, bump, prints, palm..., side })
  // opts.scale: the whole reference tabletop enlarged by this factor (big set pieces: bed, sheet, table), so their marks
  // keep the reference's size relative to the piece. Patient surfaces (prints: 0) get a smooth skin: fine tooth only and
  // very soft, broad dents, so nothing reads as a skin lesion.
  CLAY.mat = (a, b, o = {}) => { const sc = o.scale || 1, skin = o.prints === 0; return clay([a, b || a], {
    roughness: o.rough, sheen: o.sheen, side: o.side, surface: o.surface || (skin ? 'skin' : 'full'),
    marbleAmount: o.streak == null ? 0.4 : o.streak, marbleSize: K.clamp(0.6 / (o.freq || 1.2), 0.04, 3) * (o.freq ? 1 : sc),
    bump: (o.bump == null ? 0.007 : 0.007 * o.bump) * sc * (skin ? 0.35 : 1), lump: o.lump != null ? o.lump : (skin ? 0.0 : (o.bump == null ? 0.02 : 0.02 * Math.min(1, o.bump)) * sc),
    lumpSize: o.lumpSize || (skin ? 0.9 : 0.3 * sc), tile: o.tile || 1.5 * sc,
    palm: o.palm, palmK: o.palmK, palmDir: o.palmDir, palmAbs: o.palmAbs, palmLo: o.palmLo, palmHi: o.palmHi, palmX: o.palmX,
    roughVar: o.roughVar != null ? o.roughVar : (skin && !o.streak ? 0.015 : 0.12),   // even skin: no broad sheen patches
  }); };

  // A smooth closed tube through cross-sections, with rounded caps.
  // sections: [{ s, a, b, c, d, u, v }] along the tube's axis (s), where the cross-section is a super-ellipse reaching
  // a (+U), b (-U), c (+V), d (-V) from its centre (u, v). Missing b/d copy a/c; missing u/v are 0.
  // opts.axis: 'y' (s = y, U = x, V = z) or 'x' (s = x, U = z, V = y). opts: radial, rings, pow (2 = ellipse),
  // capStart / capEnd (cap length as a fraction of the section size, 0 = open), deform(pos, s, angle) to sculpt.
  CLAY.loft = (secs, o = {}) => {
    const radial = o.radial || 32, rings = o.rings || Math.max(8, secs.length * 6), pw = o.pow || 2, axis = o.axis || 'y';
    const S = secs.map((q) => ({ s: q.s, a: q.a, b: q.b == null ? q.a : q.b, c: q.c, d: q.d == null ? q.c : q.d, u: q.u || 0, v: q.v || 0 }));
    const keys = ['a', 'b', 'c', 'd', 'u', 'v'];
    // Catmull-Rom through the sections by their s position
    const at = (s) => {
      let i = 0; while (i < S.length - 2 && S[i + 1].s < s) i++;
      const p0 = S[Math.max(0, i - 1)], p1 = S[i], p2 = S[i + 1], p3 = S[Math.min(S.length - 1, i + 2)];
      const t = THREE.MathUtils.clamp((s - p1.s) / (p2.s - p1.s), 0, 1), t2 = t * t, t3 = t2 * t;
      const out = { s };
      for (const k of keys) {
        const m1 = (p2[k] - p0[k]) * 0.5, m2 = (p3[k] - p1[k]) * 0.5;
        out[k] = (2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2;
      }
      return out;
    };
    const ringList = [];
    const s0 = S[0].s, s1 = S[S.length - 1].s;
    const capN = 7;
    const first = at(s0), last = at(s1);
    const capS = o.capStart == null ? 0.8 : o.capStart, capE = o.capEnd == null ? 0.8 : o.capEnd;
    if (capS > 0) {
      const L = capS * Math.min(first.a + first.b, first.c + first.d) * 0.5;
      for (let k = capN; k >= 1; k--) { const ph = (k / capN) * Math.PI / 2; ringList.push(Object.assign({}, first, { s: s0 - Math.sin(ph) * L, sc: Math.cos(ph), pole: k === capN })); }
    }
    for (let i = 0; i <= rings; i++) ringList.push(Object.assign(at(s0 + (s1 - s0) * i / rings), { sc: 1 }));
    if (capE > 0) {
      const L = capE * Math.min(last.a + last.b, last.c + last.d) * 0.5;
      for (let k = 1; k <= capN; k++) { const ph = (k / capN) * Math.PI / 2; ringList.push(Object.assign({}, last, { s: s1 + Math.sin(ph) * L, sc: Math.cos(ph), pole: k === capN })); }
    }
    const pos = [], idx = [], v = new THREE.Vector3();
    const se = (x) => Math.sign(x) * Math.pow(Math.abs(x), 2 / pw);
    ringList.forEach((r) => {
      for (let j = 0; j < radial; j++) {
        const ang = (j / radial) * Math.PI * 2, cu = Math.cos(ang), su = Math.sin(ang);
        const U = r.u * (r.pole ? 1 : 1) + (cu >= 0 ? r.a : r.b) * se(cu) * r.sc, V = r.v + (su >= 0 ? r.c : r.d) * se(su) * r.sc;
        if (axis === 'y') v.set(U, r.s, V); else v.set(r.s, V, U);
        if (o.deform) o.deform(v, r.s, ang);
        pos.push(v.x, v.y, v.z);
      }
    });
    const nr = ringList.length;
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // make sure the faces point outward
    const mid = Math.floor(nr / 2) * radial, P = g.attributes.position, N = g.attributes.normal;
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < radial; j++) { cx += P.getX(mid + j) / radial; cy += P.getY(mid + j) / radial; cz += P.getZ(mid + j) / radial; }
    let dot = 0;
    for (let j = 0; j < radial; j++) { const k = mid + j; dot += (P.getX(k) - cx) * N.getX(k) + (P.getY(k) - cy) * N.getY(k) + (P.getZ(k) - cz) * N.getZ(k); }
    if (dot < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.computeVertexNormals(); }
    g.userData.rings = nr; g.userData.radial = radial;
    g.computeBoundingSphere();
    return g;
  };

  CLAY.ellipsoid = (rx, ry, rz, ws = 40, hs = 28) => { const g = new THREE.SphereGeometry(1, ws, hs); g.scale(rx, ry, rz); return g; };

  // a mesh that casts and receives shadows
  CLAY.mesh = (geo, mat, parent, pos, rot, name) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (name) m.name = name;
    if (parent) parent.add(m);
    return m;
  };
  // a named empty that marks a point (and an outward direction +Z) on a model, for contacts and labels
  CLAY.anchor = (parent, name, pos, normal) => {
    const a = new THREE.Object3D(); a.name = name; a.position.set(pos[0], pos[1], pos[2]);
    if (normal) { const n = new THREE.Vector3(...normal).normalize(); a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); }
    parent.add(a); return a;
  };
})(typeof window !== 'undefined' ? window : globalThis);
