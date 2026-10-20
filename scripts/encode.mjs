// Re-encodes each client's concept videos for the web and grabs a poster frame.
//   media/<slug>/<video>.mp4  ->  encoded/<slug>/<video>.mp4 + <video>.poster.webp
// H.264 High, 720x1280, CRF 26, +faststart, AAC 128k. If the CRF pass is over the
// size budget, it re-encodes at the bitrate that fits. Needs ffmpeg/ffprobe on PATH.
// Usage: npm run encode [-- <slug> ...] [-- --force]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadClients, ROOT } from './lib/clients.mjs';

const MAX_BYTES = 4 * 1024 * 1024;
const AUDIO_KBPS = 128;
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

const ffmpeg = (a) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...a], { stdio: 'inherit' });
const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

// Fit inside 720x1280 and pad to exact 9:16, so every player box matches.
const VF = 'scale=720:1280:force_original_aspect_ratio=decrease:flags=lanczos,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p';
const common = (src) => ['-i', src, '-vf', VF, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-ac', '2'];

for (const { data } of loadClients({ validate: false })) {
  const slug = data.client.slug;
  if (only.length && !only.includes(slug)) continue;
  const outDir = path.join(ROOT, 'encoded', slug);
  fs.mkdirSync(outDir, { recursive: true });

  for (const c of data.concepts) {
    const src = path.join(ROOT, 'media', slug, c.video);
    const base = path.basename(c.video, path.extname(c.video));
    const out = path.join(outDir, `${base}.mp4`);
    const poster = path.join(outDir, `${base}.poster.webp`);
    if (!fs.existsSync(src)) {
      if (fs.existsSync(out)) continue; // raw file not on this machine, encoded copy already committed
      throw new Error(`${slug}: missing source video media/${slug}/${c.video}`);
    }
    const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs;
    if (fresh && !force) {
      console.log(`= ${slug}/${base}.mp4 (up to date)`);
      continue;
    }

    ffmpeg([...common(src), '-crf', '26', out]);
    let size = fs.statSync(out).size;
    if (size > MAX_BYTES) {
      // 95% of the budget, minus audio, spread over the duration.
      const secs = duration(src);
      const kbps = Math.max(300, Math.floor((MAX_BYTES * 0.95 * 8) / 1000 / secs - AUDIO_KBPS));
      ffmpeg([...common(src), '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.5)}k`, '-bufsize', `${kbps * 2}k`, out]);
      size = fs.statSync(out).size;
    }
    ffmpeg(['-ss', '0.3', '-i', out, '-frames:v', '1', '-vf', 'scale=720:-2', '-c:v', 'libwebp', '-quality', '72', poster]);
    const mb = (size / 1024 / 1024).toFixed(2);
    console.log(`${size > MAX_BYTES ? '!' : '✓'} ${slug}/${base}.mp4  ${mb} MB${size > MAX_BYTES ? '  (over 4 MB budget)' : ''}`);
  }
}
