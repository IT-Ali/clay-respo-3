// shared/hands.js: clay hands (patient: skin with nails, nail folds and tendons; examiner: blue nitrile-glove clay)
// and the examiner's forearms with dark teal scrub sleeves. Classic script; needs THREE, K, CLAY. Defines window.HANDS.
//
// Hand local frame (a RIGHT hand; a left hand is the same hand mirrored with scale.z = -1):
//   origin at the wrist, +X toward the finger tips, +Y the back of the hand (dorsum), -Y the palm,
//   -Z the thumb side, +Z the little-finger side. So with the palm down and the fingers pointing away from you, the
//   thumb of a right hand is on the left, as it should be.
//
//   HANDS.make({ skin, skinWrist, nail, glove, side, scale }) -> hand  (skinWrist: optional material for the palm and thumb
//                                        base, e.g. a palm tint that fades toward the wrist; see the object returned at the end of make)
//   hand.pose({ curl: {index:[mcp,pip,dip], ...}, spread, thumb: [cmcSwing, mcp, ip] })
//   hand.contact(name) -> local point of a named contact (indexPad, thumbPad, middleBack, dorsum, palm, ...)
//   HANDS.place(hand, contactName, worldPoint, quaternion)  sets the hand so that the contact sits on worldPoint.
//   HANDS.examinerArm(S, mats, side) -> arm { group, hand, set(wristWorld, handQuat, backDir) }
(function (root) {
  const THREE = root.THREE, CLAY = root.CLAY;
  const HANDS = (root.HANDS = {});
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ------------------------------------------------------------ finger segments
  // a plain phalanx along +X from 0 to L, radius r0 -> r1
  function phalanx(L, r0, r1, flat = 0.92) {
    return CLAY.loft([
      { s: 0, a: r0, c: r0 * flat, d: r0 },
      { s: L * 0.5, a: (r0 + r1) / 2 * 1.02, c: (r0 + r1) / 2 * flat, d: (r0 + r1) / 2 * 1.04 },
      { s: L, a: r1, c: r1 * flat, d: r1 },
    ], { axis: 'x', radial: 24, rings: 10, capStart: 0.9, capEnd: 0.9 });
  }
  // the distal phalanx: a soft pulp underneath, a dorsum that slopes away under the nail so the nail plate meets the
  // skin of the nail fold at the normal nail-bed angle (Lovibond angle) of about 160 degrees.
  const NAIL_ANGLE = 160 * Math.PI / 180;            // the angle between the nail plate and the nail fold skin
  const SLOPE = Math.PI - NAIL_ANGLE;                // = 20 degrees: the nail slopes down this much from the fold line
  function distal(L, r, withNail) {
    const xf = L * 0.3, tan = Math.tan(SLOPE), xk = L * 0.62;
    // the back of the fingertip: level up to the nail fold, then sloping 20 degrees down under the nail (so the nail
    // meets the fold skin at 160 degrees), easing off toward the tip so the end of the finger stays round
    const up = (x) => (x <= xf ? r * 0.92 : x <= xk ? r * 0.92 - (x - xf) * tan : r * 0.92 - (xk - xf) * tan - (x - xk) * tan * 0.45);
    const S = [
      { s: 0, a: r, c: r * 0.92, d: r },
      { s: xf, a: r * 0.98, c: up(xf), d: r * 1.04 },
      { s: L * 0.55, a: r * 0.96, c: up(L * 0.55), d: r * 1.1 },
      { s: L * 0.8, a: r * 0.92, c: up(L * 0.8), d: r * 1.08, v: -0.004 },
      { s: L, a: r * 0.84, c: up(L), d: r * 0.92, v: -0.008 },
    ];
    const g = CLAY.loft(S, { axis: 'x', radial: 40, rings: 30, capStart: 0.9, capEnd: 0.85 });
    // half-width and top of the skin at x (linear between the sections: close enough for the nail to sit on)
    const lin = (x, k) => { for (let i = 1; i < S.length; i++) if (x <= S[i].s) { const u = (x - S[i - 1].s) / (S[i].s - S[i - 1].s); return K.lerp(S[i - 1][k] == null ? 0 : S[i - 1][k], S[i][k] == null ? 0 : S[i][k], u); } return S[S.length - 1][k] || 0; };
    const halfW = (x) => lin(x, 'a'), top = (x) => up(x) + lin(x, 'v');
    return { g, xf, up, halfW, top, L, r };
  }
  // A nail plate that lies on the skin of the fingertip: built over the finger's own top surface, so it never floats or
  // breaks through. It is thin, smooth and evenly coloured; its edges and its root dip just under the skin (a crisp,
  // clean edge, and the nail fold is smooth skin over the root of the nail).
  function nailGeo(d, x0, x1, widthK, th) {
    const NU = 28, NV = 20, pos = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, x = K.lerp(x0, x1, u);
      const hw = d.halfW(x) * widthK * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 6)), 1 / 6) * (u < 0.5 ? 1 : 1) + 1e-4;
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1, z = v * hw;
        const a = d.halfW(x), c = d.top(x) - (d.L ? 0 : 0);
        const ys = c * Math.sqrt(Math.max(0, 1 - (z / a) ** 2));        // the skin under this point
        const edge = K.smooth(1.0, 0.82, Math.abs(v)) * K.smooth(0.0, 0.1, u) * K.smooth(1.0, 0.94, u);
        pos.push(x, ys + th * edge - 0.004 * (1 - edge), z);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + 1, c = a + NV + 1, e = c + 1; idx.push(a, b, c, b, e, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // faces up
    const n = g.attributes.normal; let sy = 0; for (let i = 0; i < n.count; i++) sy += n.getY(i);
    if (sy < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.computeVertexNormals(); }
    return g;
  }
  HANDS.nailGeo = nailGeo;

  const FINGERS = {
    //          MCP position (local)             radius  [proximal, middle, distal] lengths  spread
    index: { at: [0.95, 0.0, -0.3], r: 0.09, L: [0.43, 0.25, 0.2], spread: -0.06 },
    middle: { at: [0.99, 0.005, -0.09], r: 0.092, L: [0.48, 0.29, 0.21], spread: 0 },
    ring: { at: [0.95, 0.0, 0.12], r: 0.086, L: [0.45, 0.27, 0.2], spread: 0.06 },
    little: { at: [0.86, -0.01, 0.31], r: 0.076, L: [0.35, 0.2, 0.18], spread: 0.13 },
  };
  HANDS.FINGERS = FINGERS;
  HANDS.NAIL_ANGLE_DEG = 160;

  HANDS.make = (o) => {
    const isGlove = !!o.glove, skin = isGlove ? o.glove : o.skin;
    const group = new THREE.Group(); group.name = o.name || 'hand';
    const body = new THREE.Group(); group.add(body);            // everything (mirrored for a left hand via group.scale.z)
    const contacts = {};
    const pts = new Map();
    const pt = (parent, name, p) => { const a = new THREE.Object3D(); a.position.set(p[0], p[1], p[2]); parent.add(a); pts.set(name, a); return a; };

    // palm: wrist -> knuckles
    const palm = CLAY.loft([
      { s: -0.22, a: 0.26, b: 0.26, c: 0.15, d: 0.14, u: 0.0 },
      { s: 0.15, a: 0.33, b: 0.33, c: 0.14, d: 0.13, u: 0.0 },
      { s: 0.55, a: 0.43, b: 0.41, c: 0.135, d: 0.12, u: 0.0 },
      { s: 0.9, a: 0.44, b: 0.42, c: 0.125, d: 0.115, u: 0.01 },
    ], { axis: 'x', radial: 64, rings: 40, pow: 2.25, capStart: 0.5, capEnd: 0.55, deform: (p) => {
      if (p.y >= 0) return;
      const g = (x, z, cx, cz, sx, sz) => Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2));
      const k = Math.min(1, -p.y / 0.06);
      p.y -= k * (0.085 * g(p.x, p.z, 0.28, -0.24, 0.26, 0.15) + 0.06 * g(p.x, p.z, 0.42, 0.28, 0.28, 0.1) + 0.035 * g(p.x, p.z, 0.88, 0, 0.1, 0.4) - 0.02 * g(p.x, p.z, 0.55, 0.02, 0.18, 0.15));
    } });
    const skinW = isGlove ? skin : (o.skinWrist || skin);   // the palm and thumb base: a palm tint that fades out toward the wrist over a few cm
    CLAY.mesh(palm, skinW, body, null, null, 'palm');
    // thenar eminence (the mound at the base of the thumb) and hypothenar eminence (little-finger side)
    // knuckles
    for (const [k, f] of Object.entries(FINGERS)) CLAY.mesh(new THREE.SphereGeometry(f.r * 1.0, 20, 14), skin, body, [f.at[0] - 0.03, f.at[1] + 0.02, f.at[2]], null, 'knuckle-' + k);
    // dorsal tendons running to the knuckles (patient only: a glove hides them)
    if (!isGlove) {
      for (const f of Object.values(FINGERS)) {
        const g = K.tube([[0.02, 0.11, f.at[2] * 0.35], [0.4, 0.13, f.at[2] * 0.68], [f.at[0] - 0.08, 0.128, f.at[2]]], 0.026, { radial: 10, segments: 20 });
        CLAY.mesh(g, skin, body, null, null, 'tendon');
      }
    }
    pt(body, 'dorsum', [0.55, 0.15, 0.02]);
    pt(body, 'palm', [0.5, -0.1, 0.02]);
    pt(body, 'thenarPt', [0.28, -0.2, -0.24]);
    pt(body, 'hypothenarPt', [0.42, -0.175, 0.28]);
    pt(body, 'wrist', [0, 0, 0]);

    // fingers: joints are groups so they can be curled
    const fingers = {};
    for (const [k, f] of Object.entries(FINGERS)) {
      const r = f.r * (isGlove ? 1.04 : 1);
      const mcp = new THREE.Group(); mcp.position.set(...f.at); body.add(mcp);
      CLAY.mesh(phalanx(f.L[0], r, r * 0.93), skin, mcp);
      const pip = new THREE.Group(); pip.position.x = f.L[0]; mcp.add(pip);
      CLAY.mesh(phalanx(f.L[1], r * 0.93, r * 0.88), skin, pip);
      const dip = new THREE.Group(); dip.position.x = f.L[1]; pip.add(dip);
      const d = distal(f.L[2], r * 0.88, !isGlove);
      CLAY.mesh(d.g, skin, dip);
      if (!isGlove) addNail(dip, f.L[2], r * 0.88, d, o.nail, skin, k);
      pt(dip, k + 'Pad', [f.L[2] * 0.62, -r * 0.88 * 1.1 - 0.004, 0]);   // the soft pulp of the finger tip
      pt(dip, k + 'Tip', [f.L[2] + r * 0.88 * 0.6, 0, 0]);
      pt(dip, k + 'Nail', [f.L[2] * 0.6, d.up(f.L[2] * 0.6) + 0.006, 0]);
      pt(dip, k + 'Fold', [d.xf, r * 0.88 * 0.92 + 0.004, 0]);
      pt(pip, k + 'MidBack', [f.L[1] * 0.5, r * 0.92 * 0.92, 0]);       // the back of the middle phalanx
      pt(mcp, k + 'ProxBack', [f.L[0] * 0.5, r * 0.92, 0]);
      pt(mcp, k + 'ProxPalm', [f.L[0] * 0.5, -r, 0]);
      fingers[k] = { mcp, pip, dip, f, d, r: r * 0.88 };
    }

    // thumb: metacarpal (inside the thenar mound), proximal and distal phalanges; the chain runs along its own +X with
    // the nail on its own +Y, turned so the pad faces the fingers
    const tBase = new THREE.Group(); tBase.position.set(0.1, -0.06, -0.24); body.add(tBase);
    const tr = isGlove ? 0.108 : 0.104;
    const tMeta = new THREE.Group(); tBase.add(tMeta);
    CLAY.mesh(phalanx(0.42, 0.135, 0.12), skinW, tMeta);
    const tMcp = new THREE.Group(); tMcp.position.x = 0.42; tMeta.add(tMcp);
    CLAY.mesh(phalanx(0.32, tr, tr * 0.95), skin, tMcp);
    const tIp = new THREE.Group(); tIp.position.x = 0.32; tMcp.add(tIp);
    const td = distal(0.29, tr * 0.95, !isGlove);
    CLAY.mesh(td.g, skin, tIp);
    if (!isGlove) addNail(tIp, 0.29, tr * 0.95, td, o.nail, skin, 'thumb');
    pt(tIp, 'thumbPad', [0.29 * 0.6, -tr * 0.95 * 1.1 - 0.004, 0]);
    pt(tIp, 'thumbTip', [0.29 + tr * 0.6, 0, 0]);
    pt(tIp, 'thumbNail', [0.29 * 0.6, td.up(0.29 * 0.6) + 0.006, 0]);

    function addNail(parent, L, r, d, nailMat, skinMat, k) {
      // from just under the fold (the root of the nail) to just short of the fingertip
      CLAY.mesh(nailGeo(d, d.xf - 0.014, L * 0.97, 0.76, 0.006), nailMat, parent, null, null, 'nail-' + k);
    }

    const hand = {
      group, body, fingers, thumb: { base: tBase, meta: tMeta, mcp: tMcp, ip: tIp }, side: o.side || 'R', isGlove,
      pts,
      // pose: curl per finger [mcp, pip, dip] in radians (bend toward the palm), spread multiplier, thumb
      // [swing toward the palm (0 = alongside the index), opposition twist, mcp, ip]
      pose(p = {}) {
        const c = p.curl || {}, sp = p.spread == null ? 1 : p.spread, def = p.all || [0.12, 0.18, 0.1];
        for (const [k, fg] of Object.entries(fingers)) {
          const cv = c[k] || def;
          fg.mcp.rotation.set(0, -(p.fan && p.fan[k] != null ? p.fan[k] : fg.f.spread * sp * 2.2), -cv[0]);   // p.fan: explicit spread per finger (radians)
          fg.pip.rotation.set(0, 0, -cv[1]);
          fg.dip.rotation.set(0, 0, -cv[2]);
        }
        const th = p.thumb || [0.15, 0, 0.12, 0.08];
        // the metacarpal leaves the wrist toward the index knuckle and out to the side; swing brings it under the palm
        const dir = V(0.8, -0.04 - th[0] * 0.45, -0.52 + th[0] * 0.3).normalize();
        const nailUp = V(0.1, 0.6 - th[1] * 0.5, -0.8).normalize();
        const z = new THREE.Vector3().crossVectors(dir, nailUp).normalize(), y = new THREE.Vector3().crossVectors(z, dir).normalize();
        tMeta.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, y, z));
        tMcp.rotation.set(0, 0, -th[2]);
        tIp.rotation.set(0, 0, -th[3]);
      },
      // local position of a named contact in the hand GROUP's frame (after the current pose)
      contact(name) {
        const a = pts.get(name); if (!a) throw new Error('no contact ' + name);
        group.updateMatrixWorld(true);
        const w = a.getWorldPosition(new THREE.Vector3());
        return group.worldToLocal(w);
      },
      world(name) { const a = pts.get(name); a.parent.updateMatrixWorld(true); return a.getWorldPosition(new THREE.Vector3()); },
    };
    if ((o.side || 'R') === 'L') group.scale.z = -1;
    if (o.scale) group.scale.multiplyScalar(o.scale);
    hand.pose({});
    return hand;
  };

  // A quaternion from where the fingers point and where the back of the hand faces (world directions).
  // For a left hand (mirrored), pass the same directions: the mirror is inside the group's scale.
  HANDS.quat = (fingerDir, dorsalDir) => {
    const x = fingerDir.clone().normalize();
    const y = dorsalDir.clone().sub(x.clone().multiplyScalar(dorsalDir.dot(x))).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };

  // Put a hand so that its contact `name` lies exactly at worldPoint, with the hand turned by quaternion q.
  // (The group's own scale, e.g. the mirror of a left hand, is kept.) Returns the wrist position.
  HANDS.place = (hand, name, worldPoint, q) => {
    const g = hand.group;
    g.quaternion.copy(q); g.position.set(0, 0, 0);
    if (g.parent) g.parent.updateMatrixWorld(true);
    g.updateMatrixWorld(true);
    const a = hand.pts.get(name);
    const w = a.getWorldPosition(new THREE.Vector3());          // where the contact is with the hand at the origin
    const base = g.parent ? g.parent.worldToLocal(worldPoint.clone()) : worldPoint.clone();
    const off = g.parent ? g.parent.worldToLocal(w.clone()) : w;
    g.position.copy(base.sub(off));
    g.updateMatrixWorld(true);
    return g.getWorldPosition(new THREE.Vector3());
  };

  // ------------------------------------------------------------ the examiner's forearm and scrub sleeve
  // The forearm runs from the wrist back along `backDir` to the elbow; the sleeve covers the upper part of the forearm
  // and carries on from the elbow along the sleeve direction until it leaves the frame. The body is never shown.
  HANDS.SLEEVE_DIR = [0, -0.42, 1];     // from the elbow toward the examiner (down and toward the camera side)
  HANDS.examinerArm = (S, mats, side) => {
    const group = new THREE.Group(); group.name = 'examiner-' + side;
    S.scene.add(group);
    const hand = HANDS.make({ glove: mats.glove, side, name: 'examiner-hand-' + side, scale: 1.04 });
    group.add(hand.group);
    const FL = 2.7;
    const fore = new THREE.Group(); group.add(fore);
    // forearm along +X from the elbow (0) to the wrist (FL); its width lies along Z
    CLAY.mesh(CLAY.loft([
      { s: -0.2, a: 0.42, c: 0.38 }, { s: 0.6, a: 0.46, c: 0.4 }, { s: 1.6, a: 0.38, c: 0.3 }, { s: FL - 0.1, a: 0.3, c: 0.19 },
    ], { axis: 'x', radial: 32, rings: 24, capStart: 0.6, capEnd: 0.4 }), mats.glove, fore);
    // glove cuff, a little proud of the forearm
    CLAY.mesh(new THREE.TorusGeometry(0.4, 0.045, 10, 36).rotateY(Math.PI / 2), mats.glove, fore, [1.25, 0, 0]);
    // scrub sleeve over the elbow end of the forearm
    CLAY.mesh(CLAY.loft([{ s: -0.6, a: 0.6, c: 0.56 }, { s: 0.4, a: 0.62, c: 0.58 }, { s: 0.95, a: 0.6, c: 0.55 }], { axis: 'x', radial: 32, rings: 10, capStart: 0, capEnd: 0 }), mats.sleeve, fore);
    CLAY.mesh(new THREE.TorusGeometry(0.585, 0.07, 10, 36).rotateY(Math.PI / 2), mats.sleeve, fore, [0.95, 0, 0]);
    // upper sleeve: from the elbow away out of frame
    const upper = new THREE.Group(); group.add(upper);
    CLAY.mesh(CLAY.loft([{ s: 0, a: 0.62, c: 0.6 }, { s: 6, a: 0.7, c: 0.66 }, { s: 34, a: 0.8, c: 0.75 }], { axis: 'x', radial: 32, rings: 20, capStart: 0.6, capEnd: 0 }), mats.sleeve, upper);
    const up = V(0, 1, 0), tmp = V(0, 0, 0);
    const arm = {
      group, hand, fore, upper, FL,
      // place the forearm and the sleeve behind a hand that is already placed. backDir: from the wrist toward the elbow.
      follow(backDir) {
        const g = hand.group; g.updateMatrixWorld(true);
        const wrist = g.getWorldPosition(V(0, 0, 0));
        const b = backDir.clone().normalize();
        const elbow = wrist.clone().addScaledVector(b, FL);
        const x = b.clone().negate();                           // forearm +X points from the elbow to the wrist
        // width of the forearm follows the width of the hand
        const hz = V(0, 0, 1).applyQuaternion(g.quaternion);
        const z = hz.sub(x.clone().multiplyScalar(hz.dot(x))).normalize(), y = new THREE.Vector3().crossVectors(z, x);
        fore.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
        fore.position.copy(elbow);
        const sd = V(...HANDS.SLEEVE_DIR).normalize();
        const sx = sd.clone(), sz = tmp.crossVectors(sx, up).normalize().clone(), sy = new THREE.Vector3().crossVectors(sz, sx);
        upper.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(sx, sy, sz));
        upper.position.copy(elbow);
      },
    };
    return arm;
  };
})(typeof window !== 'undefined' ? window : globalThis);
