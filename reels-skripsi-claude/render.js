// Render scene.html to an MP4 reel (1080x1920, 30fps).
// Usage:
//   node render.js                     -> silent video with estimated timings
//   node render.js voice.mp3           -> timings auto-synced to the voice-over, audio muxed in
//   node render.js voice.mp3 --stills  -> only write preview PNGs
const { chromium } = require('playwright');
const { spawn, spawnSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const args = process.argv.slice(2);
const audio = args.find(a => !a.startsWith('--'));
const stillsOnly = args.includes('--stills');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

// Split the voice-over into 7 narration segments using the 6 longest pauses.
function timingFromAudio(file) {
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-']).stderr.toString();
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const gaps = starts.map((s, i) => ({ s, e: ends[i] ?? dur })).filter(g => g.s > 0.5 && g.e < dur - 0.5);
  const cuts = gaps.sort((a, b) => (b.e - b.s) - (a.e - a.s)).slice(0, 6).sort((a, b) => a.s - b.s);
  if (cuts.length < 6) throw new Error(`Only found ${cuts.length} paragraph pauses in the voice-over`);
  const b = [0, ...cuts.map(g => (g.s + g.e) / 2), dur + 0.4];
  const segs = b.slice(0, 7).map((s, i) => [+s.toFixed(3), +b[i + 1].toFixed(3)]);
  return { segs, total: +(dur + 1.0).toFixed(3) };
}

(async () => {
  const timing = audio ? timingFromAudio(audio) : null;
  if (timing) console.log('Synced timing:', JSON.stringify(timing));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  if (timing) await page.addInitScript(t => { window.TIMING = t; }, timing);
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => window.TOTAL);

  if (stillsOnly) {
    const segs = await page.evaluate(() => window.SEGS);
    const pts = segs.map(([a, b], i) => i === 0 ? a + 1.8 : a + (b - a) * 0.8);
    for (let i = 0; i < pts.length; i++) {
      await page.evaluate(t => renderAt(t), pts[i]);
      await page.screenshot({ path: path.join(outDir, `still_${i}.png`) });
    }
    await browser.close();
    return;
  }

  const outFile = path.join(outDir, audio ? 'reels-skripsi-claude.mp4' : 'reels-skripsi-claude-silent.mp4');
  const ff = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
  if (audio) ff.push('-i', audio);
  ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-r', String(FPS));
  if (audio) ff.push('-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-shortest');
  ff.push('-movflags', '+faststart', outFile);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'inherit'] });

  const n = Math.ceil(total * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${n}`);
  }
  enc.stdin.end();
  await new Promise(r => enc.on('close', r));
  await browser.close();
  console.log('Wrote', outFile);
})();
