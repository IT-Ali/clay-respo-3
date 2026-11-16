// cvs1-style.js: "Soft Clay" style object for PART 1 OF 3 of the cardiovascular examination (general examination:
// position, general look, hands, face and eyes, ankle oedema). Classic script. Needs THREE, K (lib/stage.js), SOUND
// (lib/sound.js) and the shared/ scripts. Defines window.CVS1 (the style object).
// Units: 1 = 10 cm. Head at screen left (-X), feet at screen right (+X), the patient's RIGHT side toward the camera (+Z).
(function (root) {
  const THREE = root.THREE, K = root.K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ================================================================ CONTENT (the story, in order; times in seconds)
  const D = 100;
  const HOME_HOLD = 1.0;
  const BEATS = [
    { n: 1, name: 'Position', t0: 0, t1: 6 },
    { n: 2, name: 'General look', t0: 6, t1: 13 },
    { n: 3, name: 'Hands - look', t0: 13, t1: 21, hold: [13.0, 14.5] },
    { n: 4, name: 'Temperature', t0: 21, t1: 27 },
    { n: 5, name: 'Clubbing', t0: 27, t1: 34 },
    { n: 6, name: 'Nails, palms and pulps', t0: 34, t1: 42 },
    { n: 7, name: 'Tendons', t0: 42, t1: 47 },
    { n: 8, name: 'Tremor', t0: 47, t1: 53, hold: [47.2, 48.7] },
    { n: 9, name: 'Tongue and lips', t0: 53, t1: 60, hold: [54.2, 55.7] },
    { n: 10, name: 'Eyelids and iris', t0: 60, t1: 66 },
    { n: 11, name: 'Conjunctiva', t0: 66, t1: 73, hold: [66.8, 68.3] },
    { n: 12, name: 'Cheeks', t0: 73, t1: 77 },
    { n: 13, name: 'Ankle oedema', t0: 77, t1: 100, hold: [80.9, 82.4] },
  ];
  const CAPTIONS = [
    { t0: 1.2, t1: 5.7, text: 'Reclined at 45°, chest exposed - stand on his right', place: 'top' },
    { t0: 7.0, t1: 9.7, text: 'Comfortable at rest, pink, not breathless', place: 'top' },
    { t0: 10.0, t1: 12.4, text: 'Bedside: no GTN spray, no oxygen', place: 'top' },
    { t0: 17.2, t1: 20.8, text: 'No tobacco staining, no peripheral cyanosis', place: 'top' },
    { t0: 22.6, t1: 26.8, text: 'Warm and well perfused', place: 'top' },
    { t0: 29.6, t1: 33.8, text: 'Normal nail-bed angle - no clubbing', place: 'top' },
    { t0: 35.0, t1: 41.7, text: "No splinter haemorrhages, Janeway lesions or Osler's nodes", place: 'top' },
    { t0: 43.0, t1: 46.5, text: 'No xanthomata', place: 'top' },
    { t0: 50.1, t1: 52.9, text: 'Arms out: no fine tremor', place: 'top' },
    { t0: 56.8, t1: 59.8, text: 'Pink tongue and lips - no central cyanosis', place: 'top' },
    { t0: 61.6, t1: 65.8, text: 'No xanthelasma, no corneal arcus', place: 'top' },
    { t0: 70.2, t1: 72.9, text: 'Pink conjunctiva - no pallor, no petechiae', place: 'top' },
    { t0: 74.1, t1: 76.8, text: 'No malar flush', place: 'top' },
    { t0: 83.6, t1: 87.0, text: 'Press over the bone, 2 cm above the medial malleolus, for 15 s', place: 'top' },
    { t0: 87.2, t1: 90.4, text: 'The pit stays = pitting oedema', place: 'top' },
    { t0: 93.8, t1: 96.6, text: 'Both legs: bilateral pitting oedema', place: 'top' },
  ];
  // the ankle beat, in detail (seconds)
  const A = {
    travel: [77.0, 78.4], fold: [78.4, 79.8], roll: [79.8, 80.9], hold: [80.9, 82.4], toR: [82.4, 83.3], clockIn: [82.8, 83.2],
    approachR: [83.3, 83.9], pressR: [83.9, 86.9], liftR: [86.9, 87.3], pitR: [87.3, 88.3], fillR: [88.3, 90.4],
    toL: [90.4, 91.4], approachL: [91.4, 91.8], pressL: [91.8, 93.6], liftL: [93.6, 93.9], pitL: [93.9, 95.0], fillL: [95.0, 96.0],
    rollDown: [96.0, 96.6], unfold: [96.6, 97.4], clockOut: [96.0, 96.4], back: [96.0, 97.6],
  };
  const PIT = 0.04;   // 4 mm

  // ================================================================ the style
  const style = {
    id: 'cvs1-soft-clay', name: 'Soft Clay - CVS part 1: general examination', duration: D,
    fonts: ['600 56px "Fredoka"'],
    render: Object.assign({}, root.SET.RENDER, { samples: 24 }),
    content: { BEATS, CAPTIONS, A, HOME_HOLD },
    captions: true,      // the CAPTIONS switch (window.CAPTIONS = false renders the clean version)

    build(S) {
      const SET = root.SET, BED = root.BED, PATIENT = root.PATIENT, SHEET = root.SHEET, HANDS = root.HANDS, PROPS = root.PROPS, CLAY = root.CLAY, CAPTION = root.CAPTION;
      const L = SET.build(S);
      const bed = BED.build(S);
      const table = BED.table(S);
      const P = PATIENT.build(S, {});
      const SH = SHEET.build(S, P);
      bed.placePillow(P.headBack(), 7.15);
      const exM = { glove: CLAY.mat('#5a8fd8', '#3e73c3', { rough: 0.42, sheen: 0.25, streak: 0.5, freq: 2, tile: 0.8, bump: 0.45, lump: 0.006, lumpSize: 0.6 }), sleeve: CLAY.mat('#24636a', '#1d5359', { rough: 0.82, streak: 0.4, scale: 1.6, side: THREE.DoubleSide }) };
      const EX = { R: HANDS.examinerArm(S, exM, 'R'), L: HANDS.examinerArm(S, exM, 'L') };
      const clock = PROPS.clock(S);
      const hs = (x, z) => SH.heightAt(x, z);
      const Dm = BED.DIM;

      // ------------------------------------------------------------ patient arm states (wrist, hand turn, hand pose)
      const q = (f, d) => HANDS.quat(f, d);
      const relaxed = { all: [0.22, 0.32, 0.18], spread: 0.8, thumb: [0.15, 0, 0.12, 0.08] };
      const flat = { all: [0.06, 0.08, 0.04], spread: 1, thumb: [0.1, 0, 0.08, 0.05] };
      const pole = (side) => V(0, -1, side === 'R' ? 0.7 : -0.7);
      const restArm = (side) => {
        const sz = side === 'R' ? 1 : -1, x = 0.15, z = sz * 2.6;
        return { wrist: V(x, Math.max(hs(x, z), hs(x + 0.9, z)) + 0.19, z), quat: q(V(1, -0.1, -sz * 0.12), V(0, 1, 0)), pose: relaxed, pole: pole(side) };
      };
      const lapArm = (side) => {
        const sz = side === 'R' ? 1 : -1, x = -1.2, z = sz * 0.86;
        let top = 0; for (let k = 0; k <= 6; k++) top = Math.max(top, hs(x + 0.15 * k, z));
        return { wrist: V(x, top + 0.17, z), quat: q(V(1, -0.18, -sz * 0.14), V(0, 1, 0)), pose: flat, pole: V(0, -0.4, sz) };
      };
      // examiner hands palm up on the sheet over his lap, side by side, fingers pointing away (-Z): a tray
      const trayEx = (side) => {
        const x = side === 'L' ? -0.85 : 0.1, z = 0.12;
        let top = 0; for (let k = -3; k <= 3; k++) top = Math.max(top, hs(x, z + 0.3 * k), hs(x + 0.3, z + 0.3 * k));
        const quat = q(V(side === 'L' ? 0.12 : -0.05, 0.08, -1), V(0, -1, 0));
        return { contact: 'dorsum', at: V(x, top + 0.02, z + 0.25), quat, pose: { all: [0.1, 0.12, 0.08], spread: 0.6, thumb: [0.05, 0, 0.1, 0.05] }, back: V(0.05, -0.35, 1) };
      };
      // place an examiner state (contact point at a world point) -> concrete wrist + quat
      const exSolve = (side, st) => {
        const hand = EX[side].hand; hand.pose(st.pose);
        const w = HANDS.place(hand, st.contact, st.at, st.quat);
        return { wrist: w, quat: st.quat.clone(), pose: st.pose, back: st.back || V(0, -0.3, 1) };
      };
      // place a patient hand so a contact point lies on a world point -> arm state
      const ptSolve = (side, contact, at, quat, pose, pl) => {
        const hand = P.arms[side].hand; hand.pose(pose);
        const w = HANDS.place(hand, contact, at, quat);
        return { wrist: w, quat: quat.clone(), pose, pole: pl || pole(side) };
      };
      const applyArm = (side, st) => P.setArm(side, st.wrist, st.quat, st.pose, st.pole);
      const applyEx = (side, st) => { const a = EX[side]; a.hand.pose(st.pose); if (st.thumbQ) { const t = a.hand.thumb; t.meta.quaternion.copy(st.thumbQ[0]); t.mcp.quaternion.copy(st.thumbQ[1]); t.ip.quaternion.copy(st.thumbQ[2]); } a.hand.group.position.copy(st.wrist); a.hand.group.quaternion.copy(st.quat); a.follow(st.back); };

      const ST = { arm: {}, ex: {} };
      // rest
      ST.arm.rest = { R: restArm('R'), L: restArm('L') };
      // examiner at rest: hands resting on the mattress edge at his right side, wrists at the edge
      const exRest = (side) => {
        const x = side === 'R' ? 2.9 : -0.9, z = 3.75;
        return { contact: 'palm', at: V(x, hs(x, z) + 0.012, z), quat: q(V(side === 'R' ? -0.75 : 0.75, -0.04, -0.66), V(0, 1, 0)), pose: { all: [0.16, 0.24, 0.14], spread: 0.8, thumb: [0.12, 0, 0.1, 0.06] }, back: V(side === 'R' ? 0.8 : -0.8, -0.04, 0.75) };
      };
      ST.ex.rest = { R: exSolve('R', exRest('R')), L: exSolve('L', exRest('L')) };
      // lap: hands forward on the sheet over his lap, palms down
      ST.arm.lap = { R: lapArm('R'), L: lapArm('L') };
      // tray: the examiner's hands palm up under his hands; his hands rest on them palms down
      ST.ex.tray = { R: exSolve('R', trayEx('R')), L: exSolve('L', trayEx('L')) };
      applyEx('R', ST.ex.tray.R); applyEx('L', ST.ex.tray.L);
      const exPalmTop = (side, x, z) => {      // height of the examiner's palm surface near (x, z)
        const h = EX[side].hand; h.group.updateMatrixWorld(true); return h.world('palm').y + 0.03;
      };
      const trayTop = Math.max(exPalmTop('L'), exPalmTop('R'));
      ST.arm.tray = {};
      ST.arm.trayUp = {};
      for (const side of ['R', 'L']) {
        const sz = side === 'R' ? 1 : -1;
        const qd = q(V(1, -0.06, -sz * 0.1), V(0, 1, 0)), qu = q(V(1, -0.06, -sz * 0.1), V(0, -1, 0));
        ST.arm.tray[side] = ptSolve(side, 'palm', V(-0.45, trayTop + 0.035, sz * 0.9), qd, flat, V(0, -0.4, sz));
        ST.arm.trayUp[side] = ptSolve(side, 'dorsum', V(-0.45, trayTop + 0.03, sz * 0.9), qu, { all: [0.12, 0.14, 0.08], spread: 0.9, thumb: [0.05, 0.2, 0.1, 0.05] }, V(0, -0.4, sz));
      }
      // temperature: backs of the examiner's fingers on the back of his hand (right, then left)
      const tempEx = (pside) => {
        applyArm(pside, ST.arm.lap[pside]);
        const at = P.arms[pside].hand.world('dorsum').add(V(0, 0.012, 0));
        return exSolve('R', { contact: 'middleMidBack', at, quat: q(V(-0.15, -0.1, -1), V(0, -1, -0.08)), pose: { all: [-0.05, 0.04, 0.02], spread: 0.45, thumb: [0.35, 0.3, 0.2, 0.1] }, back: V(0.2, -0.45, 1) });
      };
      ST.ex.tempR = { R: tempEx('R'), L: ST.ex.rest.L };
      ST.ex.tempL = { R: tempEx('L'), L: ST.ex.rest.L };
      applyArm('R', ST.arm.lap.R); applyArm('L', ST.arm.lap.L);
      // clubbing: his right hand turned thumb-up, index finger straight, the other fingers curled; the examiner
      // pinches the index finger between thumb (on the back of the finger) and index (behind it)
      const idxPose = { curl: { index: [0.0, 0.0, 0.0], middle: [1.25, 1.35, 0.8], ring: [1.3, 1.4, 0.8], little: [1.3, 1.4, 0.8] }, spread: 0.4, thumb: [0.6, 0.6, 0.5, 0.4] };
      {
        const qd = q(V(1, -0.05, -0.05), V(0, 0.05, 1));     // dorsum toward +Z (the examiner), thumb up
        ST.arm.index = { R: ptSolve('R', 'wrist', V(-0.75, hs(0, 1.0) + 0.95, 1.05), qd, idxPose, V(0, -1, 0.6)), L: ST.arm.lap.L };
      }
      applyArm('R', ST.arm.index.R);
      {
        const pH = P.arms.R.hand, at = pH.world('indexProxBack');
        const nrm = V(0, 0, 1).applyQuaternion(ST.arm.index.R.quat).normalize();   // the back of his finger faces +Z
        ST.ex.pinch = { R: exSolve('R', { contact: 'thumbPad', at: at.clone().addScaledVector(nrm, 0.012), quat: q(V(0.25, -0.92, -0.25), V(0.15, 0.1, 1)), pose: { curl: { index: [0.9, 1.1, 0.7], middle: [1.2, 1.3, 0.8], ring: [1.3, 1.4, 0.8], little: [1.3, 1.4, 0.8] }, spread: 0.3, thumb: [0.35, 0.3, 0.25, 0.15] }, back: V(0.25, -0.2, 1) }), L: ST.ex.rest.L };
      }
      // tremor: both arms straight out in front, palms down, fingers apart
      const outArm = (side) => {
        const sz = side === 'R' ? 1 : -1, sh = P.shoulder(side), dir = V(1, 0.42, -sz * 0.05).normalize();
        return { wrist: sh.clone().addScaledVector(dir, 5.5), quat: q(dir.clone().add(V(0, -0.06, 0)), V(0, 1, 0)), pose: { all: [0.0, 0.02, 0.01], fan: { index: -0.26, middle: -0.05, ring: 0.17, little: 0.38 }, thumb: [-0.2, 0, 0.05, 0.02] }, pole: V(0, -1, sz * 0.3) };
      };
      ST.arm.out = { R: outArm('R'), L: outArm('L') };
      // conjunctiva: the pad of the examiner's right index finger on the cheek just below his right lower eyelid
      P.group.updateMatrixWorld(true);
      const headX = V(1, 0, 0).transformDirection(P.head.matrixWorld), headY = V(0, 1, 0).transformDirection(P.head.matrixWorld);
      const lidEx = (pull) => {
        const at = P.anchor('RcheekBelowEye'), n = P.anchorNormal('RcheekBelowEye');
        at.addScaledVector(n, 0.004).addScaledVector(headY, -0.035 * pull);
        const fdir = headX.clone().multiplyScalar(0.95).addScaledVector(headY, 0.12).addScaledVector(n, -0.32).normalize();
        return exSolve('R', { contact: 'indexPad', at, quat: q(fdir, n.clone().addScaledVector(headY, -0.2)), pose: { curl: { index: [0.15, 0.12, 0.08], middle: [1.3, 1.5, 0.9], ring: [1.35, 1.5, 0.9], little: [1.35, 1.5, 0.9] }, spread: 0.3, thumb: [0.5, 0.4, 0.4, 0.3] }, back: V(0.1, -0.55, 1) });
      };
      ST.ex.lid0 = { R: lidEx(0), L: ST.ex.rest.L };
      ST.ex.lid1 = { R: lidEx(1), L: ST.ex.rest.L };
      // The ankle grips. The examiner stands on his RIGHT and uses the RIGHT hand on both legs. The hand lies against the
      // side of the lower leg nearest the examiner (the outer side of his right leg, the inner side of his left leg), fingers
      // along the leg toward the foot and curled round toward the back of the calf; the THUMB comes over the top of the shin
      // and its pad presses into the bone on the inner (medial) face, 2 cm above the medial malleolus. The thumb is placed
      // joint by joint (thumbIK): the pad exactly on the press point and facing into the bone, the nail facing out. So the
      // palm stays beside the leg, never over the press point, and the camera above his right side sees the thumb.
      const legDist = (p, leg) => [P.legSDF(leg, p), 0];   // [distance from the surface of the lower leg or foot (negative = inside)]
      const S_ = 1.04, TB = [0.1, -0.06, -0.24], PAD = [0.174, -0.1169];       // examiner hand scale; thumb base (CMC) and pad (in the distal phalanx) in hand units
      const qW = new THREE.Quaternion(), w_ = V(0, 0, 0);
      const segQ = (dir, nail) => { const x = dir.clone().normalize(), y = nail.clone().addScaledVector(x, -nail.dot(x)).normalize(), z = new THREE.Vector3().crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
      // place the thumb so its pad sits on point Pt facing into the surface (normal n): returns local quaternions [meta, mcp, ip]
      const thumbIK = (hand, Pt, n) => {
        hand.group.updateMatrixWorld(true);
        const C = hand.thumb.base.getWorldPosition(V(0, 0, 0)), Qg = hand.group.getWorldQuaternion(new THREE.Quaternion());
        const t = Pt.clone().sub(C); t.addScaledVector(n, -t.dot(n)).normalize();          // the thumb lies across the skin, coming from its base
        const B = Pt.clone().addScaledVector(t, -S_ * PAD[0]).addScaledVector(n, -S_ * PAD[1]);   // the IP joint
        const r1 = S_ * 0.42, r2 = S_ * 0.32, e = B.clone().sub(C), d = Math.min(e.length(), r1 + r2 - 1e-4); e.normalize();
        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
        const wv = n.clone().addScaledVector(e, -n.dot(e)).normalize();                   // the knuckle bulges away from the skin
        const Am = C.clone().addScaledVector(e, a).addScaledVector(wv, h);
        const qm = segQ(Am.clone().sub(C), n), qp = segQ(B.clone().sub(Am), n), qd = segQ(t, n);
        return [Qg.clone().invert().multiply(qm), qm.clone().invert().multiply(qp), qp.clone().invert().multiply(qd)];
      };
      const thumbQOf = (side, pose) => { const h = EX[side].hand; h.pose(pose); return [h.thumb.meta.quaternion.clone(), h.thumb.mcp.quaternion.clone(), h.thumb.ip.quaternion.clone()]; };
      const legC = (leg, x) => { const u = 1.0 + (x - 2.4) / 4.32 * 0.15, v = 6.62 - (x - 2.4) / 4.32 * 0.19; return V(x, v, leg === 'R' ? u : -u); };   // the shin's axis
      const GRIP = {
        R: { side: 'R', F: V(0.55, -0.8, -0.1), D: V(0, 0.3, 1), base: [-0.34, 0.47, 0.33] },   // base: thumb base from the shin axis [along, toward the examiner, up]
        L: { side: 'R', F: V(0.55, -0.8, -0.1), D: V(0, 0.3, 1), base: [-0.34, 0.5, 0.26] },
      };
      const buildGrip = (leg, G) => {
        const hand = EX[G.side].hand, n = P.anchorNormal(leg + 'press'), Pp = P.anchor(leg + 'press');
        G.quat = q(G.F, G.D); G.back = V(-0.25, 0.2, 1).normalize();          // the forearm leaves low toward his right side, along the mattress, below the leg in the shot
        const curl = { index: [0, 0, 0], middle: [0, 0, 0], ring: [0, 0, 0], little: [0, 0, 0] };
        hand.pose({ curl, spread: 0.3 }); hand.group.quaternion.copy(G.quat);
        const tbW = V(...TB).multiplyScalar(S_).applyQuaternion(G.quat);
        let Ct = legC(leg, Pp.x + G.base[0]).add(V(0, G.base[2], G.base[1]));
        const body = []; hand.body.children.forEach((m) => { if (m.isMesh) body.push(m); });
        for (let it = 0; it < 40; it++) {                                        // the palm rests against the side of the leg
          hand.group.position.copy(Ct).sub(tbW); hand.group.updateMatrixWorld(true);
          let worst = 1;
          for (const m of body) { const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 5) { w_.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); worst = Math.min(worst, legDist(w_, leg)[0]); } }
          if (worst > 0.004) break;
          Ct.add(V(0, 0.003, 0.01));
        }
        G.wrist = hand.group.position.clone();
        // curl each finger just until it rests on the leg (round toward the back of the calf) or on the mattress
        for (const k of ['index', 'middle', 'ring', 'little']) {
          let best = null;
          for (let c = 0; c <= 1.9; c += 0.025) {
            curl[k] = [0.55 * c, c, 0.7 * c]; hand.pose({ curl, spread: 0.3 }); hand.group.updateMatrixWorld(true);
            let inside = 0; hand.fingers[k].mcp.traverse((m) => { if (!m.isMesh) return; const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += 7) { w_.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); inside += Math.max(0, -0.004 - legDist(w_, leg)[0]) + Math.max(0, Dm.Ym - 0.012 - w_.y); } });
            const tp = hand.world(k + 'Pad'), d = Math.min(legDist(tp, leg)[0], tp.y - Dm.Ym + 0.01), e = 40 * inside + Math.abs(d - 0.006);   // (the soft mattress gives a little under the fingertips)
            if (!best || e < best.e) best = { e, c };
          }
          curl[k] = [0.55 * best.c, best.c, 0.7 * best.c];
        }
        G.pose = { curl, spread: 0.3, thumb: [1.0, 0.4, 0.3, 0.2] };
      };
      buildGrip('R', GRIP.R); buildGrip('L', GRIP.L);
      // the grip with the thumb pad `depth` into the skin; `lift` raises the whole hand off the leg along the normal
      const pressEx = (leg, depth, lift = 0) => {
        const G = GRIP[leg], hand = EX[G.side].hand, n = P.anchorNormal(leg + 'press'), Pt = P.anchor(leg + 'press').addScaledVector(n, 0.004 - depth + lift);
        const wrist = G.wrist.clone().addScaledVector(n, lift);
        hand.pose(G.pose); hand.group.position.copy(wrist); hand.group.quaternion.copy(G.quat);
        return { wrist, quat: G.quat.clone(), pose: G.pose, back: G.back, thumbQ: thumbIK(hand, Pt, n) };
      };
      const hover = (leg) => pressEx(leg, 0, 0.3);
      const nR = P.anchorNormal('Rpress'), nL = P.anchorNormal('Lpress');
      const pressState = (leg, st) => { const o = { R: ST.ex.rest.R, L: ST.ex.rest.L }; o[GRIP[leg].side] = st; return o; };
      ST.ex.pressR = pressState('R', pressEx('R', PIT));
      ST.ex.hoverR = pressState('R', hover('R'));
      ST.ex.pressL = pressState('L', pressEx('L', PIT));
      ST.ex.hoverL = pressState('L', hover('L'));
      root.CVS1_GRIP = GRIP;
      // sheet and trousers: the examiner's hands hold the fold of the sheet, then the trouser cuffs
      const foldEx = (u) => {
        const xf = K.lerp(SH.x1 + 0.01, SHEET.FOLD_TO, u);
        const mk = (side, z) => { const x = Math.max(xf + 0.1, SHEET.FOLD_TO + 0.2); return exSolve(side, { contact: 'indexPad', at: V(x, hs(Math.min(x, 9.5), z) + 0.33 + 0.05 * u, z), quat: q(V(-1, -0.35, side === 'R' ? 0.25 : -0.05), V(0.2, 1, 0)), pose: { all: [0.7, 0.9, 0.6], spread: 0.5, thumb: [0.6, 0.4, 0.5, 0.4] }, back: V(0.6, -0.1, 1) }); };
        return { R: mk('R', 1.45), L: mk('L', -0.9) };
      };
      ST.ex.fold0 = foldEx(0); ST.ex.fold1 = foldEx(1);
      const cuffEx = (u) => {
        const sEnd = K.lerp(6.12, 4.3, u);
        const mk = (side, z) => exSolve(side, { contact: 'indexPad', at: V(sEnd + 0.02, 7.08, z), quat: q(V(-0.2, -0.7, side === 'R' ? -0.6 : 0.6).normalize(), V(-0.6, 0.6, side === 'R' ? 0.4 : -0.4)), pose: { all: [0.6, 0.8, 0.5], spread: 0.4, thumb: [0.6, 0.5, 0.5, 0.4] }, back: V(0.4, 0.1, 1) });
        return { R: mk('R', 1.35), L: mk('L', -1.0) };
      };
      ST.ex.cuff0 = cuffEx(0); ST.ex.cuff1 = cuffEx(1);

      // ------------------------------------------------------------ timelines
      // keyed states: [time, stateName]; between two different states the pose moves over the gap (eased)
      const lerpSt = (a, b, u, isEx, side) => {
        const o = { wrist: a.wrist.clone().lerp(b.wrist, u), quat: a.quat.clone().slerp(b.quat, u), pose: blendPose(a.pose, b.pose, u) };
        if (isEx) o.back = a.back.clone().lerp(b.back, u).normalize(); else o.pole = a.pole.clone().lerp(b.pole, u).normalize();
        if (isEx && (a.thumbQ || b.thumbQ)) {                    // a thumb placed joint by joint: turn each joint smoothly
          const ta = a.thumbQ || thumbQOf(side, a.pose), tb = b.thumbQ || thumbQOf(side, b.pose);
          o.thumbQ = ta.map((qq, i) => qq.clone().slerp(tb[i], u));
        }
        return o;
      };
      const PK = ['index', 'middle', 'ring', 'little'];
      function blendPose(a, b, u) {
        const ca = (p, k) => (p.curl && p.curl[k]) || p.all || [0.12, 0.18, 0.1];
        const curl = {}; for (const k of PK) curl[k] = ca(a, k).map((v, i) => K.lerp(v, ca(b, k)[i], u));
        const ta = a.thumb || [0.15, 0, 0.12, 0.08], tb = b.thumb || [0.15, 0, 0.12, 0.08];
        const sp0 = a.spread == null ? 1 : a.spread, sp1 = b.spread == null ? 1 : b.spread, F = HANDS.FINGERS;
        const fan = (a.fan || b.fan) ? Object.fromEntries(PK.map((k) => [k, K.lerp(a.fan ? a.fan[k] : F[k].spread * sp0 * 2.2, b.fan ? b.fan[k] : F[k].spread * sp1 * 2.2, u)])) : null;
        return { curl, spread: K.lerp(sp0, sp1, u), fan, thumb: ta.map((v, i) => K.lerp(v, tb[i], u)) };
      }
      const keyed = (keys, table_, isEx) => (t, side) => {
        let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
        const [t0, n0] = keys[i];
        if (i === keys.length - 1 || n0 === keys[i + 1][1]) return table_[n0][side];
        const [t1, n1] = keys[i + 1];
        const u = K.ease.inOut(K.clamp((t - t0) / (t1 - t0)));
        return lerpSt(table_[n0][side], table_[n1][side], u, isEx, side);
      };
      const armKeys = [
        [0, 'rest'], [14.5, 'rest'], [16.0, 'lap'], [16.3, 'lap'], [16.9, 'tray'], [20.9, 'tray'], [21.6, 'lap'],
        [27.0, 'lap'], [28.0, 'index'], [33.9, 'index'], [34.6, 'tray'], [36.0, 'tray'], [37.0, 'trayUp'], [41.9, 'trayUp'], [42.7, 'tray'],
        [46.5, 'tray'], [47.2, 'rest'], [48.7, 'rest'], [49.9, 'out'], [53.0, 'out'], [54.0, 'rest'], [100, 'rest'],
      ];
      const exKeys = [
        [0, 'rest'], [15.6, 'rest'], [16.5, 'tray'], [20.9, 'tray'], [21.5, 'rest'], [21.9, 'rest'], [22.6, 'tempR'], [24.2, 'tempR'], [25.0, 'tempL'], [26.7, 'tempL'], [27.2, 'rest'],
        [27.4, 'rest'], [28.3, 'pinch'], [33.8, 'pinch'], [34.5, 'tray'], [41.9, 'tray'], [42.7, 'tray'], [46.4, 'tray'], [47.1, 'rest'],
        [68.4, 'rest'], [69.4, 'lid0'], [69.7, 'lid0'], [70.3, 'lid1'], [72.8, 'lid1'], [73.6, 'rest'],
        [77.6, 'rest'], [78.3, 'fold0'], [78.4, 'fold0'], [79.8, 'fold1'], [79.85, 'cuff0'], [80.9, 'cuff1'], [81.3, 'rest'],
        [82.3, 'rest'], [83.3, 'hoverR'], [83.9, 'pressR'], [86.9, 'pressR'], [87.3, 'hoverR'], [88.1, 'rest'],
        [90.6, 'rest'], [91.4, 'hoverL'], [91.8, 'pressL'], [93.6, 'pressL'], [93.9, 'hoverL'], [94.6, 'rest'],
        [95.6, 'rest'], [95.95, 'cuff1'], [96.6, 'cuff0'], [96.65, 'fold1'], [97.4, 'fold0'], [97.9, 'rest'], [100, 'rest'],
      ];
      // the fold of the sheet moves with the examiner's hands: rebuild fold states for the in-between times
      const armAt = keyed(armKeys, ST.arm, false);
      const exAt0 = keyed(exKeys, ST.ex, true);
      const exAt = (t, side) => {
        const fu = foldU(t);
        if ((t > A.fold[0] - 0.01 && t < A.fold[1]) || (t > A.unfold[0] && t < A.unfold[1] + 0.01)) return foldEx(fu)[side];
        const ru = rollU(t);
        if ((t > A.roll[0] && t < A.roll[1]) || (t > A.rollDown[0] && t < A.rollDown[1])) return cuffEx(ru)[side];
        return exAt0(t, side);
      };
      const step = (t, a, b) => K.seg(t, a, b, K.ease.inOut);
      const foldU = (t) => (t < A.unfold[0] ? step(t, A.fold[0], A.fold[1]) : 1 - step(t, A.unfold[0], A.unfold[1]));
      const rollU = (t) => (t < A.rollDown[0] ? step(t, A.roll[0], A.roll[1]) : 1 - step(t, A.rollDown[0], A.rollDown[1]));
      const pitAt = (t, leg) => {
        const [pr, lift, fill] = leg === 'R' ? [A.pressR, A.liftR, A.fillR] : [A.pressL, A.liftL, A.fillL];
        const ap = leg === 'R' ? A.approachR : A.approachL;
        if (t < ap[1]) return 0;
        if (t < pr[0] + 0.15) return PIT * K.seg(t, ap[1], pr[0] + 0.15, K.ease.out);   // the thumb sinks in
        if (t < fill[0]) return PIT;                                                     // stays after the thumb lifts
        return PIT * (1 - K.seg(t, fill[0], fill[1], (u) => u));                         // fills back in slowly (sped up)
      };
      // the clock: 15 s for each press, ~12 s for each refill, sped up
      const clockSec = (t) => {
        let s = 0;
        s += 15 * K.seg(t, A.pressR[0], A.pressR[1]) + 12 * K.seg(t, A.fillR[0], A.fillR[1]);
        s += 15 * K.seg(t, A.pressL[0], A.pressL[1]) + 12 * K.seg(t, A.fillL[0], A.fillL[1]);
        return s;
      };
      const clockScale = (t) => (t < A.clockOut[0] ? K.ease.outBack(K.seg(t, A.clockIn[0], A.clockIn[1])) : 1 - K.ease.inBack(K.seg(t, A.clockOut[0], A.clockOut[1])));
      const face = (t) => ({
        jaw: step(t, 55.7, 56.2) * (1 - step(t, 59.9, 60.3)),
        tongue: step(t, 56.0, 56.4) * (1 - step(t, 59.8, 60.0)),
        gazeUp: step(t, 68.3, 68.8) * (1 - step(t, 73.0, 73.4)),
        pullR: step(t, 69.7, 70.3) * (1 - step(t, 72.8, 73.3)),
        blink: 0,
      });

      // ------------------------------------------------------------ camera (smooth; only the camera moves smoothly)
      const H = SET.HOME;
      P.group.updateMatrixWorld(true);
      const faceC = P.head.localToWorld(V(0, -0.15, 0.8)), faceN = V(0, 0, 1).transformDirection(P.head.matrixWorld);
      const eyeR = P.head.localToWorld(V(...P.eyes.R.E)), mouth = P.anchor('lips');
      const fromFace = (d, up, side) => faceC.clone().addScaledVector(faceN, d).addScaledVector(headY, up || 0).add(V(0, 0, side || 0)).toArray();
      const lapC = V(-0.3, trayTop + 0.25, 0.1);
      const pR = P.anchor('Rpress'), pL = P.anchor('Lpress');
      ST.cam = {
        home: H,
        b1: { pos: [3.5, 18.5, 27], target: [-0.6, 8.0, -0.5], fov: 28, focus: [-2.5, 9.2, 0.8], aperture: 0.08 },
        foot: { pos: [19.5, 15.5, 6.5], target: [-1.5, 9.0, -0.5], fov: 28, focus: [-3.5, 10.5, 0], aperture: 0.08 },
        table: { pos: [1.5, 15.0, 3.5], target: [-4.1, 8.6, -7.4], fov: 28, focus: table.at.toArray(), aperture: 0.05 },
        handsWide: { pos: [3.2, 14.5, 10.5], target: [-1.6, 8.8, 0.9], fov: 28, focus: [-1.2, 8.6, 1.5], aperture: 0.05 },
        handsClose: { pos: [1.9, trayTop + 3.4, 3.4], target: [0.0, trayTop + 0.1, 0.0], fov: 28, focus: [0.3, trayTop + 0.2, 0.2], aperture: 0.025 },
        tempC: { pos: [2.9, trayTop + 1.5, 2.3], target: [-0.5, trayTop - 0.15, 0.0], fov: 28, focus: [-0.2, trayTop, 0.5], aperture: 0.02 },
        nailsC: { pos: [2.6, trayTop + 2.4, 1.6], target: [0.4, trayTop + 0.05, 0.1], fov: 28, focus: [0.65, trayTop + 0.1, 0.1], aperture: 0.015 },
        palmsC: { pos: [1.6, trayTop + 3.0, 1.4], target: [-0.3, trayTop + 0.05, 0.0], fov: 28, focus: [-0.2, trayTop + 0.1, 0.0], aperture: 0.015 },
        palmsC2: { pos: [2.4, trayTop + 2.6, -0.6], target: [0.3, trayTop + 0.05, -0.1], fov: 28, focus: [0.4, trayTop + 0.1, -0.1], aperture: 0.015 },
        tendC: { pos: [0.4, trayTop + 2.5, 2.6], target: [-0.35, trayTop + 0.15, 0.3], fov: 28, focus: [-0.2, trayTop + 0.2, 0.4], aperture: 0.015 },
        tendC2: { pos: [1.3, trayTop + 2.4, 1.6], target: [0.2, trayTop + 0.12, -0.2], fov: 28, focus: [0.2, trayTop + 0.15, -0.3], aperture: 0.015 },
        tremor: { pos: [8.6, 21.5, 11.5], target: [-1.6, 11.2, 0.0], fov: 28, focus: [0.4, 12.4, 0.6], aperture: 0.05 },   // high enough to see the spread fingers
        faceC: { pos: fromFace(3.2, 0.2, 0.6), target: faceC.toArray(), fov: 28, focus: faceC.toArray(), aperture: 0.012 },
        mouthC: { pos: mouth.clone().addScaledVector(faceN, 1.75).addScaledVector(headY, 0.12).toArray(), target: mouth.clone().addScaledVector(headY, -0.08).toArray(), fov: 28, focus: mouth.toArray(), aperture: 0.006 },
        eyeLids: { pos: eyeR.clone().addScaledVector(faceN, 1.25).add(V(0, 0, 0.35)).toArray(), target: eyeR.clone().addScaledVector(headX, 0.05).toArray(), fov: 28, focus: eyeR.toArray(), aperture: 0.004 },
        eyeIris: { pos: eyeR.clone().addScaledVector(faceN, 0.85).add(V(0, 0, 0.18)).toArray(), target: eyeR.toArray(), fov: 28, focus: eyeR.clone().addScaledVector(faceN, 0.12).toArray(), aperture: 0.003 },
        eyeConj: { pos: eyeR.clone().addScaledVector(faceN, 1.15).addScaledVector(headY, -0.1).add(V(0, 0, 0.3)).toArray(), target: eyeR.clone().addScaledVector(headY, -0.12).toArray(), fov: 28, focus: eyeR.toArray(), aperture: 0.004 },
        faceWide: { pos: fromFace(3.6, 0.3, 0.9), target: faceC.toArray(), fov: 28, focus: faceC.toArray(), aperture: 0.012 },
        legs: { pos: [5.0, 18.0, 1.0], target: [5.0, 6.8, 0.0], fov: 28, focus: [5.6, 7.2, 0.0], aperture: 0.02, up: [0, 0, -1] },   // from above like the plan view (head left, his right side at the bottom): both ankles side by side, the examiner's arms enter from the bottom edge
        ankles: { pos: [10.6, 14.6, 4.4], target: [5.5, 6.6, -0.1], fov: 28, focus: [6.2, 6.7, 0.6], aperture: 0.02 },   // high, so the examiner's sleeves stay low in the frame
        // the presses: from above and from his right side, square to each leg, framing the whole lower leg from the knee to
        // the toes (toes to the ceiling), so it reads as a leg and a foot; the thumb on the inner face of the shin, the
        // medial malleolus below it and, after the thumb lifts, the pit are all seen in the same shot
        pressR: { pos: [4.6, 15.2, 5.3], target: [4.9, 7.0, 0.9], fov: 28, focus: pR.toArray(), aperture: 0.006 },
        pressL: { pos: [4.6, 15.2, 3.4], target: [4.9, 7.0, -1.0], fov: 28, focus: pL.toArray(), aperture: 0.006 },
        anklesBoth: { pos: [10.6, 14.6, 4.4], target: [5.5, 6.6, -0.1], fov: 28, focus: [6.2, 6.7, 0.6], aperture: 0.02 },
        pullHigh: { pos: [7.0, 24.0, 17.0], target: [2.2, 7.0, -1.2], fov: 28, focus: [1.0, 7.5, 0.0], aperture: 0.06 },   // the pull-back rises over the examiner's arms
      };
      const C = ST.cam;
      // the backs of the hands: aimed on the back of his right hand, then gliding toward the knuckles of both
      applyArm('R', ST.arm.tray.R); applyArm('L', ST.arm.tray.L);
      { const dR = P.arms.R.hand.world('dorsum'), kR = P.arms.R.hand.world('middleProxBack'), dL = P.arms.L.hand.world('dorsum');
        C.tendC = { pos: dR.clone().add(V(-0.9, 2.0, 1.7)).toArray(), target: dR.clone().add(V(0.1, 0, -0.1)).toArray(), fov: 28, focus: dR.toArray(), aperture: 0.012 };
        C.tendC2 = { pos: kR.clone().lerp(dL, 0.35).add(V(0.4, 2.1, 1.5)).toArray(), target: kR.clone().lerp(dL, 0.35).toArray(), fov: 28, focus: kR.toArray(), aperture: 0.012 }; }
      applyArm('R', ST.arm.rest.R); applyArm('L', ST.arm.rest.L);
      // the nail-bed profile shot: exactly from the side of his right index finger (from above, the finger's radial side)
      applyArm('R', ST.arm.index.R);
      { const nailP = P.arms.R.hand.world('indexFold'); C.nailSide = { pos: nailP.clone().add(V(-0.16, 1.45, 0)).toArray(), target: nailP.clone().add(V(-0.16, 0, 0)).toArray(), fov: 28, focus: nailP.toArray(), aperture: 0.003, up: [0, 0, 1] }; }
      applyArm('R', ST.arm.rest.R);

      const camKeys = [
        [0, 'home'], [HOME_HOLD, 'home'], [5.8, 'b1'], [8.2, 'foot'], [9.6, 'foot'], [11.6, 'table'], [12.2, 'table'], [13.0, 'handsWide'],
        [16.6, 'handsWide'], [18.0, 'handsClose'], [21.2, 'handsClose'], [22.2, 'tempC'], [27.0, 'tempC'], [28.4, 'nailSideApp'], [29.6, 'nailSide'],
        [33.8, 'nailSide'], [35.0, 'nailsC'], [36.4, 'nailsC'], [37.6, 'palmsC'], [41.6, 'palmsC2'], [42.8, 'tendC'], [46.4, 'tendC2'], [47.2, 'tremor'],
        [53.0, 'tremor'], [54.2, 'faceC'], [55.6, 'faceC'], [56.6, 'mouthC'], [60.0, 'mouthC'], [61.4, 'eyeLids'], [63.4, 'eyeLids'], [65.0, 'eyeIris'], [66.0, 'eyeIris'], [66.8, 'eyeConj'],
        [73.0, 'eyeConj'], [74.4, 'faceWide'], [77.0, 'faceWide'], [78.4, 'legs'], [82.4, 'legs'], [83.3, 'pressR'], [90.4, 'pressR'], [91.4, 'pressL'],
        [95.0, 'pressL'], [95.9, 'legs'], [96.6, 'pullHigh'], [97.6, 'home'], [100, 'home'],
      ];
      C.nailSideApp = { pos: [C.nailSide.pos[0] + 0.6, C.nailSide.pos[1] + 0.8, C.nailSide.pos[2] + 1.5], target: C.nailSide.target, fov: 28, focus: C.nailSide.focus, aperture: 0.006, up: [0, 0.6, 0.8] };
      // The camera language of the reference: one continuous dolly through each run of shots (K.path flows through the
      // middle shots without stopping, easing only at the ends of the run). A run ends at a hold: a shot repeated at both
      // ends of the hold, where the picture is perfectly still.
      const toPt = (c) => (Array.isArray(c.focus) ? c.focus : c.target);
      const vec = (c) => [...c.pos, ...c.target, ...toPt(c), c.fov, c.aperture, ...(c.up || [0, 1, 0])];
      const runs = [];
      { let cur = [camKeys[0]];
        for (let i = 1; i < camKeys.length; i++) {
          if (camKeys[i][1] === camKeys[i - 1][1]) { if (cur.length > 1) runs.push(cur); cur = [camKeys[i]]; }
          else cur.push(camKeys[i]);
        }
        if (cur.length > 1) runs.push(cur);
      }
      const runPaths = runs.map((r) => ({ t0: r[0][0], t1: r[r.length - 1][0], f: K.path(r.map(([t, n]) => [t, vec(C[n])])) }));
      const camAt = (t) => {
        let i = 0; while (i < camKeys.length - 1 && camKeys[i + 1][0] <= t) i++;
        const rp = runPaths.find((r) => t > r.t0 && t < r.t1);
        if (!rp) return C[camKeys[i][1]];
        const v = rp.f(t);
        return { pos: v.slice(0, 3), target: v.slice(3, 6), focus: v.slice(6, 9), fov: v[9], aperture: v[10], up: v.slice(11, 14), upW: 1 };
      };
      const shoot = (c) => {
        const cam = S.camera;
        cam.position.set(...c.pos);
        const up = V(0, 1, 0);
        if (c.up) up.lerp(V(...c.up), c.upW == null ? 1 : c.upW).normalize();
        cam.up.copy(up); cam.lookAt(...c.target);
        if (c.fov !== cam.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
        K.focus(cam, toPt(c), c.aperture);
      };
      // which region the shadow maps should concentrate on, per shot
      const shadowFor = (t) => {
        if (t < 13.0 || (t > 46.6 && t < 53.2) || t > 97.0) return {};
        if (t < 53.2) return { shadowCenter: [-0.2, trayTop, 0.2], shadowSize: 3.5 };
        if (t < 77.0) return { shadowCenter: faceC.toArray(), shadowSize: 2.0 };
        if (t < 82.4 || t > 95.4) return { shadowCenter: [5.5, 6.8, 0], shadowSize: 4.5 };
        return { shadowCenter: [6.2, 6.8, 0], shadowSize: 2.2 };
      };
      const lightsFor = (t) => {
        const o = shadowFor(t);
        // inside the mouth: a soft fill from the camera side (like a pen torch), only while the mouth is open
        const f = face(SET.poseTime(t));
        if (f.jaw > 0.05) { o.fill = 2.2 * f.jaw; o.fillPos = mouth.clone().addScaledVector(faceN, 1.0).toArray(); }
        // the lamp rakes across the shin for the pit
        // it grazes the press point at about 9 degrees above the skin, along the leg from the knee side, so the pit's knee-side
        // wall falls into its own shadow and the far wall catches the light
        if (t > A.toR[0] && t < A.back[0] + 0.6) {
          const rk = K.seg(t, A.toR[0], A.toR[1]) * (1 - K.seg(t, A.back[0], A.back[0] + 0.6)), right = t < A.toL[0] + 0.5, tgt = right ? pR : pL, n = right ? nR : nL;
          o.rake = 44 * rk; o.rakePos = tgt.clone().add(V(-6.0, 0.25, 0)).addScaledVector(n, 1.0).toArray(); o.rakeTarget = tgt.toArray();
        }
        return o;
      };

      // ------------------------------------------------------------ the frame for time t
      const homeLock = (t) => t <= HOME_HOLD + 1e-6 || t >= D - 1.0 - 1e-6;
      const update = (t) => {
        const tp = SET.poseTime(t);                       // poses change on twos
        const still = homeLock(t);
        const ar = armAt(tp, 'R'), al = armAt(tp, 'L');
        applyArm('R', ar); applyArm('L', al);
        P.setFace(face(tp));
        P.breathe(still ? 0 : tp);
        SH.setFold(foldU(tp));
        P.setRoll(rollU(tp));
        P.setPit('R', pitAt(tp, 'R')); P.setPit('L', pitAt(tp, 'L'));
        applyEx('R', exAt(tp, 'R')); applyEx('L', exAt(tp, 'L'));
        clock.set(clockSec(tp), clockScale(tp));
        shoot(window.CAM_OVERRIDE || camAt(t));
        L.set(still ? 0 : tp, lightsFor(t));
        if (still) L.lamp.intensity = SET.LAMP.power;    // no flicker on the home shot (it must match the other parts)
        if (window.POSE_HOOK) window.POSE_HOOK(t);
      };
      // clock placement: standing on the mattress between his feet, turned toward the two press cameras, so the 15 s
      // race on its face is seen in the same shot as the thumb
      clock.group.position.set(7.6, Dm.Ym + 0.45, 0); clock.group.scale.setScalar(0.44);
      clock.group.lookAt(V(C.pressR.pos[0], C.pressR.pos[1], 0));
      clock.set(0, 0);

      const overlay = (ctx, t, W, Hh) => {
        const on = window.CAPTIONS != null ? !!window.CAPTIONS : style.captions;
        if (on) CAPTION.at(ctx, t, CAPTIONS, W, Hh);
      };
      // handles for the storyboard and for later parts
      root.CVS1_WORLD = { S, P, SH, EX, clock, bed, table, ST, L, camAt, armAt, exAt, pitAt, A, applyArm, applyEx, shoot, update };
      return { update, overlay };
    },

    // ================================================================ sound: effects in front, a quiet room bed under
    sound(k) {
      // ambience bed: fades in over the first 0.5 s and out over the last 0.5 s (no clicks where the parts join)
      k.noise(0, { dur: D, color: 'brown', filter: 'lowpass', f: 300, gain: 0.11, a: 0.5, hold: D - 1.0, bus: 'amb' });
      k.noise(0, { dur: D, color: 'pink', filter: 'highpass', f: 4500, gain: 0.012, a: 0.5, hold: D - 1.0, bus: 'amb' });
      // soft camera travels: low whooshes
      for (const [t, d] of [[1.2, 1.6], [6.4, 1.6], [9.8, 1.6], [12.2, 0.8], [16.7, 1.2], [21.3, 0.9], [27.1, 1.3], [33.9, 1.0], [36.5, 1.0], [41.7, 1.0], [46.5, 0.8], [53.1, 1.0], [56.0, 0.6], [60.1, 1.2], [63.5, 1.4], [66.1, 0.7], [73.1, 1.2], [77.1, 1.2], [82.5, 0.8], [90.5, 0.9], [95.5, 2.0]]) k.play('whoosh', t, { dur: d, gain: 0.35, top: 1400 });
      // clay contacts: soft squashy thuds
      const squish = (t, g = 0.5, f = 220) => { k.play('press', t, { gain: g * 0.6 }); k.noise(t, { dur: 0.09, color: 'pink', filter: 'bandpass', f, q: 1.2, gain: 0.12 * g }); };
      squish(16.0, 0.5); squish(16.9, 0.45); squish(21.6, 0.35); squish(22.6, 0.45); squish(25.0, 0.45); squish(28.3, 0.4); squish(34.6, 0.35);
      k.play('paper', 36.1, { dur: 0.6, gain: 0.25 }); squish(37.0, 0.35); k.play('paper', 41.9, { dur: 0.5, gain: 0.22 }); squish(42.7, 0.35);
      k.play('swish', 48.7, { dur: 0.5, gain: 0.3 }); k.play('tock', 49.9, { f: 520, gain: 0.25 });
      // mouth opening, tongue lift: small wet clicks
      k.play('click', 55.75, { f: 900, gain: 0.25 }); k.play('tock', 56.05, { f: 1200, gain: 0.12 });
      // eye: the look up, the finger on the cheek, the lid drawn down
      k.play('tick', 68.35, { f: 3000, gain: 0.25 }); squish(69.4, 0.3, 400); k.play('stroke', 69.7, { material: 'brush', dur: 0.5, gain: 0.5 });
      // ankle beat: the sheet folds, trousers roll, the clock buds in, the thumb presses, the clock races, the pit stays
      k.play('paper', A.fold[0], { dur: 1.3, gain: 0.45 }); k.play('slap', A.fold[1] - 0.05, { gain: 0.25 });
      k.play('roller', A.roll[0], { dur: 1.0, gain: 0.2 });
      k.play('pop', A.clockIn[0] + 0.12, { f: 520, gain: 0.5 });
      for (const [p0, p1, f1] of [[A.pressR, A.liftR, A.fillR], [A.pressL, A.liftL, A.fillL]]) {
        k.play('press', p0[0], { gain: 0.65 }); k.noise(p0[0], { dur: 0.25, color: 'brown', filter: 'lowpass', f: 500, gain: 0.2 });
        const n = 15, dt = (p0[1] - p0[0]) / n;
        for (let i = 0; i < n; i++) k.play('tick', p0[0] + 0.1 + i * dt, { f: 4800, gain: 0.32 });       // 15 racing ticks = 15 s
        k.play('ding', p0[1] - 0.02, { f: 'A5', gain: 0.22 });
        k.noise(p1[0], { dur: 0.18, color: 'pink', filter: 'bandpass', f: 900, q: 1.5, gain: 0.12 });       // the thumb lifts off the clay
        k.play('blip', p1[1] + 0.05, { f: 'E5', type: 'triangle', dur: 0.18, gain: 0.9 });                // the pit is there
        const m = 12, dd = (f1[1] - f1[0]) / m;
        for (let i = 0; i < m; i++) k.play('tick', f1[0] + i * dd, { f: 4200, gain: 0.18 });               // slow refill ticks
      }
      k.play('roller', A.rollDown[0], { dur: 0.6, gain: 0.18 }); k.play('paper', A.unfold[0], { dur: 0.8, gain: 0.4 }); k.play('pop', A.clockOut[0], { f: 420, gain: 0.35 });
    },
  };
  root.CVS1 = style;
})(typeof window !== 'undefined' ? window : globalThis);
