// shared/patient.js: THE RECURRING PATIENT of the cardiovascular examination series. One reusable clay model.
// Classic script; needs THREE, K, CLAY, HANDS, BED (for the bed measurements). Defines window.PATIENT.
//
// A clay man of about 55: medium-brown skin, one even colour (#9b6b4b), short dark-brown hair (#2a221d) greying at
// the sides (#8d8882), a neat moustache, NO beard, a SLIM neck (keep it slim: a later video looks at the neck veins),
// average build, bare-chested, light blue hospital pyjama trousers. He lies reclined at 45 degrees on the bed from
// bed.js, head on the pillow, head toward -X (screen left), his RIGHT side toward +Z (the camera and the examiner).
//
//   const P = PATIENT.build(S, { bed })     builds him into S.scene
//   P.setArm('R'|'L', wristWorld, handQuat, handPose, elbowPole)  two-bone reach; handQuat from HANDS.quat()
//   P.setFace({ jaw, tongue, gazeUp, pullR, blink })              0..1 each (tongue: 0 in, 1 out past the lower lip)
//   P.setPit('R'|'L', depth)          depth in world units (0.04 = 4 mm), the shape of a thumb pad
//   P.setRoll(u)                      0 = trousers down to the ankles, 1 = rolled up to mid-calf
//   P.breathe(t)                      quiet breathing (chest only, so his hands stay where they are)
//   P.anchor(name) -> world point,  P.anchorNormal(name) -> world normal     (names in P.anchors)
//   P.sheetMeshes                     the meshes the sheet drapes over (see sheet.js)
//   P.legSDF('R'|'L', worldPoint)     approximate signed distance to the lower leg and foot (negative inside)
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY, HANDS = root.HANDS, BED = root.BED;
  const PATIENT = (root.PATIENT = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  PATIENT.COLORS = {
    skin: ['#9b6b4b', '#7f5338'], palm: '#c39478', nail: ['#ecbcb0', '#ecbcb0'], hair: ['#2a221d', '#3b3029'], grey: ['#8d8882', '#5f5953'],
    lip: ['#9a5c52', '#844a42'], mouth: '#4e1b1f', tongue: ['#d97f80', '#c86c70'], tongueUnder: ['#e0939a', '#cf7d86'],
    sclera: '#f2ece2', iris: ['#4b2e1e', '#3a2216'], pupil: '#0c0807', conj: ['#f7a2a7', '#f0959b'], teeth: '#f4efe4',
    pyjama: ['#9fc4e2', '#7fa8cc'], nipple: '#5e3a2b',
  };
  // proportions (world units, 1 = 10 cm)
  PATIENT.DIM = { upperArm: 3.0, foreArm: 2.6, s0: 0.9, backOff: 0.97, headPos: [0, 6.75, 0.62], headTilt: 0.3, shoulderX: 1.92, shoulderY: 4.85 };
  PATIENT.PRESS_ABOVE_MM = 20;      // the press point: 2 cm above the medial malleolus, on the bone (the lower tibia)

  PATIENT.build = (S, opts = {}) => {
    const C = PATIENT.COLORS, D = PATIENT.DIM;
    const M = {
      skin: CLAY.mat(C.skin[0], C.skin[0], { prints: 0, rough: 0.58, streak: 0.0, freq: 1.4, seed: 1, bump: 0.55, lump: 0 }),   // even skin colour: fine tooth and waxy sheen only
      hand: CLAY.mat(C.skin[0], C.skin[0], { prints: 0, rough: 0.58, streak: 0.0, freq: 2.2, seed: 2, bump: 0.55, lump: 0, palm: C.palm, palmK: 0.85 }),
      armHand: CLAY.mat(C.skin[0], C.skin[0], { prints: 0, rough: 0.58, streak: 0.0, seed: 2, bump: 0.55, lump: 0, palm: C.palm, palmK: 0.85, palmX: [5.72, 6.08] }),   // the whole arm in one piece: the palm tint fades in over 3.5 cm past the wrist (x from the shoulder)
      handWrist: CLAY.mat(C.skin[0], C.skin[0], { prints: 0, rough: 0.58, streak: 0.0, seed: 2, bump: 0.55, lump: 0, palm: C.palm, palmK: 0.85, palmX: [0.1, 0.45] }),   // palm tint fades out toward the wrist over 3.5 cm (none where the forearm meets the palm)
      nail: CLAY.mat(C.nail[0], C.nail[1], { surface: 'flat', rough: 0.34, sheen: 0.25, streak: 0, bump: 0, lump: 0 }),   // clean, smooth, uniform pale-pink nail plates
      hair: CLAY.mat(C.hair[0], C.hair[1], { prints: 0, rough: 0.7, streak: 0.35, freq: 5, bump: 1.6, palm: C.grey[0], palmDir: [1, -0.35, 0], palmAbs: true, palmLo: 0.6, palmHi: 0.92, palmK: 0.85 }),
      brow: CLAY.mat(C.hair[0], C.hair[1], { prints: 0, rough: 0.7, streak: 0.5, freq: 5, bump: 1.2 }),
      grey: CLAY.mat(C.grey[0], C.grey[1], { prints: 0, rough: 0.7, streak: 0.55, freq: 6, bump: 1.6 }),
      lip: CLAY.mat(C.lip[0], C.lip[1], { prints: 0, rough: 0.52, streak: 0.4, freq: 4 }),
      mouth: CLAY.mat(C.mouth, '#3c1418', { prints: 0, rough: 0.5, streak: 0.3 }),
      tongue: CLAY.mat(C.tongue[0], C.tongue[0], { prints: 0, rough: 0.38, streak: 0.0, freq: 5, bump: 0.7, lump: 0, sheen: 0.3 }),   // one smooth, even pink
      tongueU: CLAY.mat(C.tongueUnder[0], C.tongueUnder[1], { prints: 0, rough: 0.32, streak: 0.35, freq: 5, bump: 0.5 }),
      sclera: CLAY.mat(C.sclera, '#e8ddd0', { prints: 0, rough: 0.22, sheen: 0.1, streak: 0.2, bump: 0.15 }),
      iris: CLAY.mat(C.iris[0], C.iris[1], { prints: 0, rough: 0.18, sheen: 0.1, streak: 0.6, freq: 30, bump: 0.2 }),
      pupil: CLAY.mat(C.pupil, '#000000', { prints: 0, rough: 0.12, bump: 0.1 }),
      conj: CLAY.mat(C.conj[0], C.conj[1], { surface: 'flat', rough: 0.3, streak: 0.2, freq: 12, bump: 0, lump: 0 }),
      teeth: CLAY.mat(C.teeth, '#e6dccb', { prints: 0, rough: 0.35, bump: 0.3 }),
      pyjama: CLAY.mat(C.pyjama[0], C.pyjama[1], { prints: 0, rough: 0.78, streak: 0.55, freq: 1.0, sheen: 0.45 }),
      nipple: CLAY.mat(C.nipple, '#4d2f23', { prints: 0, rough: 0.6 }),
      dark: CLAY.mat('#3a2a22', '#2a1e18', { rough: 0.6 }),
    };
    M.conj.emissive = new THREE.Color('#f7a2a7').multiplyScalar(0.16);   // the lining stays readable in the shadow of the brow
    M.pyjamaIn = M.pyjama.clone(); M.pyjamaIn.side = THREE.DoubleSide;
    { const m = M.armHand, ob = m.onBeforeCompile;                     // the arm skin is posed in world space: texture it by its rest shape
      m.onBeforeCompile = (sh, r) => { ob(sh, r); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 restPos, restNrm;').replace('vClayP = position; vClayN = normal;', 'vClayP = restPos; vClayN = restNrm;'); };
      m.customProgramCacheKey = () => 'soft-clay-rest'; }
    const root_ = new THREE.Group(); root_.name = 'patient'; S.scene.add(root_);
    const anchors = {};
    const anchor = (parent, name, p, n) => (anchors[name] = CLAY.anchor(parent, name, p, n));

    // ------------------------------------------------------------ torso (local: X = his left, Y = toward his head, Z = front)
    const torso = new THREE.Group(); torso.name = 'torso'; root_.add(torso);
    const O = BED.onBack(D.s0, D.backOff);
    const torsoMesh = CLAY.mesh(CLAY.loft([
      { s: 0, a: 1.72, c: 1.0, d: 1.0 }, { s: 0.9, a: 1.58, c: 1.0, d: 0.95 }, { s: 1.8, a: 1.52, c: 1.03, d: 0.92 },
      { s: 2.8, a: 1.66, c: 1.1, d: 0.95 }, { s: 3.8, a: 1.8, c: 1.12, d: 1.0 }, { s: 4.6, a: 1.86, c: 1.0, d: 0.98 },
      { s: 5.1, a: 1.7, c: 0.78, d: 0.86 }, { s: 5.45, a: 1.0, c: 0.5, d: 0.62 },
    ], { axis: 'y', radial: 72, rings: 70, pow: 2.25, capStart: 0.6, capEnd: 0.35, deform: (p, s) => {
      if (p.z <= 0) return;
      const ax = Math.abs(p.x);
      // pectorals: a broad, flat plate with a soft lower edge; a shallow groove down the sternum
      const plate = K.smooth(0.05, 0.35, ax) * (1 - K.smooth(1.35, 1.75, ax)) * K.smooth(3.45, 3.7, s) * (1 - K.smooth(4.5, 4.95, s));
      p.z += 0.085 * plate * K.smooth(0.3, 0.9, p.z) - 0.025 * Math.exp(-(p.x * p.x) / 0.02) * K.smooth(2.6, 3.2, s) * (1 - K.smooth(4.6, 5.0, s));
      // a little softness at the belly
      p.z += 0.04 * Math.exp(-((s - 1.6) ** 2) / 0.5) * Math.exp(-(p.x * p.x) / 1.2);
    } }), M.skin, torso, null, null, 'torso-body');
    torsoMesh.geometry = CLAY.lumpy(torsoMesh.geometry, { amount: 0.003, size: 1.6, seed: 4 });   // barely hand-shaped: no dents that read as patches
    const chest = new THREE.Group(); torso.add(chest);              // breathing moves this group only
    torsoMesh.removeFromParent(); chest.add(torsoMesh);
    for (const s of [-1, 1]) {
      CLAY.mesh(CLAY.ellipsoid(0.5, 0.62, 0.62), M.skin, torso, [s * 1.62, D.shoulderY + 0.05, -0.05]);          // top of the shoulder
      CLAY.mesh(K.tube([[s * 0.22, 5.12, 0.6], [s * 0.9, 5.14, 0.55], [s * 1.6, 5.05, 0.28]], 0.075, { radial: 12 }), M.skin, chest);  // clavicles
    }
    // nipples and navel, placed on the surface
    torso.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    const hitLocal = (parent, meshes, from, dir) => {
      parent.updateMatrixWorld(true);
      rc.set(parent.localToWorld(from.clone()), dir.clone().transformDirection(parent.matrixWorld).normalize());
      const h = rc.intersectObjects(meshes, false)[0];
      if (!h) return null;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      return { p: parent.worldToLocal(h.point.clone()), n: n.transformDirection(new THREE.Matrix4().copy(parent.matrixWorld).invert()).normalize() };
    };
    const chestMeshes = chest.children.filter((m) => m.isMesh);
    for (const s of [-1, 1]) {
      const h = hitLocal(chest, chestMeshes, V(s * 0.98, 3.62, 3), V(0, 0, -1));
      if (h) { const m = CLAY.mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.04, 20), M.nipple, chest); m.position.copy(h.p).addScaledVector(h.n, -0.008); m.quaternion.setFromUnitVectors(V(0, 1, 0), h.n); }
    }
    { const h = hitLocal(chest, [torsoMesh], V(0, 1.35, 3), V(0, 0, -1)); if (h) { const m = CLAY.mesh(new THREE.SphereGeometry(0.06, 14, 10), M.dark, chest); m.position.copy(h.p).addScaledVector(h.n, -0.035); } }

    // neck: SLIM, clear of hair (no beard)
    const neck = CLAY.mesh(CLAY.loft([
      { s: 4.85, a: 0.58, c: 0.5, d: 0.52, v: -0.22 }, { s: 5.55, a: 0.5, c: 0.46, d: 0.5, v: -0.02 },
      { s: 6.25, a: 0.49, c: 0.45, d: 0.48, v: 0.28 }, { s: 6.75, a: 0.5, c: 0.46, d: 0.5, v: 0.45 },
    ], { axis: 'y', radial: 40, rings: 20, capStart: 0.5, capEnd: 0.5 }), M.skin, torso, null, null, 'neck');
    anchor(torso, 'neckR', [-0.49, 5.9, 0.12], [-1, 0, 0.2]);

    // ------------------------------------------------------------ head (local: origin at the centre, +Y crown, +Z face, +X his left)
    // One smoothly sculpted egg (no lumps): a gently tapered jaw, flat face plane, brow, eye sockets, cheekbones, chin.
    // The lower face (chin and lower lip) is a separate piece hinged in front of the ears, like a stop-motion jaw;
    // its edges run along the marionette lines.
    const head = new THREE.Group(); head.name = 'head'; torso.add(head);
    head.position.set(...D.headPos); head.rotation.x = D.headTilt;
    const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
    const MOUTH_Y = -0.5;
    const noseH = (x, y) => {
      if (y > 0.26 || y < -0.34) return 0;
      const h = y > -0.2 ? K.lerp(0.0, 0.165, K.smooth(0.24, -0.2, y)) : K.lerp(0.165, 0.0, K.smooth(-0.2, -0.33, y));
      const sx = 0.042 + 0.045 * K.smooth(0.12, -0.22, y);
      let r = h * Math.exp(-((x / sx) ** 2));
      r += 0.035 * g2(x, y, 0, -0.19, 0.06, 0.05);                                      // round tip
      for (const s2 of [-1, 1]) r += 0.075 * g2(x, y, s2 * 0.083, -0.245, 0.045, 0.04);  // wings of the nose
      return r;
    };
    const sculpt = (d, out) => {
      let x = d.x * 0.72, y = d.y * 0.95 + 0.1, z = d.z * 0.85 - 0.05;
      const low = K.smooth(0.15, -0.95, y);
      x *= 1 - 0.1 * low;                                        // jaw a little narrower than the skull
      const front = K.smooth(0.05, 0.5, d.z);
      if (d.z > 0 && y < 0.3) {                                  // the lower face comes forward to the mouth and the chin: a smooth bulge
        const yy = (y - 0.1) / 0.95, ez = Math.sqrt(Math.max(0, 1 - yy * yy)) * 0.85 - 0.05;
        const prof = y > -0.5 ? K.lerp(0.79, 0.84, K.smooth(0.2, -0.45, y)) : y > -0.84 ? K.lerp(0.84, 0.78, K.smooth(-0.5, -0.84, y)) : K.lerp(0.78, 0.3, K.smooth(-0.84, -1.02, y));
        const amt = Math.max(0, prof - 0.03 - ez) * K.smooth(0.32, 0.02, y);
        const wx = 0.4 - 0.08 * K.smooth(-0.5, -0.95, y);
        z += amt * Math.exp(-((x / wx) ** 2)) * K.smooth(0.0, 0.45, d.z);
      }
      if (z > 0) { const kz = 0.035, over = kz * Math.log(1 + Math.exp((z - 0.82) / kz)); z -= 0.3 * front * (1 - low) * over; }   // a flatter face plane
      let r = 0;
      for (const sx of [-1, 1]) {
        r += 0.03 * g2(x, y, sx * 0.29, 0.34, 0.2, 0.07);        // brow
        r -= 0.045 * g2(x, y, sx * 0.3, 0.16, 0.12, 0.09);       // eye sockets
        r += 0.025 * g2(x, y, sx * 0.43, -0.06, 0.13, 0.11);     // cheekbones
        r -= 0.015 * g2(x, y, sx * 0.62, 0.32, 0.1, 0.14);       // temples
        r -= 0.012 * g2(x, y, sx * 0.2, -0.33, 0.06, 0.12);      // the fold from the nose toward the mouth corner
      }
      r += 0.03 * g2(x, y, 0, -0.84, 0.15, 0.1);                 // chin
      r -= 0.018 * g2(x, y, 0, -0.66, 0.12, 0.04);               // the fold under the lower lip
      r += noseH(x, y);
      out.set(x, y, z);
      out.z += r * front;
      return out;
    };
    const mouthY = (x) => MOUTH_Y + 0.22 * x * x;
    // a thin mouth slit between the lips; the chin skin below it bends with the jaw (weights fall off toward the cheeks)
    const inSlit = (q) => q.z > 0.3 && Math.abs(q.x) < 0.185 && Math.abs(q.y - mouthY(q.x)) < 0.016 * Math.sqrt(Math.max(0, 1 - (q.x / 0.185) ** 2));
    const latW = (x) => 1 - K.smooth(0.02, 0.3, Math.abs(x));
    const jawW = (q) => q.z < -0.15 ? 0 : K.smooth(mouthY(q.x) + 0.002, mouthY(q.x) - 0.02, q.y) * latW(q.x) * K.smooth(-0.15, 0.25, q.z);
    const egg = new THREE.SphereGeometry(1, 240, 180), ep = egg.attributes.position, sp = [], dvec = V(0, 0, 0), q = V(0, 0, 0);
    for (let i = 0; i < ep.count; i++) { sculpt(dvec.set(ep.getX(i), ep.getY(i), ep.getZ(i)).normalize(), q); sp.push(q.x, q.y, q.z); }
    const vq = (i) => q.set(sp[3 * i], sp[3 * i + 1], sp[3 * i + 2]);
    const cIdx = [];
    { const I = egg.index.array; for (let t = 0; t < I.length; t += 3) { const a = inSlit(vq(I[t])), b = inSlit(vq(I[t + 1])), c = inSlit(vq(I[t + 2])); cIdx.push(I[t], I[t + 1], I[t + 2]); } }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); cg.setIndex(cIdx); cg.computeVertexNormals();
    const cranium = CLAY.mesh(cg, M.skin, head, null, null, 'cranium');
    const skin = [];   // [vertex index, weight] of the vertices that follow the jaw
    for (let i = 0; i < ep.count; i++) { const w = jawW(vq(i)); if (w > 0.002) skin.push([i, w]); }
    const crBase = Float32Array.from(sp), crBaseN = Float32Array.from(cg.attributes.normal.array);
    const faceParts = [cranium];
    const surf = (x, y) => { const h = hitLocal(head, [cranium], V(x, y, 3), V(0, 0, -1)); return h ? h.p.z : 0.8; };
    // the dark inside of the head, seen only through the open mouth
    for (const s of [-1, 1]) {
      faceParts.push(CLAY.mesh(CLAY.ellipsoid(0.075, 0.23, 0.15), M.skin, head, [s * 0.7, 0.04, -0.06], [0, s * 0.3, 0]));      // ears
      CLAY.mesh(CLAY.ellipsoid(0.03, 0.12, 0.075), M.skin, head, [s * 0.755, 0.05, -0.04], [0, s * 0.3, 0]);                     // ear rims
    }
    head.updateMatrixWorld(true);
    // nose: sculpted into the head above; here only the nostrils
    const zf = (y) => surf(0, y);
    for (const s of [-1, 1]) CLAY.mesh(CLAY.ellipsoid(0.026, 0.014, 0.03), M.dark, head, [s * 0.052, -0.3, surf(s * 0.052, -0.3) - 0.004]);
    // lips follow the face surface; the upper lip and moustache on the head, the lower lip on the jaw
    const lipGeo = (hw, th, out, yOf) => CLAY.loft([{ s: -hw, a: out * 0.35, c: th * 0.4 }, { s: -hw * 0.55, a: out, c: th }, { s: 0, a: out * 0.92, c: th * 0.9 }, { s: hw * 0.55, a: out, c: th }, { s: hw, a: out * 0.35, c: th * 0.4 }],
      { axis: 'x', radial: 24, rings: 30, deform: (p) => { const y0 = yOf(p.x); p.y += y0; p.z += surf(p.x * 0.98, y0) - 0.012; } });
    const upperLip = CLAY.mesh(lipGeo(0.21, 0.032, 0.038, (x) => mouthY(x) + 0.03), M.lip, head, null, null, 'upper-lip');
    const mous = CLAY.mesh(CLAY.loft([{ s: -0.23, a: 0.018, c: 0.02 }, { s: -0.13, a: 0.034, c: 0.038 }, { s: 0, a: 0.03, c: 0.032 }, { s: 0.13, a: 0.034, c: 0.038 }, { s: 0.23, a: 0.018, c: 0.02 }],
      { axis: 'x', radial: 24, rings: 30, deform: (p) => { const y0 = mouthY(p.x) + 0.105 - 0.3 * p.x * p.x; p.y += y0; p.z += surf(p.x, y0) + 0.008; } }), M.brow, head, null, null, 'moustache');
    function torusArcG(R, r, arc) { const g = new THREE.TorusGeometry(R, r, 10, 28, arc); g.rotateZ(Math.PI / 2 - arc / 2); g.rotateX(Math.PI / 2); return g; }

    // jaw: the chin piece and the lower lip, teeth and tongue
    const jaw = new THREE.Group(); jaw.name = 'jaw'; jaw.position.set(0, -0.35, -1.0); head.add(jaw);
    const jp = (x, y, z) => [x, y + 0.35, z + 1.0];
    const lowerLip = CLAY.mesh(lipGeo(0.2, 0.04, 0.044, (x) => mouthY(x) - 0.036), M.lip, head, null, null, 'lower-lip');
    const llBase = Float32Array.from(lowerLip.geometry.attributes.position.array);
    const ML = zf(MOUTH_Y);
    // the open mouth, made like a stop-motion replacement piece: a shallow dark dish that sits on the face between the
    // lips, with the teeth and the tongue modelled in relief inside it. Two tongue pieces are swapped: tongue down, and
    // tongue tip lifted to the roof of the mouth showing its pink underside and the frenulum.
    const mouthG = new THREE.Group(); head.add(mouthG);
    const dishGeo = (() => { const g = new THREE.SphereGeometry(0.34, 48, 20, 0, Math.PI * 2, 0, 0.56); g.rotateX(Math.PI / 2); g.translate(0, 0, -0.34 * Math.cos(0.56)); g.scale(1, 1, -1); return g; })();
    const mouthIn = M.mouth.clone(); mouthIn.side = THREE.DoubleSide;
    const dish = CLAY.mesh(dishGeo, mouthIn, mouthG);   // a shallow bowl, hollow side toward the viewer
    // teeth: a row of separate, rounded teeth along the curve of the jaw (not a white bar). widths are per tooth from the
    // middle out (central incisor, lateral incisor, canine, premolar); h = height, dep = front-to-back depth
    const teethRow = (widths, h, dep, down) => {
      const g = new THREE.Group(); let x = 0.001;
      for (const w of widths) { for (const sx of [-1, 1]) {
        const cx = sx * (x + w / 2), hw = w / 2 - 0.0012;
        const tooth = CLAY.mesh(CLAY.loft([{ s: 0, a: hw * 0.92, c: dep * 0.5 }, { s: h * 0.55, a: hw, c: dep * 0.5 }, { s: h, a: hw * 0.9, c: dep * 0.36 }],
          { axis: 'y', radial: 20, rings: 6, pow: 3, capStart: 0.2, capEnd: 0.5 }), M.teeth, g);
        tooth.position.set(cx, 0, -1.0 * cx * cx);                     // the row curves back toward the corners of the mouth
        tooth.rotation.y = -sx * Math.atan(2.0 * Math.abs(cx));
        if (down) tooth.rotation.x = Math.PI;                         // the upper teeth hang down from the gum
      } x += w; }
      mouthG.add(g); return g;
    };
    const upTeeth = teethRow([0.034, 0.028, 0.027, 0.026], 0.042, 0.02, true);
    const loTeeth = teethRow([0.024, 0.024, 0.025, 0.025], 0.034, 0.018, false);
    // the tongue, resting inside the mouth while the mouth is only a little open
    const tongueDown = CLAY.mesh(CLAY.ellipsoid(0.12, 0.05, 0.03), M.tongue, mouthG);
    // the tongue out: ONE smooth piece that slides forward over the lower teeth and past the lower lip, with a soft
    // groove down its middle and a rounded tip. Built along +X, turned so +X points out of the mouth (head +Z).
    const TONGUE_L = 0.34;
    const tongueOutGeo = CLAY.loft([
      { s: 0, a: 0.1, c: 0.045, d: 0.045 }, { s: 0.1, a: 0.122, c: 0.044, d: 0.04 }, { s: 0.2, a: 0.128, c: 0.04, d: 0.034 },
      { s: 0.28, a: 0.112, c: 0.034, d: 0.03 }, { s: TONGUE_L, a: 0.078, c: 0.028, d: 0.025 },
    ], { axis: 'x', radial: 56, rings: 40, pow: 2.3, capStart: 0.4, capEnd: 0.95, deform: (p, s2) => {
      if (p.y > 0) p.y -= 0.011 * Math.exp(-((p.z / 0.03) ** 2)) * K.smooth(0.02, 0.12, s2) * (1 - K.smooth(TONGUE_L - 0.02, TONGUE_L + 0.06, s2));   // soft midline groove on top
      p.y -= 0.35 * Math.max(0, s2 - 0.12) ** 2;                    // the free part droops a little over the lower lip
    } });
    tongueOutGeo.rotateY(-Math.PI / 2);
    const tongueOut = new THREE.Group(); mouthG.add(tongueOut);
    CLAY.mesh(tongueOutGeo, M.tongue, tongueOut, null, null, 'tongue-out');
    anchor(tongueOut, 'tongueUnder', [0, -0.04, TONGUE_L - 0.03], [0, -0.3, 1]);
    anchor(tongueOut, 'tongue', [0, 0.03, TONGUE_L - 0.06], [0, 1, 0.3]);
    anchor(head, 'lips', [0, MOUTH_Y, ML + 0.05], [0, 0, 1]);
    const placeMouth = (open, tongue) => {
      mouthG.visible = open > 0.04;
      if (!mouthG.visible) return;
      const top = mouthY(0) - 0.01, bot = mouthY(0) - 0.02 - 0.2 * open, h = top - bot, cy = (top + bot) / 2, z0 = ML + 0.004;
      dish.position.set(0, cy + 0.01, z0 + 0.012); dish.scale.set(0.84, h / 0.36 * 0.92, 0.6);
      upTeeth.position.set(0, top + 0.014, z0 + 0.004);              // hanging from just inside the upper lip, in front of the dark mouth
      loTeeth.position.set(0, bot - 0.008, z0 - 0.004);
      const out = K.ease.inOut(K.clamp(tongue / 0.6)) * (tongue > 0.01 ? 1 : 0);
      tongueDown.visible = out < 0.02;
      tongueDown.position.set(0, bot + 0.06, z0 - 0.006);
      tongueOut.visible = out >= 0.02;
      // slides out from inside the mouth until the tip is about 1.2 cm past the lower lip, resting on the lower teeth
      tongueOut.position.set(0, bot + 0.026, z0 - 0.3 + 0.17 * out); tongueOut.rotation.x = 0.08;
    };

    // eyes, seated in the sockets. The RIGHT eye is at -X.
    const eyes = {};
    for (const side of ['R', 'L']) {
      const sx = side === 'R' ? -1 : 1, ex = sx * 0.3, ey = 0.165, E = [ex, ey, surf(ex, ey) - 0.075], r = 0.12;
      const eg = new THREE.Group(); eg.position.set(...E); head.add(eg);
      const ball = new THREE.Group(); eg.add(ball);
      CLAY.mesh(new THREE.SphereGeometry(r, 40, 28), M.sclera, ball);
      const cap = (rad, ang, mat) => { const g = new THREE.SphereGeometry(rad, 40, 10, 0, Math.PI * 2, 0, ang); g.rotateX(Math.PI / 2); return CLAY.mesh(g, mat, ball); };
      cap(r * 1.004, 0.52, M.iris);      // iris, with a clean edge all the way round (no grey ring = no arcus)
      cap(r * 1.008, 0.2, M.pupil);
      // eyelids: shells just outside the eyeball
      const lr = 0.134, ph0 = Math.PI / 2 - 1.5, phL = 3.0;
      const upper = new THREE.Group(); eg.add(upper);
      CLAY.mesh(new THREE.SphereGeometry(lr, 44, 18, ph0, phL, 0.05, 1.07), M.skin, upper);
      const lower = new THREE.Group(); eg.add(lower);
      const lgeo = new THREE.SphereGeometry(lr, 44, 12, ph0, phL, 2.12, 0.62);
      CLAY.mesh(lgeo, M.skin, lower);
      const inner = CLAY.mesh(lgeo.clone(), M.conj, lower); inner.material = M.conj.clone(); inner.material.side = THREE.BackSide; inner.scale.setScalar(0.985);
      const rim = (th, grp, rr) => { const pts = []; for (let i = 0; i <= 24; i++) { const ph = ph0 + 0.1 + (phL - 0.2) * i / 24; pts.push([-Math.cos(ph) * Math.sin(th) * lr, Math.cos(th) * lr, Math.sin(ph) * Math.sin(th) * lr]); } return CLAY.mesh(K.tube(pts, rr, { radial: 10, segments: 48 }), M.skin, grp); };
      rim(1.12, upper, 0.016); rim(2.12, lower, 0.013);
      // the pink inner lining of the lower lid (conjunctiva), tucked under the lid until it is drawn down
      const conjG = new THREE.Group(); eg.add(conjG);
      CLAY.mesh(new THREE.SphereGeometry(0.138, 48, 14, ph0 + 0.4, phL - 0.8, 1.98, 0.6), M.conj, conjG);   // sits just proud of the cheek skin
      // inner corner of the eye (caruncle) toward the nose
      CLAY.mesh(CLAY.ellipsoid(0.026, 0.02, 0.022), M.conj, eg, [-sx * 0.112, -0.012, 0.05]);
      // eyebrow, lying on the brow
      const bp = [[sx * 0.45, 0.33], [sx * 0.31, 0.375], [sx * 0.15, 0.355]].map(([x, y]) => [x, y, surf(x, y) + 0.012]);
      CLAY.mesh(K.tube(bp, 0.03, { radial: 10, segments: 18 }), M.brow, head);
      eyes[side] = { group: eg, ball, upper, lower, conjG, E };
      anchor(eg, side + 'innerCorner', [-sx * 0.118, -0.01, 0.055], [-sx * 0.5, 0, 1]);
      anchor(ball, side + 'irisRim', [sx * 0.06, 0, 0.105], [0, 0, 1]);
      anchor(eg, side + 'conj', [0, -0.088, 0.088], [0, -0.4, 1]);
    }
    // hair: a dark cap following the head, greying at the sides, hidden below the hairline
    const hairCap = (mat, scale, keep) => {
      const g = new THREE.SphereGeometry(1, 260, 190), p = g.attributes.position, out = V(0, 0, 0);
      for (let i = 0; i < p.count; i++) {
        const d = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
        let hy = K.lerp(K.lerp(-0.45, -0.05, K.smooth(0.3, 0.75, Math.abs(d.x))), 0.42 + 0.12 * K.smooth(0.25, 0.5, Math.abs(d.x)), K.smooth(-0.4, 0.62, d.z));   // nape at the back, higher at the temples (age 55)
        hy = K.lerp(hy, Math.min(hy, 0.0), K.smooth(0.72, 0.86, Math.abs(d.x)) * K.smooth(-0.3, -0.1, d.z) * (1 - K.smooth(0.35, 0.55, d.z)));   // above the ears, short sideburns
        const on = K.smooth(hy - 0.07, hy + 0.07, d.y) * (keep(d) ? 1 : 0);
        sculpt(d, out);
        const k = K.lerp(0.975, scale * (1 + 0.006 * Math.sin(d.x * 31 + d.z * 17) * Math.sin(d.y * 23)), on);
        p.setXYZ(i, out.x * k, (out.y - 0.1) * k + 0.1, (out.z + 0.05) * k - 0.05);
      }
      g.computeVertexNormals();
      return CLAY.mesh(g, mat, head);
    };
    hairCap(M.hair, 1.035, () => true);
    anchor(head, 'RcheekBelowEye', [-0.3, -0.04, 0.0], [0, 0, 1]);
    anchor(head, 'Rcheek', [-0.45, -0.18, 0.0], [0, 0, 1]);

    // ------------------------------------------------------------ arms and hands (world space, posed by setArm)
    const arms = {};
    for (const side of ['R', 'L']) {
      const g = new THREE.Group(); g.name = 'arm-' + side; root_.add(g);
      const up = new THREE.Group(); g.add(up);          // frames only: the upper arm (from the shoulder) and the forearm (from the elbow)
      const fore = new THREE.Group(); g.add(fore);
      // The whole arm is ONE surface, from the shoulder through the elbow and the wrist into the palm up to the knuckles
      // (x = distance from the shoulder; the elbow at x = L1, the wrist at x = L1 + L2). setArm bends it with three
      // frames (upper arm, forearm, hand) that blend smoothly over 3 cm at the elbow and 6 cm at the wrist, so there is
      // no ring at the elbow and no seam or colour edge at the wrist. The hand's own palm piece is hidden.
      const zs = side === 'L' ? -1 : 1, L1 = D.upperArm, WR = D.upperArm + D.foreArm;
      const pg = (x, z, cx, cz, sx, sz2) => Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz2) ** 2));
      const armGeo = CLAY.loft([{ s: -0.15, a: 0.54, c: 0.54 }, { s: 0.45, a: 0.62, c: 0.62 }, { s: 1.2, a: 0.52, c: 0.52 }, { s: 2.2, a: 0.45, c: 0.44 }, { s: L1 - 0.05, a: 0.405, c: 0.39 },
        { s: L1 + 0.3, a: 0.43, c: 0.39 }, { s: L1 + 0.8, a: 0.45, c: 0.39 }, { s: L1 + 1.8, a: 0.35, c: 0.27 }, { s: L1 + 2.3, a: 0.3, c: 0.195, d: 0.19 },
        { s: WR - 0.12, a: 0.275, c: 0.163, d: 0.155 }, { s: WR + 0.15, a: 0.33, c: 0.142, d: 0.132 }, { s: WR + 0.55, a: 0.42, c: 0.135, d: 0.12 }, { s: WR + 0.9, a: 0.43, c: 0.125, d: 0.115, v: 0.01 }],
      { axis: 'x', radial: 56, rings: 150, pow: 2.15, capStart: 0.8, capEnd: 0.55, deform: (p) => {
        if (p.y >= 0 || p.x < WR - 0.25) return;                     // the palm: thenar and hypothenar eminences, as on the hand (hands.js)
        const hx = p.x - WR, hz = p.z * zs, k = Math.min(1, -p.y / 0.06) * K.smooth(WR - 0.25, WR + 0.05, p.x);
        p.y -= k * (0.085 * pg(hx, hz, 0.28, -0.24, 0.26, 0.15) + 0.06 * pg(hx, hz, 0.42, 0.28, 0.28, 0.1) + 0.035 * pg(hx, hz, 0.88, 0, 0.1, 0.4) - 0.02 * pg(hx, hz, 0.55, 0.02, 0.18, 0.15));
      } });
      // the skin's texture and palm tint stay fixed to the arm: the material reads the rest shape (restPos, restNrm)
      armGeo.setAttribute('restPos', armGeo.attributes.position.clone()); armGeo.setAttribute('restNrm', armGeo.attributes.normal.clone());
      const armMesh = CLAY.mesh(armGeo, M.armHand, g, null, null, 'arm-skin-' + side);
      armMesh.userData.base = Float32Array.from(armGeo.attributes.position.array);
      const hand = HANDS.make({ skin: M.hand, skinWrist: M.handWrist, nail: M.nail, side, name: 'patient-hand-' + side });
      hand.body.children.forEach((m) => { if (m.name === 'palm') m.visible = false; });
      g.add(hand.group);
      arms[side] = { group: g, up, fore, hand, armMesh, foreMesh: armMesh };
    }
    const shoulder = (side) => torso.localToWorld(V(side === 'R' ? -D.shoulderX : D.shoulderX, D.shoulderY, -0.05));

    // ------------------------------------------------------------ legs: right leg built, left leg is its mirror (Z -> -Z)
    // shin cross-section frame: a = lateral (+Z for the right leg), b = medial, c = front (shin bone), d = back (calf)
    const legR = new THREE.Group(); legR.name = 'leg-R'; root_.add(legR);
    const legL = new THREE.Group(); legL.name = 'leg-L'; legL.scale.z = -1; root_.add(legL);
    const EXT = 0.12;   // the legs rest a little turned out (external rotation, the same on both sides): the feet lean slightly outward
    const shinC = (s) => ({ u: K.map(s, 2.4, 6.72, 1.0, 1.15), v: K.map(s, 2.4, 6.72, 6.62, 6.43) });
    const gauss = (x, s) => Math.exp(-(x * x) / (2 * s * s));
    const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    const MM = { s: 6.47, ang: Math.PI - 0.45 };       // medial malleolus (inner ankle bone): on the inner side of the ankle, facing in and a little up
    const LM = { s: 6.6, ang: -0.3 };                  // lateral malleolus (outer, a little lower)
    // The lower leg and the foot are ONE smooth sweep: the shin runs straight to the ankle, then bends forward through the
    // heel into the foot, so heel, ankle and foot are a single shape with no join.
    // Cross-section frame: a = lateral, b = medial, c = front (shin bone; on the foot: the dorsum), d = back (calf; heel, sole).
    const SHIN = [{ s: 2.4, a: 0.53, b: 0.53, c: 0.47, d: 0.52 }, { s: 3.3, a: 0.55, b: 0.55, c: 0.44, d: 0.66 }, { s: 4.3, a: 0.5, b: 0.5, c: 0.4, d: 0.58 },
      { s: 5.3, a: 0.4, b: 0.4, c: 0.34, d: 0.41 }, { s: 5.9, a: 0.36, b: 0.36, c: 0.31, d: 0.33 }, { s: 6.62, a: 0.36, b: 0.36, c: 0.31, d: 0.33 }];
    const SA = 6.4;                                    // the ankle: where the sweep starts to bend into the foot
    // The bend turns the sweep from the shin axis toward the FRONT of the shin (rotation about the lateral axis B0), so
    // the top of the foot (dorsum) is the inner side of the bend and the heel is the outer, rounded side. The curvature
    // rises and falls smoothly along the bend (k = kMax sin^2), so there is no curvature jump where the shin meets the
    // foot (a jump shows as a line across the ankle), and the tightest radius stays larger than the front half-depth of
    // the rings (they never cross: no crease, no spike).
    const BEND = 1.28, LB = 1.4, FOOT = 0.84;           // the foot stands up: turned 73 degrees from the shin (toes to the ceiling, ankle angle about 107 degrees), bend length, foot length past the bend
    const KMAX = 2 * BEND / LB;
    const thAt = (t) => (t >= LB ? BEND : KMAX * (t / 2 - LB / (4 * Math.PI) * Math.sin(2 * Math.PI * t / LB)));
    const FOOTS = [{ t: 0, a: 0.36, b: 0.36, c: 0.31, d: 0.33 }, { t: 0.45, a: 0.36, b: 0.38, c: 0.32, d: 0.36 }, { t: 0.8, a: 0.37, b: 0.41, c: 0.33, d: 0.33 },
      { t: LB, a: 0.41, b: 0.45, c: 0.29, d: 0.23 }, { t: LB + 0.4, a: 0.45, b: 0.48, c: 0.22, d: 0.17 }, { t: LB + FOOT, a: 0.44, b: 0.46, c: 0.16, d: 0.14 }];
    const HEEL = (se) => 0.102 * gauss(se - (SA + 0.62), 0.28);   // the heel: rounds out behind and under the ankle (continuous across the shin and the bend: no step)
    const SOLE = (se) => K.smooth(SA + 0.8, SA + LB + 0.3, se);   // 0 -> 1: the sole of the foot flattens
    const cr = (S, key, x) => {               // Catmull-Rom through sections by `key`
      let i = 0; while (i < S.length - 2 && S[i + 1][key] < x) i++;
      const p0 = S[Math.max(0, i - 1)], p1 = S[i], p2 = S[i + 1], p3 = S[Math.min(S.length - 1, i + 2)], t = K.clamp((x - p1[key]) / (p2[key] - p1[key])), t2 = t * t, t3 = t2 * t;
      const o = {}; for (const k of ['a', 'b', 'c', 'd']) { const m1 = (p2[k] - p0[k]) * 0.5, m2 = (p3[k] - p1[k]) * 0.5; o[k] = (2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2; }
      return o;
    };
    const ca = Math.cos(EXT), sa = Math.sin(EXT);
    const T0 = V(1, 0, 0), N0 = V(0, ca, sa), B0 = V(0, -sa, ca);          // shin axis, front, lateral (turned out by EXT)
    const A0 = (() => { const c = shinC(SA); return V(SA, c.v, c.u); })();
    // the centre line of the bend and the foot, integrated along the arc length t from the ankle
    const PATH = (() => {
      const n = 600, L = LB + FOOT, out = [], c = A0.clone();
      for (let i = 0; i <= n; i++) {
        const t = L * i / n, q = new THREE.Quaternion().setFromAxisAngle(B0, thAt(t));
        const T = T0.clone().applyQuaternion(q), N = N0.clone().applyQuaternion(q);
        if (i > 0) { const tm = L * (i - 0.5) / n; c.addScaledVector(T0.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(B0, thAt(tm))), L / n); }
        out.push({ t, c: c.clone(), T, N });
      }
      return { at: (t) => out[Math.round(K.clamp(t / L) * n)], L };
    })();
    // shape bumps as a function of an arc-length coordinate se (= s on the shin, continuing past the ankle)
    const bumps = (se, ang) => {
      let add = 0;
      add += 0.085 * gauss(se - MM.s, 0.14) * gauss(angD(ang, MM.ang), 0.6);        // medial malleolus: a low, rounded bony bump on the inner side (about 2.5 cm across, 8 mm proud)
      add += 0.06 * gauss(se - LM.s, 0.13) * gauss(angD(ang, LM.ang), 0.55);        // lateral malleolus
      add += 0.022 * K.smooth(2.6, 3.2, se) * (1 - K.smooth(5.2, 5.9, se)) * gauss(angD(ang, Math.PI / 2 + 0.15), 0.22);   // shin bone crest
      add += 0.03 * K.smooth(5.3, 6.25, se) * (1 - K.smooth(6.9, 7.5, se));            // mild oedema: both ankles slightly puffy (a gentle fullness, no separate bump), the same on both sides
      return add;
    };
    // a point of the cross-section at parameter angle ang: [U along B (lateral +), V along N (front +)]
    const ringUV = (sec, se, ang) => {
      const heel = HEEL(se), fl = SOLE(se), cu = Math.cos(ang), su = Math.sin(ang);
      // the sole side is a flatter super-ellipse (exponent 2 -> 3.2), so the foot has a broad, flat sole
      const pw = su < 0 ? 2 + 1.2 * fl : 2, sf = (x) => Math.sign(x) * Math.pow(Math.abs(x), 2 / pw);
      let U = (cu >= 0 ? sec.a : sec.b) * (su < 0 ? sf(cu) : cu), Vv = (su >= 0 ? sec.c : sec.d + heel) * (su < 0 ? sf(su) : su);
      const r = Math.hypot(U, Vv) || 1e-6, k = 1 + bumps(se, ang) / r;
      return [U * k, Vv * k];
    };
    const lowerLegGeo = () => {
      const RAD = 96, rings = [];
      const ring = (center, T, N, B, sec, se) => {
        const pts = [];
        for (let j = 0; j < RAD; j++) { const [U, Vv] = ringUV(sec, se, (j / RAD) * Math.PI * 2); pts.push(center.clone().addScaledVector(B, U).addScaledVector(N, Vv)); }
        rings.push(pts);
      };
      // the shin: straight, from the knee to the ankle
      const NS = 170;
      for (let i = 0; i < NS; i++) { const s2 = K.lerp(2.4, SA, i / NS), c = shinC(s2); ring(V(s2, c.v, c.u), T0, N0, B0, cr(SHIN, 's', s2), s2); }
      // the bend through the heel, then the foot to the base of the toes
      const NF = 110;
      for (let i = 0; i <= NF; i++) { const t = PATH.L * i / NF, f = PATH.at(t); ring(f.c, f.T, f.N, B0, cr(FOOTS, 't', t), SA + t); }
      // a rounded end under the toes
      const last = rings[rings.length - 1], cEnd = last.reduce((m, p) => m.add(p), V(0, 0, 0)).multiplyScalar(1 / last.length), Tend = PATH.at(PATH.L).T;
      for (let k = 1; k <= 6; k++) { const f = Math.cos((k / 6) * Math.PI / 2); rings.push(last.map((p) => cEnd.clone().add(p.clone().sub(cEnd).multiplyScalar(f)).addScaledVector(Tend, 0.1 * Math.sin((k / 6) * Math.PI / 2)))); }
      const first = rings[0], cStart = first.reduce((m, p) => m.add(p), V(0, 0, 0)).multiplyScalar(1 / first.length);
      rings.unshift(first.map((p) => cStart.clone().add(p.clone().sub(cStart).multiplyScalar(0.4)).addScaledVector(T0, -0.2)));
      const pos = [], idx = [];
      rings.forEach((r) => r.forEach((p) => pos.push(p.x, p.y, p.z)));
      for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < RAD; j++) { const a2 = i * RAD + j, b2 = i * RAD + (j + 1) % RAD, c2 = a2 + RAD, d2 = b2 + RAD; idx.push(a2, c2, b2, b2, c2, d2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      // outward faces
      const P_ = g.attributes.position, N_ = g.attributes.normal, mid = Math.floor(rings.length / 3) * RAD; let cx = 0, cy = 0, cz = 0, dot = 0;
      for (let j = 0; j < RAD; j++) { cx += P_.getX(mid + j) / RAD; cy += P_.getY(mid + j) / RAD; cz += P_.getZ(mid + j) / RAD; }
      for (let j = 0; j < RAD; j++) { const k = mid + j; dot += (P_.getX(k) - cx) * N_.getX(k) + (P_.getY(k) - cy) * N_.getY(k) + (P_.getZ(k) - cz) * N_.getZ(k); }
      if (dot < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t2 = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t2; } g.computeVertexNormals(); }
      g.computeBoundingSphere();
      return g;
    };
    const shinGeo = lowerLegGeo();
    // An approximate signed distance (world units, negative inside) from a point to the lower leg and foot, for
    // keeping hands out of the legs (series addition; the toes are left out). side 'R' | 'L', point in world space.
    const legSDF = (() => {
      const NB = 72, polar = (sec, se) => {
        const r = new Float32Array(NB);
        for (let j = 0; j < 288; j++) { const [U, Vv] = ringUV(sec, se, (j / 288) * Math.PI * 2), b = Math.round(((Math.atan2(Vv, U) + Math.PI) / (2 * Math.PI)) * NB) % NB; r[b] = Math.max(r[b], Math.hypot(U, Vv)); }
        for (let k = 0; k < 2; k++) for (let b = 0; b < NB; b++) if (!r[b]) r[b] = Math.max(r[(b + 1) % NB], r[(b + NB - 1) % NB]);
        return r;
      };
      const NSS = 120, straight = [], bend = [];
      for (let i = 0; i <= NSS; i++) { const s2 = K.lerp(2.4, SA, i / NSS); straight.push(polar(cr(SHIN, 's', s2), s2)); }
      for (let i = 0; i <= NSS; i++) { const t = PATH.L * i / NSS; bend.push(polar(cr(FOOTS, 't', t), SA + t)); }
      const look = (tab, u, U, Vv) => { const r = tab[Math.round(K.clamp(u) * NSS)], b = Math.round(((Math.atan2(Vv, U) + Math.PI) / (2 * Math.PI)) * NB) % NB; return Math.hypot(U, Vv) - r[b]; };
      const p = V(0, 0, 0), q = V(0, 0, 0);
      return (side, w) => {
        p.set(w.x, w.y, side === 'L' ? -w.z : w.z);
        if (p.x <= SA) {
          const s2 = Math.max(2.4, p.x), c = shinC(s2); q.set(p.x - s2, p.y - c.v, p.z - c.u);
          return look(straight, (s2 - 2.4) / (SA - 2.4), q.dot(B0), q.dot(N0));
        }
        let lo = 0, hi = PATH.L;
        const f = (t) => { const g = PATH.at(t); return q.copy(p).sub(g.c).dot(g.T); };
        if (f(hi) > 0) lo = hi; else for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
        const g = PATH.at(lo), ax = q.copy(p).sub(g.c).dot(g.T), d = look(bend, lo / PATH.L, q.dot(B0), q.dot(g.N));
        return lo >= PATH.L ? Math.max(d, ax - 0.1) : d;
      };
    })();
    // where the toes sit: the end of the foot, in the foot's own frame
    const footFrame = (() => { const f = PATH.at(PATH.L - 0.12); return { T: f.T.clone(), N: f.N.clone(), B: B0.clone(), end: f.c.clone() }; })();
    const shinR = CLAY.mesh(shinGeo, M.skin, legR, null, null, 'shin-R');
    const shinL = CLAY.mesh(shinGeo.clone(), M.skin, legL, null, null, 'shin-L');
    const thighGeo = CLAY.loft([{ s: -1.75, a: 0.9, c: 0.86, u: 0.85, v: 6.86 }, { s: 0, a: 0.86, c: 0.8, u: 0.9, v: 6.8 }, { s: 1.5, a: 0.68, c: 0.62, u: 0.96, v: 6.7 }, { s: 2.45, a: 0.56, c: 0.52, u: 1.0, v: 6.64 }], { axis: 'x', radial: 40, rings: 30, capStart: 0.5, capEnd: 0.5 });
    const kneeGeo = new THREE.SphereGeometry(0.55, 32, 22), patGeo = CLAY.ellipsoid(0.22, 0.17, 0.22);
    const toes = [[-0.29, 0.14, 0.36], [-0.06, 0.1, 0.31], [0.11, 0.094, 0.28], [0.25, 0.088, 0.25], [0.37, 0.08, 0.21]];   // short, stubby toes (z, radius, length)
    const legParts = (grp, shinMesh) => {
      const parts = [shinMesh];
      parts.push(CLAY.mesh(thighGeo, M.skin, grp));
      parts.push(CLAY.mesh(kneeGeo, M.skin, grp, [2.45, 6.66, 1.0]));
      parts.push(CLAY.mesh(patGeo, M.skin, grp, [2.5, 6.98, 1.02]));
      // the toes, in the foot's frame (X along the foot, Y the top of the foot, Z lateral)
      const foot = new THREE.Group(); grp.add(foot);
      foot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(footFrame.T, footFrame.N, footFrame.B));
      foot.position.copy(footFrame.end);
      for (const [z, r, L] of toes) {
        const m = CLAY.mesh(CLAY.loft([{ s: 0, a: r, c: r * 0.85 }, { s: L, a: r * 0.92, c: r * 0.8 }], { axis: 'x', radial: 24, rings: 10, capStart: 0.8, capEnd: 0.9 }), M.skin, foot, [0.0, 0.0, z]); m.rotation.z = -0.22; parts.push(m);
        const td = { L, halfW: (x) => K.lerp(r, r * 0.92, x / L), top: (x) => K.lerp(r * 0.85, r * 0.8, x / L) };
        CLAY.mesh(HANDS.nailGeo(td, L * 0.48, L * 1.0, 0.56, 0.004), M.nail, m);
      }
      return { parts, foot };
    };
    const lr = legParts(legR, shinR), ll = legParts(legL, shinL);

    // press points: on the inner face of the lower shin bone, 2 cm (0.2 units) above the medial malleolus
    root_.updateMatrixWorld(true);
    const pressS = MM.s - PATIENT.PRESS_ABOVE_MM / 100;
    const pressAng = Math.PI - 0.92;   // the inner (medial) face of the tibia, where the bone lies just under the skin (faces up and in)
    const pressInfo = {};
    for (const [side, grp, mesh] of [['R', legR, shinR], ['L', legL, shinL]]) {
      const c = shinC(pressS), ca = Math.cos(EXT), sa = Math.sin(EXT);
      const dz0 = Math.cos(pressAng), dy0 = Math.sin(pressAng);
      const dir = V(0, dy0 * ca - dz0 * sa, dy0 * sa + dz0 * ca).normalize();
      const from = V(pressS, c.v, c.u).addScaledVector(dir, 2);
      const h = hitLocal(grp, [mesh], from, dir.clone().negate());
      const mmDir = V(0, Math.sin(MM.ang) * ca - Math.cos(MM.ang) * sa, Math.sin(MM.ang) * sa + Math.cos(MM.ang) * ca);
      const hm = hitLocal(grp, [mesh], V(MM.s, shinC(MM.s).v, shinC(MM.s).u).addScaledVector(mmDir, 2), mmDir.clone().negate());
      anchor(grp, side + 'press', h.p.toArray(), h.n.toArray());
      anchor(grp, side + 'mm', hm.p.toArray(), hm.n.toArray());
      const pos = mesh.geometry.attributes.position, nrm = mesh.geometry.attributes.normal;
      pressInfo[side] = { mesh, P: h.p.clone(), n: h.n.clone(), base: Float32Array.from(pos.array), baseN: Float32Array.from(nrm.array), depth: 0 };
    }

    // trousers: thighs (static) and shins (rolled by setRoll)
    const tThigh = CLAY.loft([{ s: -2.0, a: 0.98, c: 0.94, u: 0.85, v: 6.88 }, { s: 0, a: 0.95, c: 0.9, u: 0.9, v: 6.82 }, { s: 1.5, a: 0.8, c: 0.74, u: 0.96, v: 6.7 }, { s: 2.6, a: 0.76, c: 0.76, u: 1.0, v: 6.66 }], { axis: 'x', radial: 40, rings: 30, capStart: 0.4, capEnd: 0 });
    const trousers = {};
    const TR = 34, TRAD = 40;
    for (const [side, grp] of [['R', legR], ['L', legL]]) {
      CLAY.mesh(tThigh, M.pyjamaIn, grp);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TR + 1) * TRAD * 3), 3));
      const idx = []; for (let i = 0; i < TR; i++) for (let j = 0; j < TRAD; j++) { const a = i * TRAD + j, b = i * TRAD + (j + 1) % TRAD, c = a + TRAD, d = b + TRAD; idx.push(a, b, c, b, d, c); } g.setIndex(idx);
      const tube = CLAY.mesh(g, M.pyjamaIn, grp, null, null, 'trouser-shin-' + side);
      const cuff = CLAY.mesh(new THREE.TorusGeometry(1, 1, 12, 40).rotateY(Math.PI / 2), M.pyjama, grp, null, null, 'cuff-' + side);
      trousers[side] = { tube, cuff };
    }
    const tRad = (s) => {                         // loose fabric around the shin
      const r = [[2.3, 0.72, 0.74], [2.8, 0.68, 0.78], [3.3, 0.64, 0.76], [4.3, 0.59, 0.69], [5.3, 0.5, 0.53], [6.1, 0.45, 0.45]];
      for (let i = 1; i < r.length; i++) if (s <= r[i][0]) { const u = (s - r[i - 1][0]) / (r[i][0] - r[i - 1][0]); return [K.lerp(r[i - 1][1], r[i][1], u), K.lerp(r[i - 1][2], r[i][2], u)]; }
      return [r[r.length - 1][1], r[r.length - 1][2]];
    };
    let rollMemo = -1;
    const setRoll = (u) => {
      u = K.clamp(u); if (Math.abs(u - rollMemo) < 1e-5) return; rollMemo = u;
      const sEnd = K.lerp(6.12, 4.3, u), s0 = 2.3;
      for (const side of ['R', 'L']) {
        const { tube, cuff } = trousers[side], p = tube.geometry.attributes.position;
        for (let i = 0; i <= TR; i++) {
          const s = s0 + (sEnd - s0) * i / TR, c = shinC(s), [rw, rh] = tRad(s);
          const wr = 1 + 0.012 * Math.sin(s * 5.3 + (side === 'R' ? 0 : 1)) + 0.05 * u * K.smooth(sEnd - 0.8, sEnd, s);
          for (let j = 0; j < TRAD; j++) {
            const a = (j / TRAD) * Math.PI * 2, sg = Math.sin(a);
            p.setXYZ(i * TRAD + j, s, c.v + sg * (sg > 0 ? rh * 0.92 : rh) * wr, c.u + Math.cos(a) * rw * wr);
          }
        }
        p.needsUpdate = true; tube.geometry.computeVertexNormals(); tube.geometry.computeBoundingSphere();
        const c = shinC(sEnd), [rw, rh] = tRad(sEnd), tr = 0.075 + 0.07 * u;
        cuff.position.set(sEnd, c.v - 0.02, c.u); cuff.scale.set(tr / 1, (rh * 0.95 + tr * 0.5), (rw * 1.02 + tr * 0.5));
        // a torus scaled per axis: keep the tube round-ish by scaling the ring, not the tube
        cuff.geometry.dispose(); cuff.geometry = new THREE.TorusGeometry(1, tr / Math.min(rh, rw), 12, 40).rotateY(Math.PI / 2);
        cuff.scale.set(1, rh * 0.95 + tr * 0.4, rw * 1.02 + tr * 0.4);
      }
    };
    setRoll(0);

    // ------------------------------------------------------------ place the torso on the backrest
    const bx = BED.slope.clone(), bn = BED.normal.clone(), bz = V(0, 0, -1);     // local X (his left) -> world -Z
    torso.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(bz, bx, bn));
    torso.position.copy(O);
    root_.updateMatrixWorld(true);

    // anchors on the face surface (raycast from the front)
    const headMeshes = faceParts;
    for (const [name, local] of [['RcheekBelowEye', [-0.3, -0.035]], ['Rcheek', [-0.45, -0.16]], ['Lcheek', [0.45, -0.16]]]) {
      const h = hitLocal(head, headMeshes, V(local[0], local[1], 3), V(0, 0, -1));
      if (!anchors[name]) anchor(head, name, [0, 0, 0]);
      anchors[name].position.copy(h.p); anchors[name].quaternion.setFromUnitVectors(V(0, 0, 1), h.n);
    }

    // ------------------------------------------------------------ dynamic setters
    const tmp = V(0, 0, 0);
    // Posing the one-piece arm: each vertex (x along the arm from the shoulder, y and z round it) is placed by the upper
    // arm's frame (round its axis from the shoulder), the forearm's frame (from the elbow) and the hand's frame (from the
    // wrist), blended over 3 cm either side of the elbow and over the 6 cm before the wrist.
    const ux = V(0, 0, 0), fx = V(0, 0, 0), fy = V(0, 0, 0), fz = V(0, 0, 0), wo = V(0, 0, 0), pu = V(0, 0, 0), pf = V(0, 0, 0), ph = V(0, 0, 0);
    const wristBlend = (a) => {
      const m = a.armMesh, pos = m.geometry.attributes.position, B = m.userData.base, sz = Math.sign(a.hand.group.scale.z) || 1;
      const L1 = D.upperArm, WR = D.upperArm + D.foreArm, Sh = a.up.position, E = a.fore.position, HM = a.hand.group.matrixWorld;
      ux.set(1, 0, 0).applyQuaternion(a.up.quaternion); fx.set(1, 0, 0).applyQuaternion(a.fore.quaternion);
      fy.set(0, 1, 0).applyQuaternion(a.fore.quaternion); fz.set(0, 0, 1).applyQuaternion(a.fore.quaternion);
      for (let i = 0; i < pos.count; i++) {
        const x = B[3 * i], y = B[3 * i + 1], z = B[3 * i + 2];
        const we = K.smooth(L1 - 0.3, L1 + 0.3, x), wh = K.smooth(WR - 0.6, WR, x);
        wo.copy(fy).multiplyScalar(y).addScaledVector(fz, z);           // the offset from the arm's axis, turned like the forearm
        if (we < 1) { const r = wo.length(); pu.copy(wo).addScaledVector(ux, -wo.dot(ux)); if (pu.lengthSq() > 1e-12) pu.setLength(r); pu.add(Sh).addScaledVector(ux, x); }
        if (we > 0) pf.copy(E).addScaledVector(fx, x - L1).add(wo);
        const p = we <= 0 ? pu : we >= 1 ? pf : pu.lerp(pf, we);
        if (wh > 0) { ph.set(x - WR, y, z * sz).applyMatrix4(HM); p.lerp(ph, wh); }
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      pos.needsUpdate = true; m.geometry.computeVertexNormals(); m.geometry.computeBoundingSphere();
    };
    const P = {
      group: root_, torso, chest, head, jaw, mouth: mouthG, eyes, arms, legs: { R: legR, L: legL }, M, anchors, trousers, pressInfo,
      sheetMeshes: [torsoMesh, ...lr.parts, ...ll.parts, ...['R', 'L'].map((k) => trousers[k].tube), ...['R', 'L'].map((k) => trousers[k].cuff), ...legR.children.concat(legL.children).filter((m) => m.isMesh && m.material === M.pyjamaIn)],
      O, shoulder, legSDF,
      anchor(name) { const a = anchors[name]; a.updateWorldMatrix(true, false); return a.getWorldPosition(V(0, 0, 0)); },
      anchorNormal(name) { const a = anchors[name]; a.updateWorldMatrix(true, false); return V(0, 0, 1).applyQuaternion(a.getWorldQuaternion(new THREE.Quaternion())).normalize(); },
      // reach: wrist at a world point, the hand turned by handQuat, elbow bending toward `pole` (world direction)
      setArm(side, wrist, handQuat, handPose, pole) {
        const a = arms[side], Sh = shoulder(side), L1 = D.upperArm, L2 = D.foreArm;
        let d = wrist.clone().sub(Sh), dist = d.length();
        const dir = d.clone().normalize();
        dist = K.clamp(dist, Math.abs(L1 - L2) + 0.05, L1 + L2 - 0.002);
        const W = Sh.clone().addScaledVector(dir, dist);
        const ax = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, L1 * L1 - ax * ax));
        const pl = (pole || V(0, -1, 0)).clone(); pl.sub(dir.clone().multiplyScalar(pl.dot(dir))).normalize();
        const E = Sh.clone().addScaledVector(dir, ax).addScaledVector(pl, h);
        const ux = E.clone().sub(Sh).normalize(), uz = new THREE.Vector3().crossVectors(ux, pl).normalize(), uy = new THREE.Vector3().crossVectors(uz, ux);
        a.up.position.copy(Sh); a.up.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ux, uy, uz));
        const fx = W.clone().sub(E).normalize();
        const hz = V(0, 0, 1).applyQuaternion(handQuat);
        const fz = hz.sub(fx.clone().multiplyScalar(hz.dot(fx))).normalize(), fy = new THREE.Vector3().crossVectors(fz, fx);
        a.fore.position.copy(E); a.fore.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fx, fy, fz));
        a.hand.group.position.copy(W); a.hand.group.quaternion.copy(handQuat);
        if (handPose) a.hand.pose(handPose);
        a.group.updateMatrixWorld(true);
        wristBlend(a);
        return W;
      },
      setFace(f = {}) {
        const ja = 0.14 * (f.jaw || 0);
        jaw.rotation.x = ja;
        if (Math.abs(ja - (P._ja || 0)) > 1e-5) {
          P._ja = ja;
          const pa = cranium.geometry.attributes.position, c = Math.cos(ja), sn = Math.sin(ja);
          for (const [i, w] of skin) {
            const a2 = ja * w, cc = Math.cos(a2), ss = Math.sin(a2);
            const y = crBase[3 * i + 1] - jaw.position.y, z = crBase[3 * i + 2] - jaw.position.z;
            const dent = 0.05 * (ja / 0.14) * g2(crBase[3 * i], crBase[3 * i + 1], 0, MOUTH_Y - 0.12, 0.17, 0.11);
            pa.setY(i, jaw.position.y + y * cc - z * ss); pa.setZ(i, jaw.position.z + y * ss + z * cc - dent);
          }
          pa.needsUpdate = true;
          const pl = lowerLip.geometry.attributes.position;
          for (let i = 0; i < pl.count; i++) {
            const a2 = ja * latW(llBase[3 * i]), cc = Math.cos(a2), ss = Math.sin(a2);
            const y = llBase[3 * i + 1] - jaw.position.y, z = llBase[3 * i + 2] - jaw.position.z;
            pl.setY(i, jaw.position.y + y * cc - z * ss); pl.setZ(i, jaw.position.z + y * ss + z * cc);
          }
          pl.needsUpdate = true; lowerLip.geometry.computeVertexNormals();
          if (ja > 0) cranium.geometry.computeVertexNormals(); else { cranium.geometry.attributes.normal.array.set(crBaseN); cranium.geometry.attributes.normal.needsUpdate = true; }
        }
        placeMouth(f.jaw || 0, f.tongue || 0);
        const up = f.gazeUp || 0, blink = f.blink || 0;
        for (const s of ['R', 'L']) {
          const e = eyes[s];
          e.ball.rotation.x = -0.42 * up;
          e.upper.rotation.x = -0.16 * up + 0.95 * blink;
          const pull = s === 'R' ? (f.pullR || 0) : 0;
          e.lower.rotation.x = 0.62 * pull - 0.05 * up - 0.4 * blink;
          e.lower.scale.setScalar(1 + 0.1 * pull);
          e.conjG.rotation.x = (1 - pull) * 0.7;   // the inner lining slides up into view as a wide pink crescent below the eye
          e.conjG.visible = pull > 0.02;
        }
      },
      // a pit the shape of a thumb pad: flat-bottomed, soft-walled, longer across the shin than along it
      setPit(side, depth) {
        const I = pressInfo[side]; if (Math.abs(I.depth - depth) < 1e-5) return; I.depth = depth;
        const pos = I.mesh.geometry.attributes.position, nrm = I.mesh.geometry.attributes.normal, B = I.base;
        const ax = V(1, 0, 0), tn = new THREE.Vector3().crossVectors(I.n, ax).normalize(), axx = new THREE.Vector3().crossVectors(tn, I.n).normalize();
        for (let i = 0; i < pos.count; i++) {
          const x = B[3 * i], y = B[3 * i + 1], z = B[3 * i + 2];
          tmp.set(x - I.P.x, y - I.P.y, z - I.P.z);
          const dx = tmp.dot(axx), dt = tmp.dot(tn), dn = tmp.dot(I.n);
          const q = (dx / 0.085) ** 2 + (dt / 0.105) ** 2;
          const f = dn > -0.2 && q < 9 ? Math.exp(-Math.pow(q, 1.7)) : 0;
          pos.setXYZ(i, x - I.baseN[3 * i] * depth * f, y - I.baseN[3 * i + 1] * depth * f, z - I.baseN[3 * i + 2] * depth * f);
        }
        pos.needsUpdate = true;
        if (depth > 0) I.mesh.geometry.computeVertexNormals(); else { nrm.array.set(I.baseN); nrm.needsUpdate = true; }
      },
      setRoll,
      breathe(t) { const b = Math.sin((t / 4.6) * Math.PI * 2); chest.scale.set(1 + 0.004 * b, 1, 1 + 0.012 * b); },
      // world point on the back of the head (for the pillow)
      headBack() { head.updateMatrixWorld(true); return head.localToWorld(V(0, 0.15, -0.93)); },
    };
    P.setFace({});
    return P;
  };
})(typeof window !== 'undefined' ? window : globalThis);
