// resp3-style.js: "Soft Clay" style object for PART 3 OF 3 of the respiratory examination (the back of the chest:
// inspection, expansion, tactile vocal fremitus, percussion, auscultation, vocal resonance). Classic script. Needs THREE,
// K (lib/stage.js), SOUND (lib/sound.js) and the shared/ scripts (loaded unchanged). Defines window.RESP3.
// Units: 1 = 10 cm. Head at screen left (-X), feet at screen right (+X), the patient's RIGHT side toward the camera (+Z).
// Everything new for this part lives here: the sitting pose, the back landmarks (computed on this patient's surface),
// the trousers seat and the re-draped sheet for the sitting pose, the stethoscope, the contact solver and the beats.
(function (root) {
  const THREE = root.THREE, K = root.K;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ================================================================ CONTENT (the story, in order; times in seconds)
  const D = 87;
  const HOME_HOLD = 1.0;          // the series home shot, held still (breathing and flicker off) for the first and last second
  const BEATS = [
    { n: 1, name: 'Sitting forward', t0: 0, t1: 7, hold: [1.0, 2.5] },
    { n: 2, name: 'Inspection of the back', t0: 7, t1: 12 },
    { n: 3, name: 'Expansion at the back', t0: 12, t1: 22 },
    { n: 4, name: 'Tactile vocal fremitus', t0: 22, t1: 32, hold: [22.0, 23.5] },
    { n: 5, name: 'Percussion', t0: 32, t1: 48 },
    { n: 6, name: 'Auscultation', t0: 48, t1: 72, hold: [48.0, 49.5] },
    { n: 7, name: 'Vocal resonance', t0: 72, t1: 81 },
    { n: 8, name: 'Lying back', t0: 81, t1: D },
  ];
  // poses change on twos (15 a second): every event is put exactly on a pose
  const POSES = 15, snap = (t) => Math.round(t * POSES) / POSES;

  // ---- the sites on his back. Torso-local coordinates: |x| from the midline (1 = 10 cm), s up the trunk from the seat.
  // Vertebral levels on this patient (computed for his trunk: C7 at the base of the neck, 2.35 cm per level).
  const VERT = (() => { const o = {}; const names = ['C7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5']; names.forEach((n, i) => (o[n] = 5.35 - 0.235 * i)); return o; })();
  // the shoulder blades when the arms are folded (prot = 1) and at rest (prot = 0)
  const SCAP = (prot) => {
    const xm = 0.62 + 0.36 * prot;                                 // medial border, from the midline
    return {
      sup: [xm, VERT.T2],                                           // superior angle
      inf: [xm + 0.1 + 0.14 * prot, VERT.T7],                       // inferior angle (7th rib)
      lat: [1.62 + 0.1 * prot, 4.6],                                // lateral (glenoid) corner
      spine: [[xm, VERT.T3], [1.78 + 0.05 * prot, 5.0]],            // the spine of the scapula, medial end to the acromion
    };
  };
  const RIB10 = (x) => VERT.T10 - 0.17 * Math.max(0, x - 0.15);      // the 10th rib at the back (slopes down laterally)
  // the five percussion / auscultation levels (the same height on both sides), all off the shoulder blades and the spine
  const LEVELS = [
    { n: 1, x: 0.74, s: 5.04, what: 'above the spine of the scapula (apex)' },
    { n: 2, x: 0.48, s: 4.5, what: 'between the scapula and the spine, upper' },
    { n: 3, x: 0.48, s: 4.06, what: 'between the scapula and the spine, lower' },
    { n: 4, x: 1.0, s: 3.46, what: 'just below the inferior angle of the scapula' },
    { n: 5, x: 1.0, s: 3.0, what: 'just above the 10th rib (base)' },
  ];
  const ZONES = [{ name: 'upper', lv: 1 }, { name: 'middle', lv: 3 }, { name: 'lower', lv: 5 }];   // tactile fremitus / vocal resonance

  // ---- the timeline of this part
  const T = {
    sitHold: [1.0, 2.5],            // still (speech overlay: "sit forward and fold your arms")
    sitUp: [2.5, 4.4],              // he leans forward off the backrest
    fold: [3.4, 5.0],               // and folds his arms across his chest
    camRound: [2.6, 6.2],
    insp: [7.0, 12.0],
    exp: { go: [12.2, 13.4], out: [13.6, 15.4], inn: [15.4, 18.2], back: [18.2, 20.4], home: [20.6, 21.6] },
    tvf: { hold: [22.0, 23.5], start: 23.5, step: 1.4, travel: 0.45, end: 31.9 },
    perc: { start: 32.3, setup: 0.8, step: 1.42, travel: 0.42, end: 47.6 },
    aus: { hold: [48.0, 49.5], pick: [49.5, 50.3], deep: 5.4, move1: 0.6, quick: 1.2, end: 71.6 },
    vr: { start: 72.0, step: 1.42, travel: 0.42, end: 80.6 },
    back: { steth: [81.0, 81.4], unfold: [81.2, 82.6], lean: [81.6, 83.6], hands: [81.4, 82.8], cam: [81.0, 84.0] },
  };
  // sites in examination order
  const sides = ['R', 'L'];
  const TVF = []; { let t = T.tvf.start; for (const z of ZONES) for (const sd of sides) { TVF.push({ zone: z.name, lv: z.lv, side: sd, on: snap(t + T.tvf.travel), off: snap(t + T.tvf.step - 0.05), say: snap(t + T.tvf.travel + 0.2) }); t += T.tvf.step; } }
  const PERC = []; { let t = T.perc.start + T.perc.setup; for (const L of LEVELS) for (const sd of sides) { const on = snap(t + T.perc.travel); PERC.push({ lv: L.n, side: sd, on, strikes: [snap(on + 0.33), snap(on + 0.73)], off: snap(t + T.perc.step - 0.04) }); t += T.perc.step; } }
  // auscultation: level 1 with a full deep breath each side (real time), then levels 2 to 5 quicker, one short breath each
  const AUS = []; {
    let t = T.aus.pick[1];
    for (const sd of sides) { const on = snap(t + (sd === 'R' ? 0.3 : T.aus.move1)); AUS.push({ lv: 1, side: sd, on, off: snap(on + T.aus.deep), breath: [on + 0.15, on + 0.15 + 4.9], full: true }); t = AUS[AUS.length - 1].off; }
    for (let lv = 2; lv <= 5; lv++) for (const sd of sides) { const on = snap(t + 0.27); AUS.push({ lv, side: sd, on, off: snap(on + T.aus.quick - 0.27), breath: [on + 0.05, on + T.aus.quick - 0.3], full: false }); t = AUS[AUS.length - 1].off; }
  }
  const VR = []; { let t = T.vr.start; for (const z of ZONES) for (const sd of sides) { VR.push({ zone: z.name, lv: z.lv, side: sd, on: snap(t + T.vr.travel), off: snap(t + T.vr.step - 0.05), say: snap(t + T.vr.travel + 0.2) }); t += T.vr.step; } }
  const QUICK = [AUS[2].on - 0.25, AUS[AUS.length - 1].off];        // the sped-up stretch of auscultation (the clock shows it)

  const CAPTIONS = [
    { t0: 4.7, t1: 6.95, text: 'Sit forward, arms folded: the shoulder blades move out of the way', place: 'top' },
    { t0: 7.5, t1: 11.85, text: 'Straight spine, no scars, symmetrical', place: 'top' },
    { t0: 15.6, t1: 21.8, text: 'Thumbs move apart equally, 5 cm - normal expansion', place: 'top' },
    { t0: 24.0, t1: 31.85, text: "Tactile vocal fremitus ('44'): equal on both sides", place: 'top' },
    { t0: 33.4, t1: 47.6, text: 'Resonant and equal at all 5 levels, right vs left', place: 'top' },
    { t0: AUS[0].on + 0.2, t1: AUS[1].on - 0.15, text: 'Same sites: compare right with left', place: 'top' },
    { t0: AUS[1].on + 0.2, t1: AUS[5].off - 0.1, text: 'Vesicular, good and equal air entry down to the bases', place: 'top' },
    { t0: AUS[6].on - 0.1, t1: T.aus.end + 0.2, text: 'No wheeze, no crackles, no pleural rub', place: 'top' },
    { t0: 72.5, t1: 80.7, text: "Vocal resonance ('44'): normal and equal on both sides", place: 'top' },
  ];

  // ---- breathing: one schedule for the chest and the breath sounds. b is P.breathe's value (sin: -1..1 when quiet,
  // 0 = the chest at rest). Quiet breathing 16 a minute, mouth closed; deep breaths about 10 a minute, mouth open.
  const QUIET = 60 / 16;
  const deepCycle = (u, A, insp) => (u < insp ? A * (1 - Math.cos(Math.PI * u / insp)) / 2 : A * (1 + Math.cos(Math.PI * (u - insp) / (1 - insp))) / 2);
  const BREATHS = (() => {
    // explicit breaths (everything else is quiet breathing that fits whole cycles into the gaps)
    const list = [];
    list.push({ t0: T.exp.out[0], t1: T.exp.out[1], A: -1.8, insp: 0.5, kind: 'out' });               // out fully
    list.push({ t0: T.exp.inn[0], t1: T.exp.back[1], A: 4.2, insp: (T.exp.inn[1] - T.exp.inn[0]) / (T.exp.back[1] - T.exp.inn[0]), kind: 'deep' });
    for (const a of AUS) {
      const [b0, b1] = a.breath;
      list.push({ t0: b0, t1: b1, A: a.full ? 3.6 : 2.4, insp: 0.42, kind: a.full ? 'deep' : 'short', mouth: true });
    }
    list.sort((p, q) => p.t0 - q.t0);
    // quiet breathing in the gaps, from the end of the home hold to the start of the end hold
    const out = [], quiet = (a, b) => { const n = Math.max(1, Math.round((b - a) / QUIET)); if (b - a < 1.2) { out.push({ t0: a, t1: b, kind: 'rest' }); return; } const p = (b - a) / n; for (let i = 0; i < n; i++) out.push({ t0: a + i * p, t1: a + (i + 1) * p, kind: 'quiet' }); };
    let t = HOME_HOLD;
    for (const br of list) { if (br.t0 > t + 1e-6) quiet(t, br.t0); out.push(br); t = br.t1; }
    quiet(t, D - HOME_HOLD);
    return out;
  })();
  const breathAt = (t) => {
    if (t <= HOME_HOLD || t >= D - HOME_HOLD) return { b: 0, mouth: 0, kind: 'rest' };
    for (const br of BREATHS) if (t >= br.t0 && t < br.t1) {
      const u = (t - br.t0) / (br.t1 - br.t0);
      if (br.kind === 'quiet') return { b: Math.sin(2 * Math.PI * u), mouth: 0, kind: 'quiet' };
      if (br.kind === 'rest') return { b: 0, mouth: 0, kind: 'rest' };
      return { b: deepCycle(u, br.A, br.insp), mouth: br.mouth ? K.smooth(0, 0.08, u) * (1 - K.smooth(0.9, 1, u)) : 0, kind: br.kind };
    }
    return { b: 0, mouth: 0, kind: 'rest' };
  };
  // "44" said at each fremitus and vocal-resonance site: the jaw and lips move, no sound (added later)
  const SAY = [...TVF, ...VR].map((s) => s.say);
  const sayJaw = (t) => { for (const s of SAY) { const u = (t - s) / 0.75; if (u >= 0 && u <= 1) { const syl = Math.abs(Math.sin(u * Math.PI * 3.0)); return 0.42 * syl * Math.sin(Math.PI * u) + 0.06; } } return 0; };

  // ================================================================ the style
  const style = {
    id: 'resp3-soft-clay', name: 'Soft Clay - respiratory part 3: the back of the chest', duration: D,
    fonts: ['600 56px "Fredoka"'],
    render: Object.assign({}, root.SET.RENDER),
    content: { BEATS, CAPTIONS, T, LEVELS, ZONES, TVF, PERC, AUS, VR, BREATHS, VERT, HOME_HOLD },
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
      const elbowPlugs = ['R', 'L'].map((sd) => { const m = CLAY.mesh(new THREE.SphereGeometry(0.6, 32, 20), exM.sleeve, EX[sd].fore, [-0.3, 0, 0]); m.visible = false; return m; });
      const clock = PROPS.clock(S);
      const hs = (x, z) => SH.heightAt(x, z);
      const Dm = BED.DIM;

      // ------------------------------------------------------------ helpers (as in cvs1-style.js)
      const q = (f, d) => HANDS.quat(f, d);
      const relaxed = { all: [0.22, 0.32, 0.18], spread: 0.8, thumb: [0.15, 0, 0.12, 0.08] };
      const pole = (side) => V(0, -1, side === 'R' ? 0.7 : -0.7);
      // the series home poses, copied unchanged from cvs1-style.js
      const restArm = (side) => {
        const sz = side === 'R' ? 1 : -1, x = 0.15, z = sz * 2.6;
        return { wrist: V(x, Math.max(hs(x, z), hs(x + 0.9, z)) + 0.19, z), quat: q(V(1, -0.1, -sz * 0.12), V(0, 1, 0)), pose: relaxed, pole: pole(side) };
      };
      const exSolve = (side, st) => {
        const hand = EX[side].hand; hand.pose(st.pose);
        const w = HANDS.place(hand, st.contact, st.at, st.quat);
        return { wrist: w, quat: st.quat.clone(), pose: st.pose, back: st.back || V(0, -0.3, 1) };
      };
      const exRest = (side) => {
        const x = side === 'R' ? 2.9 : -0.9, z = 3.75;
        return { contact: 'palm', at: V(x, hs(x, z) + 0.012, z), quat: q(V(side === 'R' ? -0.75 : 0.75, -0.04, -0.66), V(0, 1, 0)), pose: { all: [0.16, 0.24, 0.14], spread: 0.8, thumb: [0.12, 0, 0.1, 0.06] }, back: V(side === 'R' ? 0.8 : -0.8, -0.04, 0.75) };
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

      // ------------------------------------------------------------ the sitting pose (built here; shared/ is not edited)
      // The trunk turns about his hips from the 45 degree backrest to sitting upright, leaning a little forward, off the
      // backrest. The bed and the backrest do not move.
      const torso = P.torso, chest = P.chest;
      P.group.updateMatrixWorld(true);
      const REC = { pos: torso.position.clone(), quat: torso.quaternion.clone() };
      const LEAN = 0.2;                                         // forward lean past upright (radians, ~11 degrees)
      const SIT = { pos: V(-1.12, 6.74, 0), quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, -1), V(Math.sin(LEAN), Math.cos(LEAN), 0), V(Math.cos(LEAN), -Math.sin(LEAN), 0))) };
      const HIP = V(-1.55, 6.9, 0);
      const recAngle = Math.atan2(BED.slope.y, BED.slope.x), sitAngle = Math.PI / 2 - LEAN, dAng = sitAngle - recAngle;   // turn about +Z
      const corr = (() => { const r = REC.pos.clone().sub(HIP).applyAxisAngle(V(0, 0, 1), dAng).add(HIP); return SIT.pos.clone().sub(r); })();
      const headTilt0 = P.head.rotation.x;
      let sitMemo = -1;
      const setSit = (u) => {
        u = K.clamp(u); if (Math.abs(u - sitMemo) < 1e-6) return; sitMemo = u;
        if (u <= 0) { torso.position.copy(REC.pos); torso.quaternion.copy(REC.quat); }
        else {
          const e = u;
          torso.position.copy(REC.pos).sub(HIP).applyAxisAngle(V(0, 0, 1), dAng * e).add(HIP).addScaledVector(corr, e);
          torso.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), dAng * e).multiply(REC.quat));
        }
        P.head.rotation.x = headTilt0 + 0.04 * u;               // his head bows a little as he leans forward
        P.group.updateMatrixWorld(true);
      };

      // ------------------------------------------------------------ his back, shaped on his own trunk surface
      // The trunk mesh is reshaped in place (one surface, so nothing can show a seam): the furrow of the spine with the
      // bumps of the spinous processes, the paraspinal muscles, the two shoulder blades with their spines and inferior
      // angles (sliding out to the sides as he folds his arms), and the lower ribs that widen in a deep breath.
      const torsoMesh = chest.children.find((m) => m.isMesh && m.name === 'torso-body');
      // A finer copy of the same trunk (the same sections, sculpting and hand-shaping as patient.js), so the small relief of
      // the spine reads cleanly. It is swapped in only while he sits up; the home shot keeps the original mesh untouched.
      const geoLo = torsoMesh.geometry;
      const geoHi = CLAY.lumpy(CLAY.loft([
        { s: 0, a: 1.72, c: 1.0, d: 1.0 }, { s: 0.9, a: 1.58, c: 1.0, d: 0.95 }, { s: 1.8, a: 1.52, c: 1.03, d: 0.92 },
        { s: 2.8, a: 1.66, c: 1.1, d: 0.95 }, { s: 3.8, a: 1.8, c: 1.12, d: 1.0 }, { s: 4.6, a: 1.86, c: 1.0, d: 0.98 },
        { s: 5.1, a: 1.7, c: 0.78, d: 0.86 }, { s: 5.45, a: 1.0, c: 0.5, d: 0.62 },
      ], { axis: 'y', radial: 288, rings: 330, pow: 2.25, capStart: 0.6, capEnd: 0.35, deform: (p, s2) => {
        if (p.z <= 0) return;
        const ax = Math.abs(p.x);
        const plate = K.smooth(0.05, 0.35, ax) * (1 - K.smooth(1.35, 1.75, ax)) * K.smooth(3.45, 3.7, s2) * (1 - K.smooth(4.5, 4.95, s2));
        p.z += 0.085 * plate * K.smooth(0.3, 0.9, p.z) - 0.025 * Math.exp(-(p.x * p.x) / 0.02) * K.smooth(2.6, 3.2, s2) * (1 - K.smooth(4.6, 5.0, s2));
        p.z += 0.04 * Math.exp(-((s2 - 1.6) ** 2) / 0.5) * Math.exp(-(p.x * p.x) / 1.2);
      } }), { amount: 0.003, size: 1.6, seed: 4 });
      const tg = geoHi, tpos = tg.attributes.position, tB = Float32Array.from(tpos.array), tN = Float32Array.from(tg.attributes.normal.array);
      const useHi = (on) => { const g = on ? geoHi : geoLo; if (torsoMesh.geometry !== g) torsoMesh.geometry = g; };
      const g2 = (x, y, sx, sy) => Math.exp(-((x / sx) ** 2 + (y / sy) ** 2));
      const segDist = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, t = K.clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)); return Math.hypot(px - ax - vx * t, py - ay - vy * t); };
      const triSD = (p, A, B, C) => {          // signed distance to a triangle in 2D (negative inside)
        const d = Math.min(segDist(p[0], p[1], ...A, ...B), segDist(p[0], p[1], ...B, ...C), segDist(p[0], p[1], ...C, ...A));
        const cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const s1 = cr(A, B, p), s2 = cr(B, C, p), s3 = cr(C, A, p), inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
        return inside ? -d : d;
      };
      // height of the back's relief (along the outward normal), torso-local x (his left +), s, for amount `on` (0 at the
      // home shot, so the reclined frames are untouched), arms folded `prot`, flexion `flex`
      const relief = (x, s, on, prot, flex) => {
        if (on <= 0) return 0;
        const ax = Math.abs(x), band = K.smooth(1.25, 1.8, s) * (1 - K.smooth(5.25, 5.55, s));
        let h = 0;
        h -= 0.03 * (1 - 0.55 * flex) * Math.exp(-((x / 0.17) ** 2)) * band;                  // the furrow of the spine
        h += 0.022 * Math.exp(-(((ax - 0.34) / 0.16) ** 2)) * band * K.smooth(1.4, 2.2, s);    // paraspinal muscles
        for (const [n, sv] of Object.entries(VERT)) {                                         // spinous processes
          const k = n === 'C7' ? 1.7 : n[0] === 'L' ? 0.8 : 1;
          h += k * (0.01 + 0.02 * flex) * g2(x, s - sv, 0.085, 0.085);
        }
        const sc = SCAP(prot), p = [ax, s];
        const sd = triSD(p, sc.sup, sc.inf, sc.lat);
        h += 0.06 * K.smooth(0.16, -0.14, sd);                                                // the shoulder blade (a broad, soft plate)
        h += 0.012 * K.smooth(0.1, -0.05, sd) * Math.exp(-((segDist(ax, s, ...sc.sup, ...sc.inf) / 0.14) ** 2));   // its medial border
        h += 0.028 * g2(ax - sc.inf[0], s - sc.inf[1], 0.14, 0.13);                            // the inferior angle
        h += 0.026 * Math.exp(-((segDist(ax, s, ...sc.spine[0], ...sc.spine[1]) / 0.12) ** 2));   // the spine of the scapula
        return h * on;
      };
      // a deep breath widens the lower ribs (on top of P.breathe's quiet scale): lateral push at the lower chest
      const ribPush = (x, s, deep) => (deep > 0 ? deep * 0.035 * K.smooth(2.0, 2.8, s) * (1 - K.smooth(4.0, 4.8, s)) * K.smooth(0.3, 1.2, Math.abs(x)) : 0);
      const deepOfB = (b) => Math.max(0, b - 1) / 3.2;
      let reliefCache = null;
      const back = { on: -1, prot: -1, flex: -1, deep: -1, press: null };
      // press: { c, n, R, depth } (trunk frame): the skin under a pressed chest piece lies flush with its face
      const shapeBack = (on, prot, flex, deep, press = null) => {
        if (Math.abs(on - back.on) + Math.abs(prot - back.prot) + Math.abs(flex - back.flex) + Math.abs(deep - back.deep) < 1e-5 && press === back.press) return;
        Object.assign(back, { on, prot, flex, deep, press });
        const arr = tpos.array;
        if (on <= 0 && deep <= 0 && !press) { arr.set(tB); tg.attributes.normal.array.set(tN); tg.attributes.normal.needsUpdate = true; tpos.needsUpdate = true; return; }
        const steady = on === 1 && prot === 1 && flex === 1;
        if (steady && !reliefCache) { reliefCache = new Float32Array(tpos.count); for (let i = 0; i < tpos.count; i++) { const z = tB[3 * i + 2], w = K.smooth(0.15, -0.35, z); reliefCache[i] = w > 0 ? relief(tB[3 * i], tB[3 * i + 1], 1, 1, 1) * w : 0; } }
        for (let i = 0; i < tpos.count; i++) {
          const x = tB[3 * i], s = tB[3 * i + 1], z = tB[3 * i + 2];
          const w = K.smooth(0.15, -0.35, z);                     // only the back
          const h = window.DBG && window.DBG.noRelief ? 0 : steady ? reliefCache[i] : w > 0 ? relief(x, s, on, prot, flex) * w : 0;
          const rp = ribPush(x, s, deep) * K.smooth(0.6, -0.1, z);
          let X = x + tN[3 * i] * h + Math.sign(x) * rp, Y = s + tN[3 * i + 1] * h, Z = z + tN[3 * i + 2] * h;
          if (press) {
            const dx = X - press.c.x, dy = Y - press.c.y, dz = Z - press.c.z, hn = dx * press.n.x + dy * press.n.y + dz * press.n.z + press.depth;
            if (hn > 0 && hn < 0.2) { const r = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - (hn - press.depth) ** 2)), w = 1 - K.smooth(press.R * 1.02, press.R * 1.45, r); if (w > 0) { X -= press.n.x * hn * w; Y -= press.n.y * hn * w; Z -= press.n.z * hn * w; } }
          }
          arr[3 * i] = X; arr[3 * i + 1] = Y; arr[3 * i + 2] = Z;
        }
        tpos.needsUpdate = true; if (window.DBG && window.DBG.keepN) { tg.attributes.normal.array.set(tN); tg.attributes.normal.needsUpdate = true; } else tg.computeVertexNormals(); tg.computeBoundingSphere();
      };

      // ------------------------------------------------------------ the trousers seat (only when he sits up)
      // The pyjama trousers come up to his waist; reclined they are hidden under the sheet, sitting up they show behind him.
      const seat = new THREE.Group(); chest.add(seat);
      {
        const pj = P.M.pyjama;
        const g = CLAY.loft([{ s: -0.05, a: 1.765, c: 1.045, d: 1.045 }, { s: 0.9, a: 1.625, c: 1.045, d: 0.995 }, { s: 1.5, a: 1.575, c: 1.09, d: 0.975 }],
          { axis: 'y', radial: 72, rings: 24, pow: 2.25, capStart: 0.45, capEnd: 0, deform: (p) => { if (p.y < 0.4) p.y = 0.4 - (0.4 - p.y) * 0.55; } });
        CLAY.mesh(g, pj, seat, null, null, 'trouser-seat');
        const band = CLAY.loft([{ s: 1.42, a: 1.6, c: 1.115, d: 1.0 }, { s: 1.52, a: 1.6, c: 1.115, d: 1.0 }], { axis: 'y', radial: 72, rings: 4, pow: 2.25, capStart: 0.4, capEnd: 0.4 });
        CLAY.mesh(band, pj, seat, null, null, 'waistband');
      }
      seat.visible = false;

      // ------------------------------------------------------------ the sheet re-draped for the sitting pose
      // A second drape of the same sheet, computed on him sitting up (shared/sheet.js, unchanged); the visible sheet
      // morphs between the two drapes as he sits up and lies back.
      setSit(1); useHi(true); shapeBack(1, 1, 1, 0); seat.visible = true; P.group.updateMatrixWorld(true);
      // the sheet rests on his legs and on an invisible proxy round his hips up to the waist, its top edge just behind
      // the line of his hips, so it lies over his lap and falls round the sides of his hips onto the mattress
      const waistProxy = CLAY.mesh(CLAY.loft([{ s: -0.2, a: 1.9, c: 1.2, d: 1.05 }, { s: 0.8, a: 1.82, c: 1.2, d: 1.02 }, { s: 1.42, a: 1.72, c: 1.22, d: 0.98 }],
        { axis: 'y', radial: 48, rings: 12, pow: 2.4, capStart: 0, capEnd: 0.25 }), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), torso);
      waistProxy.visible = false; P.group.updateMatrixWorld(true);
      const sitEdge = V(-1.7, 0, 0);
      const SH2 = SHEET.build(S, { group: P.group, torso: { localToWorld: () => sitEdge.clone() }, sheetMeshes: P.sheetMeshes.filter((m) => m !== torsoMesh).concat([waistProxy]) });
      waistProxy.removeFromParent();
      SH2.mesh.visible = false; S.scene.children.filter((m) => m.name === 'sheet-hem').forEach((m, i) => { if (i > 0) m.visible = false; });
      const hems = S.scene.children.filter((m) => m.name === 'sheet-hem');
      const drape = { a: Float32Array.from(SH.mesh.geometry.attributes.position.array), b: Float32Array.from(SH2.mesh.geometry.attributes.position.array), ha: Float32Array.from(hems[0].geometry.attributes.position.array), hb: Float32Array.from(hems[1].geometry.attributes.position.array), memo: -1 };
      const setDrape = (u) => {
        u = K.clamp(u); if (Math.abs(u - drape.memo) < 1e-6) return; drape.memo = u;
        for (const [mesh, A, B] of [[SH.mesh, drape.a, drape.b], [hems[0], drape.ha, drape.hb]]) {
          const pa = mesh.geometry.attributes.position, arr = pa.array;
          if (u <= 0) arr.set(A); else for (let i = 0; i < arr.length; i++) arr[i] = A[i] + (B[i] - A[i]) * u;
          pa.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
        }
      };

      // ------------------------------------------------------------ the back surface: sites, normals, a distance field
      // Sites are found on the real mesh (a ray from behind, along the trunk's own front axis), in the trunk's frame.
      const rc = new THREE.Raycaster();
      const backHit = (x, s) => {        // torso-local point and outward normal on his back at (x, s), sitting, arms folded
        torso.updateMatrixWorld(true);
        let h = null;
        for (let k = 0; k < 20 && !h; k++, x *= 0.96) { rc.set(torso.localToWorld(V(x, s, -4)), V(0, 0, 1).transformDirection(torso.matrixWorld)); h = rc.intersectObject(torsoMesh, false)[0]; }
        const p = torso.worldToLocal(h.point.clone()), n = h.face.normal.clone().transformDirection(torsoMesh.matrixWorld).transformDirection(new THREE.Matrix4().copy(torso.matrixWorld).invert()).normalize();
        return { p, n };
      };
      // His right is -x in the trunk's frame (the trunk's +x is his left)
      const sx = (side) => (side === 'R' ? -1 : 1);
      const SITES = {};
      for (const Lv of LEVELS) for (const sd of sides) SITES[sd + Lv.n] = backHit(sx(sd) * Lv.x, Lv.s);
      // an approximate signed distance (trunk frame) to his back and sides, for keeping hands out of him; checked against
      // rays on the real mesh in the review panels
      const TSEC = [{ s: 0, a: 1.72, c: 1.0, d: 1.0 }, { s: 0.9, a: 1.58, c: 1.0, d: 0.95 }, { s: 1.8, a: 1.52, c: 1.03, d: 0.92 }, { s: 2.8, a: 1.66, c: 1.1, d: 0.95 }, { s: 3.8, a: 1.8, c: 1.12, d: 1.0 }, { s: 4.6, a: 1.86, c: 1.0, d: 0.98 }, { s: 5.1, a: 1.7, c: 0.78, d: 0.86 }, { s: 5.45, a: 1.0, c: 0.5, d: 0.62 }];
      const secAt = (s) => {
        let i = 0; while (i < TSEC.length - 2 && TSEC[i + 1].s < s) i++;
        const p0 = TSEC[Math.max(0, i - 1)], p1 = TSEC[i], p2 = TSEC[i + 1], p3 = TSEC[Math.min(TSEC.length - 1, i + 2)], t = K.clamp((s - p1.s) / (p2.s - p1.s)), t2 = t * t, t3 = t2 * t, o = {};
        for (const k of ['a', 'c', 'd']) { const m1 = (p2[k] - p0[k]) * 0.5, m2 = (p3[k] - p1[k]) * 0.5; o[k] = (2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2; }
        return o;
      };
      const PW = 2.25, LN = K.noise(4), LF = 1 / 1.6, LA = 2 * 0.003, lq = V(0, 0, 0);   // the trunk's own lumpy() warp (patient.js: amount 0.003, size 1.6, seed 4)
      const CS = { x: 1, z: 1 };                   // the chest's breathing scale right now
      const setBreath = (b, press = null) => { CS.x = 1 + 0.004 * b; CS.z = 1 + 0.012 * b; chest.scale.set(CS.x, 1, CS.z); shapeBack(1, 1, 1, deepOfB(b), press); chest.updateMatrixWorld(true); };
      const trunkSD = (lp1, deep = 0) => {         // lp: trunk-local point
        const lp0 = V(lp1.x / CS.x, lp1.y, lp1.z / CS.z);
        const lp = lq.set(lp0.x - LA * LN.n3(lp0.x * LF + 31.4, lp0.y * LF, lp0.z * LF), lp0.y - LA * LN.n3(lp0.x * LF, lp0.y * LF + 47.2, lp0.z * LF), lp0.z - LA * LN.n3(lp0.x * LF, lp0.y * LF, lp0.z * LF + 12.9));
        if (lp.y > 5.45) {                          // the rounded top of the trunk (the loft's end cap, 0.196 long)
          const sc = secAt(5.45), dz = lp.z < 0 ? sc.d : sc.c, u = Math.abs(lp.x) / sc.a, w = Math.abs(lp.z) / dz, h = (lp.y - 5.45) / 0.196;
          const rho = Math.pow(Math.pow(u, PW) + Math.pow(w, PW), 1 / PW), q = Math.hypot(rho, h);
          return (q - 1) * Math.min(Math.hypot(lp.x, lp.z) / Math.max(rho, 1e-6), 0.196 + 0.5 * Math.hypot(lp.x, lp.z));
        }
        const sc = secAt(lp.y), dz = lp.z < 0 ? sc.d : sc.c;
        let x = Math.abs(lp.x); x -= ribPush(lp.x, lp.y, deep) * K.smooth(0.6, -0.1, lp.z);
        const u = x / sc.a, w = Math.abs(lp.z) / dz, rho = Math.pow(Math.pow(u, PW) + Math.pow(w, PW), 1 / PW);
        const rad = Math.hypot(x, lp.z) / Math.max(rho, 1e-6);
        return (rho - 1) * rad - (lp.z < 0.15 ? relief(lp.x, lp.y, 1, 1, 1) * K.smooth(0.15, -0.35, lp.z) : 0);
      };

      // ------------------------------------------------------------ his arms: at rest (home) and folded across his chest
      const ST = { arm: {}, ex: {} };
      ST.arm.rest = { R: restArm('R'), L: restArm('L') };
      const applyArm = (side, st) => P.setArm(side, st.wrist, st.quat, st.pose, st.pole);
      // folded: each hand on the opposite upper arm, the right forearm over the left (trunk-local, converted each pose)
      const FOLD = {
        R: { wrist: V(0.95, 3.62, 1.72), f: V(1, 0.25, -0.5), d: V(0.3, 0.1, 1), pose: { all: [0.3, 0.42, 0.26], spread: 0.55, thumb: [0.35, 0.2, 0.2, 0.15] }, pole: V(-0.15, -1, 0.45) },
        L: { wrist: V(-0.95, 3.3, 1.55), f: V(-1, 0.3, -0.5), d: V(-0.3, 0.1, 1), pose: { all: [0.3, 0.42, 0.26], spread: 0.55, thumb: [0.35, 0.2, 0.2, 0.15] }, pole: V(0.15, -1, 0.4) },
      };
      const foldArm = (side) => {
        torso.updateMatrixWorld(true);
        const F = FOLD[side], tq = torso.getWorldQuaternion(new THREE.Quaternion());
        return { wrist: torso.localToWorld(F.wrist.clone()), quat: tq.clone().multiply(q(F.f, F.d)), pose: F.pose, pole: F.pole.clone().applyQuaternion(tq).normalize() };
      };
      const lerpArm = (a, b, u) => ({ wrist: a.wrist.clone().lerp(b.wrist, u), quat: a.quat.clone().slerp(b.quat, u), pose: blendPose(a.pose, b.pose, u), pole: a.pole.clone().lerp(b.pole, u).normalize() });

      // ------------------------------------------------------------ the examiner's hands: contact solver
      // States for the back are built in the trunk's frame (sitting, arms folded), so they ride with his trunk and his
      // breathing. Each contact: the hand is turned, then moved along the skin normal until the touching part is exactly
      // `gap` off the skin (measured on the hand's own surface), and fingers are curled until their pads rest on the skin.
      const applyEx = (side, st) => {
        const a = EX[side]; a.hand.pose(st.pose);
        const th = a.hand.thumb;
        if (st.thumbQ) { th.meta.quaternion.copy(st.thumbQ[0]); th.mcp.quaternion.copy(st.thumbQ[1]); th.ip.quaternion.copy(st.thumbQ[2]); }
        a.hand.group.position.copy(st.wrist); a.hand.group.quaternion.copy(st.quat);
        a.follow(st.back);
        if (st.sleeve) { const sd = st.sleeve.clone().normalize(), up = V(0, 1, 0), sz = new THREE.Vector3().crossVectors(sd, up).normalize(), sy = new THREE.Vector3().crossVectors(sz, sd); a.upper.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(sd, sy, sz)); }
      };
      // hand vertices of a part, in the trunk's frame
      const wv = V(0, 0, 0);
      const partMeshes = (hand, part) => {
        const out = [];
        const add = (o) => o.traverse((m) => { if (m.isMesh) out.push(m); });
        if (part === 'palm') hand.body.children.forEach((m) => { if (m.isMesh && m.name === 'palm') out.push(m); });
        else if (part === 'body') hand.body.children.forEach((m) => { if (m.isMesh) out.push(m); });
        else if (part === 'thumb') add(hand.thumb.mcp);
        else if (part === 'thumbAll') add(hand.thumb.meta);
        else if (PK.includes(part)) add(hand.fingers[part].mcp);
        else if (part.endsWith('Distal')) add(hand.fingers[part.replace('Distal', '')].dip);
        else if (part === 'fingers') PK.forEach((k) => add(hand.fingers[k].mcp));
        return out;
      };
      const tInv = new THREE.Matrix4();
      const minSD = (meshes, step = 3, deep = 0) => {      // the lowest point of these meshes over the skin (trunk frame)
        torso.updateMatrixWorld(true); tInv.copy(torso.matrixWorld).invert();
        let best = 1e9, at = null;
        for (const m of meshes) { m.updateMatrixWorld(true); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i += step) { wv.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).applyMatrix4(tInv); const d = trunkSD(wv, deep); if (d < best) { best = d; at = wv.clone(); } } }
        return { d: best, at };
      };
      // the true gap of these meshes to his skin, cast on the real mesh along the surface normal from the closest points
      const trueGap = (meshes, deep = 0) => {
        torso.updateMatrixWorld(true); tInv.copy(torso.matrixWorld).invert();
        const cand = [];
        for (const m of meshes) { m.updateMatrixWorld(true); const pa = m.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { wv.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).applyMatrix4(tInv); const d = trunkSD(wv, deep); if (d < 0.03) cand.push([d, wv.clone()]); } }
        cand.sort((a, b) => a[0] - b[0]);
        let best = 1e9;
        for (const [d0, q] of cand.slice(0, 40)) {
          const e = 0.004, gq = (dx, dy, dz) => trunkSD(V(q.x + dx, q.y + dy, q.z + dz), deep);
          const gL = V(gq(e, 0, 0) - gq(-e, 0, 0), gq(0, e, 0) - gq(0, -e, 0), gq(0, 0, e) - gq(0, 0, -e)).normalize();
          const at = torso.localToWorld(q.clone()), nW = gL.transformDirection(torso.matrixWorld);
          rc.set(at.clone().addScaledVector(nW, 0.5), nW.clone().negate());
          const h = rc.intersectObject(torsoMesh, false)[0];
          if (h) best = Math.min(best, h.distance - 0.5);
        }
        return best < 1e8 ? best : (cand[0] ? cand[0][0] : 1);
      };
      // put a hand (side) in the trunk frame: quaternion qL (trunk frame), a contact point near site pL; then slide it along
      // the normal n until the part's lowest point is `gap` off the skin. Returns a state in the trunk frame.
      const toWorldQ = (qL) => torso.getWorldQuaternion(new THREE.Quaternion()).multiply(qL);
      const solveLocal = (side, o) => {
        const hand = EX[side].hand;
        hand.pose(o.pose);
        if (o.thumbQ) { const th = hand.thumb; th.meta.quaternion.copy(o.thumbQ[0]); th.mcp.quaternion.copy(o.thumbQ[1]); th.ip.quaternion.copy(o.thumbQ[2]); }
        const wq = toWorldQ(o.qL);
        let off = 0.3;
        const place = () => { HANDS.place(hand, o.contact, torso.localToWorld(o.pL.clone().addScaledVector(o.n, off)), wq); hand.group.updateMatrixWorld(true); };
        const parts = o.parts.flatMap((p) => partMeshes(hand, p));
        for (let it = 0; it < 30; it++) { place(); const m = minSD(parts, 2, o.deep || 0).d; const err = m - o.gap; if (Math.abs(err) < 0.0002) break; off -= err; }
        for (let it = 0; it < 3; it++) { place(); const m = trueGap(parts, o.deep || 0), err = m - o.gap; if (Math.abs(err) < 0.0003) break; off -= err; }   // finish on the real mesh
        place();
        const wristL = torso.worldToLocal(hand.group.getWorldPosition(V(0, 0, 0)));
        return { wristL, qL: o.qL.clone(), pose: o.pose, thumbQ: o.thumbQ, backL: foreDir(o.qL, o.fore || (side === 'L' ? [0.35, 0.9, 0.4] : undefined), wristL, o.foreL || null), sleeveL: side === 'L' ? SLEEVE_L : SLEEVE, contact: o, offset: off };
      };
      // curl each finger until its pad rests on the skin (gap g)
      const curlToSkin = (side, o, keys, gap, range = [0, 1.4]) => {
        const hand = EX[side].hand, curl = Object.assign({}, o.pose.curl);
        for (const k of keys) {
          let best = null;
          const test = (c) => {
            curl[k] = [c, c * 0.62, c * 0.42]; hand.pose(Object.assign({}, o.pose, { curl }));
            if (o.thumbQ) { const th = hand.thumb; th.meta.quaternion.copy(o.thumbQ[0]); th.mcp.quaternion.copy(o.thumbQ[1]); th.ip.quaternion.copy(o.thumbQ[2]); }
            hand.group.updateMatrixWorld(true);
            const d = minSD(partMeshes(hand, k), 2, o.deep || 0).d, e = Math.abs(d - gap) + (d < 0 ? 10 * -d : 0);
            if (!best || e < best.e) best = { e, c, d };
          };
          for (let c = range[0]; c <= range[1]; c += 0.02) test(c);
          const c0 = best.c; for (let c = c0 - 0.02; c <= c0 + 0.02; c += 0.002) test(c);
          curl[k] = [best.c, best.c * 0.62, best.c * 0.42];
        }
        return curl;
      };
      // a state in the trunk frame -> a world state for applyEx (with the breathing displacement of the contact point)
      const localToWorldSt = (st, disp) => {
        torso.updateMatrixWorld(true);
        const tq = torso.getWorldQuaternion(new THREE.Quaternion());
        const w = st.wristL.clone(); if (disp) w.add(disp);
        return { wrist: torso.localToWorld(w), quat: tq.clone().multiply(st.qL), pose: st.pose, thumbQ: st.thumbQ, back: st.backL.clone().applyQuaternion(tq), sleeve: st.sleeveL ? st.sleeveL.clone() : null };
      };
      // the examiner's forearm: from the wrist down to an elbow that hangs in the gap between his back and the backrest,
      // on the examiner's side; from there the sleeve runs off toward the examiner (screen right), above the backrest
      const SLEEVE = V(-0.1, -0.22, 1).normalize(), SLEEVE_L = V(-0.04, -0.02, 1).normalize();
      const elbowBackL = (wristL, side) => {
        torso.updateMatrixWorld(true);
        const w = torso.localToWorld(wristL.clone());
        const E = V(-3.0, Math.max(8.1, w.y - 1.7), K.clamp(w.z + 1.6, 0.4, 3.2));
        return E.sub(w).normalize().transformDirection(new THREE.Matrix4().copy(torso.matrixWorld).invert());
      };
      // the forearm continues the line of the hand (the wrist about straight), dropping and leaving his back
      const foreDir = (qL, w = [0.7, 0.55, 0.45], wristL = null, explicit = null) => {
        const d = explicit ? explicit.clone().normalize() : V(1, 0, 0).applyQuaternion(qL).multiplyScalar(-w[0]).add(V(0, -w[1], 0)).add(V(0, 0, -w[2])).normalize();
        if (!wristL) return d;
        // the elbow (2.7 from the wrist) must stay in front of the backrest: lift the forearm toward level if it would not
        torso.updateMatrixWorld(true);
        const tinv = new THREE.Matrix4().copy(torso.matrixWorld).invert(), wW = torso.localToWorld(wristL.clone());
        for (let k = 0; k < 20; k++) {
          const e = wW.clone().addScaledVector(d.clone().transformDirection(torso.matrixWorld), 2.7 * 1.0);
          if ((e.x + 2) * 0.7071 + (e.y - 6) * 0.7071 > 0.75) break;
          d.add(V(0, 0.12, 0).transformDirection(tinv)).normalize();
        }
        return d;
      };
      // directions in the trunk frame: up (+y), out of his back (-z), his right (-x)
      const TL = { up: V(0, 1, 0), outB: V(0, 0, -1) };

      // ---------------- the hand poses for each step (all built sitting, arms folded, chest at rest)
      setSit(1); shapeBack(1, 1, 1, 0); P.group.updateMatrixWorld(true);
      const flatPose = { curl: { index: [0.04, 0.05, 0.03], middle: [0.04, 0.05, 0.03], ring: [0.04, 0.05, 0.03], little: [0.05, 0.06, 0.04] }, spread: 0.12, thumb: [0.3, 0.05, 0.08, 0.05] };
      const travelPose = { all: [0.25, 0.35, 0.2], spread: 0.4, thumb: [0.2, 0.05, 0.12, 0.08] };   // relaxed between contacts: fingers together, slightly curled

      // (a) expansion: hands flat on the lower back ribs, fingers round the sides, thumbs meeting at the spine at the
      // 10th rib, held just off the skin (hovering). `spread` 0 = breathed out, 1 = deep breath in (thumbs 2.5 cm apart each)
      const EXP_GAP = 0.004, THUMB_HOVER = 0.04;      // palm 0.4 mm off the skin; thumbs hovering 4 mm off
      const segQ = (dir, nail) => { const x = dir.clone().normalize(), y = nail.clone().addScaledVector(x, -nail.dot(x)).normalize(), z = new THREE.Vector3().crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); };
      // thumb placed joint by joint (the cvs1 method, solved in the hand's own frame so it also holds for the mirrored
      // left hand): its pad over the point PtW, facing the skin (normal nW), lying along dirW
      const thumbOver = (side, PtW, nW, dirW) => {
        const hand = EX[side].hand; hand.group.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(hand.group.matrixWorld).invert();
        const Pt = PtW.clone().applyMatrix4(inv), n = nW.clone().transformDirection(inv), dir = dirW.clone().transformDirection(inv);
        const C = V(0.1, -0.06, -0.24), PAD = [0.174, -0.117];
        const t = dir.clone().addScaledVector(n, -dir.dot(n)).normalize();
        const B = Pt.clone().addScaledVector(t, -PAD[0]).addScaledVector(n, -PAD[1]);
        const r1 = 0.42, r2 = 0.32, e = B.clone().sub(C), d = Math.min(e.length(), r1 + r2 - 1e-4); e.normalize();
        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
        const wv2 = n.clone().addScaledVector(e, -n.dot(e)).normalize();
        const Am = C.clone().addScaledVector(e, a).addScaledVector(wv2, h);
        const qm = segQ(Am.clone().sub(C), n), qp = segQ(B.clone().sub(Am), n), qd = segQ(t, n);
        return [qm, qm.clone().invert().multiply(qp), qp.clone().invert().multiply(qd)];
      };
      const thumbQFor = (side, pose) => { const h = EX[side].hand; h.pose(pose); return [h.thumb.meta.quaternion.clone(), h.thumb.mcp.quaternion.clone(), h.thumb.ip.quaternion.clone()]; };
      const expansionState = (side, spread, b) => {
        setBreath(b); const deep = deepOfB(b);
        const s0 = sx(side), sT = RIB10(0.15) + 0.02, shift = 0.25 * spread;   // thumbs at the 10th rib; each moves about 2.5 cm out in a deep breath
        // the hand: palm on the posterolateral lower ribs, fingers pointing up and out round his side
        const fDir = V(s0 * 0.8, 0.55, 0.22).normalize();
        const site = backHit(s0 * (1.12 + shift), sT + 0.42);
        const qL = segQ(fDir, site.n);
        const pose = { curl: { index: [0.05, 0.06, 0.03], middle: [0.05, 0.06, 0.03], ring: [0.05, 0.06, 0.03], little: [0.06, 0.07, 0.04] }, spread: 0.55, thumb: [0.0, 0, 0.05, 0.02] };
        // the forearms drop away to each side of him (not toward the camera); both sleeves then run off toward the examiner
        const o = { pose, qL, pL: site.p, n: site.n, contact: 'palm', parts: ['palm'], gap: EXP_GAP, deep, foreL: V(s0 * 0.5, -0.82, -0.28) };
        solveLocal(side, o);
        o.pose = Object.assign({}, pose, { curl: curlToSkin(side, o, PK, 0.006, [-0.1, 1.2]) });
        let st = solveLocal(side, o);
        // the thumb: pointing at the midline along the 10th rib, its pad hovering THUMB_HOVER over the skin
        const hand = EX[side].hand, tip = backHit(s0 * (0.25 + shift), sT);
        const nW = tip.n.clone().transformDirection(torso.matrixWorld), dirW = V(-s0, -0.06, 0).transformDirection(torso.matrixWorld);
        let lift = THUMB_HOVER;
        for (let it = 0; it < 5; it++) {
          hand.pose(o.pose); HANDS.place(hand, 'palm', torso.localToWorld(o.pL.clone().addScaledVector(o.n, st.offset)), toWorldQ(qL)); hand.group.updateMatrixWorld(true);
          o.thumbQ = thumbOver(side, torso.localToWorld(tip.p.clone().addScaledVector(tip.n, lift)), nW, dirW);
          const th = hand.thumb; th.meta.quaternion.copy(o.thumbQ[0]); th.mcp.quaternion.copy(o.thumbQ[1]); th.ip.quaternion.copy(o.thumbQ[2]); hand.group.updateMatrixWorld(true);
          const m = minSD(partMeshes(hand, 'thumb'), 1, deep).d; lift += THUMB_HOVER - m;
        }
        st = solveLocal(side, o);
        st.thumbTipL = torso.worldToLocal(hand.world('thumbTip'));
        setBreath(0);
        return st;
      };
      const B_OUT = -1.8, B_IN = 4.2;              // the chest breathed out fully / at the top of the deep breath

      // (b) tactile vocal fremitus: the palm of the right hand, flat, fingers together pointing up his back
      const fremitusState = (side, lv) => {
        // the examiner's right hand for every site (moved from right to left): upper zone, palm just below the top of the
        // shoulder with the fingers up and over it; middle and lower zones, fingers up his back
        const s0 = sx(side), Lv = LEVELS[lv - 1], site = lv === 1 ? backHit(s0 * Lv.x, Lv.s - 0.1) : SITES[side + lv];
        const fDir = (lv === 1 ? V(-s0 * 0.12, 1, 0) : lv === 3 ? V(-s0 * 0.1, 1, 0) : V(s0 * 0.08, 1, 0)).normalize();
        const qL = segQ(fDir, site.n);
        const o = { pose: flatPose, qL, pL: site.p, n: site.n, contact: 'palm', parts: ['palm'], gap: 0.005, fore: [0.5, 0.75, 0.45] };
        solveLocal('R', o);
        o.pose = Object.assign({}, flatPose, { curl: curlToSkin('R', o, PK, 0.005, [-0.15, lv === 1 ? 1.9 : 0.9]) });
        return solveLocal('R', o);
      };

      // (c) percussion: the examiner's left middle finger lies flat along the rib space (the other fingers lifted off, kept
      // together), and the tip of the right middle finger strikes its middle bone from a loose wrist, then lifts straight off
      const plexPose = { curl: { index: [-0.42, 0.06, 0.04], middle: [0.0, 0.0, 0.0], ring: [-0.42, 0.06, 0.04], little: [-0.4, 0.08, 0.05] }, spread: 0.0, thumb: [-0.1, 0, 0.05, 0.02] };
      const plexState = (side, lv) => {
        const site = SITES[side + lv];
        // the rib space runs across his back, sloping down toward his side; the fingers point to his right (screen right)
        const fDir = (side === 'R' ? V(-1, -0.25, 0) : V(-1, 0.25, 0)).normalize();
        const qL = segQ(fDir, site.n);
        const o = { pose: plexPose, qL, pL: site.p, n: site.n, contact: 'middleMidBack', parts: ['middle'], gap: 0.006, fore: [0.3, 0.9, 0.42] };
        // the middle finger's middle phalanx centred on the site: place its back over the site, then settle the whole finger on the skin
        let st = solveLocal('L', o);
        // straighten the middle finger onto the skin (it follows the curve of his back a little)
        o.pose = Object.assign({}, plexPose, { curl: Object.assign({}, plexPose.curl, curlToSkin('L', o, ['middle'], 0.006, [-0.15, 0.3])) });
        st = solveLocal('L', o);
        return st;
      };
      const strikePose = { curl: { index: [1.15, 1.45, 0.8], middle: [0.3, 1.25, 0.55], ring: [1.25, 1.5, 0.85], little: [1.3, 1.5, 0.85] }, spread: 0.25, thumb: [0.55, 0.3, 0.35, 0.2] };
      const strikeState = (side, lv, lift) => {
        // the striking right hand: a loose fist with the middle finger hooked; the hand lies above his back, fingers
        // pointing up it, and the fingertip comes straight down onto the middle bone of the left middle finger
        const plex = ST.ex.plex[side + lv];
        const hl = EX.L.hand; applyEx('L', localToWorldSt(plex)); hl.group.updateMatrixWorld(true);
        const target = torso.worldToLocal(hl.world('middleMidBack')), n = SITES[side + lv].n.clone();
        const fDir = V(side === 'R' ? 0.12 : 0.25, 1, 0).addScaledVector(n, -0.05).normalize();
        const qL0 = segQ(fDir, n.clone().addScaledVector(fDir, -n.dot(fDir)));
        const hand = EX.R.hand; hand.pose(strikePose);
        HANDS.place(hand, 'middleTip', torso.localToWorld(target.clone().addScaledVector(n, 0.004)), toWorldQ(qL0));
        hand.group.updateMatrixWorld(true);
        const wristL = torso.worldToLocal(hand.group.getWorldPosition(V(0, 0, 0)));
        // loose wrist: raised = the hand turned back about the wrist (its own palm-width axis), so the tip lifts off the back
        const axis = V(0, 0, 1).applyQuaternion(qL0).normalize();
        const qL = new THREE.Quaternion().setFromAxisAngle(axis, 0.42 * lift).multiply(qL0);
        return { wristL, qL, pose: strikePose, backL: foreDir(qL0, [0.6, 0.6, 0.5]), sleeveL: SLEEVE, tipTarget: target };
      };

      // (d) the stethoscope: a two-sided chest piece (diaphragm and bell), held by the right hand, the diaphragm pressed
      // flat on the skin; the tubing runs up out of the frame
      const STETH = { R: 0.215, H: 0.13 };       // diaphragm radius (4.3 cm across) and the piece's height
      const steth = new THREE.Group(); steth.name = 'stethoscope'; S.scene.add(steth);
      const metal = new THREE.MeshPhysicalMaterial({ color: '#c9ccd1', metalness: 0.85, roughness: 0.28, clearcoat: 0.4 });
      const blackClay = CLAY.mat('#2b2f36', '#1f2228', { rough: 0.5, streak: 0.3 });
      const tubeClay = CLAY.mat('#2e3440', '#252a33', { rough: 0.45, streak: 0.25, sheen: 0.3 });
      // built along +Y = out of the skin; the diaphragm face at y = 0
      const piece = new THREE.Group(); steth.add(piece);
      CLAY.mesh(new THREE.CylinderGeometry(STETH.R, STETH.R, 0.02, 48), CLAY.mat('#e9ecef', '#d5d9de', { rough: 0.35, streak: 0.2 }), piece, [0, 0.01, 0]);   // diaphragm membrane
      CLAY.mesh(new THREE.TorusGeometry(STETH.R, 0.022, 12, 48).rotateX(Math.PI / 2), metal, piece, [0, 0.022, 0]);                                       // rim
      CLAY.mesh(new THREE.CylinderGeometry(STETH.R * 0.92, STETH.R, 0.055, 48), metal, piece, [0, 0.05, 0]);
      CLAY.mesh(new THREE.CylinderGeometry(0.06, STETH.R * 0.7, 0.05, 40), metal, piece, [0, 0.1, 0]);
      CLAY.mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.06, 36), metal, piece, [0, 0.15, 0]);           // the bell on the other side
      CLAY.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 36), blackClay, piece, [0, 0.184, 0]);
      const stem = CLAY.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 16).rotateZ(Math.PI / 2), metal, piece, [0.18, 0.1, 0]);   // stem off the side
      const tube = CLAY.mesh(new THREE.BufferGeometry(), tubeClay, steth, null, null, 'steth-tube');
      let tubeKey = '';
      const setTube = (startW, outW) => {
        const key = startW.toArray().map((v) => v.toFixed(3)).join(',');
        if (key === tubeKey) return; tubeKey = key;
        // from the stem out of the side of the chest piece, up and away toward the examiner's ears, out of frame
        const a = startW, b = a.clone().addScaledVector(outW, 0.5).add(V(-0.3, 0.6, 0.35)), c = a.clone().addScaledVector(outW, 1.0).add(V(-1.2, 2.6, 1.6)), d = a.clone().addScaledVector(outW, 1.2).add(V(-2.6, 7.5, 3.2));
        tube.geometry.dispose(); tube.geometry = K.tube([a.toArray(), b.toArray(), c.toArray(), d.toArray()], 0.042, { radial: 12, segments: 60 });
      };
      steth.visible = false;
      const stethPose = { curl: { index: [0.5, 0.5, 0.3], middle: [0.5, 0.5, 0.3], ring: [1.0, 1.3, 0.75], little: [1.1, 1.35, 0.8] }, spread: 0.18, thumb: [0.45, 0.25, 0.3, 0.2] };
      const stethState = (side, lv) => {
        const site = SITES[side + lv];
        // the skin under the rim: fit the plane, so the chest piece sits square on his back
        const n = (() => {
          const t1 = V(0, 1, 0).addScaledVector(site.n, -site.n.y).normalize(), t2 = new THREE.Vector3().crossVectors(site.n, t1), pts = [];
          for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, q0 = site.p.clone().addScaledVector(t1, Math.cos(a) * STETH.R).addScaledVector(t2, Math.sin(a) * STETH.R); const h = backHit(q0.x, q0.y); pts.push(h.p); }
          let nn = V(0, 0, 0); for (let k = 0; k < 12; k++) { const a = pts[k].clone().sub(site.p), b = pts[(k + 3) % 12].clone().sub(site.p); nn.add(new THREE.Vector3().crossVectors(b, a)); }
          nn.normalize(); if (nn.dot(site.n) < 0) nn.negate();
          site.rim = pts; return nn;
        })();
        // pressed in: deep enough that the whole rim is flush with the skin (at least 1 mm at its lowest point)
        const PRESS = Math.max(...site.rim.map((q0) => -q0.clone().sub(site.p).dot(n))) + 0.01;
        // the chest piece: the diaphragm flat on the skin, pressed on firmly (gap 0); its stem points up his back
        const yAx = n.clone(), up = V(side === 'R' ? -0.15 : 0.15, 1, 0), xAx = up.clone().addScaledVector(yAx, -up.dot(yAx)).normalize();
        const zAx = new THREE.Vector3().crossVectors(xAx, yAx);
        const pieceQL = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, zAx));
        const pieceL = site.p.clone().addScaledVector(n, -PRESS);
        // the right hand comes from below: index and middle finger pads on the back of the chest piece, pressing it on
        const fDir = V(side === 'R' ? -0.1 : 0.15, 1, 0).addScaledVector(n, -0.12).normalize();
        const qL = segQ(fDir, n.clone().addScaledVector(fDir, -n.dot(fDir)));
        const hand = EX.R.hand; hand.pose(stethPose);
        const topL = pieceL.clone().addScaledVector(n, 0.192).addScaledVector(xAx, -0.03);
        HANDS.place(hand, 'middlePad', torso.localToWorld(topL.clone().addScaledVector(n, 0.004)), toWorldQ(qL));
        hand.group.updateMatrixWorld(true);
        const mp = torso.worldToLocal(hand.world('indexPad').lerp(hand.world('middlePad'), 0.5)), shift = topL.clone().sub(mp); shift.addScaledVector(n, -shift.dot(n));
        hand.group.position.add(torso.localToWorld(shift.clone()).sub(torso.localToWorld(V(0, 0, 0))));
        hand.group.updateMatrixWorld(true);
        const wristL = torso.worldToLocal(hand.group.getWorldPosition(V(0, 0, 0)));
        return { wristL, qL, pose: stethPose, backL: foreDir(qL, [0.6, 0.6, 0.5]), sleeveL: SLEEVE, pieceL, pieceQL, press: { c: site.p.clone(), n: n.clone(), R: STETH.R, depth: PRESS } };
      };

      // ---------------- build the states
      ST.ex.rest = { R: exSolve('R', exRest('R')), L: exSolve('L', exRest('L')) };
      setSit(1); shapeBack(1, 1, 1, 0);
      const BK = {};
      // calibrate: the thumb tips move apart by 5 cm in total between breathed out and breathed in
      const tipsApart = (pair) => { for (const sd of sides) applyEx(sd, localToWorldSt(pair[sd])); return EX.R.hand.world('thumbTip').distanceTo(EX.L.hand.world('thumbTip')); };
      BK.expOut = { R: expansionState('R', 0, B_OUT), L: expansionState('L', 0, B_OUT) };
      let kIn = 1;
      BK.expIn = { R: expansionState('R', kIn, B_IN), L: expansionState('L', kIn, B_IN) };
      for (let it = 0; it < 2; it++) {
        const d = tipsApart(BK.expIn) - tipsApart(BK.expOut);
        if (Math.abs(d - 0.5) < 0.02) break;
        kIn *= 0.5 / d; BK.expIn = { R: expansionState('R', kIn, B_IN), L: expansionState('L', kIn, B_IN) };
      }
      BK.expCal = { kIn, out: tipsApart(BK.expOut), in: tipsApart(BK.expIn) };
      BK.tvf = {}; for (const z of ZONES) for (const sd of sides) BK.tvf[sd + z.lv] = fremitusState(sd, z.lv);
      ST.ex.plex = {}; for (const Lv of LEVELS) for (const sd of sides) ST.ex.plex[sd + Lv.n] = plexState(sd, Lv.n);
      BK.strikeUp = {}; BK.strikeDown = {};
      for (const Lv of LEVELS) for (const sd of sides) { BK.strikeUp[sd + Lv.n] = strikeState(sd, Lv.n, 1); BK.strikeDown[sd + Lv.n] = strikeState(sd, Lv.n, 0); }
      BK.steth = {}; for (const Lv of LEVELS) for (const sd of sides) BK.steth[sd + Lv.n] = stethState(sd, Lv.n);
      // relaxed "hover" states near each site (fingers together, slightly curled, palm toward the back)
      const hoverOf = (st, lift = 0.35) => ({ wristL: st.wristL.clone().add(V(0, 0, -lift)), qL: st.qL.clone(), pose: travelPose, backL: st.backL.clone(), sleeveL: st.sleeveL });

      // ------------------------------------------------------------ timelines
      // the trunk: sitting-up amount and the back's relief
      const sitU = (t) => (t < T.back.lean[0] ? K.seg(t, T.sitUp[0], T.sitUp[1], K.ease.inOut) : 1 - K.seg(t, T.back.lean[0], T.back.lean[1], K.ease.inOut));
      const foldU = (t) => (t < T.back.unfold[0] ? K.seg(t, T.fold[0], T.fold[1], K.ease.inOut) : 1 - K.seg(t, T.back.unfold[0], T.back.unfold[1], K.ease.inOut));
      // deep-breath amount for the ribs (from the breathing schedule)
      const deepOf = (b) => Math.max(0, b - 1) / 3.2;
      // the examiner's hands: a list of keys [time, stateFn] per hand; between different keys the hand travels relaxed
      const W = (side, st, disp) => localToWorldSt(st, disp);
      const restW = (side) => ST.ex.rest[side];
      const breathDisp = (pL, b) => {             // how far a point on his back moves with the breath (chest scale + ribs)
        const sxx = 1 + 0.004 * b, szz = 1 + 0.012 * b, d = V(pL.x * (sxx - 1), 0, pL.z * (szz - 1));
        d.x += Math.sign(pL.x) * ribPush(pL.x, pL.y, deepOf(b)) * K.smooth(0.6, -0.1, pL.z);
        return d;
      };
      const ex = {};   // per-hand keyed timelines built below: [{ t, st: (tq) => worldState }]
      const KEYS = { R: [], L: [] };
      const key = (side, t, fn) => KEYS[side].push({ t, fn });
      const restKey = (side, t) => key(side, t, () => restW(side));
      // expansion
      const expSpread = (tq) => { const b = breathAt(tq).b; return K.clamp((b - 0) / 4.2); };
      for (const sd of sides) {
        restKey(sd, 0); restKey(sd, T.exp.go[0]);
        const expSt = (tq) => {
          const u = K.clamp((breathAt(tq).b - B_OUT) / (B_IN - B_OUT));
          const a = BK.expOut[sd], b = BK.expIn[sd];
          const st = { wristL: a.wristL.clone().lerp(b.wristL, u), qL: a.qL.clone().slerp(b.qL, u), pose: blendPose(a.pose, b.pose, u), thumbQ: a.thumbQ.map((qq, i) => qq.clone().slerp(b.thumbQ[i], u)), backL: a.backL.clone().lerp(b.backL, u).normalize() };
          return W(sd, st, null);
        };
        key(sd, T.exp.go[1], expSt); key(sd, T.exp.home[0], expSt); restKey(sd, T.exp.home[1]);
      }
      // fremitus (right hand only)
      restKey('R', 23.0);
      for (const s of TVF) { const st = BK.tvf[s.side + s.lv], f = (tq) => W('R', st, breathDisp(st.wristL.clone().setZ(-1), breathAt(tq).b)); key('R', s.on, f); key('R', s.off, f); }
      restKey('R', TVF[TVF.length - 1].off + 0.6);
      // percussion: left hand (pleximeter) and right hand (striker)
      restKey('L', T.perc.start); restKey('R', T.perc.start);
      for (const p of PERC) {
        const id = p.side + p.lv, pl = ST.ex.plex[id];
        const fL = (tq) => W('L', pl, breathDisp(pl.wristL.clone().setZ(-1), breathAt(tq).b));
        key('L', p.on, fL); key('L', p.off, fL);
        const up = BK.strikeUp[id], down = BK.strikeDown[id];
        const fR = (tq) => {
          // poses on twos: raised, strike (exactly on the strike frame), off, raised...
          let lift = 1; for (const s of p.strikes) { const k = Math.round((tq - s) * POSES); if (k === 0) lift = 0; else if (k === -1) lift = 0.55; else if (k === 1) lift = 0.45; }
          const st = { wristL: up.wristL.clone().lerp(down.wristL, 1 - lift), qL: up.qL.clone().slerp(down.qL, 1 - lift), pose: up.pose, backL: up.backL };
          return W('R', st, breathDisp(down.wristL.clone().setZ(-1), breathAt(tq).b));
        };
        key('R', p.on - 0.07, fR); key('R', p.off, fR);
      }
      restKey('L', PERC[PERC.length - 1].off + 0.5); restKey('R', PERC[PERC.length - 1].off + 0.5);
      // auscultation and vocal resonance (right hand with the chest piece)
      restKey('R', T.aus.pick[0]);
      for (const a of [...AUS, ...VR]) { const st = BK.steth[a.side + a.lv]; const f = (tq) => W('R', st, breathDisp(st.pieceL.clone().setZ(-1), breathAt(tq).b)); key('R', a.on, f); key('R', a.off, f); }
      restKey('R', T.back.hands[1]); restKey('L', T.back.hands[1]);
      restKey('R', D); restKey('L', D);
      for (const sd of sides) KEYS[sd].sort((a, b) => a.t - b.t);
      // between two different keys: lift off, travel relaxed (fingers together, palm toward the back), settle into the next
      const lerpW = (a, b, u) => {
        const o = { wrist: a.wrist.clone().lerp(b.wrist, u), quat: a.quat.clone().slerp(b.quat, u), pose: blendPose(a.pose, b.pose, u), back: a.back.clone().lerp(b.back, u).normalize() };
        if (a.thumbQ || b.thumbQ) { const ta = a.thumbQ || null, tb = b.thumbQ || null; if (ta && tb) o.thumbQ = ta.map((qq, i) => qq.clone().slerp(tb[i], u)); else if (u < 0.5 && ta) o.thumbQ = ta; else if (tb && u >= 0.5) o.thumbQ = tb; }
        return o;
      };
      const travel = (a, b, u, side) => {
        // relaxed hand in the middle of the move, lifted off the skin
        const e = K.ease.inOut(u), lift = Math.sin(Math.PI * u);
        const o = lerpW(a, b, e);
        o.pose = blendPose(o.pose, travelPose, lift * 0.85);
        if (o.thumbQ && lift > 0.3) o.thumbQ = null;
        torso.updateMatrixWorld(true);
        const outW = V(0, 0, -1).transformDirection(torso.matrixWorld);
        o.wrist.addScaledVector(outW, 0.45 * lift).add(V(0, 0.1 * lift, 0));
        return o;
      };
      const exAt = (side, tq) => {
        const ks = KEYS[side];
        let i = 0; while (i < ks.length - 1 && ks[i + 1].t <= tq) i++;
        const a = ks[i], b = ks[Math.min(ks.length - 1, i + 1)];
        if (i === ks.length - 1 || a.fn === b.fn) return a.fn(tq);
        return travel(a.fn(tq), b.fn(tq), K.clamp((tq - a.t) / (b.t - a.t)), side);
      };

      // stethoscope: in the right hand from the pick-up to the end of vocal resonance
      const stethOn = (tq) => tq >= T.aus.pick[0] + 0.3 && tq < T.back.steth[1];
      const stethPop = (tq) => K.ease.outBack(K.seg(tq, T.aus.pick[0] + 0.3, T.aus.pick[0] + 0.3 + 2 / POSES)) * (1 - K.seg(tq, T.back.steth[0], T.back.steth[1]));
      const onSkin = (tq) => { for (const a of [...AUS, ...VR]) if (tq >= a.on && tq < a.off) return a; return null; };

      // ------------------------------------------------------------ camera (smooth; only the camera moves smoothly)
      setSit(1); P.group.updateMatrixWorld(true);
      const tW = (x, y, z) => torso.localToWorld(V(x, y, z));
      const backC = tW(0, 3.7, -1.0), backN = V(0, 0, -1).transformDirection(torso.matrixWorld);
      const H = SET.HOME;
      // from behind his right shoulder, a little above, looking down onto his back (over the backrest)
      const C = {
        home: H,
        side: { pos: [4.5, 15.5, 22.0], target: [-1.2, 9.5, -0.3], fov: 28, focus: [-1.6, 10.0, 0.6], aperture: 0.06 },
        round: { pos: [-6.0, 19.5, 17.5], target: [-1.6, 10.2, -0.2], fov: 28, focus: [-1.8, 10.2, 0.6], aperture: 0.05 },
        back: { pos: [-14.0, 21.0, 6.2], target: [-1.7, 10.35, 0.15], fov: 28, focus: tW(0, 3.9, -1.0).toArray(), aperture: 0.04 },
        backHigh: { pos: [-13.2, 21.6, 5.4], target: [-1.6, 11.0, 0.1], fov: 28, focus: tW(0, 4.6, -1.0).toArray(), aperture: 0.035 },
        backLow: { pos: [-13.6, 19.6, 5.6], target: [-1.9, 9.6, 0.1], fov: 28, focus: tW(0, 3.0, -1.0).toArray(), aperture: 0.035 },
        backExp: { pos: [-13.4, 19.6, 2.6], target: [-2.0, 10.0, 0.1], fov: 28, focus: tW(0, 3.0, -1.0).toArray(), aperture: 0.03 },
        pullHigh: { pos: [-4.0, 22.0, 24.0], target: [-0.6, 8.5, -0.8], fov: 28, focus: [-0.8, 8.5, 0.4], aperture: 0.06 },
      };
      const camKeys = [
        [0, 'home'], [HOME_HOLD, 'home'], [T.sitHold[1], 'home'], [4.0, 'round'], [T.camRound[1], 'back'], [7.4, 'back'], [9.3, 'backHigh'], [11.6, 'backLow'], [12.2, 'back'], [13.4, 'backExp'],
        [21.0, 'backExp'], [22.0, 'back'], [80.8, 'back'], [82.4, 'round'], [84.0, 'home'], [D, 'home'],
      ];
      const toPt = (c) => (Array.isArray(c.focus) ? c.focus : c.target);
      const vec = (c) => [...c.pos, ...c.target, ...toPt(c), c.fov, c.aperture];
      const runs = [];
      { let cur = [camKeys[0]];
        for (let i = 1; i < camKeys.length; i++) { if (camKeys[i][1] === camKeys[i - 1][1]) { if (cur.length > 1) runs.push(cur); cur = [camKeys[i]]; } else cur.push(camKeys[i]); }
        if (cur.length > 1) runs.push(cur); }
      const runPaths = runs.map((r) => ({ t0: r[0][0], t1: r[r.length - 1][0], f: K.path(r.map(([t, n]) => [t, vec(C[n])])) }));
      const camAt = (t) => {
        let i = 0; while (i < camKeys.length - 1 && camKeys[i + 1][0] <= t) i++;
        const rp = runPaths.find((r) => t > r.t0 && t < r.t1);
        if (!rp) return C[camKeys[i][1]];
        const v = rp.f(t);
        return { pos: v.slice(0, 3), target: v.slice(3, 6), focus: v.slice(6, 9), fov: v[9], aperture: v[10] };
      };
      const shoot = (c) => {
        const cam = S.camera; cam.position.set(...c.pos); cam.up.set(...(c.up || [0, 1, 0])); cam.lookAt(...c.target);
        if (c.fov !== cam.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
        K.focus(cam, toPt(c), c.aperture);
      };
      const shadowFor = (t) => (t < 3.0 || t > 83.5 || (window.DBG && window.DBG.wideShadow) ? {} : { shadowCenter: backC.toArray(), shadowSize: 5.5 });

      // ------------------------------------------------------------ the clock (time sped up in the quick auscultation run)
      clock.group.position.set(-4.0, 7.6 + 0.5, -6.9); clock.group.scale.setScalar(0.55);      // on the bedside table, beside the glass
      clock.group.lookAt(V(...C.back.pos));
      const clockScale = (tq) => K.ease.outBack(K.seg(tq, QUICK[0] - 0.25, QUICK[0])) * (1 - K.ease.inBack(K.seg(tq, QUICK[1], QUICK[1] + 0.3)));
      const clockSec = (tq) => 45 * K.seg(tq, QUICK[0], QUICK[1]);      // about 45 s of breaths shown in 8 s

      // ------------------------------------------------------------ the frame for time t
      const homeLock = (t) => t <= HOME_HOLD + 1e-6 || t >= D - HOME_HOLD - 1e-6;
      const update = (t) => {
        const tq = SET.poseTime(t), still = homeLock(t);
        const u = still ? 0 : sitU(tq), fu = still ? 0 : foldU(tq);
        const br = still ? { b: 0, mouth: 0 } : breathAt(tq);
        // trunk, back relief, trousers seat and sheet
        setSit(u); useHi(u > 0); elbowPlugs.forEach((m) => (m.visible = u > 0));
        const on = K.smooth(0, 0.35, u);
        const pa = !still && stethOn(tq) ? onSkin(tq) : null;
        shapeBack(on, fu, u, deepOf(br.b), pa ? BK.steth[pa.side + pa.lv].press : null);
        CS.x = 1 + 0.004 * br.b; CS.z = 1 + 0.012 * br.b;
        seat.visible = u > 0.002;
        setDrape(u);
        P.breathe(Math.asin(K.clamp(br.b, -1, 1)) / (2 * Math.PI) * 4.6);       // P.breathe's own quiet scale ...
        chest.scale.set(1 + 0.004 * br.b, 1, 1 + 0.012 * br.b);                  // ... carried on for the deep breaths
        // his arms
        for (const sd of sides) { const r = ST.arm.rest[sd]; applyArm(sd, fu > 0 ? lerpArm(r, foldArm(sd), K.ease.inOut(fu)) : r); }
        // his face: lips apart for the deep breaths, the jaw moving for "44"
        const jaw = Math.max(0.32 * br.mouth, sayJaw(tq));
        P.setFace({ jaw });
        // the examiner
        applyEx('R', still ? restW('R') : exAt('R', tq)); applyEx('L', still ? restW('L') : exAt('L', tq));
        // stethoscope
        steth.visible = !still && stethOn(tq);
        if (steth.visible) {
          const a = onSkin(tq), hand = EX.R.hand;
          torso.updateMatrixWorld(true);
          const pop = stethPop(tq);
          let pW, qW;
          if (a) { const st = BK.steth[a.side + a.lv]; pW = torso.localToWorld(st.pieceL.clone().add(breathDisp(st.pieceL, br.b))); qW = toWorldQ(st.pieceQL); }
          else {          // carried under the finger pads between sites
            hand.group.updateMatrixWorld(true);
            const pads = hand.world('indexPad').lerp(hand.world('middlePad'), 0.5), dn = V(0, -1, 0).transformDirection(hand.group.matrixWorld).normalize();
            pW = pads.addScaledVector(dn, 0.19); qW = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dn.clone().negate());
          }
          piece.position.set(0, 0, 0); steth.position.copy(pW); steth.quaternion.copy(qW); piece.scale.setScalar(Math.max(0.001, pop));
          tube.position.set(0, 0, 0); tube.quaternion.identity();
          steth.updateMatrixWorld(true);
          const stemEnd = stem.localToWorld(V(0, 0.1, 0)), out = V(0, 1, 0).applyQuaternion(qW);
          tube.removeFromParent(); S.scene.add(tube); tube.visible = pop > 0.5; setTube(stemEnd, out);
        } else tube.visible = false;
        clock.set(clockSec(tq), still ? 0 : clockScale(tq));
        shoot(window.CAM_OVERRIDE || camAt(t));
        L.set(still ? 0 : tq, shadowFor(t));
        if (still) L.lamp.intensity = SET.LAMP.power;    // no flicker on the home shot (it must match the other parts)
        if (window.POSE_HOOK) window.POSE_HOOK(t);
      };

      // ------------------------------------------------------------ captions and review overlays (review only)
      const proj = (p) => { const v = (p.isVector3 ? p.clone() : V(...p)).project(S.camera); return [(v.x * 0.5 + 0.5) * S.W, (-v.y * 0.5 + 0.5) * S.H, v.z]; };
      const overlay = (ctx, t, Wd, Hd) => {
        const on = window.CAPTIONS != null ? !!window.CAPTIONS : style.captions;
        if (on && (!window.REVIEW || window.REVIEW.captions)) CAPTION.at(ctx, t, CAPTIONS, Wd, Hd);
        if (window.REVIEW) drawReview(ctx, Object.assign({}, window.REVIEW, { items: window.REVIEW.build ? window.REVIEW.build() : window.REVIEW.items }), Wd, Hd);
      };
      const drawReview = (ctx, R, Wd, Hd) => {
        const k = Wd / 1920;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const label = (x, y, text, col, dx = 14, dy = -14, size = 26) => {
          ctx.font = `600 ${size * k}px "Fredoka", sans-serif`; const w = ctx.measureText(text).width + 14 * k, h = (size + 10) * k;
          let bx = x + dx * k, by = y + dy * k - h / 2; if (dx < 0) bx = x + dx * k - w;
          ctx.fillStyle = 'rgba(248,238,219,0.93)'; ctx.beginPath(); ctx.roundRect(bx, by, w, h, 8 * k); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 2.5 * k; ctx.stroke();
          ctx.fillStyle = '#26336b'; ctx.textBaseline = 'middle'; ctx.fillText(text, bx + 7 * k, by + h / 2 + 1 * k);
        };
        for (const it of R.items || []) {
          const col = it.color || '#f2b33d';
          if (it.type === 'dot') { const [x, y] = proj(it.p); ctx.fillStyle = col; ctx.strokeStyle = '#102a2c'; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.arc(x, y, (it.r || 9) * k, 0, 7); ctx.fill(); ctx.stroke(); if (it.label) label(x, y, it.label, col, it.dx, it.dy, it.size); }
          else if (it.type === 'ring') { const [x, y] = proj(it.p); ctx.strokeStyle = col; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.arc(x, y, (it.r || 22) * k, 0, 7); ctx.stroke(); if (it.label) label(x, y, it.label, col, it.dx, it.dy, it.size); }
          else if (it.type === 'line') { ctx.strokeStyle = col; ctx.lineWidth = (it.w || 4) * k; if (it.dash) ctx.setLineDash(it.dash.map((v) => v * k)); ctx.beginPath(); it.pts.forEach((p, i) => { const [x, y] = proj(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); if (it.label) { const [x, y] = proj(it.pts[it.at == null ? it.pts.length - 1 : it.at]); label(x, y, it.label, col, it.dx, it.dy, it.size); } }
          else if (it.type === 'arrow') {
            const [x0, y0] = proj(it.a), [x1, y1] = proj(it.b), a = Math.atan2(y1 - y0, x1 - x0), hl = (it.head || 16) * k;
            ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = (it.w || 3.5) * k; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            const head = (x, y, ang) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - hl * Math.cos(ang - 0.4), y - hl * Math.sin(ang - 0.4)); ctx.lineTo(x - hl * Math.cos(ang + 0.4), y - hl * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill(); };
            head(x1, y1, a); if (it.both) head(x0, y0, a + Math.PI);
            if (it.label) label((x0 + x1) / 2, (y0 + y1) / 2, it.label, col, it.dx == null ? 12 : it.dx, it.dy == null ? -22 : it.dy, it.size);
          }
          else if (it.type === 'text') label(it.x * Wd, it.y * Hd, it.text, col, 0, 0, it.size || 30);
        }
        if (R.title) { ctx.font = `600 ${34 * k}px "Fredoka", sans-serif`; const w = ctx.measureText(R.title).width + 36 * k; ctx.fillStyle = 'rgba(16,42,44,0.82)'; ctx.beginPath(); ctx.roundRect(24 * k, 22 * k, w, 54 * k, 12 * k); ctx.fill(); ctx.fillStyle = '#f8eedb'; ctx.textBaseline = 'middle'; ctx.fillText(R.title, 42 * k, 50 * k); }
        ctx.restore();
      };

      // ------------------------------------------------------------ review panels (storyboard only, never in the video)
      // Gaps are measured on the real mesh: the closest point of each touching part (found with the distance field) is
      // cast onto his trunk along the skin normal.
      const gapOf = (meshes, nL) => {
        const r = minSD(meshes, 1, deepOf(breathAt(SET.poseTime(window.__T || 0)).b));
        torso.updateMatrixWorld(true);
        const e = 0.004, gq = (dx, dy, dz) => trunkSD(V(r.at.x + dx, r.at.y + dy, r.at.z + dz), deepOf(breathAt(SET.poseTime(window.__T || 0)).b));
        const gL = V(gq(e, 0, 0) - gq(-e, 0, 0), gq(0, e, 0) - gq(0, -e, 0), gq(0, 0, e) - gq(0, 0, -e)).normalize();
        const at = torso.localToWorld(r.at.clone()), nW = (gL.lengthSq() > 0.5 ? gL : nL.clone()).transformDirection(torso.matrixWorld);
        rc.set(at.clone().addScaledVector(nW, 0.5), nW.clone().negate());
        const h = rc.intersectObject(torsoMesh, false)[0];
        const gap = h ? h.distance - 0.5 : r.d;
        return { gap, from: at, to: h ? h.point.clone() : at.clone().addScaledVector(nW, -r.d) };
      };
      const mm = (u) => (u * 100).toFixed(1) + ' mm';
      const REV = {
        gapItems(list) {      // [{ meshes, n, label, color, dx, dy }]
          const items = [], report = [];
          for (const g of list) {
            const r = gapOf(g.meshes, g.n), lab = (g.label ? g.label + ': ' : '') + (r.gap < 0 ? 'INSIDE ' + mm(-r.gap) : mm(r.gap));
            const far = r.from.clone().add(r.from.clone().sub(r.to).normalize().multiplyScalar(g.len || 0.35));
            items.push({ type: 'arrow', a: far, b: r.to, color: g.color || '#f2b33d', label: lab, dx: g.dx, dy: g.dy, size: g.size || 24, head: 12, w: 3 });
            report.push({ part: g.label, gap_mm: +(r.gap * 100).toFixed(2) });
          }
          window.REVIEW_REPORT = (window.REVIEW_REPORT || []).concat(report);
          return items;
        },
        handMin(side, n) { const r = gapOf(partMeshes(EX[side].hand, 'body').concat(partMeshes(EX[side].hand, 'fingers'), partMeshes(EX[side].hand, 'thumbAll')), n); return r.gap; },
      };
      // handles for the storyboard / review panels
      root.RESP3_WORLD = { REV, gapOf, mm, S, P, SH, SH2, EX, steth, piece, bed, table, ST, BK, L, camAt, CAMS: C, exAt, setSit, shapeBack, applyArm, applyEx, foldArm, localToWorldSt, torso, torsoMesh, chest, SITES, trunkSD, minSD, partMeshes, backHit, tW, breathAt, sayJaw, update, shoot, seat, proj, SCAP, RIB10, VERT, LEVELS, ZONES };
      return { update, overlay };
    },

    // ================================================================ sound: effects in front, a quiet room bed under
    sound(k) {
      const c = style.content;
      // ambience bed: fades in over the first 0.5 s and out over the last 0.5 s (no clicks where the parts join)
      k.noise(0, { dur: D, color: 'brown', filter: 'lowpass', f: 300, gain: 0.11, a: 0.5, hold: D - 1.0, bus: 'amb' });
      k.noise(0, { dur: D, color: 'pink', filter: 'highpass', f: 4500, gain: 0.012, a: 0.5, hold: D - 1.0, bus: 'amb' });
      // soft camera travels
      for (const [t, d] of [[2.7, 3.0], [8.6, 1.6], [12.3, 1.2], [80.9, 2.8]]) k.play('whoosh', t, { dur: d, gain: 0.3, top: 1300 });
      // the mattress creaks a little as he sits up and lies back
      k.play('roller', c.T.sitUp[0] + 0.1, { dur: 1.2, gain: 0.12 }); k.noise(c.T.sitUp[0], { dur: 1.6, color: 'pink', filter: 'bandpass', f: 600, q: 0.8, gain: 0.05, a: 0.6 });
      k.play('roller', c.T.back.lean[0] + 0.1, { dur: 1.4, gain: 0.12 }); k.noise(c.T.back.lean[0], { dur: 1.8, color: 'pink', filter: 'bandpass', f: 600, q: 0.8, gain: 0.05, a: 0.6 });
      // gloved hands landing on skin: soft clay squishes
      const squish = (t, g = 0.4, f = 240) => { k.play('press', t, { gain: g * 0.5 }); k.noise(t, { dur: 0.08, color: 'pink', filter: 'bandpass', f, q: 1.2, gain: 0.1 * g }); };
      squish(c.T.exp.go[1], 0.45); squish(c.T.exp.go[1] + 0.03, 0.4, 300);
      for (const s of c.TVF) squish(s.on, 0.35);
      for (const p of c.PERC) squish(p.on, 0.22, 400);
      // percussion: a resonant note on the exact frame of every strike (low, hollow, rings a little); the same both sides
      const resonant = (t, pan) => {
        k.tone(t, { f: [[0, 132], [0.02, 118], [0.3, 108]], dur: 0.42, gain: 0.34, a: 0.002, pan, verb: 0.12 });
        k.tone(t, { f: [[0, 236], [0.25, 214]], dur: 0.26, gain: 0.09, a: 0.002, pan });
        k.noise(t, { dur: 0.06, color: 'pink', filter: 'bandpass', f: 260, q: 1.4, gain: 0.22, a: 0.001, pan });
        k.noise(t, { dur: 0.012, filter: 'highpass', f: 2500, gain: 0.05, a: 0.001, pan });
      };
      for (const p of c.PERC) for (const s of p.strikes) resonant(s, p.side === 'R' ? 0.18 : -0.18);
      // stethoscope: picked up, and set on the skin
      k.play('pop', c.T.aus.pick[0] + 0.32, { f: 480, gain: 0.35 });
      for (const a of [...c.AUS, ...c.VR]) k.play('tock', a.on, { f: 380, gain: 0.12 });
      k.play('pop', c.T.back.steth[0], { f: 380, gain: 0.25 });
      // VESICULAR breath sounds, only while the diaphragm is on the skin, from the same breathing schedule as the chest:
      // a soft rustle that grows through the whole of inspiration and fades early in expiration (shorter and quieter),
      // with no gap between them. Equal on both sides.
      for (const a of [...c.AUS]) {
        const br = c.BREATHS.find((b) => Math.abs(b.t0 - a.breath[0]) < 1e-6);
        if (!br) continue;
        const ti = br.t0, te = br.t0 + (br.t1 - br.t0) * br.insp, tend = br.t1, g = a.full ? 0.5 : 0.42, pan = a.side === 'R' ? 0.15 : -0.15;
        const inDur = te - ti;
        k.noise(ti, { dur: inDur + 0.12, color: 'pink', filter: 'bandpass', f: [[0, 420], [inDur, 560]], q: 0.6, gain: g, a: inDur * 0.97, pan });
        k.noise(ti, { dur: inDur + 0.12, color: 'brown', filter: 'lowpass', f: 700, gain: g * 0.6, a: inDur * 0.97, pan });
        const exDur = Math.min(a.off - te, (tend - te) * 0.45);
        k.noise(te, { dur: exDur, color: 'pink', filter: 'bandpass', f: [[0, 520], [exDur, 380]], q: 0.6, gain: g * 0.45, a: 0.04, pan });
      }
      // the clock buds in for the sped-up run, ticks, and goes
      const q0 = c.AUS[2].on - 0.25, q1 = c.AUS[c.AUS.length - 1].off;
      k.play('pop', q0 - 0.2, { f: 560, gain: 0.3 });
      for (let x = q0; x < q1; x += 0.18) k.play('tick', x, { f: 4800, gain: 0.12 });
      k.play('pop', q1 + 0.05, { f: 420, gain: 0.22 });
      // lying back: the stethoscope goes, hands back to rest
      squish(c.T.back.hands[1] - 0.1, 0.3);
    },
  };
  root.RESP3 = style;
})(typeof window !== 'undefined' ? window : globalThis);
