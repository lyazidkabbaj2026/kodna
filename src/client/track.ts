// Anonymous view tracking, so Kodna knows what a prospect actually looked at:
// which pages, for how long, how much of each video, which language, and which button they tapped.
// No cookies and no third-party scripts: a random visitor id in localStorage, a session id per
// visit, and batched beacons to /api/t (same origin). Opening a link once with ?owner marks the
// device as Kodna's own, so those visits are flagged and hidden in the stats by default.

type Ev = { type: string; at: number; page?: number; letter?: string; value?: number; label?: string };

const root = document.documentElement;
const endpoint = root.dataset.beacon || '';
const slug = root.dataset.slug || '';
const t0 = Date.now();
const queue: Ev[] = [];

function store(kind: 'local' | 'session', key: string, make?: () => string): string {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage;
    let v = s.getItem(key);
    if (!v && make) {
      v = make();
      s.setItem(key, v);
    }
    return v || '';
  } catch {
    return make ? make() : '';
  }
}
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

if (/[?&]owner\b/.test(location.search)) {
  try {
    localStorage.setItem('kodna-owner', '1');
  } catch {
    /* ignore */
  }
  try {
    history.replaceState(null, '', location.pathname + location.hash);
  } catch {
    /* ignore */
  }
}

const vid = store('local', 'kodna-vid', rid);
const sid = store('session', `kodna-sid-${slug}`, rid);
const owner = store('local', 'kodna-owner') === '1';

function flush() {
  if (!endpoint || !queue.length) return;
  const body = JSON.stringify({
    slug,
    lang: root.lang,
    sid,
    vid,
    owner,
    w: window.innerWidth,
    h: window.innerHeight,
    events: queue.splice(0, queue.length),
  });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
  } catch {
    /* fall through */
  }
  fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
}

export function track(type: string, data: Omit<Ev, 'type' | 'at'> = {}) {
  if (!endpoint) return;
  queue.push({ type, at: Date.now() - t0, ...data });
  if (type === 'pick' || type === 'open') flush();
}

if (endpoint) {
  track('open', { label: document.referrer ? new URL(document.referrer).hostname : '' });
  setInterval(flush, 8000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      track('hide');
      flush();
    } else track('show');
  });
  window.addEventListener('pagehide', () => {
    track('leave');
    flush();
  });
}
