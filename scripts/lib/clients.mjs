import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Ajv from 'ajv';

export const ROOT = path.resolve(import.meta.dirname, '../..');
const DATA = path.join(ROOT, 'data');
const LINKS = path.join(DATA, 'links.json');
const RESERVED = new Set(['schema.json', 'links.json']);

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateSchema = ajv.compile(JSON.parse(fs.readFileSync(path.join(DATA, 'schema.json'), 'utf8')));

export class DataError extends Error {}

/** Absolute path of a media file. JSON paths may be relative to media/<slug>/ or start with "media/<slug>/". */
export function mediaPath(slug, rel) {
  const prefix = `media/${slug}/`;
  return path.join(ROOT, 'media', slug, rel.startsWith(prefix) ? rel.slice(prefix.length) : rel);
}

/** Every data/<slug>.json, parsed and (by default) checked against the schema and media folder. */
export function loadClients({ validate = true } = {}) {
  const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && !RESERVED.has(f) && !f.startsWith('_'));
  return files.sort().map((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
    if (validate) check(file, data);
    return { file, data };
  });
}

function check(file, data) {
  const errors = [];
  if (!validateSchema(data)) {
    for (const e of validateSchema.errors) errors.push(`${e.instancePath || '/'} ${e.message}`);
  } else {
    const slug = data.client.slug;
    if (file !== `${slug}.json`) errors.push(`file name must be ${slug}.json (client.slug)`);
    const need = (rel, where) => {
      if (rel && !fs.existsSync(mediaPath(slug, rel))) errors.push(`${where}: ${path.relative(ROOT, mediaPath(slug, rel))} not found`);
    };
    need(data.client.logo, 'client.logo');
    const letters = new Set();
    data.concepts.forEach((c, i) => {
      if (letters.has(c.letter)) errors.push(`concepts[${i}].letter "${c.letter}" is used twice`);
      letters.add(c.letter);
      need(c.poster, `concepts[${i}].poster`);
      const base = path.basename(c.video, path.extname(c.video));
      if (!fs.existsSync(path.join(ROOT, 'encoded', slug, `${base}.mp4`)))
        errors.push(`concepts[${i}].video: encoded/${slug}/${base}.mp4 missing, run "npm run encode -- ${slug}"`);
      c.shots.forEach((s, j) => need(s.image, `concepts[${i}].shots[${j}].image`));
    });
    (data.gift?.files ?? []).forEach((f, i) => need(typeof f === 'string' ? f : f.path, `gift.files[${i}]`));
    const t = data.terms;
    if (t.deposit + t.onDelivery !== t.price) errors.push(`terms: deposit + onDelivery (${t.deposit + t.onDelivery}) ≠ price (${t.price})`);
  }
  if (errors.length) throw new DataError(`data/${file}\n  - ${errors.join('\n  - ')}`);
}

/**
 * The unguessable suffix of each client's URL (/p/<slug>-<token>). Stored in data/links.json
 * so links never change between deploys. New clients get a token on their first local build;
 * on CI a missing token is an error, so a link can't silently change.
 */
export function linkTokens(slugs) {
  const links = fs.existsSync(LINKS) ? JSON.parse(fs.readFileSync(LINKS, 'utf8')) : {};
  const missing = slugs.filter((s) => !links[s]);
  if (missing.length) {
    if (process.env.CI || process.env.VERCEL)
      throw new DataError(`data/links.json has no token for: ${missing.join(', ')}. Run "npm run build" locally and commit data/links.json.`);
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)
    for (const s of missing) links[s] = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    fs.writeFileSync(LINKS, JSON.stringify(links, null, 2) + '\n');
    console.log(`+ new link token(s) written to data/links.json for: ${missing.join(', ')} (commit it)`);
  }
  return links;
}
