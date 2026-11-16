// Render stills of the page in headless Chromium (software WebGL here; GPU on a PC).
//   node tools/shot.mjs jobs.json outDir [w h samples]
// jobs.json: [{ "name": "b1", "t": 3.2, "samples": 16, "js": "window.CAM_OVERRIDE = ..." }, ...]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../server.mjs';

const require = createRequire(import.meta.url);
let chromium; for (const m of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(m)); break; } catch (e) {} }
const [jobsFile, outDir, w = '1280', h = '720', samples = '16'] = process.argv.slice(2);
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(0), port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[')) console.log('page:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/index.html?still=1&w=${w}&h=${h}&samples=${samples}`, { waitUntil: 'commit', timeout: 0 });
await page.waitForFunction(() => window.READY === true, null, { timeout: 0 });
if (fs.existsSync(new URL('../storyboard/panels.js', import.meta.url))) await page.addScriptTag({ url: `http://127.0.0.1:${port}/storyboard/panels.js` });
console.log('built in', ((Date.now() - t0) / 1000).toFixed(1), 's');
for (const j of jobs) {
  const t1 = Date.now();
  const res = await page.evaluate(async (j) => {
    window.CAM_OVERRIDE = null; window.REVIEW = null;
    let t = j.t;
    if (j.js) { const r = eval(j.js); if (r && r.then) await r; }
    if (j.panel) t = window.panel(j.panel);
    if (window.__T && !j.panel && j.t === 0) t = window.__T;
    window.seek(t, j.samples);
    const out = { url: document.getElementById('c').toDataURL('image/png') };
    if (window.REVIEW_REPORT) { out.report = window.REVIEW_REPORT; window.REVIEW_REPORT = null; }
    window.REVIEW = null; window.CAM_OVERRIDE = null;
    return out;
  }, j);
  fs.writeFileSync(path.join(outDir, j.name + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
  if (res.report) fs.writeFileSync(path.join(outDir, j.name + '.json'), JSON.stringify(res.report, null, 1));
  console.log(j.name, ((Date.now() - t1) / 1000).toFixed(1), 's');
}
await browser.close(); server.close();
