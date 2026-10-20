// Returns raw view events for the stats dashboard (/stats). The secret key travels in a header
// and is checked inside the database (kodna_stats), so this function holds no secret itself.

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  const { SUPABASE_URL: url, SUPABASE_KEY: key } = process.env;
  if (!url || !key) return res.status(503).json({ error: 'not_configured' });
  const statsKey = req.headers['x-stats-key'];
  if (!statsKey || typeof statsKey !== 'string' || statsKey.length > 100) return res.status(401).json({ error: 'key' });

  const r = await fetch(`${url}/rest/v1/rpc/kodna_stats`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_key: statsKey, p_days: 90 }),
  }).catch(() => null);
  if (!r) return res.status(502).json({ error: 'upstream' });
  if (!r.ok) return res.status(r.status === 403 || r.status === 401 ? 401 : 502).json({ error: r.status === 403 || r.status === 401 ? 'key' : 'upstream' });
  res.status(200).json(await r.json());
}
