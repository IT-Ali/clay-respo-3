# shared/ — the cardiovascular examination series kit (parts 1, 2 and 3)

Everything the three parts reuse, so the patient, the set and the home shot match exactly when the three MP4s are
joined. Give this folder, together with `ref/patient_full.png` and `ref/patient_face.png`, to the sessions that build
parts 2 and 3.

All files are classic scripts (no modules). They need a global `THREE` (three.js **0.187.0**, core only) and the
STAGE kit (`lib/stage.js`, global `K`). Load them in this order, after `lib/stage.js`:

```html
<script src="lib/stage.js"></script>
<script src="shared/clay.js"></script>     <!-- CLAY: clay material + shape helpers (needed by all below) -->
<script src="shared/set.js"></script>      <!-- SET: backdrop, lighting, HOME shot constants, render settings -->
<script src="shared/bed.js"></script>      <!-- BED: hospital bed, pillow, bedside table with the glass -->
<script src="shared/props.js"></script>    <!-- PROPS: small clay clock (racing hand, no text) -->
<script src="shared/hands.js"></script>    <!-- HANDS: hands (patient + gloved examiner), examiner forearms/sleeves -->
<script src="shared/patient.js"></script>  <!-- PATIENT: the recurring patient (needs HANDS, BED) -->
<script src="shared/sheet.js"></script>    <!-- SHEET: the white sheet draped over him (needs PATIENT) -->
<script src="shared/caption.js"></script>  <!-- CAPTION: the cream caption plaque (2D overlay) -->
```

## Units and layout (identical in every part)

- 1 world unit = 10 cm. Floor at y = 0. The bed's long axis runs along X.
- Patient's head toward **-X (screen left)**, feet toward **+X (screen right)**.
- His **RIGHT** side faces **+Z** (toward the camera). The examiner stands there in every beat.
- The bedside table is on his **LEFT** (-Z, far side), near his head.

## Files

| File | What it is | Main entry points |
|---|---|---|
| `clay.js` | The Soft Clay kit from the reference style source, unchanged in behaviour: `claySurface()` (tiling height map of fingerprints, knife drags, joins, pits, fine tooth), `clay()` (triplanar plasticine material, soft dents, streaked second colour, waxy sheen) and `lumpy()` (shapes a geometry by hand). Series additions: a `'skin'` surface (fine tooth only, for the patient's skin and hair) and a `'flat'` one (nails), a palm/side tint (`palm`, with `palmX` to fade it in along the object), `roughVar` (how much the broad noise varies the roughness; skin defaults to almost none, so the skin is one even colour with no sheen patches), and `CLAY.mat(a, b, opts)` with `scale` for big set pieces (marks scaled with the set). Also the `loft` shape helper. | `CLAY.surface(kind)`, `CLAY.clay(colour, opts)`, `CLAY.lumpy(geo, opts)`, `CLAY.mat(a, b, opts)`, `CLAY.loft`, `CLAY.ellipsoid`, `CLAY.mesh`, `CLAY.anchor` |
| `set.js` | The reference set, scaled by `SET.SC` = 2.7 (the bed set is 2.7x the reference tabletop): the seamless teal paper sweep with its tooth, the big soft key from the upper left, the sky light with real occlusion, the reference environment, plus a raking lamp and a fill light (off unless a shot asks). **`SET.HOME`** is the home shot (camera, 28 degree lens, focus). **`SET.RENDER`** is the reference grade. `SET.poseTime(t)` is stop-motion time on twos; `SET.flicker(t)` the 1.2% key flicker. | `SET.build(S)` -> lights `L` with `L.set(t, opts)`; `SET.shoot(S, shot)`; `SET.HOME`, `SET.LAMP`, `SET.SKY`, `SET.ENV`, `SET.RENDER`, `SET.SC` |
| `bed.js` | Pale grey bed frame, pale sage mattress with the backrest at 45 degrees, one white pillow, and the bedside table (warm wood) with a clear glass of water. `BED.DIM` holds the measurements the patient uses. | `BED.build(S)` → `{ placePillow(headBack, s) }`, `BED.table(S)`, `BED.DIM`, `BED.onBack(s, off)` |
| `props.js` | The small clay clock (12 nubs, one racing hand, no text). | `PROPS.clock(S)` → `{ group, set(seconds, scale) }` |
| `hands.js` | One hand builder for the patient (skin, nails with a nail fold at the normal 160° nail-bed angle, thenar/hypothenar eminences, finger pulps, dorsal tendons; optional `skinWrist` material for the palm and thumb base) and the examiner (blue nitrile-glove clay). Left hands are mirrored right hands, so thumbs are always on the correct side. Named contact points (`indexPad`, `thumbPad`, `middleMidBack`, `dorsum`, `palm`, `indexFold`, ...) and a solver that puts a contact exactly on a world point. The examiner's forearm and teal scrub sleeve leave the frame toward the camera. | `HANDS.make(opts)`, `HANDS.quat(fingerDir, dorsalDir)`, `HANDS.place(hand, contact, point, quat)`, `HANDS.examinerArm(S, mats, 'R'|'L')` → `{ hand, follow(backDir) }` |
| `patient.js` | **The recurring patient.** A clay man of about 55: medium-brown skin (#9b6b4b, even), short dark-brown hair (#2a221d) greying at the sides (#8d8882), a neat moustache, **no beard**, a **slim neck (do not widen it)**, average build, bare-chested, light blue pyjama trousers. Reclined at 45 degrees on the bed. Skin: one even colour (fine tooth and waxy sheen only, no streaks or dents). Each arm is one continuous surface from the shoulder through the elbow and wrist into the palm, bent by the upper-arm, forearm and hand frames (no ring at the elbow, no seam at the wrist). Face: eyes with lids (the lower lid can be drawn down to show the pink conjunctiva), iris with a clean rim, mouth (stop-motion replacement piece) with rows of separate teeth and one smooth pink tongue that slides out past the lower lip (soft midline groove), lips. Legs: the lower leg, heel and foot are ONE smooth sweep (no join), heel resting on the mattress, the foot standing up (toes to the ceiling, turned slightly outward, the same on both sides); both ankles mildly puffy (bilateral oedema); low, rounded medial malleolus on the inner side and the lateral malleolus; press points on the inner face of the tibia 2 cm above each medial malleolus; a thumb-pad-shaped pit. | `PATIENT.build(S)` → `P` with `P.setArm(side, wrist, quat, handPose, pole)`, `P.setFace({ jaw, tongue, gazeUp, pullR, blink })` (tongue 0..1 = in..out), `P.setPit(side, depth)`, `P.setRoll(u)`, `P.breathe(t)`, `P.anchor(name)`, `P.shoulder(side)`, `P.headBack()`, `P.legSDF(side, point)` (approximate signed distance to the lower leg and foot) |
| `sheet.js` | The white sheet (#f3efe7 / #ddd5c6) over him from the waist down, draped over his legs, with a turned-down hem. It folds up off the lower legs in layers and back. | `SHEET.build(S, P)` → `{ setFold(u), heightAt(x, z) }` |
| `caption.js` | The series caption: a cream rounded plaque (#f8eedb) with dark navy text (#26336b) in Fredoka, a soft shadow, 0.25 s fades, placed top, bottom or in a corner. | `CAPTION.at(ctx, t, list, W, H)`, `CAPTION.draw(...)`, `CAPTION.FONT_SPEC` |

## The home shot (start and end of every part)

```js
const L = SET.build(S); const bed = BED.build(S); BED.table(S);
const P = PATIENT.build(S); const SH = SHEET.build(S, P); bed.placePillow(P.headBack(), 7.15);
SET.shoot(S, SET.HOME);            // camera, lens and focus
L.set(0, {});                      // lamp, sky, no rake, no fill
// patient: arms resting at his sides on the sheet, face neutral, no breathing offset (P.breathe(0)),
// sheet unfolded (SH.setFold(0)), trousers down (P.setRoll(0)), no pits, clock hidden.
// examiner: both gloved hands resting on the mattress edge at his right side.
```

The exact home poses (patient arms, examiner hands) are built in `cvs1-style.js` (`ST.arm.rest`, `ST.ex.rest`); copy
those two functions (`restArm`, `exRest`) into parts 2 and 3 unchanged. Lamp flicker and breathing are switched off
during the first and last second so the joined frames are identical. Fade the ambience bed in over the first 0.5 s and
out over the last 0.5 s.

## Render settings

Use `SET.RENDER` as the style's `render` block (the reference grade: neutral tone, bloom 0.06, threshold 1.1,
vignette 0.26, grain 0.014, fov 28, shutter 0 = no motion blur, 64 samples), fonts `['600 56px "Fredoka"']`, poses on twos via `SET.poseTime(t)`.
