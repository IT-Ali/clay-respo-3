# Respiratory examination, part 3 of 3: the back of the chest (Soft Clay)

A three.js 0.187.0 motion graphic in the Soft Clay style, built on the series kit from the cardiovascular video
(`shared/`, loaded unchanged). Part 3 starts and ends on the series home shot, so it joins parts 1 and 2 end to end.

**Status: storyboard round.** The scene, the beats, the captions and the sound score are built; the storyboard
(`storyboard/index.html`) is waiting for review. The MP4 render script (`npm start`) comes in the next round, after
the storyboard is approved.

## Folder

| Path | What it is |
|---|---|
| `index.html` | The player: 1920×1080 canvas, play/pause, scrub, time, sound, captions and loop toggles |
| `resp3-style.js` | This part: content and timeline first, then `build(S)` → `update(t)`, then `sound(k)` |
| `lib/stage.js`, `lib/sound.js`, `lib/text3d.js` | The STAGE kit, the SOUND kit and TEXT3D, unchanged from the prompt |
| `shared/` | The series kit (patient, bed, set, hands, sheet, caption), unchanged |
| `ref/` | The series reference images, and `cvs1-style.js` (part 1 of the cardiovascular video; `restArm` and `exRest` are copied from it) |
| `vendor/` | three.js 0.187.0 (`three.module.js` + `three.core.js`) and the Fredoka font, served locally |
| `storyboard/` | The storyboard page, its stills, and `panels.js` (the review panels; never part of the video) |
| `tools/shot.mjs` | Renders stills in headless Chromium: `node tools/shot.mjs jobs.json outDir 1280 720 16` |
| `tools/make_storyboard.py` | Builds `storyboard/index.html` from the stills and their measured gaps |
| `server.mjs` | A tiny static server: `npm run serve`, then open http://127.0.0.1:8080/ |

## Play it

```bash
npm install
```

```bash
npm run serve
```

Then open http://127.0.0.1:8080/ in Chrome. `?captions=0` starts without captions; the Captions button switches them.
`window.CAPTIONS = false` (or the button) gives the clean version: the same build renders both.

## Notes

- Units: 1 world unit = 10 cm. Head at screen left, his right side toward the camera, the examiner on his right.
- Everything new for this part lives in `resp3-style.js`: the sitting pose, the back landmarks computed on his own
  trunk, the trousers seat and a second drape of the shared sheet for sitting, the stethoscope, the contact solver
  (gaps measured on the real mesh) and the beats.
- The first and last second are the exact series home frame (breathing and lamp flicker off); the ambience fades in
  over the first 0.5 s and out over the last 0.5 s.
