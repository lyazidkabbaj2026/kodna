// 1200x630 link-preview card: Kodna mark + "Votre pub vidéo" + client name, the two concept posters on the right.
// Text is rendered with the committed brand fonts (no system fonts needed on the build machine).
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './clients.mjs';

const W = 1200;
const H = 630;
const INK = '#0a1428';
const OUTFIT = path.join(ROOT, 'brand/fonts/outfit-latin-700-normal.woff2');
const INTER = path.join(ROOT, 'brand/fonts/inter-latin-wght-normal.woff2');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (markup, fontfile, font, width) =>
  sharp({ text: { text: markup, font, fontfile, rgba: true, width, dpi: 72 } }).png().toBuffer();

async function rounded(file, w, h, r) {
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  return sharp(file).resize(w, h, { fit: 'cover' }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

export async function makeOgImage({ data, ui, markSvg, logoFile, posterFiles }) {
  const mark = await sharp(Buffer.from(markSvg.replace('currentColor', '#ffffff'))).resize(64, 64).png().toBuffer();
  const layers = [
    { input: mark, left: 72, top: 72 },
    { input: await text(`<span foreground="#ffffff">Kodna</span>`, OUTFIT, 'Outfit Bold 38', 400), left: 152, top: 82 },
    { input: await text(`<span foreground="#a9b2c7" letter_spacing="4000">${esc(ui.proposal.toUpperCase())}</span>`, INTER, 'Inter Semi-Bold 20', 560), left: 72, top: 236 },
    { input: await text(`<span foreground="#ffffff">${esc(ui.coverTitle)}</span>`, OUTFIT, 'Outfit Bold 72', 600), left: 72, top: 270 },
    { input: await text(`<span foreground="#fdbf4e">${esc(data.client.name)}</span>`, OUTFIT, 'Outfit Bold 48', 600), left: 72, top: 372 },
    {
      input: await text(
        `<span foreground="#a9b2c7">${esc(ui.coverConcepts.replace('{n}', String(data.concepts.length)))}</span>`,
        INTER,
        'Inter Medium 26',
        600,
      ),
      left: 72,
      top: 470,
    },
  ];
  if (logoFile) {
    const logo = await sharp(logoFile, { density: 300 }).resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    layers.push({ input: logo, left: 560, top: 68 });
  }
  // Two posters, slightly fanned, on the right.
  const pw = 230;
  const ph = Math.round((pw * 16) / 9);
  const shown = posterFiles.slice(0, 2);
  for (const [i, f] of shown.entries()) {
    const card = await rounded(f, pw, ph, 18);
    layers.push({ input: card, left: 686 + i * (pw + 24) - (shown.length === 1 ? -120 : 0), top: Math.round((H - ph) / 2) + (i ? 24 : -24) });
  }
  return sharp({ create: { width: W, height: H, channels: 3, background: INK } })
    .composite(layers)
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
