// Proposal deck: swipe pager, lazy media, custom video player, "Je choisis" buttons.
// No framework. Everything is wired from data-* attributes rendered by scripts/lib/render.mjs.
import { track as log } from './track';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T | null;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];

const deck = $('.deck')!;
const track = $('[data-track]')!;
const pages = $$('.page', track);
const segs = $$('.progress__seg');
const countEl = $('[data-count]')!;
const prevBtn = $<HTMLButtonElement>('button[data-prev]')!;
const nextBtn = $<HTMLButtonElement>('button[data-next]')!;
const nextLabel = $('[data-next-label]')!;
const toastEl = $('[data-toast]')!;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const n = pages.length;
const root = document.documentElement;
let current = 0;

// ---------------------------------------------------------------- media deterrents

document.addEventListener('contextmenu', (ev) => {
  const t = ev.target as Element;
  if (t.closest('img, video, [data-protect]')) ev.preventDefault();
});
document.addEventListener('dragstart', (ev) => {
  if ((ev.target as Element).closest('img, video')) ev.preventDefault();
});

// ---------------------------------------------------------------- lazy media

function hydrate(i: number) {
  const page = pages[i];
  if (!page || page.dataset.hydrated) return;
  page.dataset.hydrated = '1';
  for (const img of $$<HTMLImageElement>('img[data-src]', page)) {
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src!;
  }
  for (const v of $$<HTMLVideoElement>('video[data-src]', page)) {
    // Poster as a CSS background on the frame (not the video's poster attribute) keeps the
    // poster out of the native "save image" path.
    const frame = v.closest<HTMLElement>('.player');
    if (frame && v.dataset.poster) frame.style.backgroundImage = `url("${v.dataset.poster}")`;
  }
}

// ---------------------------------------------------------------- pager

function go(i: number, animate = true) {
  i = Math.max(0, Math.min(n - 1, i));
  const changed = i !== current;
  if (changed) $$<HTMLVideoElement>('video', pages[current]).forEach((v) => v.pause());
  current = i;
  track.classList.toggle('is-animating', animate && !reduceMotion);
  track.style.transform = `translate3d(${-i * 100}%,0,0)`;
  pages.forEach((p, j) => {
    if (j === i) p.removeAttribute('inert');
    else p.setAttribute('inert', '');
    // .is-current (re)starts the page's entrance animations in CSS.
    p.classList.toggle('is-current', j === i);
  });
  if (changed || !animate) {
    for (const el of $$('[data-countup]', pages[i])) countUp(el);
    onPageView(i);
  }
  segs.forEach((s, j) => {
    s.classList.toggle('is-done', j < i);
    s.classList.toggle('is-current', j === i);
  });
  countEl.textContent = String(i + 1);
  deck.dataset.tone = pages[i].dataset.tone || 'light';
  deck.dataset.page = String(i + 1);
  prevBtn.disabled = i === 0;
  const label = pages[i].dataset.dock || '';
  nextBtn.hidden = !label;
  if (label) nextLabel.textContent = label;
  hydrate(i);
  hydrate(i + 1);
  hydrate(i - 1);
  try {
    history.replaceState(null, '', i ? `#${i + 1}` : location.pathname + location.search);
  } catch {
    /* some in-app browsers forbid it; position is just not remembered */
  }
}

function onPageView(i: number) {
  log('view', { page: i + 1, label: (pages[i].getAttribute('aria-label') || '').split(' : ').slice(1).join(' : ') });
}

/** Price ticks up to its value when the terms page comes into view. */
function countUp(el: HTMLElement) {
  const to = Number(el.dataset.countup);
  const fmt = new Intl.NumberFormat(el.dataset.locale || undefined);
  const suffix = el.dataset.suffix || '';
  if (reduceMotion || !to) return;
  const start = performance.now();
  const dur = 900;
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt.format(Math.round(to * eased)) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

prevBtn.addEventListener('click', () => go(current - 1));
nextBtn.addEventListener('click', () => go(current + 1));
for (const b of $$('[data-go-next]')) b.addEventListener('click', () => go(current + 1));

document.addEventListener('keydown', (ev) => {
  if (!root.classList.contains('lang-set')) return; // language picker still open
  const t = ev.target as HTMLElement;
  if (t.closest('[data-seek]')) return;
  if (ev.key === 'ArrowRight' || ev.key === 'PageDown') go(current + 1);
  else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') go(current - 1);
  else if (ev.key === 'Home') go(0);
  else if (ev.key === 'End') go(n - 1);
  else return;
  ev.preventDefault();
});

// Swipe. Pages are touch-action: pan-y, so the browser keeps vertical scroll and we get
// horizontal moves. Inside the shots strip only a swipe that starts at the screen edge pages.
const EDGE = 28;
let drag: { id: number; x: number; y: number; t: number; dx: number; axis: '' | 'x' | 'y'; w: number } | null = null;
let suppressClick = false;

track.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  const t = ev.target as Element;
  if (t.closest('[data-seek], .player__bar')) return;
  const w = track.clientWidth;
  if (t.closest('[data-noswipe]') && ev.clientX > EDGE && ev.clientX < w - EDGE) return;
  if (ev.pointerType === 'mouse' && t.closest('a, button')) return;
  drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: ev.timeStamp, dx: 0, axis: '', w };
});

track.addEventListener('pointermove', (ev) => {
  if (!drag || ev.pointerId !== drag.id) return;
  const dx = ev.clientX - drag.x;
  const dy = ev.clientY - drag.y;
  if (!drag.axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (drag.axis === 'x') {
      track.classList.remove('is-animating');
      try {
        track.setPointerCapture(ev.pointerId);
      } catch {
        /* pointer already gone */
      }
    }
  }
  if (drag.axis !== 'x') return;
  ev.preventDefault();
  // Rubber band at the ends.
  const atEnd = (current === 0 && dx > 0) || (current === n - 1 && dx < 0);
  drag.dx = atEnd ? dx / 3 : dx;
  track.style.transform = `translate3d(calc(${-current * 100}% + ${drag.dx}px),0,0)`;
});

function endDrag(ev: PointerEvent) {
  if (!drag || ev.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (d.axis !== 'x') return;
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 50);
  const v = d.dx / Math.max(1, ev.timeStamp - d.t); // px per ms
  const far = Math.abs(d.dx) > d.w * 0.18;
  const fast = Math.abs(v) > 0.35 && Math.abs(d.dx) > 24;
  if ((far || fast) && ev.type !== 'pointercancel') go(current + (d.dx < 0 ? 1 : -1));
  else go(current);
}
track.addEventListener('pointerup', endDrag);
track.addEventListener('pointercancel', endDrag);

// Tap the left / right edge of a page to move, like Stories.
track.addEventListener('click', (ev) => {
  if (suppressClick) return;
  const t = ev.target as Element;
  if (t.closest('a, button, input, [data-noswipe], .player, [tabindex]')) return;
  const w = track.clientWidth;
  if (ev.clientX < w * 0.16) go(current - 1);
  else if (ev.clientX > w * 0.84) go(current + 1);
});

// ---------------------------------------------------------------- video player

const fmt = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

for (const player of $$('[data-player]')) {
  const video = $<HTMLVideoElement>('video', player)!;
  const big = $<HTMLButtonElement>('[data-big]', player)!;
  const bigLabel = $('[data-big-label]', player)!;
  const pp = $<HTMLButtonElement>('[data-playpause]', player)!;
  const mute = $<HTMLButtonElement>('[data-mute]', player)!;
  const seek = $('[data-seek]', player)!;
  const fill = $('[data-fill]', player)!;
  const time = $('[data-time]', player)!;

  const ensureSrc = () => {
    if (!video.getAttribute('src') && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  };
  const play = () => {
    ensureSrc();
    video.muted = false;
    const p = video.play();
    if (p) p.catch(() => {
      // Autoplay policy refused sound (rare after a tap): play muted, user can unmute.
      video.muted = true;
      video.play().catch(() => undefined);
    });
  };
  const toggle = () => (video.paused || video.ended ? play() : video.pause());

  big.addEventListener('click', play);
  $('[data-toggle]', player)!.addEventListener('click', toggle);
  pp.addEventListener('click', toggle);
  mute.addEventListener('click', () => {
    video.muted = !video.muted;
  });

  const sync = () => {
    const playing = !video.paused && !video.ended;
    player.classList.toggle('is-playing', playing);
    player.classList.toggle('is-muted', video.muted);
    pp.setAttribute('aria-label', (playing ? pp.dataset.lPause : pp.dataset.lPlay) || '');
    mute.setAttribute('aria-label', (video.muted ? mute.dataset.lUnmute : mute.dataset.lMute) || '');
  };
  const letter = player.closest('.page')?.querySelector('.badge')?.textContent || '';
  const reached = new Set<number>();
  video.addEventListener('play', () => {
    player.classList.add('has-started');
    sync();
    log('play', { letter, value: Math.round(video.currentTime) });
  });
  video.addEventListener('pause', sync);
  video.addEventListener('volumechange', sync);
  video.addEventListener('ended', () => {
    bigLabel.textContent = bigLabel.dataset.replay || '';
    sync();
  });
  video.addEventListener('timeupdate', () => {
    const r = video.duration ? video.currentTime / video.duration : 0;
    for (const m of [25, 50, 75, 95]) {
      if (r * 100 >= m && !reached.has(m)) {
        reached.add(m);
        log('watched', { letter, value: m === 95 ? 100 : m });
      }
    }
    fill.style.transform = `scaleX(${r})`;
    seek.setAttribute('aria-valuenow', String(Math.round(r * 100)));
    seek.setAttribute('aria-valuetext', `${fmt(video.currentTime)} / ${fmt(video.duration)}`);
    time.textContent = fmt(video.currentTime);
  });

  const seekTo = (clientX: number) => {
    const r = seek.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    if (video.duration) video.currentTime = ratio * video.duration;
  };
  seek.addEventListener('pointerdown', (ev) => {
    seek.setPointerCapture(ev.pointerId);
    seekTo(ev.clientX);
    const move = (e: PointerEvent) => seekTo(e.clientX);
    const up = () => {
      seek.removeEventListener('pointermove', move);
      seek.removeEventListener('pointerup', up);
    };
    seek.addEventListener('pointermove', move);
    seek.addEventListener('pointerup', up);
  });
  seek.addEventListener('keydown', (ev) => {
    if (!video.duration) return;
    if (ev.key === 'ArrowRight') video.currentTime = Math.min(video.duration, video.currentTime + 2);
    else if (ev.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 2);
    else return;
    ev.preventDefault();
  });
}

// ---------------------------------------------------------------- shots strip position

for (const strip of $$('.strip')) {
  const dots = $$('i', strip.parentElement!.querySelector('.dots') || document.createElement('div'));
  let raf = 0;
  strip.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const first = strip.firstElementChild as HTMLElement | null;
        const step = first ? first.offsetWidth + 14 : strip.clientWidth;
        const at = Math.round(strip.scrollLeft / step);
        dots.forEach((d, k) => d.classList.toggle('is-on', k === Math.min(at, dots.length - 1)));
      });
    },
    { passive: true },
  );
}

// ---------------------------------------------------------------- choose

let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 2600);
}

function copy(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => legacyCopy(text),
    );
  }
  return Promise.resolve(legacyCopy(text));
}
function legacyCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

for (const a of $$<HTMLAnchorElement>('[data-pick]')) {
  a.addEventListener('click', (ev) => {
    // Second tap (or if the delayed redirect was blocked): plain link, open right away.
    if (a.dataset.armed) return;
    a.dataset.armed = '1';
    ev.preventDefault();
    const letter = a.dataset.pick || '';
    const href = a.href;
    $$('[data-pick]').forEach((b) => b.classList.toggle('is-picked', b === a));
    log('pick', { letter });
    copy(letter).then((ok) => {
      const tpl = (ok ? toastEl.dataset.copied : toastEl.dataset.open) || '';
      toast(tpl.replace('{letter}', letter));
      window.setTimeout(() => {
        window.location.href = href;
      }, 1100);
    });
  });
}

// ---------------------------------------------------------------- language

// The base page opens on a FR / EN picker (hidden by the boot script once a choice is
// remembered). Picking this page's language just closes it; the other one navigates.
for (const a of $$<HTMLAnchorElement>('[data-setlang]')) {
  a.addEventListener('click', (ev) => {
    const lang = a.dataset.setlang || '';
    log('lang', { label: lang });
    try {
      localStorage.setItem('kodna-lang', lang);
    } catch {
      /* private mode: the choice just isn't remembered */
    }
    if (lang === root.lang) {
      ev.preventDefault();
      root.classList.add('lang-set', 'lang-chosen');
      go(current, false); // restart the cover's entrance now that it is visible
    }
  });
}

// ---------------------------------------------------------------- start

const fromHash = parseInt(location.hash.slice(1), 10);
hydrate(0);
go(Number.isFinite(fromHash) ? fromHash - 1 : 0, false);
