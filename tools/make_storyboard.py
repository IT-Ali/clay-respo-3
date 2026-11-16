#!/usr/bin/env python3
"""Build storyboard/index.html from the rendered stills (storyboard/img/*.png -> .jpg) and their gap reports (.json)."""
import json, os, html
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'storyboard', 'img')

def jpg(name):
    src = os.path.join(IMG, name + '.png')
    dst = os.path.join(IMG, name + '.jpg')
    if os.path.exists(src) and (not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)):
        Image.open(src).convert('RGB').save(dst, quality=86, optimize=True, progressive=True)
    return 'img/' + name + '.jpg'

def report(name):
    p = os.path.join(IMG, name + '.json')
    return json.load(open(p)) if os.path.exists(p) else []

def gaps(name):
    rows = report(name)
    if not rows: return ''
    li = []
    for r in rows:
        if 'gap_mm' in r:
            g = r['gap_mm']
            state = 'ok' if 0 <= g <= 1.5 else ('lift' if g > 1.5 else 'bad')
            li.append(f'<li class="g {state}"><span>{html.escape(r["part"])}</span><b>{g:.1f} mm</b></li>')
        elif 'cm' in r:
            li.append(f'<li class="g ok"><span>{html.escape(r["part"])}</span><b>{r["cm"]:.1f} cm</b></li>')
    return '<ul class="gaps">' + ''.join(li) + '</ul>'

E = html.escape

REVIEW = [
    ('a', 'Sitting forward, arms folded', [
        ('sitSide', 'From his right side: upright and off the backrest, arms folded across the chest, the sheet over his lap from the waist down, trousers up at the waist. The backrest stays at 45°.'),
        ('sitBack', 'From behind: the shoulder blades have slid out to the sides (medial borders marked). His right hand rests on his left arm.'),
    ]),
    ('b', 'Back landmarks', [
        ('landmarks', 'Computed on his own back with the arms folded: spinous processes C7 to L1, both scapular spines (solid) and outlines (dashed) with the inferior angles at the 7th rib, the 10th rib (lung bases), the 5 levels on each side (orange = his right, blue = his left, the same height on both sides) and the 3 fremitus zones (rings: upper = level 1, middle = level 3, lower = level 5).'),
    ]),
    ('c', 'Hand poses and skin-level checks', [
        ('expHands', 'Expansion, breathed out: palms flat on the lower ribs, fingers round his sides, thumbs meeting at the spine at the 10th rib.'),
        ('expSkin', 'Skin level: both thumbs hover free, just off the skin (they never touch).'),
        ('tvf', 'Tactile vocal fremitus, upper zone, right: the flat palm on his upper back, fingers up and over the top of the shoulder.'),
        ('tvfL', 'The same place on the left, the same (right) hand.'),
        ('tvfLow', 'Lower zone, right: palm flat, fingers together up his back.'),
        ('tvfSkin', 'Skin level: the palm on the skin.'),
        ('perc', 'Percussion, strike frame, level 1 right: only the left middle finger lies on the skin along the rib space; the index, ring and little fingers are lifted off.'),
        ('percSkin', 'Skin level: the tip of the right middle finger on the middle bone of the left middle finger.'),
        ('steth', 'Auscultation, level 1 right: the diaphragm pressed firmly, the hand coming from below so the chest piece stays in view; the tubing runs up out of frame.'),
        ('stethSkin', 'Skin level: the skin presses flush against the whole rim of the diaphragm (gap 0).'),
    ]),
    ('d', 'Expansion: breathed out and breathed in', [
        ('expOut', 'Breathed out fully: the thumb tips almost meet at the spine.'),
        ('expIn', 'Deep breath in, the same camera: each thumb has moved about 2.5 cm out, 5 cm in total.'),
    ]),
    ('e', 'Plan view', [
        ('plan', 'From above, head at screen left as in the series: his right (the examiner\'s side) at the bottom, his left at the top with the bedside table near his head, and the back camera behind his right shoulder.'),
    ]),
]

BEATS = [
    dict(n='Start', name='Home shot', t='0.0 – 1.0 s', imgs=['home'], text='(no caption)',
         change='The series home shot: reclined at 45°, sheet from the waist down, gloved hands resting at his right side. Held still; breathing and lamp flicker off.',
         cam='SET.HOME, still.', snd='Room ambience fades in over the first 0.5 s.'),
    dict(n='1', name='Sitting forward', t='1.0 – 7.0 s (hold 1.0 – 2.5 s)', imgs=['b1', 'b1b'],
         text='4.7 – 7.0 s, top: "Sit forward, arms folded: the shoulder blades move out of the way"',
         change='Hold: picture still, no caption (speech goes here). 2.5 – 4.4 s he leans forward off the backrest, 3.4 – 5.0 s he folds his arms across his chest; the shoulder blades slide out to the sides. The sheet re-drapes round his waist and lap, the trousers stay up. The bed does not move.',
         cam='Holds the home shot through the hold, then one continuous dolly round to behind his right shoulder, above, looking down onto his back (2.5 – 6.2 s).',
         snd='Mattress creak and sheet rustle as he sits up (2.5 s), a soft camera whoosh (2.7 s).'),
    dict(n='2', name='Inspection of the back', t='7.0 – 12.0 s', imgs=['b2'],
         text='7.5 – 11.9 s, top: "Straight spine, no scars, symmetrical"',
         change='He breathes quietly (16 a minute, mouth closed, chest and upper abdomen together). Nothing else moves.',
         cam='Passes over his back: whole back, up toward the shoulders, down toward the lower ribs, back to the whole back.',
         snd='Room ambience, a soft whoosh (8.6 s).'),
    dict(n='3', name='Expansion at the back', t='12.0 – 22.0 s', imgs=['b3'],
         text='15.6 – 21.8 s, top: "Thumbs move apart equally, 5 cm - normal expansion"',
         change='12.2 – 13.4 s both hands travel relaxed onto the lower back ribs, thumbs at the spine at the 10th rib, hovering 4 mm off the skin. 13.6 – 15.4 s he breathes out fully; 15.4 – 18.2 s deep breath in: the thumbs move apart 2.5 cm each (5 cm); 18.2 – 20.4 s out again, the thumbs come back together. 20.6 – 21.6 s hands back to rest. (The white 5 cm arrow is storyboard only.)',
         cam='Moves in a little, centred on his lower back, held through the breath.',
         snd='Two soft glove squishes as the hands land (13.4 s). No breath sounds (no stethoscope on the skin).'),
    dict(n='4', name='Tactile vocal fremitus', t='22.0 – 32.0 s (hold 22.0 – 23.5 s)', imgs=['b4'],
         text="24.0 – 31.9 s, top: \"Tactile vocal fremitus ('44'): equal on both sides\"",
         change='Hold: still, no caption (he is asked to say "44"). Then the flat palm of the right hand rests on: upper right 23.9, upper left 25.3, middle right 26.7, middle left 28.1, lower right 29.5, lower left 30.9 s (about 0.95 s each). At each he says "44": jaw and lips move, no sound.',
         cam='The back shot, still.',
         snd='A soft squish as the palm lands at each site. Silence for "44" (added later).'),
    dict(n='5', name='Percussion', t='32.0 – 48.0 s', imgs=['b5'],
         text='33.4 – 47.6 s, top: "Resonant and equal at all 5 levels, right vs left"',
         change='Left middle finger along the rib space, the other fingers lifted; the right middle fingertip strikes its middle bone twice from a loose wrist and lifts straight off. Levels 1 to 5, right then left at each level: R1 33.5, L1 34.9, R2 36.3, L2 37.8, R3 39.2, L3 40.6, R4 42.1, L4 43.5, R5 44.9, L5 46.3 s. (Frame shown: level 3 left, strike frame.)',
         cam='The back shot, still.',
         snd='A resonant note (low, hollow, ringing a little) on the exact frame of each of the 20 strikes; identical right and left.'),
    dict(n='6', name='Auscultation', t='48.0 – 72.0 s (hold 48.0 – 49.5 s)', imgs=['b6', 'b6b', 'b6c'],
         text='50.8 – 56.5 s: "Same sites: compare right with left" · 56.8 – 66.7 s: "Vesicular, good and equal air entry down to the bases" · 67.0 – 71.8 s: "No wheeze, no crackles, no pleural rub" (all top)',
         change='Hold: still, no caption (he is asked to breathe deeply through his open mouth). The chest piece pops into the right hand (49.8 s). Diaphragm pressed firmly at level 1 right (50.6 – 56.0 s) and left (56.6 – 62.0 s), one full deep breath at each, lips apart. Then quicker, time sped up (the small clay clock on the bedside table races): levels 2 to 5, right then left, one short breath at each (about 1.2 s per site), ending at the bases.',
         cam='The back shot, still.',
         snd='Vesicular breath sound only while the diaphragm is on the skin, from the same breathing schedule: grows through inspiration, fades early in expiration, no gap. Equal both sides. A soft tock as the chest piece lands; clock ticks during the quick run.'),
    dict(n='7', name='Vocal resonance', t='72.0 – 81.0 s', imgs=['b7'],
         text="72.5 – 80.7 s, top: \"Vocal resonance ('44'): normal and equal on both sides\"",
         change='The diaphragm at the upper, middle and lower zones, right then left (72.4, 73.9, 75.3, 76.7, 78.1, 79.5 s); he says "44" at each (jaw and lips move, no sound).',
         cam='The back shot, still.',
         snd='A soft tock as the chest piece lands. No breath sound while he speaks, no sound for "44".'),
    dict(n='8', name='Lying back', t='81.0 – 87.0 s (last 1 s locked)', imgs=['b8', 'end'],
         text='(no caption)',
         change='81.0 – 81.4 s the stethoscope goes; 81.2 – 82.6 s he unfolds his arms; 81.6 – 83.6 s he leans back onto the 45° backrest, arms back at rest; 81.4 – 82.8 s the examiner\'s hands return to rest at his right side. From 84.0 s the home shot holds 3 s; 86.0 – 87.0 s is exactly the home frame (breathing and flicker off).',
         cam='Pulls back over his right side to the home shot (81.0 – 84.0 s), then still.',
         snd='Small pop as the stethoscope goes, mattress creak, a long soft whoosh; the ambience fades out over the last 0.5 s.'),
]

ASSUME = [
    'Length 87 s (about 90 s as asked): start 1 s, beats of 6, 5, 10, 10, 16, 24, 9 and 6 s.',
    'His back: vertebral levels 2.35 cm apart, C7 at the base of the neck, T7 (inferior angles) 14 cm below C7, T10 21 cm below C7. The 10th rib slopes down 1.7 cm per 10 cm out from the spine.',
    'The 5 levels (distance from the midline / height): 1) 7.4 cm, 3.1 cm below C7 (above the scapular spine, medial to the superior angle); 2) and 3) 4.8 cm, between the scapula and the spine; 4) 10 cm, 2.5 cm below the inferior angle; 5) 10 cm, just above the 10th rib.',
    'With the arms folded the medial border of each shoulder blade moves from 6.2 cm to 9.8 cm from the midline (and the inferior angle further out).',
    'Expansion: the thumbs hover 4 mm off the skin. Breathed out the tips are 1.1 cm apart; at the top of the deep breath 6.1 cm (5 cm more, 2.5 cm each).',
    'Quiet breathing 16 a minute. Deep breaths at level 1 last 4.9 s each (about 12 a minute; I can slow them to 10 a minute, which adds about 2 s). Levels 2 to 5 use one short breath each (0.85 s) shown as sped-up time with the clay clock (about 45 s of real time in 9.6 s).',
    'Fremitus uses the examiner\'s right hand on both sides (moved right to left, as written). Percussion uses the left middle finger as the pleximeter (fingers pointing to his right, along the rib space) and the right middle finger to strike, two strikes per site.',
    'Gaps: palms and fingers 0.2 – 0.6 mm; the diaphragm is pressed in until the skin lies flush with its whole rim (about 1 – 3 mm deep at the centre: "pressed firmly").',
    '"44": the jaw and lips move, but from behind his face is mostly hidden. I can add a short cutaway of his face if you want the lips visible.',
    'No breath sound during vocal resonance (he is speaking, the voice is added later).',
    'The chest piece pops into the hand in stop-motion (no pick-up from a surface); the tubing runs up out of frame.',
    'Captions are all at the top (they cover only the back of his head; never the hands or the sites).',
    'Built in my own code, shared/ untouched: the sitting pose, a second drape of the shared sheet for sitting, a pyjama seat shown only when he sits up, a finer copy of his trunk mesh while sitting (same shape; avoids stripe artifacts on the new spine relief), rounded elbows inside the sleeves while sitting. The home shot uses only the shared models, so it matches parts 1 and 2.',
    'This machine has no GPU: the stills are software WebGL at 10 – 16 samples (a little noise and soft shadow banding is expected). The final MP4s render on your PC with npm start (next round).',
]

def fig(name, cap, cls=''):
    return (f'<figure class="{cls}"><img src="{jpg(name)}" alt="{E(cap)}" width="1280" height="720" loading="lazy">'
            f'<figcaption><p>{E(cap)}</p>{gaps(name)}</figcaption></figure>')

parts = []
for letter, title, figs in REVIEW:
    parts.append(f'<section class="rev"><h3><span class="tag">{letter}</span>{E(title)}</h3><div class="figs n{min(len(figs), 2)}">' + ''.join(fig(n, c) for n, c in figs) + '</div></section>')
review_html = ''.join(parts)

beat_html = []
for b in BEATS:
    imgs = ''.join(f'<img src="{jpg(n)}" alt="Beat {E(b["n"])} key frame" width="1280" height="720" loading="lazy">' for n in b['imgs'])
    beat_html.append(f'''<article class="beat"><div class="shots k{len(b['imgs'])}">{imgs}</div>
<div class="info"><header><span class="num">{E(b['n'])}</span><h3>{E(b['name'])}</h3><span class="time">{E(b['t'])}</span></header>
<dl><dt>On screen</dt><dd>{E(b['text'])}</dd><dt>What changes</dt><dd>{E(b['change'])}</dd><dt>Camera</dt><dd>{E(b['cam'])}</dd><dt>Sound</dt><dd>{E(b['snd'])}</dd></dl></div></article>''')

page = f'''<title>Back of the Chest Storyboard</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* layout: one reading column; review panels in a two-up grid, beats as image + notes rows */
:root {{
  --bg: #eef3f2; --panel: #ffffff; --fg: #1f2c4d; --muted: #5a6b74; --line: #d3dfdd; --accent: #12808a; --mark: #c9861a; --ok: #2f8f5b; --bad: #c2412d;
  --display: "Fredoka", "Trebuchet MS", system-ui, sans-serif; --body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; --mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #0c2426; --panel: #12333600; --fg: #e8efe9; --muted: #9db3b3; --line: #24494c; --accent: #57c3ca; --mark: #f2b33d; --ok: #6ccf97; --bad: #ff8a73; color-scheme: dark; }} }}
:root[data-theme="dark"] {{ --bg: #0c2426; --panel: #12333600; --fg: #e8efe9; --muted: #9db3b3; --line: #24494c; --accent: #57c3ca; --mark: #f2b33d; --ok: #6ccf97; --bad: #ff8a73; color-scheme: dark; }}
body {{ background: var(--bg); color: var(--fg); font: 15px/1.55 var(--body); }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 40px; }}
h1, h2, h3 {{ font-family: var(--display); font-weight: 600; text-wrap: balance; margin: 0; }}
h1 {{ font-size: clamp(28px, 4vw, 40px); line-height: 1.1; }}
h2 {{ font-size: 24px; display: flex; align-items: baseline; gap: 12px; }}
h2 small {{ font: 500 13px var(--body); color: var(--muted); letter-spacing: 0.04em; text-transform: uppercase; }}
.lede {{ max-width: 70ch; color: var(--muted); margin: 10px 0 0; }}
.chips {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }}
.chips span {{ font: 500 13px var(--mono); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; }}
section > .intro {{ color: var(--muted); max-width: 72ch; margin: 6px 0 18px; }}
.rev {{ display: grid; gap: 12px; padding-top: 6px; }}
.rev h3 {{ font-size: 19px; display: flex; gap: 10px; align-items: center; }}
.tag {{ font: 600 14px var(--mono); color: var(--bg); background: var(--accent); border-radius: 6px; padding: 1px 8px; }}
.figs {{ display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }}
.figs.n1 {{ grid-template-columns: minmax(0, 1fr); max-width: 860px; }}
figure {{ margin: 0; display: grid; gap: 8px; align-content: start; min-width: 0; }}
figure img, .shots img {{ width: 100%; height: auto; aspect-ratio: 16 / 9; border-radius: 10px; display: block; background: #0d3a3d; }}
figcaption p {{ margin: 0; font-size: 14px; }}
.gaps {{ list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }}
.gaps li {{ font: 500 12px var(--mono); border-radius: 6px; padding: 2px 8px; border: 1px solid var(--line); display: flex; gap: 8px; }}
.gaps li b {{ font-weight: 500; font-variant-numeric: tabular-nums; }}
.gaps li.ok b {{ color: var(--ok); }} .gaps li.lift b {{ color: var(--mark); }} .gaps li.bad b {{ color: var(--bad); }}
.beats {{ display: grid; gap: 28px; }}
.beat {{ display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 20px; padding-top: 22px; border-top: 1px solid var(--line); }}
.shots {{ display: grid; gap: 8px; }}
.shots.k3 {{ grid-template-columns: 1fr 1fr; }} .shots.k3 img:first-child {{ grid-column: 1 / -1; }}
.info header {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 12px; margin-bottom: 10px; }}
.num {{ font: 600 22px var(--display); color: var(--accent); min-width: 1.4em; }}
.info h3 {{ font-size: 22px; }}
.time {{ font: 500 13px var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; flex-basis: 100%; }}
dl {{ margin: 0; display: grid; grid-template-columns: 7.5em minmax(0, 1fr); gap: 8px 14px; }}
dt {{ font: 600 11px var(--body); text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); padding-top: 3px; }}
dd {{ margin: 0; font-size: 14px; }}
ol.assume {{ margin: 0; padding-left: 22px; display: grid; gap: 8px; max-width: 80ch; }}
.checks {{ display: grid; gap: 6px; max-width: 80ch; margin: 0; padding-left: 20px; }}
@media (max-width: 760px) {{ .figs, .beat {{ grid-template-columns: minmax(0, 1fr); }} dl {{ grid-template-columns: minmax(0, 1fr); }} dt {{ padding-top: 0; }} }}
</style>
<div class="wrap">
<header>
<h1>Respiratory exam, part 3: the back of the chest</h1>
<p class="lede">Soft Clay storyboard for review. The review panels come first, then one key frame (or a few) per beat with its timing, exact caption, motion, camera and sound. Every still is rendered from the real scene (the series patient, bed, hands and set from shared/, loaded unchanged), captioned version.</p>
<div class="chips"><span>87 s</span><span>8 beats</span><span>1920×1080 · 30 fps</span><span>poses on twos</span><span>captions on</span><span>stills: software WebGL, 10–16 samples</span></div>
</header>
<section><h2>Review panels <small>before beat 1 · never in the video</small></h2>
<p class="intro">Coloured chips under a panel are gaps measured on the real mesh: a ray from the closest point of each touching part to his skin along the skin normal. Green is within the 1.5 mm rule; amber marks parts that are meant to be lifted or hovering.</p>
{review_html}
</section>
<section><h2>Beats <small>captioned version</small></h2>
<div class="beats">{''.join(beat_html)}</div>
</section>
<section><h2>What I checked in every panel</h2>
<ul class="checks">
<li>Hand contact rules: each named part touches with a gap under 1.5 mm, nothing sinks in; no upright or waving hands, no V; fingers together except the lifted pleximeter fingers; hands travel relaxed between contacts.</li>
<li>Every site is off the shoulder blades and the spine, at the same height on both sides (panel b).</li>
<li>Percussion: only the left middle finger touches the skin; expansion: the thumbs hover free.</li>
<li>Arms folded and the shoulder blades moved out (panels a, b).</li>
<li>Right and left against the screen: seen from behind, his right is on the viewer's right (all back panels); plan view (e).</li>
<li>His neck stays the series' slim neck; no text in the scene apart from the captions (the review labels are storyboard only).</li>
<li>The last frame matches the first: both are the shared home shot with breathing and flicker off.</li>
</ul>
</section>
<section><h2>Facts and numbers I assumed</h2>
<ol class="assume">{''.join('<li>' + E(a) + '</li>' for a in ASSUME)}</ol>
</section>
</div>
'''
open(os.path.join(ROOT, 'storyboard', 'index.html'), 'w').write(page)
print('wrote storyboard/index.html')
