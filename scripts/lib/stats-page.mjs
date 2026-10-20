// /stats: private dashboard of who opened which proposal and what they saw.
// Static page; data comes from /api/stats with the stats key (kept in this browser's localStorage).

export function renderStats({ clients, css, favicon, markSvg }) {
  const meta = JSON.stringify(clients).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0a1428">
<title>Kodna · Views</title>
<link rel="icon" href="${favicon}" type="image/svg+xml">
<style>${css}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--k-paper);color:var(--k-text);font-family:var(--font-body);line-height:1.5;-webkit-font-smoothing:antialiased}
h1,p{margin:0}
svg{display:block;width:100%;height:100%}
.lockup{display:inline-flex;align-items:center;gap:10px}.lockup__mark{width:24px;height:24px}.lockup__word{font-family:var(--font-display);font-weight:700;font-size:19px;letter-spacing:-.02em}
.s__me{margin-left:8px;border:0;background:none;padding:0;font:inherit;font-size:12px;font-weight:600;color:var(--k-text-2);text-decoration:underline;cursor:pointer}
.st{max-width:640px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 20px) 16px calc(env(safe-area-inset-bottom) + 40px)}
.st__top{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--k-ink)}
.st__top h1{font-family:var(--font-display);font-size:28px;letter-spacing:-.02em;margin:22px 0 4px}
.st__sub{color:var(--k-text-2);font-size:14px}
.st__toggle{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--k-text-2)}
.st__toggle input{width:18px;height:18px;accent-color:var(--k-ink)}
.st__bar{display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px}
.st__btn{border:1px solid var(--k-line);background:#fff;border-radius:999px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer}
.cl{background:#fff;border:1px solid var(--k-line);border-radius:22px;padding:18px;margin-top:14px;box-shadow:0 1px 2px rgba(10,20,40,.04)}
.cl__head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.cl__name{font-family:var(--font-display);font-size:21px;font-weight:700;letter-spacing:-.01em}
.cl__link{font-size:12px;color:var(--k-text-2);text-decoration:none;word-break:break-all}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.kpi{background:var(--k-paper);border-radius:14px;padding:10px}
.kpi b{display:block;font-family:var(--font-display);font-size:22px;line-height:1.1}
.kpi span{font-size:11px;color:var(--k-text-2);font-weight:600}
.ss{margin-top:12px;border-top:1px solid var(--k-line)}
.s{padding:14px 0;border-bottom:1px solid var(--k-line)}
.s:last-child{border-bottom:0}
.s__row{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.s__when{font-weight:700;font-size:15px}
.s__dur{font-size:13px;color:var(--k-text-2);font-variant-numeric:tabular-nums;white-space:nowrap}
.s__meta{font-size:13px;color:var(--k-text-2);margin-top:2px}
.tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:var(--k-mist);color:var(--k-ink);margin-right:4px}
.tag--amber{background:var(--k-amber)}
.tag--ink{background:var(--k-ink);color:#fff}
.heat{display:flex;gap:3px;margin-top:10px}
.heat i{flex:1;height:22px;border-radius:5px;background:var(--k-mist);position:relative}
.heat i.v{background:var(--k-ink)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip2{font-size:12px;font-weight:600;padding:4px 9px;border-radius:999px;border:1px solid var(--k-line);background:#fff}
.chip2--pick{background:var(--k-amber);border-color:transparent}
details{margin-top:8px}
summary{font-size:12px;font-weight:600;color:var(--k-text-2);cursor:pointer}
.pl{margin-top:6px;font-size:13px}
.pl div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed var(--k-line)}
.pl span:last-child{font-variant-numeric:tabular-nums;color:var(--k-text-2)}
.empty{color:var(--k-text-2);font-size:14px;padding:14px 0 4px}
.login{background:#fff;border:1px solid var(--k-line);border-radius:22px;padding:20px;margin-top:20px}
.login input{width:100%;font:inherit;padding:12px 14px;border-radius:14px;border:1px solid var(--k-line);margin:10px 0}
.login button{width:100%;height:48px;border:0;border-radius:999px;background:var(--k-ink);color:#fff;font:inherit;font-weight:650}
.err{color:#c4302b;font-size:13px;margin-top:6px}
</style>
</head>
<body>
<main class="st">
  <div class="st__top"><span class="lockup lockup--sm" style="color:var(--k-ink)"><span class="lockup__mark">${markSvg}</span><span class="lockup__word">Kodna</span></span></div>
  <h1 style="font-family:var(--font-display);font-size:28px;letter-spacing:-.02em;margin:22px 0 4px">Proposal views</h1>
  <p class="st__sub">Who opened each link, what they looked at, and what they chose.</p>
  <div id="app"></div>
</main>
<script>
const CLIENTS = ${meta};
const app = document.getElementById('app');
const KEY = 'kodna-stats-key';
const get = (k) => { try { return localStorage.getItem(k) } catch { return null } };
const set = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const m = location.hash.match(/key=([\\w-]+)/);
if (m) { set(KEY, m[1]); history.replaceState(null, '', location.pathname); }

function login(msg) {
  app.innerHTML = '<form class="login"><b>Stats key</b><input name="k" autocomplete="off" placeholder="Paste your stats key">' + (msg ? '<p class="err">' + esc(msg) + '</p>' : '') + '<button>Open</button></form>';
  app.querySelector('form').onsubmit = (e) => { e.preventDefault(); set(KEY, e.target.k.value.trim()); load(); };
}

function fmtDur(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' s';
  return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
}
function fmtWhen(d) {
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.round(diff / 60) + ' min ago';
  if (diff < 86400) return Math.round(diff / 3600) + ' h ago';
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Events of one visit (session) -> what was seen and for how long. */
function summarize(rows, nPages) {
  rows.sort((a, b) => a.id - b.id);
  const dwell = new Array(nPages + 1).fill(0);
  const seen = new Set();
  const video = {};
  let pick = null, lang = null, cur = null, since = 0, visible = true, last = 0, loads = 0;
  const close = (at) => { if (cur && visible) dwell[cur] += Math.max(0, at - since); };
  for (const r of rows) {
    const at = r.at_ms || 0;
    if (r.type === 'open') { close(last); cur = null; visible = true; loads++; }
    if (r.type === 'view') { close(at); cur = r.page; since = at; visible = true; if (r.page) seen.add(r.page); }
    if (r.type === 'hide' || r.type === 'leave') { close(at); visible = false; }
    if (r.type === 'show') { visible = true; since = at; }
    if (r.type === 'play') { (video[r.letter] ||= { pct: 0, plays: 0 }).plays++; }
    if (r.type === 'watched') { const v = (video[r.letter] ||= { pct: 0, plays: 0 }); v.pct = Math.max(v.pct, r.value || 0); }
    if (r.type === 'pick') pick = r.letter;
    if (r.type === 'lang') lang = r.label;
    if (r.lang) lang = lang || r.lang;
    last = at;
  }
  close(last);
  const first = rows[0];
  return {
    start: new Date(first.created_at),
    device: first.device, city: first.city, country: first.country, screen: first.screen,
    lang: rows[rows.length - 1].lang || lang, owner: rows.some((r) => r.owner), vid: first.vid,
    dwell, seen, video, pick, total: dwell.reduce((a, b) => a + b, 0), loads,
  };
}

function render(rows) {
  const showOwn = get('kodna-stats-own') === '1';
  let html = '<div class="st__bar"><label class="st__toggle"><input type="checkbox" id="own"' + (showOwn ? ' checked' : '') + '> Include my own visits</label><button class="st__btn" id="refresh">Refresh</button></div>';
  for (const c of CLIENTS) {
    const mine = rows.filter((r) => r.slug === c.slug);
    const bySid = {};
    for (const r of mine) (bySid[r.sid] ||= []).push(r);
    let sessions = Object.values(bySid).map((rs) => summarize(rs, c.pages.length));
    sessions = sessions.filter((s) => showOwn || !s.owner).sort((a, b) => b.start - a.start);
    const people = new Set(sessions.map((s) => s.vid)).size;
    const videos = sessions.filter((s) => Object.values(s.video).some((v) => v.plays)).length;
    const picks = sessions.filter((s) => s.pick).map((s) => s.pick);
    const visitN = {};
    [...sessions].reverse().forEach((s) => { s.nth = visitN[s.vid] = (visitN[s.vid] || 0) + 1; });
    html += '<section class="cl"><div class="cl__head"><div><div class="cl__name">' + esc(c.name) + '</div><a class="cl__link" href="' + esc(c.route) + '?owner" target="_blank" rel="noopener">' + esc(location.origin + c.route) + '</a></div></div>';
    html += '<div class="kpis"><div class="kpi"><b>' + sessions.length + '</b><span>Visits</span></div><div class="kpi"><b>' + people + '</b><span>People</span></div><div class="kpi"><b>' + videos + '</b><span>Played a video</span></div><div class="kpi"><b>' + (picks.length ? esc(picks[0]) : '–') + '</b><span>Choice</span></div></div>';
    html += '<div class="ss">';
    if (!sessions.length) html += '<p class="empty">No visits yet.</p>';
    for (const s of sessions) {
      const where = [s.city, s.country].filter(Boolean).join(', ');
      html += '<div class="s"><div class="s__row"><span class="s__when">' + esc(fmtWhen(s.start)) + '</span><span class="s__dur">' + fmtDur(s.total) + '</span></div>';
      html += '<div class="s__meta">' + (s.owner ? '<span class="tag tag--ink">You</span>' : '') + (s.nth > 1 ? '<span class="tag">Visit ' + s.nth + '</span>' : '') + (s.lang ? '<span class="tag">' + esc(String(s.lang).toUpperCase()) + '</span>' : '') + esc([s.device, where].filter(Boolean).join(' · ')) + (!s.owner && s.vid ? '<button class="s__me" data-me="' + esc(s.vid) + '">This was me</button>' : '') + '</div>';
      const max = Math.max(1, ...s.dwell);
      html += '<div class="heat" aria-label="Pages seen">' + c.pages.map((label, i) => {
        const d = s.dwell[i + 1];
        const seen = s.seen.has(i + 1);
        return '<i class="' + (seen ? 'v' : '') + '" style="' + (seen ? 'opacity:' + (0.35 + 0.65 * d / max).toFixed(2) : '') + '" title="' + esc((i + 1) + '. ' + label + (seen ? ' · ' + fmtDur(d) : ' · not seen')) + '"></i>';
      }).join('') + '</div>';
      html += '<div class="chips">';
      for (const L of c.letters) {
        const v = s.video[L];
        html += '<span class="chip2">Video ' + esc(L) + ' · ' + (v && v.plays ? (v.pct ? v.pct + '%' : 'started') : 'not played') + '</span>';
      }
      html += s.pick ? '<span class="chip2 chip2--pick">Tapped “I choose ' + esc(s.pick) + '”</span>' : '';
      html += '</div><details><summary>Page by page</summary><div class="pl">' + c.pages.map((label, i) => '<div><span>' + (i + 1) + '. ' + esc(label) + '</span><span>' + (s.seen.has(i + 1) ? fmtDur(s.dwell[i + 1]) : '—') + '</span></div>').join('') + '</div></details></div>';
    }
    html += '</div></section>';
  }
  app.innerHTML = html;
  document.getElementById('own').onchange = (e) => { set('kodna-stats-own', e.target.checked ? '1' : null); render(rows); };
  document.getElementById('refresh').onclick = load;
  for (const b of app.querySelectorAll('[data-me]')) b.onclick = async () => { b.textContent = '…'; await markOwner(b.dataset.me); load(); };
}

/** Tag every visit from this device id as Kodna's own (also earlier ones). */
async function markOwner(vid) {
  try {
    await fetch('/api/stats', { method: 'POST', headers: { 'x-stats-key': get(KEY), 'content-type': 'application/json' }, body: JSON.stringify({ owner: vid }) });
  } catch {}
}

async function load() {
  const key = get(KEY);
  if (!key) return login();
  // Opening the dashboard means this browser is Kodna's: proposals opened here count as "You",
  // including any visit made before (e.g. a link tapped from this page without ?owner).
  set('kodna-owner', '1');
  const myVid = get('kodna-vid');
  if (myVid && !sessionStorage.getItem('kodna-owner-synced')) {
    await markOwner(myVid);
    try { sessionStorage.setItem('kodna-owner-synced', '1'); } catch {}
  }
  app.innerHTML = '<p class="empty">Loading…</p>';
  try {
    const r = await fetch('/api/stats', { headers: { 'x-stats-key': key }, cache: 'no-store' });
    if (r.status === 401) { set(KEY, null); return login('That key did not work.'); }
    if (r.status === 503) { app.innerHTML = '<p class="empty">Tracking is not connected to a database yet.</p>'; return; }
    if (!r.ok) throw new Error(r.status);
    render(await r.json());
  } catch (e) {
    app.innerHTML = '<p class="empty">Could not load the stats (' + esc(e.message) + '). <button class="st__btn" onclick="load()">Retry</button></p>';
  }
}
load();
</script>
</body>
</html>
`;
}
