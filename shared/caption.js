// shared/caption.js: the series caption plaque, drawn on the stage kit's 2D overlay.
// A cream rounded plaque (#f8eedb) with dark navy text (#26336b) in Fredoka, a soft shadow, fading in and out over
// 0.25 s, placed top, bottom or in a corner so it never covers the hands or the part being examined.
// Classic script, no dependencies. Defines window.CAPTION.
//   CAPTION.FONT_SPEC       the font to load before drawing ('600 56px "Fredoka"')
//   CAPTION.alpha(t, t0, t1) fade 0..1 for a caption shown from t0 to t1
//   CAPTION.draw(ctx, text, alpha, place, W, H)   place: 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br'
//   CAPTION.at(ctx, t, list, W, H)  draws whichever caption of list [{ t0, t1, text, place }] is on at time t
(function (root) {
  const CAPTION = (root.CAPTION = {});
  CAPTION.FONT_SPEC = '600 56px "Fredoka"';
  CAPTION.FADE = 0.25;
  CAPTION.PLAQUE = '#f8eedb';
  CAPTION.INK = '#26336b';
  CAPTION.alpha = (t, t0, t1) => Math.max(0, Math.min(1, (t - t0) / CAPTION.FADE, (t1 - t) / CAPTION.FADE));

  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur);
    return lines;
  }
  CAPTION.draw = (ctx, text, a, place, W, H) => {
    if (a <= 0 || !text) return;
    const k = W / 1920, fs = 56 * k, padX = 40 * k, padY = 22 * k, lh = fs * 1.22, margin = 54 * k;
    ctx.save();
    ctx.font = `600 ${fs}px "Fredoka", "Trebuchet MS", sans-serif`;
    const corner = place && place.length === 2;
    const maxW = (corner ? 860 : 1500) * k;
    const lines = wrap(ctx, text, maxW);
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const bw = tw + padX * 2, bh = lines.length * lh + padY * 2;
    let x = (W - bw) / 2, y = margin;
    if (place === 'bottom') y = H - margin - bh;
    if (place === 'tl') { x = margin; y = margin; } else if (place === 'tr') { x = W - margin - bw; y = margin; }
    else if (place === 'bl') { x = margin; y = H - margin - bh; } else if (place === 'br') { x = W - margin - bw; y = H - margin - bh; }
    const e = a * a * (3 - 2 * a);
    y += (1 - e) * 10 * k * (place && place[0] === 'b' ? 1 : -1);
    ctx.globalAlpha = e;
    ctx.shadowColor = 'rgba(8, 28, 30, 0.38)'; ctx.shadowBlur = 26 * k; ctx.shadowOffsetY = 7 * k;
    ctx.fillStyle = CAPTION.PLAQUE;
    const r = Math.min(30 * k, bh / 2);
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = CAPTION.INK; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, x + bw / 2, y + padY + lh * (i + 0.5) + fs * 0.03));
    ctx.restore();
  };
  CAPTION.at = (ctx, t, list, W, H) => {
    for (const c of list) if (t >= c.t0 && t <= c.t1) CAPTION.draw(ctx, c.text, CAPTION.alpha(t, c.t0, c.t1), c.place || 'top', W, H);
  };
})(typeof window !== 'undefined' ? window : globalThis);
