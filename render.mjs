// render.mjs: renders the respiratory part 3 animation to MP4 in Chrome (GPU) with ffmpeg.
//
//   npm start                       everything at the series quality: 1920x1080, 30 fps, 64 samples,
//                                   the full video and every beat, captions and clean, with sound
//   node render.mjs --beat 3        only beat 3 (both versions)
//   node render.mjs --samples 8 --width 960 --height 540    a quick low-sample preview
//
// Output (out/):  resp3_back_full_captions.mp4, resp3_back_full_clean.mp4,
//                 beats/resp3_back_beat1_sitting-forward_captions.mp4 ... (one per beat, both versions)
//
// How it works: the page renders each frame once with the stage kit (window.seek), the frame is captured as the clean
// version, and the series caption plaque is drawn over a copy for the captioned version (the same composite the stage's
// own overlay does), so the 3D is rendered once for both. The held home shot (first and last second) reuses the frame at
// t = 0, so the first and last frames are pixel-identical. The sound is rendered from the same score (SOUND.renderOffline),
// normalised to about -15 LUFS and muxed in; each beat is cut from the full video, frame-exact.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './server.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const has = (name) => process.argv.includes('--' + name);
const W = +arg('width', 1920), H = +arg('height', 1080), FPS = +arg('fps', 30), SAMPLES = +arg('samples', 64);
const OUT = path.resolve(ROOT, arg('out', 'out'));
const ONLY_BEAT = arg('beat', null);
const VERSIONS = (arg('versions', 'captions,clean')).split(',');
const SOFTWARE_GL = has('software');            // cloud preview without a GPU
const SHADOW = arg('shadow', null);              // preview only: shadow map size (the final render keeps 2048)
const STEP = +arg('step', 1);                    // preview only: render every STEP-th frame and hold it (2 = the 15 poses a second)

let FFMPEG = process.env.FFMPEG || null;
if (!FFMPEG) { try { FFMPEG = require('ffmpeg-static'); } catch (e) { FFMPEG = 'ffmpeg'; } }

// Chrome: your installed Google Chrome (playwright-core, channel 'chrome'), or CHROME_PATH, or a bundled Chromium
async function launch() {
  let pw = null;
  const mods = SOFTWARE_GL ? ['/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright', 'playwright', 'playwright-core'] : ['playwright-core', 'playwright'];
  for (const m of mods) { try { pw = require(m); break; } catch (e) {} }
  if (!pw) throw new Error('playwright-core is missing: run npm install');
  const args = SOFTWARE_GL
    ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    : ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-gpu-rasterization', '--disable-gpu-sandbox', '--force-high-performance-gpu'].concat(process.platform === 'win32' ? ['--use-angle=d3d11'] : []);
  const tries = [];
  if (process.env.CHROME_PATH) tries.push({ executablePath: process.env.CHROME_PATH });
  if (!SOFTWARE_GL) tries.push({ channel: 'chrome' }, { channel: 'msedge' });
  tries.push({});
  let last = null;
  for (const t of tries) { try { return await pw.chromium.launch(Object.assign({ headless: true, args }, t)); } catch (e) { last = e; } }
  throw last;
}

const run = (cmd, a, opts = {}) => new Promise((ok, bad) => {
  const p = spawn(cmd, a, { stdio: ['ignore', 'ignore', 'pipe'], ...opts });
  let err = ''; p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
  p.on('close', (c) => (c === 0 ? ok() : bad(new Error(cmd + ' ' + a.join(' ') + '\n' + err.slice(-3000)))));
});
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmt = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

async function main() {
  fs.mkdirSync(path.join(OUT, 'beats'), { recursive: true });
  const tmp = path.join(OUT, 'tmp'); fs.mkdirSync(tmp, { recursive: true });
  const server = await serve(0), port = server.address().port;
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html?still=1&captions=0&w=${W}&h=${H}&samples=${SAMPLES}${SHADOW ? '&shadow=' + SHADOW : ''}`, { waitUntil: 'commit', timeout: 0 });
  console.log('building the set...');
  await page.waitForFunction(() => window.READY === true, null, { timeout: 0 });
  const info = await page.evaluate(() => {
    const gl = document.getElementById('c').getContext('webgl2'), ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const c = window.RESP3.content;
    return { D: window.DURATION, home: c.HOME_HOLD, beats: c.BEATS, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown' };
  });
  console.log('WebGL renderer:', info.gpu);
  if (/swiftshader|llvmpipe|software/i.test(info.gpu) && !SOFTWARE_GL) console.log('WARNING: Chrome is not using the GPU; the render will be very slow. Update the graphics driver or set CHROME_PATH.');

  const D = info.D, total = Math.round(D * FPS);
  let f0 = 0, f1 = total;                                  // frame range [f0, f1)
  let beatsWanted = info.beats;
  if (ONLY_BEAT) { const b = info.beats.find((x) => String(x.n) === String(ONLY_BEAT)); f0 = Math.round(b.t0 * FPS); f1 = Math.round(b.t1 * FPS); beatsWanted = [b]; }
  const tag = ONLY_BEAT ? `beat${ONLY_BEAT}` : 'full';

  // ---------------- video: one render per frame, two encoders (captions / clean)
  const enc = {}, done = {};
  for (const v of VERSIONS) {
    const file = path.join(tmp, `${tag}_${v}.mp4`);
    const p = spawn(FFMPEG, ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-framerate', String(FPS), '-i', '-', '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', file], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-8000); });
    done[v] = new Promise((ok, bad) => p.on('close', (c) => (c === 0 ? ok() : bad(new Error('ffmpeg video: ' + err.slice(-2000))))));
    enc[v] = { p, file };
  }
  const write = (v, buf) => new Promise((ok) => { if (!enc[v].p.stdin.write(buf)) enc[v].p.stdin.once('drain', ok); else ok(); });
  const t0 = Date.now();
  let prev = null;
  for (let f = f0; f < f1; f++) {
    const t = f / FPS;
    if (STEP > 1 && (f - f0) % STEP !== 0 && prev) { for (const v of VERSIONS) await write(v, prev[v]); continue; }
    const hold = t <= info.home + 1e-6 || t >= D - info.home - 1e-6;   // the held home shot: the frame at t = 0
    // one raw read of the finished frame (rows bottom-up; ffmpeg flips them). The caption plaque is drawn on a 2D canvas
    // and composited over the frame exactly as the stage's own overlay does (premultiplied "over"), only where it is.
    const res = await page.evaluate(({ t, rt, versions }) => {
      window.CAPTIONS = false;
      const T0 = performance.now();
      window.seek(rt);
      const T1 = performance.now();
      const S = window.S, gl = S.renderer.getContext(), W = S.W, H = S.H;
      if (!window.__px || window.__px.length !== W * H * 4) window.__px = new Uint8Array(W * H * 4);
      const px = window.__px; gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const b64 = (u) => { let s = ''; for (let j = 0; j < u.length; j += 0x8000) s += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000)); return btoa(s); };
      const T2 = performance.now();
      const out = { clean: b64(px) };
      if (versions.includes('captions')) {
        if (!window.__cap) { window.__cap = document.createElement('canvas'); window.__cap.width = W; window.__cap.height = H; }
        const ctx = window.__cap.getContext('2d', { willReadFrequently: true }); ctx.clearRect(0, 0, W, H);
        window.CAPTION.at(ctx, t, window.RESP3.content.CAPTIONS, W, H);
        const ov = ctx.getImageData(0, 0, W, H).data;
        let any = false; for (let i = 3; i < ov.length; i += 64) if (ov[i]) { any = true; break; }
        if (any) {
          const cp = new Uint8Array(px);
          for (let y = 0; y < H; y++) { const ro = (H - 1 - y) * W * 4, oo = y * W * 4; for (let x = 0; x < W * 4; x += 4) { const a = ov[oo + x + 3]; if (!a) continue; const k = a / 255; for (let c = 0; c < 3; c++) cp[ro + x + c] = Math.round(ov[oo + x + c] * k + cp[ro + x + c] * (1 - k)); } }
          out.captions = b64(cp);
        } else out.captions = out.clean;
      }
      out.ms = [T1 - T0, T2 - T1, performance.now() - T2].map(Math.round);
      return out;
    }, { t, rt: hold ? 0 : t, versions: VERSIONS });
    if (process.env.PROFILE) console.log('\nms seek/read/rest', res.ms);
    prev = {}; for (const v of VERSIONS) { prev[v] = Buffer.from(res[v], 'base64'); await write(v, prev[v]); }
    if ((f - f0) % 15 === 0 || f === f1 - 1) {
      const n = f - f0 + 1, el = (Date.now() - t0) / 1000, eta = el / n * (f1 - f0 - n);
      process.stdout.write(`\rframe ${n}/${f1 - f0}  t=${t.toFixed(2)} s  ${(el / n).toFixed(2)} s/frame  elapsed ${fmt(el)}  left ${fmt(eta)}   `);
    }
  }
  console.log('');
  for (const v of VERSIONS) enc[v].p.stdin.end();
  await Promise.all(VERSIONS.map((v) => done[v]));

  // ---------------- sound: the same score, rendered offline, normalised, muxed
  console.log('rendering the sound...');
  const SR = 48000;
  const nChunks = await page.evaluate(async ({ D, SR }) => {
    const r = await window.SOUND.renderOffline((k) => window.RESP3.sound(k), D, SR, { voiceover: false });
    window.__snd = r.inter; window.__chunk = SR * 2 * 5;
    return Math.ceil(r.inter.length / window.__chunk);
  }, { D, SR });
  const raw = path.join(tmp, 'sound.f32');
  const fd = fs.openSync(raw, 'w');
  for (let i = 0; i < nChunks; i++) {
    const b64 = await page.evaluate((i) => { const a = window.__snd.subarray(i * window.__chunk, (i + 1) * window.__chunk); const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let j = 0; j < u.length; j += 0x8000) s += String.fromCharCode.apply(null, u.subarray(j, j + 0x8000)); return btoa(s); }, i);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  await browser.close(); server.close();
  const wav = path.join(tmp, 'sound.wav');
  // about -15 LUFS; aformat at the end is needed by ffmpeg 6 (ffmpeg-static) on Windows ("Cannot select channel layout")
  await run(FFMPEG, ['-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw, '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=sample_fmts=s16:channel_layouts=stereo', wav]);

  const a0 = f0 / FPS, a1 = f1 / FPS;
  for (const v of VERSIONS) {
    const full = path.join(OUT, `resp3_back_${tag}_${v}.mp4`);
    await run(FFMPEG, ['-y', '-i', enc[v].file, '-ss', a0.toFixed(6), '-t', (a1 - a0).toFixed(6), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', full]);
    if (!ONLY_BEAT) {
      // each beat cut from the full video, frame-exact, with a 10 ms fade at each end of its sound (no clicks)
      for (const b of beatsWanted) {
        const s0 = b.t0, s1 = b.t1, name = `resp3_back_beat${b.n}_${slug(b.name)}_${v}.mp4`;
        await run(FFMPEG, ['-y', '-i', full, '-ss', s0.toFixed(6), '-to', s1.toFixed(6), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-af', `afade=t=in:st=0:d=0.01,afade=t=out:st=${(s1 - s0 - 0.01).toFixed(3)}:d=0.01,aformat=sample_fmts=fltp:channel_layouts=stereo`, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', path.join(OUT, 'beats', name)]);
      }
    } else {
      fs.renameSync(full, path.join(OUT, 'beats', `resp3_back_beat${ONLY_BEAT}_${slug(beatsWanted[0].name)}_${v}.mp4`));
    }
  }
  if (!has('keep-tmp')) fs.rmSync(tmp, { recursive: true, force: true });
  console.log('done in', fmt((Date.now() - t0) / 1000), '->', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
