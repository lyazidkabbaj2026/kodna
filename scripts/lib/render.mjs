// HTML for one proposal in one language. Client copy comes from the JSON (plus its translation
// overlay); UI chrome strings from src/ui.<lang>.json.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Also keeps French thousands ("4 167 m") and number + unit together on one line.
const e = (s) =>
  String(s ?? '')
    .replace(/[&<>"']/g, (c) => ESC[c])
    .replace(/(\d) (?=\d{3}\b)/g, '$1\u00a0')
    .replace(/(\d) (?=(m|km|h|s|Dh|%)\b)/g, '$1\u00a0');
const t = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// ---- helpers ---------------------------------------------------------------

function fmtDate(s, locale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`));
}

function fmtTime(v) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'string') return v;
  const r = Math.round(v);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
}

function fmtMoney(n, currency, locale) {
  return `${new Intl.NumberFormat(locale).format(n)} ${currency}`;
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
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.6 5.4 3.6 8.5s-1 5.9-3.6 8.5c-2.6-2.6-3.6-5.4-3.6-8.5s1-5.9 3.6-8.5z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg>',
};

/** Last word wrapped in <em> (gradient accent on the cover title). */
const emLast = (s) => {
  const i = s.lastIndexOf(' ');
  return i < 0 ? e(s) : `${e(s.slice(0, i))} <em>${e(s.slice(i + 1))}</em>`;
};

const brandLockup = (markSvg, cls = '') =>
  `<span class="lockup ${cls}"><span class="lockup__mark">${markSvg}</span><span class="lockup__word">Kodna</span></span>`;

/** Lazy media: real URLs live in data-* and are swapped in by the pager when the page is near. */
function img({ asset, alt, cls = '', sizes = '100vw', eager = false }) {
  const a = `${eager ? 'src' : 'data-src'}="${e(asset.src)}"${asset.srcset ? ` ${eager ? 'srcset' : 'data-srcset'}="${e(asset.srcset)}" sizes="${sizes}"` : ''}`;
  return `<img class="${cls}" ${a} alt="${e(alt)}" width="${asset.w}" height="${asset.h}" draggable="false" decoding="async">`;
}

// ---- pages -----------------------------------------------------------------
// Each page: { tone: 'dark'|'light', label, next (dock button label, '' = none), html }.

const logoChip = (assets, data, ui) =>
  assets.logo
    ? `<span class="x" aria-hidden="true">×</span><span class="logochip">${img({ asset: assets.logo, alt: t(ui.logoAlt, { name: data.client.name }), eager: true, sizes: '120px' })}</span>`
    : '';

function pageCover({ data, assets, ui, markSvg }) {
  const n = data.concepts.length;
  const shown = data.concepts.slice(0, 3);
  return {
    tone: 'dark',
    label: ui.coverTitle,
    html: `
    <div class="cover">
      <div class="brands rv" style="--d:0">${brandLockup(markSvg)}${logoChip(assets, data, ui)}</div>
      <div class="fan" aria-hidden="true"><div class="fan__float">
        ${shown
          .map(
            (c, i) => `<div class="fan__card" style="--i:${i - (shown.length - 1) / 2}">
          ${img({ asset: assets.concepts[i].poster, alt: '', eager: true, sizes: '42vw' })}
          <span class="fan__letter">${e(c.letter)}</span>
        </div>`,
          )
          .join('')}
      </div></div>
      <div class="cover__text">
        <p class="eyebrow rv" style="--d:3">${e(ui.proposal)} · ${e(data.client.name)}</p>
        <h1 class="cover__title rv" style="--d:4">${emLast(ui.coverTitle)}</h1>
        <p class="cover__sub rv" style="--d:5">${e(t(ui.coverConcepts, { n }))}<span class="cover__date">${e(fmtDate(data.date, ui.locale))}</span></p>
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
      <p class="eyebrow rv">${e(ui.beforeTitle)}</p>
      <p class="statement rv" style="--d:1">${e(data.disclaimer)}</p>
      <h2 class="h-sub rv" style="--d:2">${e(ui.finalAddsTitle)}</h2>
      <ul class="adds stagger">
        ${data.finalAdds.map((a) => `<li><span class="tick">${ICON.check}</span><span>${e(a)}</span></li>`).join('')}
      </ul>
    </div>`,
  };
}

function pageIdea({ c, a, ui }) {
  const meta = [c.durationSec && t(ui.duration, { s: c.durationSec }), ui.formatVertical].filter(Boolean).join(' · ');
  return {
    tone: 'light',
    label: `${t(ui.concept, { letter: c.letter })} · ${ui.theIdea}`,
    html: `
    <div class="sheet">
      <div class="idea__head rv">
        <span class="lettertile" aria-hidden="true">${e(c.letter)}</span>
        <div>
          <p class="eyebrow">${e(t(ui.concept, { letter: c.letter }))}</p>
          <h2 class="h-title">${e(c.title)}</h2>
        </div>
      </div>
      <p class="lead rv" style="--d:1">${e(c.idea)}</p>
      ${
        c.why?.length
          ? `<div class="card rv" style="--d:2">
        <h3 class="card__title">${e(ui.why)}</h3>
        <ol class="rows">${c.why.map((w, i) => `<li><span class="num">${i + 1}</span><span>${e(w)}</span></li>`).join('')}</ol>
      </div>`
          : ''
      }
      <button class="previewcard rv" style="--d:3" type="button" data-go-next>
        <span class="previewcard__thumb" data-protect>${img({ asset: a.poster, alt: '', sizes: '64px' })}<span class="previewcard__play">${ICON.play}</span></span>
        <span class="previewcard__text"><strong>${e(ui.watchPreview)}</strong><span>${e(meta)}</span></span>
        <span class="previewcard__arrow">${ICON.arrowR}</span>
      </button>
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
      <p class="watch__label rv"><span class="badge">${e(c.letter)}</span> ${e(c.title)} <span class="watch__dim">· ${e(ui.preview)}</span></p>
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
      <p class="watch__note rv" style="--d:4">${e(ui.previewNote)}</p>
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
    <div class="sheet sheet--wide sheet--top">
      <div class="shots__head rv">
        <p class="eyebrow"><span class="badge badge--sm">${e(c.letter)}</span> ${e(c.title)}</p>
        <div class="shots__row">
          <h2 class="h-title">${e(ui.shotsTitle)}</h2>
          <p class="shots__meta">${e(t(ui.shotsCount, { n: c.shots.length }))}<span class="shots__hint">${e(ui.shotsHint)} <span class="nudge">${ICON.arrowR}</span></span></p>
        </div>
      </div>
      <ol class="strip stagger" data-noswipe data-protect tabindex="0" aria-label="${e(`${name} · ${ui.shotsTitle}`)}">
        ${c.shots
          .map((s, i) => {
            const tc = [fmtTime(s.start), fmtTime(s.end)].filter(Boolean).join(' – ');
            return `<li class="shot">
          <div class="shot__img">
            ${img({ asset: a.shots[i], alt: s.description, sizes: '(min-width: 600px) 280px, 70vw' })}
            <span class="shot__n">${String(i + 1).padStart(2, '0')}<i>/${String(c.shots.length).padStart(2, '0')}</i></span>
            ${tc ? `<span class="shot__tc">${e(tc)}</span>` : ''}
          </div>
          ${s.voiceover ? `<p class="shot__label">${e(ui.voiceover)}</p><p class="shot__vo">« ${e(s.voiceover)} »</p>` : ''}
          <p class="shot__desc">${e(s.description)}</p>
        </li>`;
          })
          .join('')}
      </ol>
      <div class="dots rv" style="--d:3" aria-hidden="true">${c.shots.map((_, i) => `<i${i ? '' : ' class="is-on"'}></i>`).join('')}</div>
    </div>`,
  };
}

function pageTerms({ data, assets, ui }) {
  const tm = data.terms;
  const cur = tm.currency ?? 'Dh';
  const money = (n) => fmtMoney(n, cur, ui.locale);
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
      <p class="eyebrow rv">${e(ui.termsTitle)}</p>
      <div class="price rv" style="--d:1">
        <p class="price__total" data-countup="${tm.price}" data-locale="${ui.locale}" data-suffix="${e(`\u00a0${cur}`)}">${e(money(tm.price))}</p>
        <div class="price__split">
          <p><strong>${e(money(tm.deposit))}</strong><span>${e(ui.atOrder)}</span></p>
          <p><strong>${e(money(tm.onDelivery))}</strong><span>${e(ui.atDelivery)}</span></p>
        </div>
      </div>
      <div class="card rv" style="--d:2">
        <h3 class="card__title">${e(ui.included)}</h3>
        <ul class="rows stagger">
          ${rows.map((r) => `<li><span class="tick">${ICON.check}</span><span>${e(r)}</span></li>`).join('')}
        </ul>
        ${tm.extraLanguage ? `<p class="extra"><span>${e(t(ui.extraLanguage, { language: tm.extraLanguage.language }))}</span><strong>+${e(money(tm.extraLanguage.price))}</strong></p>` : ''}
      </div>
      ${
        gift
          ? `<div class="gift rv" style="--d:4" data-protect>
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

function pageChoose({ data, assets, ui, markSvg }) {
  return {
    tone: 'dark',
    label: ui.chooseTitle,
    html: `
    <div class="choose">
      <p class="eyebrow rv">${e(ui.chooseTitle)}</p>
      <h2 class="choose__title rv" style="--d:1">${e(ui.chooseLead)}</h2>
      <div class="choose__buttons stagger">
        ${data.concepts
          .map(
            (c, i) => `<a class="pick" href="${e(data.cta.instagramDm)}" data-pick="${e(c.letter)}" rel="noopener">
          <span class="pick__thumb" data-protect>${img({ asset: assets.concepts[i].poster, alt: '', sizes: '64px' })}<span class="pick__letter">${e(c.letter)}</span></span>
          <span class="pick__text"><span class="pick__main">${e(t(ui.choose, { letter: c.letter }))}</span><span class="pick__sub">${e(c.title)}</span></span>
          <span class="pick__ig"><span class="i-ig">${ICON.ig}</span><span class="i-ok">${ICON.check}</span></span>
        </a>`,
          )
          .join('')}
      </div>
      <p class="choose__hint rv" style="--d:4">${e(ui.chooseHint)}</p>
      ${data.cta.text ? `<p class="choose__text rv" style="--d:5">${e(data.cta.text)}</p>` : ''}
      <div class="choose__sign rv" style="--d:6">${brandLockup(markSvg, 'lockup--sm')}<p class="tagline">Build<i>•</i>Automate<i>•</i>Grow</p></div>
    </div>`,
  };
}

/** First screen of the base-language page: pick FR / EN. Bilingual on purpose. */
function langPicker({ data, assets, langs, markSvg, uis }) {
  return `<div class="langpick" data-langpick role="dialog" aria-modal="true" aria-labelledby="lp-title" style="${accents(data.client.colors)}">
  <div class="langpick__bg" aria-hidden="true"><div class="aura"></div></div>
  <div class="langpick__inner">
    <div class="brands rv">${brandLockup(markSvg)}${logoChip(assets, data, uis[0])}</div>
    <div class="langpick__main">
      <p class="eyebrow rv" style="--d:2">${e(data.client.name)}</p>
      <h1 class="langpick__title rv" style="--d:3" id="lp-title">${uis.map((u, i) => (i ? `<span>${e(u.langPrompt)}</span>` : e(u.langPrompt))).join('')}</h1>
      <div class="langpick__options rv" style="--d:5">
        ${langs
          .map(
            (l) => `<a class="langopt" href="${e(l.href)}" data-setlang="${l.code}" lang="${l.code}">
          <span class="langopt__code">${e(l.short)}</span><span class="langopt__name">${e(l.name)}</span><span class="langopt__arrow">${ICON.arrowR}</span>
        </a>`,
          )
          .join('')}
      </div>
    </div>
    <p class="tagline rv" style="--d:7">Build<i>•</i>Automate<i>•</i>Grow</p>
  </div>
</div>`;
}

// ---- document --------------------------------------------------------------

function head({ title, description, shared, ui, og, url, boot = '', attrs = '' }) {
  return `<!doctype html>
<html lang="${ui.htmlLang}"${attrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0a1428">
<meta name="format-detection" content="telephone=no">
<title>${e(title)}</title>
${boot}
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
</head>`;
}

/**
 * Runs before first paint. A remembered language choice skips the picker (or jumps to that
 * language's page); without one, the base page shows the picker.
 */
function bootScript({ lang, langs, picker }) {
  const hrefs = Object.fromEntries(langs.map((l) => [l.code, l.href]));
  return `<script>(function(){var d=document.documentElement,l;try{l=localStorage.getItem('kodna-lang')}catch(x){}var h=${JSON.stringify(hrefs)};if(l&&l!=='${lang}'&&h[l]){location.replace(h[l]+location.hash);return}if(l||${picker ? 'location.hash.length>1' : 'true'})d.classList.add('lang-set')})()</script>`;
}

export function renderProposal({ data, assets, shared, ui, lang, langs, uis, og, url }) {
  const { markSvg } = shared;
  const ctx = { data, assets, ui, markSvg };
  const pages = [pageCover(ctx), pageBefore(ctx)];
  data.concepts.forEach((c, i) => {
    const a = assets.concepts[i];
    pages.push(pageIdea({ c, a, ui }), pageVideo({ c, a, ui }), pageShots({ c, a, ui }));
  });
  pages.push(pageTerms(ctx), pageChoose(ctx));
  const n = pages.length;

  // Dock label = what the next page is.
  const nextLabel = (i) => {
    if (i === 0) return ui.start;
    if (i >= n - 1) return '';
    const k = i - 2; // concept block index: idea, video, shots
    if (i === 1) return t(ui.nextConcept, { letter: data.concepts[0].letter });
    if (i === n - 2) return ui.nextChoose;
    if (k >= 0 && k < data.concepts.length * 3) {
      const step = k % 3;
      if (step === 0) return ui.nextPreview;
      if (step === 1) return ui.nextShots;
      const next = data.concepts[Math.floor(k / 3) + 1];
      return next ? t(ui.nextConcept, { letter: next.letter }) : ui.nextTerms;
    }
    return ui.next;
  };

  const picker = langs.length > 1 && lang === langs[0].code;
  const other = langs.filter((l) => l.code !== lang);
  const title = `${ui.coverTitle} · ${data.client.name} × Kodna`;
  const description = `${t(ui.coverConcepts, { n: data.concepts.length })}. ${data.disclaimer}`;

  const attrs = ` data-slug="${e(data.client.slug)}" data-beacon="/api/t"`;
  return `${head({ title, description, shared, ui, og, url, attrs, boot: langs.length > 1 ? bootScript({ lang, langs, picker }) : '<script>document.documentElement.classList.add("lang-set")</script>' })}
<body>
<div class="deck" style="${accents(data.client.colors)}" data-tone="${pages[0].tone}" data-page="1">
  <header class="chrome">
    <div class="progress" aria-hidden="true">${pages.map(() => '<span class="progress__seg"><i></i></span>').join('')}</div>
    <div class="chrome__row">
      <span class="chrome__brand">${markSvg}</span>
      <span class="chrome__right">
        ${other.map((l) => `<a class="langswitch" href="${e(l.href)}" data-setlang="${l.code}" lang="${l.code}" aria-label="${e(l.name)}">${ICON.globe}<span>${e(l.short)}</span></a>`).join('')}
        <span class="chrome__count" aria-live="polite" aria-atomic="true"><span data-count>1</span> / ${n}</span>
      </span>
    </div>
  </header>
  <main class="track" data-track>
    ${pages
      .map(
        (p, i) => `<section class="page page--${p.tone}${p.cls ? ` ${p.cls}` : ''}" data-tone="${p.tone}" data-dock="${e(nextLabel(i))}" aria-roledescription="page" aria-label="${e(`${t(ui.pageOf, { i: i + 1, n })} : ${p.label}`)}"${i ? ' inert' : ''}>
      ${p.tone === 'dark' ? '<div class="aura" aria-hidden="true"></div>' : ''}<div class="page__scroll">${p.html}</div>${p.edges ? '<div class="edge edge--l" aria-hidden="true"></div><div class="edge edge--r" aria-hidden="true"></div>' : ''}
    </section>`,
      )
      .join('\n    ')}
  </main>
  <nav class="dock">
    <button class="dock__back" type="button" data-prev aria-label="${e(ui.prev)}">${ICON.arrowL}</button>
    <button class="dock__next" type="button" data-next><span data-next-label>${e(nextLabel(0))}</span><span class="dock__arrow">${ICON.arrowR}</span></button>
  </nav>
  <div class="toast" role="status" aria-live="polite" data-toast data-copied="${e(ui.toastCopied)}" data-open="${e(ui.toastOpen)}"></div>
  ${data.placeholder ? `<div class="demo-ribbon">${e(ui.demo)}</div>` : ''}
</div>
${picker ? langPicker({ data, assets, langs, markSvg, uis }) : ''}
<script>${shared.js}</script>
</body>
</html>
`;
}

export function render404(shared, ui) {
  return `${head({ title: 'Kodna', description: '', shared, ui })}
<body>
<main class="notfound">
  ${brandLockup(shared.markSvg)}
  <p>${e(ui.notFound)}</p>
</main>
</body>
</html>
`;
}
