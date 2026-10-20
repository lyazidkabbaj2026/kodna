// HTML for one proposal. All client copy comes from the JSON; UI chrome strings from src/ui.fr.json.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Also keeps French thousands ("4 167 m") and number + unit together on one line.
const e = (s) =>
  String(s ?? '')
    .replace(/[&<>"']/g, (c) => ESC[c])
    .replace(/(\d) (?=\d{3}\b)/g, '$1\u00a0')
    .replace(/(\d) (?=(m|km|h|s|Dh|%)\b)/g, '$1\u00a0');
const t = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// ---- helpers ---------------------------------------------------------------

function fmtDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`));
}

function fmtTime(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'string') return v;
  const r = Math.round(v);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
}

function fmtMoney(n, currency = 'Dh') {
  return `${new Intl.NumberFormat('fr-FR').format(n)} ${currency}`;
}

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Client colours are accents only. Pick the first one readable on each background. */
function accents(colors) {
  const list = [colors.primary, colors.accent, colors.secondary].filter(Boolean);
  const onLight = list.find((c) => contrast(c, '#f4f6f9') >= 3) ?? '#0a1428';
  const onDark = list.find((c) => contrast(c, '#0a1428') >= 3) ?? '#fdbf4e';
  const fill = colors.primary;
  const fillInk = contrast(fill, '#ffffff') >= contrast(fill, '#0a1428') ? '#ffffff' : '#0a1428';
  return `--c-on-light:${onLight};--c-on-dark:${onDark};--c-fill:${fill};--c-fill-ink:${fillInk}`;
}

const ICON = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  arrowL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg>',
};

const brandLockup = (markSvg, cls = '') =>
  `<span class="lockup ${cls}"><span class="lockup__mark">${markSvg}</span><span class="lockup__word">Kodna</span></span>`;

/** Lazy media: real URLs live in data-* and are swapped in by the pager when the page is near. */
function img({ asset, alt, cls = '', sizes = '100vw', eager = false }) {
  const a = `${eager ? 'src' : 'data-src'}="${e(asset.src)}"${asset.srcset ? ` ${eager ? 'srcset' : 'data-srcset'}="${e(asset.srcset)}" sizes="${sizes}"` : ''}`;
  return `<img class="${cls}" ${a} alt="${e(alt)}" width="${asset.w}" height="${asset.h}" draggable="false" decoding="async">`;
}

// ---- pages -----------------------------------------------------------------

function pageCover({ data, assets, ui, markSvg }) {
  const n = data.concepts.length;
  return {
    tone: 'dark',
    label: ui.coverTitle,
    html: `
    <div class="cover">
      <div class="cover__brands anim" style="--d:0">
        ${brandLockup(markSvg)}
        ${assets.logo ? `<span class="cover__x" aria-hidden="true">×</span><span class="cover__logo">${img({ asset: assets.logo, alt: t(ui.logoAlt, { name: data.client.name }), eager: true, sizes: '56px' })}</span>` : ''}
      </div>
      <div class="cover__main">
        <p class="eyebrow anim" style="--d:1">${e(ui.proposal)} · ${e(data.client.name)}</p>
        <h1 class="cover__title anim" style="--d:2">${e(ui.coverTitle)}</h1>
        <p class="cover__sub anim" style="--d:3">${e(t(ui.coverConcepts, { n }))}</p>
        <div class="cover__letters anim" style="--d:4" aria-hidden="true">${data.concepts.map((c) => `<span>${e(c.letter)}</span>`).join('')}</div>
      </div>
      <div class="cover__foot anim" style="--d:5">
        <p class="cover__meta">${e(data.client.name)}<br><span>${e(fmtDate(data.date))}</span></p>
        <p class="cover__hint">${e(ui.coverHint)} <span class="nudge">${ICON.arrowR}</span></p>
      </div>
    </div>`,
  };
}

function pageBefore({ data, ui }) {
  return {
    tone: 'light',
    label: ui.beforeTitle,
    html: `
    <div class="sheet">
      <p class="eyebrow">${e(ui.beforeTitle)}</p>
      <p class="statement">${e(data.disclaimer)}</p>
      <div class="adds">
        <h2 class="h-sub">${e(ui.finalAddsTitle)}</h2>
        <ul class="ticks">
          ${data.finalAdds.map((a) => `<li><span class="tick">${ICON.check}</span><span>${e(a)}</span></li>`).join('')}
        </ul>
      </div>
    </div>`,
  };
}

function pageIdea({ c, ui }) {
  return {
    tone: 'light',
    label: `${t(ui.concept, { letter: c.letter })} · ${ui.theIdea}`,
    html: `
    <div class="sheet">
      <div class="idea__head">
        <span class="bigletter" aria-hidden="true">${e(c.letter)}</span>
        <div>
          <p class="eyebrow">${e(t(ui.concept, { letter: c.letter }))}</p>
          <h2 class="h-title">${e(c.title)}</h2>
        </div>
      </div>
      <p class="lead">${e(c.idea)}</p>
      ${
        c.why?.length
          ? `<h3 class="h-sub">${e(ui.why)}</h3>
      <ol class="why">${c.why.map((w, i) => `<li><span class="why__n">${i + 1}</span><span>${e(w)}</span></li>`).join('')}</ol>`
          : ''
      }
      <p class="chips">${c.durationSec ? `<span class="chip">${e(t(ui.duration, { s: c.durationSec }))}</span>` : ''}<span class="chip">${e(ui.formatVertical)}</span></p>
    </div>`,
  };
}

function pageVideo({ c, a, ui }) {
  const name = t(ui.concept, { letter: c.letter });
  return {
    tone: 'dark',
    cls: 'page--watch',
    label: `${name} · ${ui.preview}`,
    html: `
    <div class="watch">
      <p class="watch__label"><span class="badge">${e(c.letter)}</span> ${e(name)} <span class="watch__dim">· ${e(ui.preview)}</span></p>
      <div class="player" data-player data-protect>
        <video playsinline webkit-playsinline preload="none" data-src="${e(a.video)}" data-poster="${e(a.poster.src)}"
          controlslist="nodownload noplaybackrate noremoteplayback" disablepictureinpicture disableremoteplayback
          x-webkit-airplay="deny" draggable="false" aria-label="${e(`${name} · ${ui.preview}`)}"></video>
        <div class="player__shield" data-toggle aria-hidden="true"></div>
        <button class="player__big" type="button" data-big>
          <span class="player__bigicon">${ICON.play}</span><span data-big-label data-play="${e(ui.playWithSound)}" data-replay="${e(ui.replay)}">${e(ui.playWithSound)}</span>
        </button>
        <div class="player__bar">
          <button class="player__btn" type="button" data-playpause aria-label="${e(ui.play)}" data-l-play="${e(ui.play)}" data-l-pause="${e(ui.pause)}">
            <span class="i-play">${ICON.play}</span><span class="i-pause">${ICON.pause}</span>
          </button>
          <div class="player__track" data-seek role="slider" tabindex="0" aria-label="${e(ui.seek)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="player__fill" data-fill></div>
          </div>
          <span class="player__time" data-time>0:00</span>
          <button class="player__btn" type="button" data-mute aria-label="${e(ui.mute)}" data-l-mute="${e(ui.mute)}" data-l-unmute="${e(ui.unmute)}">
            <span class="i-sound">${ICON.sound}</span><span class="i-muted">${ICON.muted}</span>
          </button>
        </div>
      </div>
      <p class="watch__note">${e(ui.previewNote)}</p>
    </div>`,
  };
}

function pageShots({ c, a, ui }) {
  const name = t(ui.concept, { letter: c.letter });
  return {
    tone: 'light',
    edges: true, // the strip scrolls natively, so page swipes start from these edge strips
    label: `${name} · ${ui.shotsTitle}`,
    html: `
    <div class="sheet sheet--wide">
      <div class="shots__head">
        <p class="eyebrow"><span class="badge badge--light">${e(c.letter)}</span> ${e(name)}</p>
        <h2 class="h-title">${e(ui.shotsTitle)}</h2>
        <p class="shots__meta">${e(t(ui.shotsCount, { n: c.shots.length }))} · <span class="shots__hint">${e(ui.shotsHint)} <span class="nudge">${ICON.arrowR}</span></span></p>
      </div>
      <ol class="strip" data-noswipe data-protect tabindex="0" aria-label="${e(`${name} · ${ui.shotsTitle}`)}">
        ${c.shots
          .map((s, i) => {
            const tc = [fmtTime(s.start), fmtTime(s.end)].filter(Boolean).join(' – ');
            return `<li class="shot">
          <div class="shot__img">
            ${img({ asset: a.shots[i], alt: s.description, sizes: '(min-width: 600px) 260px, 64vw' })}
            <span class="shot__n">${String(i + 1).padStart(2, '0')}</span>
            ${tc ? `<span class="shot__tc">${e(tc)}</span>` : ''}
          </div>
          ${s.voiceover ? `<p class="shot__vo"><span class="visually-hidden">${e(ui.voiceover)} : </span>« ${e(s.voiceover)} »</p>` : ''}
          <p class="shot__desc">${e(s.description)}</p>
        </li>`;
          })
          .join('')}
      </ol>
    </div>`,
  };
}

function pageTerms({ data, assets, ui }) {
  const tm = data.terms;
  const cur = tm.currency ?? 'Dh';
  const rows = [
    tm.deliveryDays &&
      (tm.deliveryStartsAfter ? t(ui.deliveredIn, { d: tm.deliveryDays, after: tm.deliveryStartsAfter }) : t(ui.deliveredInShort, { d: tm.deliveryDays })),
    tm.revisionsIncluded && (tm.revisionsIncluded === 1 ? ui.revisions1 : t(ui.revisionsN, { n: tm.revisionsIncluded })),
    tm.voiceover && t(ui.voiceoverTerm, { v: tm.voiceover }),
    tm.format,
  ].filter(Boolean);
  const gift = data.gift;
  const giftImg = assets.gift[0];
  return {
    tone: 'light',
    label: ui.termsTitle,
    html: `
    <div class="sheet">
      <p class="eyebrow">${e(ui.termsTitle)}</p>
      <div class="price">
        <p class="price__total">${e(fmtMoney(tm.price, cur))}</p>
        <div class="price__split">
          <p><strong>${e(fmtMoney(tm.deposit, cur))}</strong><span>${e(ui.atOrder)}</span></p>
          <p><strong>${e(fmtMoney(tm.onDelivery, cur))}</strong><span>${e(ui.atDelivery)}</span></p>
        </div>
      </div>
      <ul class="ticks ticks--tight">
        ${rows.map((r) => `<li><span class="tick">${ICON.check}</span><span>${e(r)}</span></li>`).join('')}
      </ul>
      ${tm.extraLanguage ? `<p class="extra">${e(t(ui.extraLanguage, { language: tm.extraLanguage.language, price: tm.extraLanguage.price, currency: cur }))}</p>` : ''}
      ${
        gift
          ? `<div class="gift" data-protect>
        ${giftImg ? `<div class="gift__img">${img({ asset: giftImg, alt: t(ui.logoAlt, { name: data.client.name }), sizes: '96px' })}</div>` : ''}
        <div>
          <p class="gift__badge">${e(ui.giftBadge)}</p>
          <p class="gift__title">${e(gift.title ?? '')}</p>
          <p class="gift__note">${e(ui.giftLine)}</p>
        </div>
      </div>`
          : ''
      }
    </div>`,
  };
}

function pageChoose({ data, ui, markSvg }) {
  return {
    tone: 'dark',
    label: ui.chooseTitle,
    html: `
    <div class="choose">
      <p class="eyebrow">${e(ui.chooseTitle)}</p>
      <h2 class="choose__title">${e(ui.chooseLead)}</h2>
      <div class="choose__buttons">
        ${data.concepts
          .map(
            (c) => `<a class="pick" href="${e(data.cta.instagramDm)}" data-pick="${e(c.letter)}" rel="noopener">
          <span class="pick__letter">${e(c.letter)}</span>
          <span class="pick__text"><span class="pick__main">${e(t(ui.choose, { letter: c.letter }))}</span><span class="pick__sub">${e(c.title)}</span></span>
          <span class="pick__ig">${ICON.ig}</span>
        </a>`,
          )
          .join('')}
      </div>
      <p class="choose__hint">${e(ui.chooseHint)}</p>
      ${data.cta.text ? `<p class="choose__text">${e(data.cta.text)}</p>` : ''}
      <div class="choose__sign">${brandLockup(markSvg, 'lockup--sm')}<p class="tagline">Build<i>•</i>Automate<i>•</i>Grow</p></div>
    </div>`,
  };
}

// ---- document --------------------------------------------------------------

function head({ title, description, shared, og, url, extra = '' }) {
  return `<!doctype html>
<html lang="${shared.ui.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0a1428">
<meta name="format-detection" content="telephone=no">
<title>${e(title)}</title>
${description ? `<meta name="description" content="${e(description)}">` : ''}
${og ? `<meta property="og:type" content="website">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:image" content="${e(og)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${url ? `<meta property="og:url" content="${e(url)}">` : ''}
<meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="icon" href="${shared.favicon}" type="image/svg+xml">
${shared.preloadFont ? `<link rel="preload" href="${shared.preloadFont}" as="font" type="font/woff2" crossorigin>` : ''}
<style>${shared.css}</style>
${extra}
</head>`;
}

export function renderProposal({ data, assets, shared, og, url }) {
  const { ui, markSvg } = shared;
  const ctx = { data, assets, ui, markSvg };
  const pages = [pageCover(ctx), pageBefore(ctx)];
  data.concepts.forEach((c, i) => {
    const a = assets.concepts[i];
    pages.push(pageIdea({ c, ui }), pageVideo({ c, a, ui }), pageShots({ c, a, ui }));
  });
  pages.push(pageTerms(ctx), pageChoose(ctx));
  const n = pages.length;

  const title = `${ui.coverTitle} · ${data.client.name} × Kodna`;
  const description = `${t(ui.coverConcepts, { n: data.concepts.length })}. ${data.disclaimer}`;

  return `${head({ title, description, shared, og, url })}
<body>
<div class="deck" style="${accents(data.client.colors)}" data-tone="${pages[0].tone}">
  <header class="chrome">
    <div class="progress" aria-hidden="true">${pages.map(() => '<span class="progress__seg"><i></i></span>').join('')}</div>
    <div class="chrome__row">
      <span class="chrome__brand">${markSvg}</span>
      <span class="chrome__count" aria-live="polite" aria-atomic="true"><span data-count>1</span> / ${n}</span>
    </div>
  </header>
  <main class="track" data-track>
    ${pages
      .map(
        (p, i) => `<section class="page page--${p.tone}${p.cls ? ` ${p.cls}` : ''}" data-tone="${p.tone}" aria-roledescription="page" aria-label="${e(`${t(ui.pageOf, { i: i + 1, n })} : ${p.label}`)}"${i ? ' inert' : ''}>
      <div class="page__scroll">${p.html}</div>${p.edges ? '<div class="edge edge--l" aria-hidden="true"></div><div class="edge edge--r" aria-hidden="true"></div>' : ''}
    </section>`,
      )
      .join('\n    ')}
  </main>
  <nav class="pager-nav">
    <button class="navbtn navbtn--prev" type="button" data-prev aria-label="${e(ui.prev)}">${ICON.arrowL}</button>
    <button class="navbtn navbtn--next" type="button" data-next aria-label="${e(ui.next)}">${ICON.arrowR}</button>
  </nav>
  <div class="toast" role="status" aria-live="polite" data-toast data-copied="${e(ui.toastCopied)}" data-open="${e(ui.toastOpen)}"></div>
  ${data.placeholder ? `<div class="demo-ribbon">${e(ui.demo)}</div>` : ''}
</div>
<script>${shared.js}</script>
</body>
</html>
`;
}

export function render404(shared) {
  return `${head({ title: 'Kodna', description: '', shared })}
<body>
<main class="notfound">
  ${brandLockup(shared.markSvg)}
  <p>${e(shared.ui.notFound)}</p>
</main>
</body>
</html>
`;
}
