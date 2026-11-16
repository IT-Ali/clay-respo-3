// storyboard/panels.js: the review panels and the beat key frames for the storyboard (review only, never in the video).
// Loaded by tools/storyboard.mjs into the player page. Each panel: { t, title, cam, review(W) -> items }.
(function () {
  const W = window.RESP3_WORLD, c = window.RESP3.content, THREE = window.THREE, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const { torso, SITES, LEVELS, VERT, SCAP, RIB10, EX, partMeshes, REV, tW } = W;
  const sx = (side) => (side === 'R' ? -1 : 1);
  const onBack = (x, s, out = 0.02) => { const h = W.backHit(x, s); return tW(h.p.x + h.n.x * out, h.p.y + h.n.y * out, h.p.z + h.n.z * out); };
  const nW = (nL) => nL.clone().transformDirection(torso.matrixWorld);
  const COL = { R: '#f28c38', L: '#5fb3e8', spine: '#f2d04b', scap: '#e85f8a', rib: '#9be06b', zone: '#ffffff', gap: '#f2b33d' };
  const sideLabels = () => [
    { type: 'text', x: 0.82, y: 0.9, text: 'his RIGHT (viewer\'s right)', color: COL.R, size: 30 },
    { type: 'text', x: 0.04, y: 0.9, text: 'his LEFT', color: COL.L, size: 30 },
  ];
  const T = {
    sit: 9.0,
    expOut: 14.6, expIn: 18.2,
    tvf: c.TVF[0].on + 0.3,
    perc: c.PERC[0].strikes[0],
    aus: c.AUS[0].on + 1.0,
  };
  // the tangential close-up camera for a skin-level panel: along the skin, a little out from it
  const skinCam = (pW, nL, alongL, dist = 2.2, out = 0.22, fov = 22) => {
    const n = nW(nL), a = alongL.clone().transformDirection(torso.matrixWorld);
    return { pos: pW.clone().addScaledVector(a, dist).addScaledVector(n, out).toArray(), target: pW.clone().addScaledVector(n, 0.05).toArray(), fov, aperture: 0, focus: pW.toArray() };
  };
  const P = {};

  // ---------------- a) the sitting-forward pose
  P.sitSide = { t: T.sit, title: 'a) Sitting forward, arms folded - from his right side', cam: { pos: [-0.6, 12.2, 24.5], target: [-1.2, 9.4, 0], fov: 26, aperture: 0 }, review: () => [
    { type: 'dot', p: tW(0, 1.5, 1.15), label: 'sheet over his lap from the waist down', color: '#ffffff', dx: 18, dy: 30 },
    { type: 'dot', p: tW(-1.0, 1.45, -0.55), label: 'trousers up at the waist', color: '#9fc4e2', dx: -18, dy: 28 },
    { type: 'dot', p: [-5.4, 9.3, 3.6], label: 'backrest unmoved (45°)', color: '#c4d9c8', dx: -18, dy: -24 },
    { type: 'dot', p: tW(0, 3.3, -1.0), label: 'off the backrest, upright', color: COL.R, dx: -18, dy: -22 },
    { type: 'dot', p: W.P.arms.R.hand.world('dorsum').toArray(), label: 'arms folded across the chest', color: COL.L, dx: 18, dy: -28 },
  ] };
  P.sitBack = { t: T.sit, title: 'a) Sitting forward, arms folded - from behind', cam: { pos: [-16.8, 21.8, 0.6], target: [-1.6, 10.0, 0], fov: 28, aperture: 0 }, review: () => {
    const sc = SCAP(1), it = [];
    for (const sd of ['R', 'L']) { const m = onBack(sx(sd) * sc.sup[0], 4.3); it.push({ type: 'dot', p: m, color: COL.scap, label: 'medial border moved out', dx: sd === 'R' ? 18 : -18, dy: -20 }); }
    it.push({ type: 'dot', p: W.P.arms.R.hand.world('dorsum'), label: 'his right hand on his left arm', color: COL.R, dx: -18, dy: 26 });
    it.push({ type: 'dot', p: tW(0, 1.45, -1.02), label: 'trousers up; sheet round his waist', color: '#9fc4e2', dx: 18, dy: 30 });
    return it.concat(sideLabels());
  } };

  // ---------------- b) the back landmarks
  P.landmarks = { t: T.sit, title: 'b) Back landmarks (computed on his back, arms folded)', cam: { pos: [-12.6, 18.4, 0.0], target: [-1.8, 9.95, 0], fov: 25, aperture: 0 }, review: () => {
    const it = [], sc = SCAP(1);
    // spinous processes
    for (const [n, s] of Object.entries(VERT)) { if (n[0] === 'L' && n !== 'L1') continue; it.push({ type: 'dot', p: onBack(0, s), r: 5, color: COL.spine, label: n === 'C7' || n === 'T7' || n === 'T10' ? n : null, dx: 12, dy: 0, size: 20 }); }
    it.push({ type: 'text', x: 0.43, y: 0.1, text: 'spinous processes (C7 to L1)', color: COL.spine, size: 24 });
    for (const sd of ['R', 'L']) {
      const s0 = sx(sd), m = (pt) => onBack(s0 * pt[0], pt[1]);
      it.push({ type: 'line', pts: [m(sc.spine[0]), m([(sc.spine[0][0] + sc.spine[1][0]) / 2, (sc.spine[0][1] + sc.spine[1][1]) / 2]), m(sc.spine[1])], color: COL.scap, w: 5, label: sd === 'R' ? 'spine of scapula' : null, at: 2, dx: 14, dy: -16, size: 20 });
      it.push({ type: 'line', pts: [m(sc.sup), m(sc.inf), m(sc.lat)], color: COL.scap, w: 2.5, dash: [6, 6] });
      it.push({ type: 'dot', p: m(sc.inf), color: COL.scap, r: 8, label: 'inferior angle (7th rib)', dx: sd === 'R' ? 16 : -16, dy: 18, size: 20 });
      const rib = []; for (let x = 0.15; x <= 1.62; x += 0.12) rib.push(onBack(s0 * x, RIB10(x)));
      it.push({ type: 'line', pts: rib, color: COL.rib, w: 4, dash: [10, 7], label: sd === 'L' ? '10th rib (lung bases)' : null, at: rib.length - 1, dx: -16, dy: 18, size: 20 });
      for (const Lv of LEVELS) { const p = onBack(s0 * Lv.x, Lv.s, 0.03); it.push({ type: 'dot', p, color: sd === 'R' ? COL.R : COL.L, r: 13, label: String(Lv.n), dx: sd === 'R' ? 16 : -16, dy: 0, size: 22 }); }
      for (const z of c.ZONES) { const Lv = LEVELS[z.lv - 1]; it.push({ type: 'ring', p: onBack(s0 * Lv.x, Lv.s, 0.03), r: 30, color: COL.zone, label: sd === 'L' ? 'fremitus: ' + z.name : null, dx: -36, dy: -12, size: 18 }); }
    }
    return it.concat(sideLabels());
  } };

  // ---------------- c) hand poses with skin-level panels
  const handGaps = (side, parts, nL, extra = {}) => parts.map((p) => Object.assign({ meshes: partMeshes(EX[side].hand, p.part), n: nL, label: p.label, dx: p.dx, dy: p.dy, len: p.len }, extra));
  const expN = () => SITES.R5.n;
  P.expHands = { t: T.expOut, title: 'c) Expansion: hands flat on the lower ribs, thumbs at the spine (breathed out)', cam: { pos: [-12.0, 16.8, 0.0], target: [-2.1, 9.75, 0], fov: 20, aperture: 0 }, review: () => REV.gapItems([
    ...handGaps('R', [{ part: 'palm', label: 'R palm', dx: 18, dy: 30 }, { part: 'index', label: 'R fingers', dx: 18, dy: -10 }], W.backHit(-1.1, 3.4).n),
    ...handGaps('L', [{ part: 'palm', label: 'L palm', dx: -18, dy: 30 }, { part: 'index', label: 'L fingers', dx: -18, dy: -10 }], W.backHit(1.1, 3.4).n),
    ...handGaps('R', [{ part: 'thumb', label: 'R thumb hovers', dx: 18, dy: -50, len: 0.5 }], expN()),
    ...handGaps('L', [{ part: 'thumb', label: 'L thumb hovers', dx: -18, dy: -50, len: 0.5 }], SITES.L5.n),
  ]).concat(sideLabels()) };
  P.expSkin = { t: T.expOut, title: 'c) Skin level: the thumbs hover just off the skin at the spine', cam: () => skinCam(W.EX.R.hand.world('thumbPad').lerp(W.EX.L.hand.world('thumbPad'), 0.5), V(0, 0, -1), V(0, 1, 0.0).normalize(), 1.6, 0.16, 20), review: () => REV.gapItems([
    ...handGaps('R', [{ part: 'thumb', label: 'R thumb gap', dx: 18, dy: -30, len: 0.18 }], expN()),
    ...handGaps('L', [{ part: 'thumb', label: 'L thumb gap', dx: -18, dy: -30, len: 0.18 }], SITES.L5.n),
  ]) };
  P.tvf = { t: T.tvf, title: 'c) Tactile vocal fremitus: the flat palm on the upper zone, right', cam: { pos: [-11.8, 17.6, 4.0], target: [-2.0, 11.1, -0.2], fov: 22, aperture: 0 }, review: () => REV.gapItems(handGaps('R', [{ part: 'palm', label: 'palm', dx: 18, dy: 30 }, { part: 'middle', label: 'fingers', dx: 18, dy: -20 }], SITES.R1.n)).concat(sideLabels()) };
  P.tvfL = { t: c.TVF[1].on + 0.3, title: 'c) Tactile vocal fremitus: the same place on the left', cam: { pos: [-11.8, 17.6, 1.0], target: [-2.0, 11.0, -0.4], fov: 22, aperture: 0 }, review: () => REV.gapItems(handGaps('R', [{ part: 'palm', label: 'palm', dx: -18, dy: 30 }, { part: 'middle', label: 'fingers', dx: -18, dy: -20 }], SITES.L1.n)).concat(sideLabels()) };
  P.tvfLow = { t: c.TVF[4].on + 0.3, title: 'c) Tactile vocal fremitus: lower zone, right', cam: { pos: [-11.8, 16.6, 4.0], target: [-2.0, 10.0, -0.2], fov: 22, aperture: 0 }, review: () => REV.gapItems(handGaps('R', [{ part: 'palm', label: 'palm', dx: 18, dy: 30 }, { part: 'middle', label: 'fingers', dx: 18, dy: -20 }], SITES.R5.n)).concat(sideLabels()) };
  P.tvfSkin = { t: T.tvf, title: 'c) Skin level: palm flat on the skin', cam: () => skinCam(W.EX.R.hand.world('palm'), SITES.R1.n, V(1, 0.15, 0), 2.0, 0.12, 24), review: () => REV.gapItems(handGaps('R', [{ part: 'palm', label: 'palm', dx: 18, dy: 30, len: 0.15 }, { part: 'middle', label: 'middle finger', dx: 18, dy: -30, len: 0.15 }, { part: 'little', label: 'little finger', dx: -18, dy: -30, len: 0.15 }], SITES.R1.n)) };
  P.perc = { t: T.perc, title: 'c) Percussion: left middle finger flat in the rib space, right middle fingertip strikes it', cam: { pos: [-11.6, 18.0, 3.5], target: [-2.0, 11.0, -0.4], fov: 20, aperture: 0 }, review: () => REV.gapItems([
    ...handGaps('L', [{ part: 'middle', label: 'L middle finger (only finger on the skin)', dx: 18, dy: 34 }, { part: 'index', label: 'L index lifted', dx: -18, dy: -30 }, { part: 'ring', label: 'L ring lifted', dx: -18, dy: 26 }], SITES.R1.n),
  ]).concat(sideLabels()) };
  P.percSkin = { t: T.perc, title: 'c) Skin level: the strike frame', cam: () => { const p = W.EX.L.hand.world('middleMidBack'), n = nW(SITES.R1.n); return { pos: p.clone().addScaledVector(n, 2.6).add(V(0, 1.2, 0.5)).toArray(), target: p.toArray(), fov: 24, aperture: 0 }; }, review: () => {
    const it = REV.gapItems(handGaps('L', [{ part: 'middle', label: 'L middle finger on skin', dx: -18, dy: 34, len: 0.15 }, { part: 'little', label: 'L little lifted', dx: 18, dy: 30, len: 0.15 }], SITES.R1.n));
    // the striking fingertip on the middle bone of the left middle finger
    const tip = W.EX.R.hand.world('middleTip'), tgt = W.EX.L.hand.world('middleMidBack'), d = tip.distanceTo(tgt);
    it.push({ type: 'dot', p: tgt, color: '#ffffff', r: 6, label: 'R fingertip on the middle bone: ' + W.mm(Math.max(0, d - 0.1)), dx: 18, dy: -40, size: 22 });
    return it;
  } };
  P.steth = { t: T.aus, title: 'c) Auscultation: the diaphragm pressed firmly at level 1, right', cam: { pos: [-11.8, 17.8, 4.0], target: [-2.0, 11.1, -0.2], fov: 22, aperture: 0 }, review: () => [{ type: 'dot', p: W.piece.localToWorld(V(0, 0.02, 0.22)), color: '#ffffff', r: 6, label: 'diaphragm flat on the skin', dx: 18, dy: -30, size: 22 }].concat(sideLabels()) };
  P.stethSkin = { t: T.aus, title: 'c) Skin level: diaphragm pressed firmly (gap 0)', cam: () => skinCam(W.piece.getWorldPosition(V(0, 0, 0)), SITES.R1.n, V(1, 0.1, 0), 2.0, 0.1, 22), review: () => {
    const it = [], pc = W.piece; pc.updateMatrixWorld(true);
    const n = nW(SITES.R1.n);
    for (const a of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
      const p = pc.localToWorld(V(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2));
      W.torso.updateMatrixWorld(true);
      const rc = new THREE.Raycaster(p.clone().addScaledVector(n, 0.5), n.clone().negate()), h = rc.intersectObject(W.torsoMesh, false)[0];
      const g = h ? h.distance - 0.5 : 0;
      window.REVIEW_REPORT = (window.REVIEW_REPORT || []).concat([{ part: 'diaphragm rim ' + Math.round(a * 57.3), gap_mm: +(g * 100).toFixed(2) }]);
      if (a === 0 || a === Math.PI) it.push({ type: 'arrow', a: p.clone().addScaledVector(n, 0.25), b: p, color: COL.gap, label: 'rim ' + W.mm(g), dx: a ? -18 : 18, dy: -26, size: 22, head: 12, w: 3 });
    }
    return it;
  } };

  // ---------------- d) expansion: breathed out / breathed in, same camera, with the 5 cm arrow
  const expCam = { pos: [-11.6, 16.4, 0.0], target: [-2.15, 9.6, 0], fov: 15, aperture: 0 };
  const thumbArrow = (lab) => () => {
    const a = W.EX.R.hand.world('thumbTip'), b = W.EX.L.hand.world('thumbTip'), d = a.distanceTo(b);
    const out = V(-0.15, 0, 0);
    window.REVIEW_REPORT = (window.REVIEW_REPORT || []).concat([{ part: 'thumb tips apart (' + lab + ')', cm: +(d * 10).toFixed(2) }]);
    return [{ type: 'arrow', a: a.clone().add(out), b: b.clone().add(out), both: true, color: '#ffffff', label: lab + ': thumb tips ' + (d * 10).toFixed(1) + ' cm apart', dx: -170, dy: -60, size: 26, w: 4 }];
  };
  P.expOut = { t: T.expOut, title: 'd) Expansion - breathed out', cam: expCam, review: thumbArrow('breathed out') };
  P.expIn = { t: T.expIn, title: 'd) Expansion - deep breath in: each thumb moves 2.5 cm, 5 cm in total', cam: expCam, review: thumbArrow('breathed in') };

  // ---------------- e) plan view
  P.plan = { t: T.sit, title: 'e) Plan view from above (head at screen left, as in the series)', cam: { pos: [-2.5, 46, 0.001], target: [-2.5, 6, 0], fov: 28, aperture: 0, up: [0, 0, -1] }, review: () => {
    const cam = W.CAMS.back, cp = V(...cam.pos), tg = V(...cam.target);
    return [
      { type: 'dot', p: tW(-1.6, 4.6, 0), color: COL.R, label: 'his RIGHT (examiner side, nearer the camera in the home shot)', dx: 20, dy: 40, size: 24 },
      { type: 'dot', p: tW(1.6, 4.6, 0), color: COL.L, label: 'his LEFT', dx: 20, dy: -40, size: 24 },
      { type: 'dot', p: [1.0, 8, 6.4], color: '#5a8fd8', label: 'examiner stands here (his right)', dx: 18, dy: 10, size: 24 },
      { type: 'dot', p: [-4.6, 7.6, -7.6], color: '#c69f77', label: 'bedside table (his left, near his head)', dx: 18, dy: 0, size: 24 },
      { type: 'arrow', a: [cp.x, 8, cp.z], b: [K.lerp(cp.x, tg.x, 0.7), 8, K.lerp(cp.z, tg.z, 0.7)], color: '#ffffff', label: 'back camera: behind his right shoulder, above', dx: -40, dy: 40, size: 24, w: 5 },
      { type: 'dot', p: [-8.5, 12, 0], color: '#c8cbcf', label: 'backrest', dx: -18, dy: -30, size: 22 },
      { type: 'dot', p: [9.5, 8, 0], color: '#f3efe7', label: 'feet', dx: -18, dy: -30, size: 22 },
    ];
  } };
  // ---------------- the beat key frames (the captioned version, the real timeline camera)
  const B = {
    home: { t: 0.5 },
    b1: { t: 4.6 }, b1b: { t: 6.6 },
    b2: { t: 9.6 },
    b3: { t: 18.2, arrow: true },
    b4: { t: c.TVF[1].say + 0.25 },
    b5: { t: c.PERC[5].strikes[0] },
    b6: { t: c.AUS[0].on + 1.6 }, b6b: { t: c.AUS[1].on + 2.0 }, b6c: { t: c.AUS[7].on + 0.45 },
    b7: { t: c.VR[3].say + 0.25 },
    b8: { t: 82.7 }, end: { t: 86.6 },
  };
  for (const [k, v] of Object.entries(B)) P[k] = Object.assign({ beat: true }, v);
  window.PANELS = P;
  window.panel = (name) => {
    const p = P[name];
    window.__T = p.t;
    if (p.beat) {
      window.CAM_OVERRIDE = null; window.REVIEW_REPORT = [];
      // storyboard only: the 5 cm measurement on the expansion frame
      window.REVIEW = p.arrow ? { captions: true, build: () => { const a = W.EX.R.hand.world('thumbTip'), b = W.EX.L.hand.world('thumbTip'); return [{ type: 'arrow', a: a.clone().add(V(-0.12, -0.05, 0)), b: b.clone().add(V(-0.12, -0.05, 0)), both: true, color: '#ffffff', label: 'storyboard only: thumbs ' + (a.distanceTo(b) * 10).toFixed(1) + ' cm apart (5 cm wider than breathed out)', dx: 24, dy: 95, size: 24, w: 4 }]; } } : null;
      return p.t;
    }
    window.seek(p.t, 1);                       // pose the world at the panel's time first (cameras that read the pose)
    const cam = typeof p.cam === 'function' ? p.cam() : p.cam;
    window.CAM_OVERRIDE = cam;
    window.REVIEW = { title: p.title, build: p.review };
    window.REVIEW_REPORT = [];
    return p.t;
  };
})();
