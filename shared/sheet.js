// shared/sheet.js: the white sheet over the patient from the waist down, draped over his legs (a height field built by
// dropping rays onto the body), with a turned-down hem at the waist. It can be folded up off the lower legs in an
// accordion of layers and unfolded again. Classic script; needs THREE, K, CLAY, BED. Defines window.SHEET.
//   const SH = SHEET.build(S, P)   P from PATIENT.build
//   SH.setFold(u)                  0 = covering his legs to the feet, 1 = folded up to just above the knees
//   SH.heightAt(x, z)              top of the (unfolded) sheet, for resting things on it
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY, BED = root.BED;
  const SHEET = (root.SHEET = {});
  SHEET.FOLD_TO = 2.15;      // x of the fold line when folded (just above the knees, which are at x = 2.45)
  SHEET.build = (S, P) => {
    const D = BED.DIM;
    const mat = CLAY.mat('#f3efe7', '#ddd5c6', { rough: 0.74, streak: 0.5, freq: 0.9, sheen: 0.5, side: THREE.DoubleSide, scale: 2.7 });
    // the top edge lies across his belly (just below the navel)
    P.group.updateMatrixWorld(true);
    const edge = P.torso.localToWorld(new THREE.Vector3(0, 1.45, 1.05));
    const x0 = edge.x, x1 = D.xEnd + 0.3, zH = D.half + 0.6;
    const nx = 150, nz = 84, dx = (x1 - x0) / nx, dz = (2 * zH) / nz;
    const bedTop = (x) => (x >= D.Xh ? D.Ym : D.Ym + (D.Xh - x) * Math.tan(D.angle));
    // 1. body heights under the sheet
    const rc = new THREE.Raycaster(); rc.far = 60;
    const meshes = P.sheetMeshes;
    const H = new Float32Array((nx + 1) * (nz + 1));
    const id = (i, j) => j * (nx + 1) + i;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * dx, z = -zH + j * dz;
      rc.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
      const h = rc.intersectObjects(meshes, false)[0];
      let y = bedTop(x) + 0.07;
      if (h) y = Math.max(y, h.point.y + 0.13);
      H[id(i, j)] = y;
    }
    // widen tall things a little (a sheet tents out past the toes), then
    { const Hc = Float32Array.from(H); for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let m = Hc[id(i, j)]; for (let k = -8; k <= 8; k++) for (let l = -6; l <= 6; l++) { const ii = K.clamp(i + k, 0, nx), jj = K.clamp(j + l, 0, nz), dd = (k * dx) ** 2 + (l * dz) ** 2; m = Math.max(m, Hc[id(ii, jj)] - 1.6 * dd); } H[id(i, j)] = m; } }   // rounded domes over the feet, not peaks
    // 2. drape: blur, never below the body
    const blur = (src, r) => {
      const out = new Float32Array(src.length), tmp = new Float32Array(src.length);
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let s = 0, w = 0; for (let k = -r; k <= r; k++) { const ii = K.clamp(i + k, 0, nx); const ww = Math.exp(-(k * k) / (r * r * 0.5)); s += src[id(ii, j)] * ww; w += ww; } tmp[id(i, j)] = s / w; }
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { let s = 0, w = 0; for (let k = -r; k <= r; k++) { const jj = K.clamp(j + k, 0, nz); const ww = Math.exp(-(k * k) / (r * r * 0.5)); s += tmp[id(i, jj)] * ww; w += ww; } out[id(i, j)] = s / w; }
      return out;
    };
    let Hd = H;
    for (let it = 0; it < 4; it++) { const b = blur(Hd, 6); for (let k = 0; k < b.length; k++) b[k] = Math.max(b[k], H[k]); Hd = b; }
    { const b = blur(Hd, 3); for (let k = 0; k < b.length; k++) Hd[k] = Math.max(b[k], H[k] - 0.06); }   // soften what is left of any ridge
    // 3. hang over the mattress edges and the foot end, with soft folds
    const nse = K.noise(7);
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * dx, z = -zH + j * dz;
      let y = Hd[id(i, j)];
      const oz = Math.abs(z) - D.half + 0.15, ox = x - D.xEnd + 0.1;
      if (oz > 0) y -= Math.min(1.05, oz * oz * 7 + oz * 1.4);
      if (ox > 0) y -= Math.min(1.05, ox * ox * 7 + ox * 1.4);
      y += 0.03 * nse.fbm(x * 0.6, z * 0.9, 0, 3) + 0.02 * Math.sin(x * 2.2 + z * 0.7) * K.smooth(0, 3, Math.abs(z));
      Hd[id(i, j)] = y;
    }
    const Hs = (x, z) => {        // bilinear sample of the draped heights
      const fi = K.clamp((x - x0) / dx, 0, nx - 1e-4), fj = K.clamp((z + zH) / dz, 0, nz - 1e-4), i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
      return K.lerp(K.lerp(Hd[id(i, j)], Hd[id(i + 1, j)], u), K.lerp(Hd[id(i, j + 1)], Hd[id(i + 1, j + 1)], u), v);
    };
    // geometry
    const g = new THREE.BufferGeometry(), pos = new Float32Array((nx + 1) * (nz + 1) * 3), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'sheet';
    S.scene.add(mesh);
    // the turned-down hem at the waist
    const hemPts = []; for (let j = 0; j <= 40; j++) { const z = -zH + 0.25 + (2 * zH - 0.5) * j / 40; hemPts.push([x0 + 0.08, Hs(x0 + 0.08, z) + 0.06, z]); }
    const hem = CLAY.mesh(K.tube(hemPts, 0.13, { radial: 14, segments: 80 }), mat, S.scene, null, null, 'sheet-hem');

    const R = 0.1, LF = 2.55;
    let memo = -1;
    const setFold = (u) => {
      u = K.clamp(u); if (Math.abs(u - memo) < 1e-5) return; memo = u;
      const xf = K.lerp(x1 + 0.01, SHEET.FOLD_TO, u);
      for (let j = 0; j <= nz; j++) {
        const z = -zH + j * dz;
        for (let i = 0; i <= nx; i++) {
          const x = x0 + i * dx, k = id(i, j);
          let X = x, Y = Hd[k];
          let d = x - xf;
          if (d > 0) {
            let xp = xf, dir = -1, layer = 0, right = true;
            for (let guard = 0; guard < 12; guard++) {
              const c = Math.PI * R;
              if (d <= c) { const th = d / R; X = xp + (right ? 1 : -1) * R * Math.sin(th); Y = Hs(xp, z) + 2 * R * layer + R * (1 - Math.cos(th)); break; }
              d -= c; layer++;
              if (d <= LF) { X = xp + dir * d; Y = Hs(X, z) + 2 * R * layer; break; }
              d -= LF; xp += dir * LF; dir = -dir; right = !right;
            }
          }
          pos[3 * k] = X; pos[3 * k + 1] = Y; pos[3 * k + 2] = z;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    };
    setFold(0);
    return { mesh, setFold, heightAt: Hs, x0, x1, edge };
  };
})(typeof window !== 'undefined' ? window : globalThis);
