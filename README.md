# Respiratory examination, part 3 of 3: the back of the chest (Soft Clay)

A three.js 0.187.0 motion graphic in the Soft Clay style, built on the series kit from the cardiovascular video
(`shared/`, loaded unchanged). Part 3 starts and ends on the series home shot, so it joins parts 1 and 2 end to end.

## Render everything on your PC (Windows, Node + Chrome)

Unzip, open a terminal in the folder, and run:

```bash
npm start
```

That installs the dependencies (three, playwright-core, ffmpeg-static) and renders, in your installed Google Chrome on
the GPU, at the series quality (1920×1080, 30 fps, 64 samples), with sound:

- `out/resp3_back_full_captions.mp4` and `out/resp3_back_full_clean.mp4` (87 s)
- `out/beats/resp3_back_beat1_sitting-forward_captions.mp4` … `beat8_lying-back_clean.mp4` (16 files)

It renders beat by beat and keeps what it has finished, so if it is interrupted, run `npm start` again and it carries
on from the next beat (`node render.mjs --force` starts over). It prints the WebGL renderer it found (it should name your RTX 3060 Ti) and a running time estimate. Other commands:
`npm run beat3` (only beat 3), `npm run preview` (a quick low-sample pass into `preview/`), `npm run check` (the
sound/picture checks below). If Chrome is not found, set `CHROME_PATH` to chrome.exe.

How it renders: each frame is rendered once; the clean frame is saved, and the series caption plaque is composited over
a copy for the captioned version. The held home shot (first and last second) reuses the frame at t = 0, so the first
and last frames are identical. The sound comes from the same score, normalised to about -15 LUFS (ending in
`aformat=sample_fmts=s16:channel_layouts=stereo` for ffmpeg 6); each beat is cut frame-exact from the full video.

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
| `render.mjs` | The MP4 renderer (`npm start`) |
| `tools/check.mjs` | Checks strike frames vs percussion notes, breath sounds vs breathing and contact, first vs last frame |
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
