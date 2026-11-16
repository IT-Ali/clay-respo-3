// tools/check.mjs: checks the picture and the sound against the one schedule.
//   node tools/check.mjs [--software]
// 1. every percussion note starts on the exact frame where the right fingertip touches the left middle finger
// 2. the breath sounds play only while the diaphragm is on the skin and follow his breathing (rise through inspiration,
//    fade early in expiration)
// 3. the first and last frames are the home shot, pixel for pixel (grain switched off for the comparison, since the
//    stage seeds it per frame; render.mjs reuses the t = 0 frame for the whole held home shot)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { serve } from '../server.mjs';
const require = createRequire(import.meta.url);
let pw = null; for (const m of ['/opt/node22/lib/node_modules/playwright', 'playwright', 'playwright-core']) { try { pw = require(m); break; } catch (e) {} }
const SOFT = process.argv.includes('--software');
const server = await serve(0), port = server.address().port;
const largs = SOFT || !process.env.GPU ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist'];
let browser = null; for (const o of [{}, { channel: 'chrome' }, { channel: 'msedge' }]) { try { browser = await pw.chromium.launch(Object.assign({ args: largs }, o)); break; } catch (e) {} }
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html?still=1&captions=0&w=480&h=270&samples=1&shadow=512`, { waitUntil: 'commit', timeout: 0 });
await page.waitForFunction(() => window.READY === true, null, { timeout: 0 });
const out = await page.evaluate(async () => {
  const W = window.RESP3_WORLD, c = window.RESP3.content, FPS = 30, D = window.DURATION, R = {};
  // ---- 1. percussion: picture
  const tipGap = (t) => { W.update(t); const a = W.EX.R.hand.world('middleTip'), b = W.EX.L.hand.world('middleMidBack'); return a.distanceTo(b); };   // the fingertip point to the point on the back of the middle bone
  R.strikes = [];
  for (const p of c.PERC) for (const s of p.strikes) {
    const f = Math.round(s * FPS);
    R.strikes.push({ site: p.side + p.lv, t: s, frame: f, onFrame: Math.abs(f / FPS - s) < 1e-6, gapAt: tipGap(f / FPS), gapBefore: tipGap((f - 1) / FPS), gapAfter2: tipGap((f + 2) / FPS) });
  }
  // ---- sound layers rendered offline from the same score
  const layer = async (name) => { window.SOUND_ISOLATE = name; const r = await window.SOUND.renderOffline((k) => window.RESP3.sound(k), D, 48000, { voiceover: false }); window.SOUND_ISOLATE = null; return r.inter; };
  const env = (inter, win = 0.005) => { const n = Math.round(48000 * win), out = new Float32Array(Math.floor(inter.length / 2 / n)); for (let i = 0; i < out.length; i++) { let s = 0; for (let j = 0; j < n; j++) { const k = (i * n + j) * 2; s += inter[k] * inter[k] + inter[k + 1] * inter[k + 1]; } out[i] = Math.sqrt(s / (2 * n)); } return out; };
  // percussion onsets: the first 5 ms window above 25% of that note's peak, searched around each strike
  const pe = env(await layer('perc'));
  for (const st of R.strikes) {
    const i0 = Math.round((st.t - 0.06) / 0.005), i1 = Math.round((st.t + 0.12) / 0.005);
    let pk = 0; for (let i = i0; i < i1; i++) pk = Math.max(pk, pe[i]);
    let on = -1; for (let i = i0; i < i1; i++) if (pe[i] > 0.25 * pk) { on = i; break; }
    st.soundOnset = on * 0.005; st.offsetMs = Math.round((on * 0.005 - st.t) * 1000);
  }
  // ---- 2. breath sounds
  const be = env(await layer('breath'), 0.02), dt = 0.02;
  const onSkin = (t) => [...c.AUS].some((a) => t >= a.on && t < a.off);
  let outside = 0, inside = 0; for (let i = 0; i < be.length; i++) { const t = (i + 0.5) * dt; if (onSkin(t)) inside = Math.max(inside, be[i]); else outside = Math.max(outside, be[i]); }
  R.breath = { maxOutsideContact: outside, maxInside: inside, breaths: [] };
  const breathB = (t) => W.breathAt(t).b;
  for (const a of c.AUS) {
    const br = c.BREATHS.find((b) => Math.abs(b.t0 - a.breath[0]) < 1e-6), te = br.t0 + (br.t1 - br.t0) * br.insp;
    const at = (t) => be[Math.floor(t / dt)];
    // the chest: rising during inspiration, highest at its end
    let bMaxT = br.t0, bMax = -9; for (let t = br.t0; t < br.t1; t += 0.01) { const v = breathB(t); if (v > bMax) { bMax = v; bMaxT = t; } }
    let eMaxT = br.t0, eMax = 0; for (let t = br.t0; t < br.t1; t += dt) if (at(t) > eMax) { eMax = at(t); eMaxT = t; }
    const q = [0.25, 0.5, 0.75].map((u) => at(br.t0 + (te - br.t0) * u));
    const expMid = at(te + (br.t1 - te) * 0.6), expEarly = at(te + 0.08);
    // the diaphragm on the skin through the whole breath (picture)
    W.update(br.t0); const p0 = W.steth.visible; W.update(br.t1 - 0.02); const p1 = W.steth.visible;
    R.breath.breaths.push({ site: a.side + a.lv, inspStart: br.t0, inspEnd: +te.toFixed(3), chestPeakT: +bMaxT.toFixed(2), soundPeakT: +eMaxT.toFixed(2), risesThroughInsp: q[0] < q[1] && q[1] < q[2], expirationQuieter: expEarly < eMax, fadedBy60pctOfExp: expMid < 0.15 * eMax, contactWholeBreath: a.on <= br.t0 && br.t1 <= a.off, chestPieceShown: p0 && p1 });
  }
  // ---- 3. first and last frame: the home shot, pixel for pixel (grain off for the comparison)
  const S = window.S, gl = S.renderer.getContext(), grab = (t) => { S.seek(t, 1); const px = new Uint8Array(S.W * S.H * 4); gl.readPixels(0, 0, S.W, S.H, gl.RGBA, gl.UNSIGNED_BYTE, px); return px; };
  const g = S.R.grain; S.R.grain = 0;
  const first = grab(0), last = grab((Math.round(D * FPS) - 1) / FPS), mid = grab(0.5), mid2 = grab(D - 0.5);
  S.R.grain = g;
  const diff = (a, b) => { let m = 0, n = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > m) m = d; if (d) n++; } return { maxDiff: m, pixelsDiffering: n }; };
  R.frames = { firstVsLast: diff(first, last), firstVsHoldStart: diff(first, mid), firstVsHoldEnd: diff(first, mid2) };
  return R;
});
await browser.close(); server.close();
fs.mkdirSync('preview', { recursive: true }); fs.writeFileSync('preview/check.json', JSON.stringify(out, null, 1));
const s = out.strikes;
console.log(`percussion: ${s.length} strikes; all on a frame: ${s.every((x) => x.onFrame)}; fingertip touching on the strike frame: ${s.every((x) => x.gapAt < 0.015)} (max gap ${Math.max(...s.map((x) => x.gapAt * 100)).toFixed(2)} mm); lifted the frame before: ${s.every((x) => x.gapBefore > 0.1)}; note onsets vs strike: ${Math.min(...s.map((x) => x.offsetMs))} to ${Math.max(...s.map((x) => x.offsetMs))} ms`);
const b = out.breath;
console.log(`breath: loudest outside chest-piece contact ${b.maxOutsideContact.toExponential(2)} (inside ${b.maxInside.toFixed(4)})`);
for (const x of b.breaths) console.log(`  ${x.site}: insp ${x.inspStart.toFixed(2)}-${x.inspEnd}  chest peak ${x.chestPeakT}  sound peak ${x.soundPeakT}  rises ${x.risesThroughInsp}  exp quieter ${x.expirationQuieter}  faded early ${x.fadedBy60pctOfExp}  on skin ${x.contactWholeBreath && x.chestPieceShown}`);
console.log('frames:', JSON.stringify(out.frames));
