# Kodna · proposals

Private, swipeable web proposals, one per client. Lyazid sends **one link** in the Instagram DM. The client
swipes through the proposal in Instagram's in-app browser, watches the concept previews and replies **A** or **B**.

```
/p/<slug>-<token>     one page per client (token = 6 random chars, in data/links.json)
/                     404 (no index, nothing to browse)
```

Static output (no server, no trackers), deployed on Vercel. JS ≈ 2 KB gzipped, CSS inlined, one HTML request
before first paint. Media loads only for the current page and its neighbours.

## Pages

Cover → Avant de regarder → for each concept: idea · video · plan par plan → Pour lancer → Choisir.
Swipe left/right, tap the left/right edge, the ‹ › buttons, or the keyboard arrows. The shots strip
scrolls on its own. To change page from there, swipe from the very edge of the screen or use the buttons.

## Add a client

1. **Copy the data.** Put the client's JSON at `data/<slug>.json` (the file name must equal `client.slug`).
   It follows `data/schema.json`. All client copy lives there and nothing is hard-coded in the template.
2. **Add the media** to `media/<slug>/`: the source videos (`concept-a.mp4`…), `shots/*.jpg`, logo, gift files.
   Paths in the JSON can be relative to this folder or start with `media/<slug>/`.
3. **Encode the videos** (needs `ffmpeg`):
   ```bash
   npm run encode -- <slug>
   ```
   → `encoded/<slug>/concept-x.mp4` (H.264 High, 720×1280, CRF 26, +faststart, AAC 128k, ≤ 4 MB) and a WebP
   poster. Only these encoded copies are committed. Raw `media/**/*.mp4` is git-ignored.
4. **Check and build**:
   ```bash
   npm run check        # schema + media exist + deposit + onDelivery = price
   npm run build        # first build of a new slug writes its token to data/links.json
   npm run preview      # http://localhost:4321/p/<slug>-<token>
   npm run screenshots  # screenshots/<slug>/01.png … at 390×844, for approval
   ```
5. **Commit** `data/`, `media/` (images), `encoded/` and `data/links.json`, then push. Vercel builds and deploys.
   The link is printed by the build: `https://<domain>/p/<slug>-<token>`.

A link never changes once its token is in `data/links.json`. To revoke a link, change or delete the token
and redeploy. On Vercel a missing token fails the build, so a link can't change by accident.

### Before sending a link

The build prints warnings that must be cleared:

- `placeholder: true`: demo content. The page shows a red "DÉMO" badge. Remove the field for real proposals.
- `gift.note` and `client.logoNote` are internal notes and never appear on the page.
- `cta.confirmHandle`: set while the Instagram handle in `cta.instagramDm` is unconfirmed. Remove it once checked.

## Branding

- `src/styles/tokens.css`: colours, fonts, radii, spacing. Values come from the Kodna brand board (ink `#0a1428`,
  amber `#fdbf4e`, paper `#f4f6f9`).
- `brand/kodna-mark.svg`: the K mark (white/ink shape uses `currentColor`, amber stays fixed). **It is a
  redrawn approximation.** Replace it with the official SVG from the brand pack (keep `fill="currentColor"`
  on the main shape so it works on dark and light pages).
- `brand/fonts/`: self-hosted Inter (body) and Outfit Bold (display, close to the wordmark). Swap in the
  brand's own typeface if it has one, and update the `@font-face` rules in `tokens.css`.
- Client colours (`client.colors`) are used only as accents: concept letters, the current progress
  segment, the play button and the "Je choisis" letter tiles. The build picks whichever client colour
  stays readable on the light and dark backgrounds.

## Video protection

There is no way to make a web video truly undownloadable (screen recording always works). The burned-in
"APERÇU · KODNA" watermark is the real protection. The page adds the reasonable deterrents:

- custom controls (no native menu), `controlslist="nodownload noplaybackrate noremoteplayback"`,
  `disablepictureinpicture`, `disableremoteplayback`, `playsinline`;
- a transparent layer over the video and `-webkit-touch-callout: none` (no long-press "save"), context menu
  and drag blocked on images and video;
- no file names anywhere: media is served from content-hashed paths `/v/<hash>.mp4`, `/a/<hash>.webp`,
  with `Cross-Origin-Resource-Policy: same-origin`;
- `preload="none"`: the video is only fetched when the client taps play.

## Privacy

`noindex, nofollow` meta and an `X-Robots-Tag` header on every response, `Referrer-Policy: no-referrer`,
no analytics. Each client page has its own Open Graph image (generated at build) for the Instagram link
preview. Set `SITE_URL` in the Vercel env (or rely on `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets)
so `og:image` is an absolute URL.

## Deploy (Vercel)

Import the repo in Vercel. `vercel.json` sets the build (`npm run build`, output `dist/`) and headers.
Add the custom domain if any (e.g. `kodna.ma`, so links read `kodna.ma/p/...`) and set `SITE_URL` to it.

## Layout

```
data/            schema.json, links.json, <slug>.json
media/<slug>/    source media (raw videos git-ignored)
encoded/<slug>/  web videos + posters (committed)
brand/           K mark + fonts
src/styles/      tokens.css (brand), base.css (layout)
src/client/      main.ts (pager, lazy media, player, choose buttons)
src/ui.fr.json   French UI chrome strings (not client copy)
scripts/         build, encode, check, preview, screenshots
scripts/dev/     make-placeholders.mjs (demo media only)
```
