// shared/set.js: the teal paper sweep, the lighting and the HOME SHOT constants shared by every part of the
// cardiovascular examination series. Classic script; needs THREE, K, CLAY. Defines window.SET.
// Units: 1 = 10 cm. Floor at y = 0. The bed's long axis runs along X: the patient's head toward -X (screen left), his
// feet toward +X (screen right). His RIGHT side, where the examiner stands, is +Z (toward the camera).
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY;
  const SET = (root.SET = {});

  // ---------------------------------------------------------------- fixed constants (identical in parts 1, 2 and 3)
  SET.BG = '#0d3a3d';             // background beyond the sweep
  SET.PAPER = '#12808a';          // teal paper sweep (the reference card colour)
  // The reference set is a small tabletop; this set (a bed) is SC times bigger, so every position and size from the
  // reference is scaled by SC around this set's centre. Angles, colours, softness ratios and the grade are unchanged.
  SET.SC = 2.7;
  SET.CENTER = [0, 7.0, -1.0];
  const SC = SET.SC, at = (ref, refTarget) => ref.map((v, i) => SET.CENTER[i] + (v - refTarget[i]) * SC);
  // the grade: exactly the reference render block (samples 64 for the final; previews use fewer)
  SET.RENDER = { samples: 64, shutter: 0, tone: 'neutral', exposure: 1.0, bloom: 0.06, bloomThreshold: 1.1, vignette: 0.26, grain: 0.014, fov: 28, background: '#0d3a3d', near: 0.05, far: 400, fps: 30 };
  // HOME SHOT: the wide view of the whole set every part starts and ends on (held still ~1 s, no caption)
  SET.HOME = { pos: [1.5, 22.5, 33.8], target: [0.4, 6.9, -1.2], fov: 28, focus: [-0.5, 8.0, 0.5], aperture: 0.09 };
  // the reference key: one big soft lamp from the upper left (power scales with distance squared)
  SET.LAMP = { pos: at([-7.5, 11, 9.5], [0.4, 1.3, -0.6]), target: SET.CENTER, power: 1400 * SC * SC, angle: 0.52, penumbra: 1, soft: 1.3 * SC, near: 6 * SC, far: 40 * SC, bias: -0.0003, color: '#fff0dc' };
  // the reference sky light with real occlusion
  SET.SKY = { power: 0.75, color: '#e2f2ff', size: 9.5 * SC, center: [-0.5, 5.0, -1.0], spread: 0.85, mapSize: 2048 };
  // the reference environment (direction-only, so its numbers carry over unchanged)
  SET.ENV = { top: '#f6f2ea', horizon: '#b9d2d0', bottom: '#3f6466', intensity: 0.22, panels: [{ pos: [-9, 12, 10], size: [16, 12], color: '#fff2df', power: 2.4 }] };
  SET.POSE_FPS = 15;              // stop-motion: poses change on twos (15 a second); only the camera moves smoothly

  // reference stop-motion time and re-placement jitter
  SET.poseTime = (t) => Math.floor(t * SET.POSE_FPS + 1e-3) / SET.POSE_FPS;
  SET.nudge = (id, tq, amt) => (K.hash(id, Math.round(tq * SET.POSE_FPS)) - 0.5) * 2 * amt;
  // single frames never get exactly the same exposure: the reference key flicker
  SET.flicker = (t) => 1 + SET.nudge(1, SET.poseTime(t), 0.012);

  // ---------------------------------------------------------------- build
  SET.build = (S) => {
    const THREE_ = THREE;
    S.scene.background = new THREE_.Color(SET.BG);
    // the reference seamless paper sweep: floor, cove, wall in one sheet (scaled by SC; its floor ends behind the table)
    const FLOOR_BACK = -9.6, COVE = 1.9 * SC, WALL = FLOOR_BACK - COVE;
    let sweep;
    {
      const front = 16 * SC, height = 16 * SC, Lf = front - FLOOR_BACK, La = Math.PI / 2 * COVE, L = Lf + La + height - COVE;
      const g = new THREE_.PlaneGeometry(70 * SC, 1, 1, 120), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const s2 = (p.getY(i) + 0.5) * L, x = p.getX(i);
        if (s2 < Lf) p.setXYZ(i, x, 0, front - s2);
        else if (s2 < Lf + La) { const a = (s2 - Lf) / COVE; p.setXYZ(i, x, COVE - COVE * Math.cos(a), FLOOR_BACK - COVE * Math.sin(a)); }
        else p.setXYZ(i, x, COVE + s2 - Lf - La, WALL);
      }
      g.computeVertexNormals();
      const tooth = K.canvasTex(256, 256, (ctx) => { const im = ctx.createImageData(256, 256), r = K.rng(9); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = im.data[i + 1] = im.data[i + 2] = 128 + r.range(-60, 60); im.data[i + 3] = 255; } ctx.putImageData(im, 0, 0); }, { data: true, repeat: [40, L * 0.6 / SC] });
      sweep = new THREE_.Mesh(g, new THREE_.MeshStandardMaterial({ color: SET.PAPER, roughness: 0.93, bumpMap: tooth, bumpScale: 0.35 }));
      sweep.receiveShadow = true; sweep.name = 'sweep'; S.scene.add(sweep);
    }

    K.env(S, SET.ENV);
    const lamp = K.spot(S, { pos: SET.LAMP.pos, target: SET.LAMP.target, power: SET.LAMP.power, angle: SET.LAMP.angle, penumbra: SET.LAMP.penumbra, soft: SET.LAMP.soft, color: SET.LAMP.color, mapSize: 2048, near: SET.LAMP.near, far: SET.LAMP.far, bias: SET.LAMP.bias, normalBias: 0.015 });
    const sky = K.skyLight(S, { power: SET.SKY.power, color: SET.SKY.color, size: SET.SKY.size, center: SET.SKY.center, spread: SET.SKY.spread, mapSize: SET.SKY.mapSize, dist: 40, bias: -0.0004, normalBias: 0.02 });
    // a low raking lamp for close-ups of the skin surface (off unless a shot asks for it)
    const rake = K.spot(S, { pos: [-4, 8.6, 1.5], target: [6.3, 6.6, 0], power: 0, angle: 0.32, penumbra: 0.8, soft: 0.35, color: '#fff1de', mapSize: 2048, near: 1, far: 30, bias: -0.0001, normalBias: 0.004 });

    // a soft fill near the camera for close-ups into shadowed places (inside the mouth), off unless a shot asks
    const fill = new THREE_.PointLight('#fff4ea', 0, 0, 2); S.scene.add(fill);
    const L = { sweep, lamp, sky, rake, fill };
    // Tighten the shadow maps around a region for close-ups (keeps contact shadows crisp). Pass null for the wide set.
    L.focus = (center, size) => {
      const c = center || SET.SKY.center, s = size || SET.SKY.size;
      sky.target.position.set(c[0], c[1], c[2]);
      const cam = sky.shadow.camera; cam.left = -s; cam.right = s; cam.top = s; cam.bottom = -s; cam.updateProjectionMatrix();
      sky.shadow.normalBias = 0.02 * Math.min(1, s / SET.SKY.size) + 0.002;
    };
    L.set = (t, o = {}) => {
      const f = SET.flicker(t);
      lamp.intensity = SET.LAMP.power * f * (o.lamp == null ? 1 : o.lamp);
      sky.intensity = SET.SKY.power * (o.sky == null ? 1 : o.sky);
      rake.intensity = (o.rake || 0) * f;
      if (o.rakePos) rake.position.set(...o.rakePos);
      if (o.rakeTarget) rake.target.position.set(...o.rakeTarget);
      fill.intensity = (o.fill || 0) * f; if (o.fillPos) fill.position.set(...o.fillPos);
      L.focus(o.shadowCenter, o.shadowSize);
    };
    return L;
  };

  // put the camera on a shot { pos, target, fov, focus (point or distance), aperture }
  SET.shoot = (S, shot) => {
    K.look(S.camera, shot.pos, shot.target, shot.fov);
    K.focus(S.camera, shot.focus || shot.target, shot.aperture == null ? 0.05 : shot.aperture);
  };
})(typeof window !== 'undefined' ? window : globalThis);
