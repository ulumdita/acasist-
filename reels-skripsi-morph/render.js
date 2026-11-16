// Render the morph reel: frames from scene.html (headless Chromium) + synthesised score.
//   node render.js                 -> music + SFX only, estimated timings
//   node render.js voice.mp3       -> timings synced to the voice-over; voice mixed over the score (ducked)
//   node render.js [voice] --stills  -> key-frame PNGs (incl. every morph midpoint) + contact sheet
const { chromium } = require('playwright');
const { spawn, spawnSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const args = process.argv.slice(2);
const voice = args.find(a => !a.startsWith('--'));
const stillsOnly = args.includes('--stills');
const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

function timingFromAudio(file) {
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-']).stderr.toString();
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  const gaps = starts.map((s, i) => ({ s, e: ends[i] ?? dur })).filter(g => g.s > 0.5 && g.e < dur - 0.5);
  const cuts = gaps.sort((a, b) => (b.e - b.s) - (a.e - a.s)).slice(0, 6).sort((a, b) => a.s - b.s);
  if (cuts.length < 6) throw new Error(`Only found ${cuts.length} paragraph pauses in the voice-over`);
  const b = [0, ...cuts.map(g => (g.s + g.e) / 2), dur + 0.4];
  return { segs: b.slice(0, 7).map((s, i) => [+s.toFixed(3), +b[i + 1].toFixed(3)]), total: +(dur + 1.2).toFixed(3) };
}

(async () => {
  const timing = voice ? timingFromAudio(voice) : null;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  if (timing) await page.addInitScript(t => { window.TIMING = t; }, timing);
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => document.fonts.ready);
  const { total, cues, segs } = await page.evaluate(() => ({ total: window.TOTAL, cues: window.CUES, segs: window.SEGS }));
  fs.writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify({ total, segs, cues }, null, 1));

  if (stillsOnly) {
    const pts = [];
    cues.forEach(c => { pts.push((c.start + c.land) / 2); pts.push(c.land + 1.6); });
    pts.push(total - 0.5);
    const files = [];
    for (let i = 0; i < pts.length; i++) {
      await page.evaluate(t => renderAt(t), pts[i]);
      const f = path.join(outDir, `still_${String(i).padStart(2, '0')}.png`);
      await page.screenshot({ path: f });
      files.push(f);
    }
    await browser.close();
    const cols = 6, inputs = files.flatMap(f => ['-i', f]);
    const fc = files.map((_, i) => `[${i}]scale=270:480[v${i}]`).join(';') + ';' +
      files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=` +
      files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join('|') + `:fill=black`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, path.join(outDir, 'keyframes.png')]);
    files.forEach(f => fs.unlinkSync(f));
    console.log('Wrote', path.join(outDir, 'keyframes.png'));
    return;
  }

  // 1) score
  const score = path.join(outDir, 'score.wav');
  execFileSync('python3', [path.join(__dirname, 'audio.py'), path.join(outDir, 'cues.json'), score], { stdio: 'inherit' });

  // 2) frames -> silent video
  const silent = path.join(outDir, '_video.mp4');
  const enc = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '17', '-r', String(FPS), silent], { stdio: ['pipe', 'ignore', 'inherit'] });
  const n = Math.round(total * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${n}`);
  }
  enc.stdin.end();
  await new Promise(r => enc.on('close', r));
  await browser.close();

  // 3) mix (+ duck score under voice), then two-pass loudnorm to -14 LUFS / -1 dBTP
  const out = path.join(outDir, voice ? 'reels-skripsi-morph.mp4' : 'reels-skripsi-morph-musik.mp4');
  const mixWav = path.join(outDir, '_mix.wav');
  const inputs = ['-i', score];
  let filter = '[0:a]anull[a]';
  if (voice) {
    inputs.push('-i', voice);
    filter = '[1:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[v1][v2];' +
      '[0:a]volume=0.55[m];[m][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];' +
      '[md][v2]amix=inputs=2:normalize=0[a]';
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[a]', '-t', String(total), '-ar', '48000', mixWav]);
  // master: measure integrated loudness, apply make-up gain + peak limiter, twice (converges to -14 LUFS, <= -1 dBTP)
  let cur = mixWav;
  for (let pass = 1; pass <= 2; pass++) {
    const log = spawnSync('ffmpeg', ['-hide_banner', '-i', cur, '-af', 'ebur128', '-f', 'null', '-']).stderr.toString();
    const I = parseFloat(log.match(/\n\s+I:\s+(-?[\d.]+) LUFS/)[1]);
    const next = path.join(outDir, `_master${pass}.wav`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', cur, '-af',
      `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.7:level=false:attack=0.5:release=60:asc=1`, next]);
    if (cur !== mixWav) fs.unlinkSync(cur);
    cur = next;
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', cur, '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(total), '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.unlinkSync(cur);
  fs.unlinkSync(mixWav);
  fs.unlinkSync(silent);
  console.log('Wrote', out);
})();
