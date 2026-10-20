// Returns raw view events for the stats dashboard (/stats). The secret key travels in a header
// and is checked inside the database (kodna_stats, kodna_mark_owner), so this function holds no secret.

import { SUPABASE_URL, SUPABASE_KEY } from './_config.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  const url = SUPABASE_URL;
  const key = SUPABASE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'not_configured' });
  const statsKey = req.headers['x-stats-key'];
  if (!statsKey || typeof statsKey !== 'string' || statsKey.length > 100) return res.status(401).json({ error: 'key' });

  // POST {owner: <visitor id>}: tag that device's visits as Kodna's own.
  if (req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 2000) return res.status(413).end();
    }
    let vid = null;
    try {
      vid = JSON.parse(raw).owner;
    } catch {
      /* fall through */
    }
    if (typeof vid !== 'string' || !vid || vid.length > 32) return res.status(400).json({ error: 'vid' });
    const m = await fetch(`${url}/rest/v1/rpc/kodna_mark_owner`, {
      method: 'POST',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_key: statsKey, p_vid: vid }),
    }).catch(() => null);
    if (!m) return res.status(502).json({ error: 'upstream' });
    if (!m.ok) return res.status(m.status === 401 || m.status === 403 ? 401 : 502).json({ error: 'owner' });
    return res.status(200).json({ updated: await m.json() });
  }

  const r = await fetch(`${url}/rest/v1/rpc/kodna_stats`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_key: statsKey, p_days: 90 }),
  }).catch(() => null);
  if (!r) return res.status(502).json({ error: 'upstream' });
  if (!r.ok) return res.status(r.status === 403 || r.status === 401 ? 401 : 502).json({ error: r.status === 403 || r.status === 401 ? 'key' : 'upstream' });
  res.status(200).json(await r.json());
}
