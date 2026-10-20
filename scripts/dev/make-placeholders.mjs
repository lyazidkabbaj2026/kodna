// Generates demo media so the template can be built and previewed before the real kit arrives.
// Usage: node scripts/dev/make-placeholders.mjs   (needs ffmpeg). Never run it over real client media.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../..');
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

for (const file of fs.readdirSync(path.join(root, 'data')).filter((f) => f.endsWith('.json') && f !== 'schema.json' && f !== 'links.json')) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));
  if (!data.placeholder) continue;
  const dir = path.join(root, 'media', data.client.slug);
  const { primary, secondary = '#333333' } = data.client.colors;
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="${primary}"/><text x="120" y="142" font-family="DejaVu Sans, sans-serif" font-size="64" font-weight="700" text-anchor="middle" fill="#fff">${data.client.name.split(' ').map((w) => w[0]).join('')}</text></svg>`;
  for (const rel of [data.client.logo, ...(data.gift?.files ?? []).map((f) => (typeof f === 'string' ? f : f.path))]) {
    if (!rel) continue;
    const out = path.join(dir, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (out.endsWith('.svg')) fs.writeFileSync(out, logoSvg);
    else await sharp(Buffer.from(logoSvg)).resize(1200, 1200).png().toFile(out);
  }
  for (const c of data.concepts) {
    for (const [i, s] of c.shots.entries()) {
      const out = path.join(dir, s.image);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="540" height="960" fill="url(#g)"/><text x="270" y="470" font-family="DejaVu Sans" font-size="120" font-weight="700" text-anchor="middle" fill="#fff" opacity=".9">${c.letter}${i + 1}</text><text x="270" y="540" font-family="DejaVu Sans" font-size="28" text-anchor="middle" fill="#fff" opacity=".7">PLAN DÉMO</text></svg>`;
      await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(out);
    }
    const video = path.join(dir, c.video);
    if (fs.existsSync(video)) continue;
    const dur = String(c.durationSec ?? 20);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', `testsrc2=size=1080x1920:rate=30:duration=${dur}`,
      '-f', 'lavfi', '-i', `sine=frequency=${c.letter === 'A' ? 440 : 523}:duration=${dur}`,
      '-vf', `drawtext=fontfile=${font}:text='APERÇU · KODNA':fontcolor=white@0.8:fontsize=72:x=(w-tw)/2:y=h*0.8:box=1:boxcolor=black@0.4:boxborderw=20,drawtext=fontfile=${font}:text='CONCEPT ${c.letter} (DÉMO)':fontcolor=white:fontsize=90:x=(w-tw)/2:y=h*0.12`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', video]);
  }
  console.log(`placeholders: ${data.client.slug}`);
}
