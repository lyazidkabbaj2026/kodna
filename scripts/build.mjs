// Static build: data/<slug>.json + media/<slug>/ + encoded/<slug>/  ->  dist/p/<slug>-<token>/index.html
// Media is content-hashed into /a (images), /v (videos), /f (fonts): no file names in the UI.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import * as esbuild from 'esbuild';
import { loadClients, linkTokens, mediaPath, DataError, ROOT } from './lib/clients.mjs';
import { renderProposal, render404 } from './lib/render.mjs';
import { makeOgImage } from './lib/og.mjs';

const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache');
const SITE_URL = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '');
const uiFor = (lang) => {
  const file = path.join(ROOT, `src/ui.${lang}.json`);
  if (!fs.existsSync(file)) throw new Error(`No UI strings for language "${lang}" (src/ui.${lang}.json)`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

let clients;
try {
  clients = loadClients();
} catch (e) {
  if (e instanceof DataError) {
    console.error(`✗ Invalid client data:\n${e.message}`);
    process.exit(1);
  }
  throw e;
}
const tokens = linkTokens(clients.map((c) => c.data.client.slug));

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
function emit(buf, ext, dir = 'a') {
  const name = `${hash(buf)}.${ext}`;
  fs.mkdirSync(path.join(DIST, dir), { recursive: true });
  fs.writeFileSync(path.join(DIST, dir, name), buf);
  return `/${dir}/${name}`;
}

/** Raster -> WebP at the given widths (cached by content). SVG is passed through. */
async function image(file, widths) {
  const src = fs.readFileSync(file);
  if (file.endsWith('.svg')) {
    const text = src.toString('utf8');
    if (/<script|on\w+\s*=/i.test(text)) throw new Error(`${file}: SVG with scripts is not allowed`);
    const vb = text.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
    return { src: emit(src, 'svg'), srcset: '', w: vb ? Number(vb[1]) : 1, h: vb ? Number(vb[2]) : 1 };
  }
  const meta = await sharp(src).metadata();
  const out = [];
  for (const w of widths.filter((w, i) => i === 0 || w <= meta.width)) {
    const key = path.join(CACHE, `${hash(src)}-${w}.webp`);
    if (!fs.existsSync(key)) await sharp(src).rotate().resize({ width: Math.min(w, meta.width) }).webp({ quality: 74 }).toFile(key);
    out.push({ url: emit(fs.readFileSync(key), 'webp'), w: Math.min(w, meta.width) });
  }
  const last = out[out.length - 1];
  return {
    src: last.url,
    srcset: out.map((o) => `${o.url} ${o.w}w`).join(', '),
    w: meta.width,
    h: meta.height,
  };
}

// Fonts and CSS (inlined into each page: one request for the HTML, nothing render-blocking).
const fontUrls = {};
let css = ['tokens.css', 'base.css'].map((f) => fs.readFileSync(path.join(ROOT, 'src/styles', f), 'utf8')).join('\n');
css = css.replace(/url\('\.\.\/\.\.\/brand\/fonts\/([^']+)'\)/g, (_, f) => {
  fontUrls[f] ??= emit(fs.readFileSync(path.join(ROOT, 'brand/fonts', f)), 'woff2', 'f');
  return `url('${fontUrls[f]}')`;
});
css = (await esbuild.transform(css, { loader: 'css', minify: true })).code;

const js = (
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/client/main.ts')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2019', 'safari13'],
    write: false,
  })
).outputFiles[0].text;

const markSvg = fs.readFileSync(path.join(ROOT, 'brand/kodna-mark.svg'), 'utf8');
const favicon = emit(Buffer.from(markSvg.replace('currentColor', '#0a1428')), 'svg');
const shared = { css, js, markSvg, favicon, preloadFont: fontUrls['inter-latin-wght-normal.woff2'] };

const report = [];
for (const { data, langs: byLang } of clients) {
  const slug = data.client.slug;
  const media = (rel) => mediaPath(slug, rel);
  const assets = { logo: null, concepts: [], gift: [] };

  if (data.client.logo) assets.logo = await image(media(data.client.logo), [240]);
  for (const c of data.concepts) {
    const base = path.basename(c.video, path.extname(c.video));
    const enc = path.join(ROOT, 'encoded', slug, base);
    const videoBuf = fs.readFileSync(`${enc}.mp4`);
    const posterFile = c.poster ? media(c.poster) : `${enc}.poster.webp`;
    assets.concepts.push({
      video: emit(videoBuf, 'mp4', 'v'),
      videoBytes: videoBuf.length,
      poster: await image(posterFile, [240, 480, 720]),
      shots: await Promise.all(c.shots.map((s) => image(media(s.image), [320, 540]))),
    });
  }
  for (const f of data.gift?.files ?? []) {
    const rel = typeof f === 'string' ? f : f.path;
    if (/\.(svg|png|jpe?g|webp)$/i.test(rel)) assets.gift.push(await image(media(rel), [480, 960]));
  }
  const posterFiles = data.concepts.map((c) =>
    c.poster ? media(c.poster) : path.join(ROOT, 'encoded', slug, `${path.basename(c.video, path.extname(c.video))}.poster.webp`),
  );

  // Base language at /p/<slug>-<token> (with the language picker), others at .../<lang>.
  const route = `/p/${slug}-${tokens[slug]}`;
  const codes = Object.keys(byLang);
  const uis = codes.map(uiFor);
  const langs = codes.map((code, i) => ({ code, short: uis[i].langShort, name: uis[i].langName, href: i ? `${route}/${code}` : route }));
  for (const [i, code] of codes.entries()) {
    const ld = byLang[code];
    const og = emit(await makeOgImage({ data: ld, ui: uis[i], markSvg, logoFile: data.client.logo && media(data.client.logo), posterFiles }), 'jpg');
    const html = renderProposal({ data: ld, assets, shared, ui: uis[i], lang: code, langs, uis, og: SITE_URL + og, url: SITE_URL + langs[i].href });
    fs.mkdirSync(path.join(DIST, langs[i].href), { recursive: true });
    fs.writeFileSync(path.join(DIST, langs[i].href, 'index.html'), html);
  }
  report.push({ slug, route, langs: codes, videos: assets.concepts.map((a) => a.videoBytes), placeholder: !!data.placeholder, confirm: !!data.cta.confirmHandle });
}

fs.writeFileSync(path.join(DIST, '404.html'), render404(shared, uiFor('fr')));

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const jsGz = (await import('node:zlib')).gzipSync(js).length;
console.log(`\nJS ${kb(js.length)} (${kb(jsGz)} gz) · CSS ${kb(css.length)} inlined\n`);
for (const r of report) {
  console.log(`✓ ${SITE_URL || ''}${r.route}`);
  console.log(`    ${r.langs.join(' + ')} · videos ${r.videos.map((v) => `${(v / 1048576).toFixed(1)} MB`).join(' + ')}`);
  if (r.placeholder) console.log('    ! placeholder: true (demo content, shows a DÉMO ribbon)');
  if (r.confirm) console.log('    ! cta.confirmHandle is set: confirm the Instagram handle before sending');
}
if (!SITE_URL) console.log('\n(i) SITE_URL not set: Open Graph URLs are relative. Set SITE_URL=https://… for the real deploy.');
