// shared/props.js: small clay props. Classic script; needs THREE, K, CLAY. Defines window.PROPS.
//   PROPS.clock(S) -> { group, set(seconds, visibleScale) }  a small clay clock with one racing hand and no text
//     (12 hour nubs, the hand goes round once per 60 "seconds"), used to show that time is sped up.
(function (root) {
  const THREE = root.THREE, K = root.K, CLAY = root.CLAY;
  const PROPS = (root.PROPS = {});
  PROPS.clock = (S) => {
    const g = new THREE.Group(); g.name = 'clock'; S.scene.add(g);
    const face = CLAY.mat('#f8eedb', '#eadcc2', { rough: 0.62, streak: 0.4 });
    const rim = CLAY.mat('#d0704c', '#b85a3a', { rough: 0.58, streak: 0.5 });
    const navy = CLAY.mat('#26336b', '#1d2858', { rough: 0.55, streak: 0.4 });
    const body = new THREE.Group(); g.add(body);
    // disc facing +Z
    CLAY.mesh(CLAY.lumpy(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 48, 1).rotateX(Math.PI / 2), { amount: 0.012, size: 0.4, seed: 91 }), face, body);
    CLAY.mesh(CLAY.lumpy(new THREE.TorusGeometry(0.98, 0.14, 16, 56), { amount: 0.018, size: 0.35, seed: 92, dents: 3, dentSize: 0.2, dentDepth: 0.025 }), rim, body, [0, 0, 0.04]);
    CLAY.mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.34, 40).rotateX(Math.PI / 2), rim, body, [0, 0, -0.2]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, big = i % 3 === 0;
      CLAY.mesh(new THREE.SphereGeometry(big ? 0.075 : 0.05, 14, 10), navy, body, [Math.sin(a) * 0.74, Math.cos(a) * 0.74, 0.12]);
    }
    // two little feet and a bell knob on top, like a desk clock
    for (const s of [-1, 1]) CLAY.mesh(new THREE.SphereGeometry(0.2, 16, 12), rim, body, [s * 0.6, -0.92, -0.1]);
    CLAY.mesh(new THREE.SphereGeometry(0.16, 16, 12), rim, body, [0, 1.12, -0.05]);
    const hand = new THREE.Group(); hand.position.z = 0.14; body.add(hand);
    CLAY.mesh(CLAY.loft([{ s: -0.14, a: 0.06, c: 0.03 }, { s: 0.3, a: 0.05, c: 0.03 }, { s: 0.66, a: 0.025, c: 0.025 }], { axis: 'y', radial: 16, rings: 10 }), navy, hand);
    CLAY.mesh(new THREE.SphereGeometry(0.085, 14, 10), navy, hand, [0, 0, 0.03]);
    return {
      group: g, body,
      set(seconds, scale) {
        hand.rotation.z = -(seconds / 60) * Math.PI * 2;
        const s = Math.max(1e-3, scale == null ? 1 : scale);
        body.scale.setScalar(s); g.visible = s > 0.002;
      },
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
