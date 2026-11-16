// shared/bed.js: the clay hospital bed (pale grey frame, pale sage mattress, backrest raised to 45 degrees, one white
// pillow) and the bedside table with a clear glass of water. Classic script; needs THREE, K, CLAY. Defines window.BED.
//   BED.DIM          the bed's key measurements (shared with the patient model)
//   BED.build(S)     -> { group, pillow, placePillow(headBackWorld) }
//   BED.table(S)     -> { group, glass }   (on the patient's LEFT, the far side, near his head)
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY;
  const BED = (root.BED = {});
  const r45 = Math.PI / 4;
  BED.DIM = {
    Ym: 6.0,          // top of the flat part of the mattress
    Xh: -2.0,         // hinge where the backrest rises
    back: 8.4,        // backrest length along its slope
    angle: r45,       // 45 degrees
    xEnd: 10.6,       // foot end of the mattress
    half: 4.5,        // half width of the mattress (Z)
    thick: 1.2,
  };
  const D = BED.DIM;
  BED.slope = new THREE.Vector3(-Math.cos(D.angle), Math.sin(D.angle), 0);   // up the backrest
  BED.normal = new THREE.Vector3(Math.sin(D.angle), Math.cos(D.angle), 0);   // out of the backrest, toward the patient
  BED.onBack = (s, off) => new THREE.Vector3(D.Xh, D.Ym, 0).addScaledVector(BED.slope, s).addScaledVector(BED.normal, off);

  BED.mats = () => ({
    frame: CLAY.mat('#c8cbcf', '#b3b7bc', { rough: 0.55, streak: 0.4, scale: 2.7 }),
    frameDark: CLAY.mat('#9ea4aa', '#8b9197', { rough: 0.55, streak: 0.3, scale: 2.7 }),
    mattress: CLAY.mat('#c4d9c8', '#afc8b4', { rough: 0.7, streak: 0.5, scale: 2.7 }),
    pillow: CLAY.mat('#f3efe7', '#ddd5c6', { rough: 0.68, streak: 0.45, scale: 2.7 }),
    wood: CLAY.mat('#c69f77', '#ad8660', { rough: 0.62, streak: 0.6, freq: 1.6, scale: 2.7 }),
  });

  BED.build = (S, M) => {
    M = M || BED.mats();
    const g = new THREE.Group(); g.name = 'bed'; S.scene.add(g);
    let seed = 30;   // every piece shaped by hand (the reference lumpy(), scaled to the size of the piece)
    const box = (w, h, d, r, mat, p, rz) => { const big = Math.max(w, h, d), soft = mat === M.mattress; return CLAY.mesh(CLAY.lumpy(K.roundedBox(w, h, d, r, 5), { amount: soft ? 0.05 : 0.018, size: soft ? 2.2 : 1.2, seed: seed++, dents: soft ? 4 : 0, dentSize: 1.1, dentDepth: 0.05 }), mat, g, p, rz ? [0, 0, rz] : null); };
    // mattress: flat part and backrest part
    const flatL = D.xEnd - D.Xh;
    box(flatL, D.thick, D.half * 2, 0.45, M.mattress, [D.Xh + flatL / 2, D.Ym - D.thick / 2, 0]);
    const bc = BED.onBack(D.back / 2, -D.thick / 2);
    box(D.back, D.thick, D.half * 2, 0.45, M.mattress, [bc.x, bc.y, 0], -r45);
    // fill the outer corner at the hinge
    CLAY.mesh(new THREE.CylinderGeometry(D.thick * 0.62, D.thick * 0.62, D.half * 2 - 0.3, 32).rotateX(Math.PI / 2), M.mattress, g, [D.Xh + 0.15, D.Ym - D.thick * 0.6, 0]);
    // frame: base deck, rails, backrest plate, legs and castors, head and foot boards
    box(flatL + 0.6, 0.45, D.half * 2 + 0.2, 0.18, M.frame, [D.Xh + flatL / 2, D.Ym - D.thick - 0.25, 0]);
    const pc = BED.onBack(D.back / 2, -D.thick - 0.25);
    box(D.back, 0.4, D.half * 2 + 0.2, 0.16, M.frame, [pc.x, pc.y, 0], -r45);
    const xs = [-6.6, 10.0], zs = [-D.half + 0.6, D.half - 0.6];
    box(18.2, 0.5, 0.45, 0.2, M.frame, [1.7, 3.6, zs[0]]); box(18.2, 0.5, 0.45, 0.2, M.frame, [1.7, 3.6, zs[1]]);
    for (const x of xs) for (const z of zs) {
      CLAY.mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.6, 20), M.frame, g, [x, 2.4 + 0.1, z]);
      CLAY.mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24).rotateX(Math.PI / 2), M.frameDark, g, [x, 0.42, z]);
      CLAY.mesh(K.roundedBox(0.6, 0.3, 0.5, 0.1), M.frameDark, g, [x, 0.75, z]);
    }
    // cross bar under the deck
    box(0.5, 0.45, D.half * 2 - 1, 0.2, M.frame, [2, 3.6, 0]);
    // backrest support strut
    CLAY.mesh(K.tube([[-2.8, 3.9, 0], [-4.6, 6.0, 0], [-5.4, 7.3, 0]], 0.2, { radial: 12 }), M.frame, g);
    // foot board (low) and head board
    box(0.45, 3.4, D.half * 2 + 0.3, 0.2, M.frame, [D.xEnd + 0.45, D.Ym - 0.5, 0]);
    box(0.45, 8.6, D.half * 2 + 0.3, 0.2, M.frame, [-9.15, 7.6, 0]);
    // pillow: placed against the head by placePillow
    const pillow = CLAY.mesh(K.roundedBox(2.6, 1.0, 5.4, 0.48, 8), M.pillow, g, null, null, 'pillow');
    // soften the pillow: pinch the corners and dent the middle a little
    { const p = pillow.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const e = Math.pow(Math.abs(z) / 2.7, 4); p.setY(i, y * (1 - 0.35 * e)); p.setX(i, x * (1 - 0.12 * e)); } pillow.geometry.computeVertexNormals(); pillow.geometry = CLAY.lumpy(pillow.geometry, { amount: 0.04, size: 1.0, seed: 77, dents: 3, dentSize: 0.8, dentDepth: 0.05 }); }
    const out = {
      group: g, pillow,
      // the head rests on the pillow: thickness fills the gap between the mattress and the back of the head
      placePillow(headBack, s) {
        const n = BED.normal, off = headBack.clone().sub(new THREE.Vector3(D.Xh, D.Ym, 0)).dot(n);
        const th = Math.max(0.6, off + 0.14);
        pillow.scale.set(1, th / 1.0, 1);
        const c = BED.onBack(s, th / 2);
        pillow.position.set(c.x, c.y, 0); pillow.rotation.set(0, 0, -r45);
      },
    };
    return out;
  };

  // the bedside table on the patient's LEFT (far side, -Z) near his head, with only a clear glass of water on it
  BED.table = (S, M) => {
    M = M || BED.mats();
    const g = new THREE.Group(); g.name = 'table'; S.scene.add(g);
    const x = -4.6, z = -7.6, top = 7.6;
    CLAY.mesh(CLAY.lumpy(K.roundedBox(4.2, 0.45, 3.4, 0.18, 5), { amount: 0.025, size: 1.2, seed: 81, dents: 2, dentSize: 0.6, dentDepth: 0.03 }), M.wood, g, [x, top - 0.22, z]);
    CLAY.mesh(CLAY.lumpy(K.roundedBox(3.7, 2.2, 3.0, 0.2, 5), { amount: 0.03, size: 1.4, seed: 82, dents: 2, dentSize: 0.7, dentDepth: 0.03 }), M.wood, g, [x, top - 1.8, z]);   // drawer box
    CLAY.mesh(K.roundedBox(1.2, 0.18, 0.2, 0.08, 4), M.frameDark || M.frame, g, [x, top - 1.75, z + 1.52]); // drawer handle
    for (const dx of [-1.7, 1.7]) for (const dz of [-1.3, 1.3]) CLAY.mesh(new THREE.CylinderGeometry(0.17, 0.14, top - 2.9, 16), M.wood, g, [x + dx, (top - 2.9) / 2, z + dz]);
    // glass of water: clear glass with a thick base, and the water inside
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transmission: 1, thickness: 0.25, ior: 1.5, metalness: 0, transparent: false, specularIntensity: 1, envMapIntensity: 1.6 });
    const waterMat = new THREE.MeshPhysicalMaterial({ color: '#dff4f6', roughness: 0.02, transmission: 1, thickness: 0.8, ior: 1.33, metalness: 0, attenuationColor: new THREE.Color('#b9e3e6'), attenuationDistance: 3 });
    const gp = [x + 0.6, top, z + 0.2];
    const prof = [[0, 0], [0.42, 0], [0.47, 0.06], [0.5, 1.4], [0.53, 1.42], [0.5, 1.44], [0.45, 1.42], [0.43, 0.16], [0, 0.16]].map(([r, y]) => new THREE.Vector2(r, y));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glassMat); glass.position.set(...gp); glass.castShadow = true; g.add(glass);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.42, 0.9, 48), waterMat); water.position.set(gp[0], top + 0.16 + 0.45, gp[2]); g.add(water);
    return { group: g, glass, water, at: new THREE.Vector3(gp[0], top + 0.7, gp[2]) };
  };
})(typeof window !== 'undefined' ? window : globalThis);
