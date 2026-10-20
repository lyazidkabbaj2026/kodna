// Receives view-tracking beacons from the proposal pages and stores them in Supabase.
// Database settings in ./_config.js (the table only allows inserts).

import { SUPABASE_URL, SUPABASE_KEY } from './_config.js';

const TYPES = new Set(['open', 'view', 'play', 'watched', 'pick', 'lang', 'hide', 'show', 'leave']);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);
const int = (v) => (Number.isFinite(v) ? Math.round(v) : null);

function device(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Other';
  const app = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /WhatsApp/.test(ua) ? 'WhatsApp' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${app}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 32_000) return res.status(413).end();
  }
  const url = SUPABASE_URL;
  const key = SUPABASE_KEY;
  if (!url || !key) return res.status(204).end();

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return res.status(400).end();
  }
  const slug = str(body.slug, 64);
  const sid = str(body.sid, 32);
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !sid || !Array.isArray(body.events)) return res.status(400).end();

  const h = req.headers;
  const city = (() => {
    try {
      return decodeURIComponent(h['x-vercel-ip-city'] || '') || null;
    } catch {
      return null;
    }
  })();
  const base = {
    slug,
    sid,
    vid: str(body.vid, 32),
    lang: str(body.lang, 5),
    owner: body.owner === true,
    device: device(h['user-agent']),
    country: str(h['x-vercel-ip-country'], 4),
    city: city && city.slice(0, 80),
    screen: Number.isFinite(body.w) && Number.isFinite(body.h) ? `${Math.round(body.w)}×${Math.round(body.h)}` : null,
  };
  const rows = body.events
    .slice(0, 100)
    .filter((e) => e && TYPES.has(e.type))
    .map((e) => ({
      ...base,
      type: e.type,
      at_ms: Math.max(0, int(e.at) ?? 0),
      page: int(e.page),
      letter: str(e.letter, 2),
      value: int(e.value),
      label: str(e.label, 120),
    }));
  if (!rows.length) return res.status(204).end();

  const r = await fetch(`${url}/rest/v1/proposal_events`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  }).catch(() => null);
  if (!r || !r.ok) console.error('track insert failed', r && r.status, r && (await r.text()));
  res.status(204).end();
}
