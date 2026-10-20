// One PNG per page at 390x844 (iPhone 12-15 size), for approval before links are sent.
// Usage: npm run build && npm run screenshots   -> screenshots/<slug>/<lang>/NN.png (00 = language picker)
// Uses the pre-installed Chromium if PLAYWRIGHT_BROWSERS_PATH is set, else a local Chrome (CHROME_PATH).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { ROOT } from './lib/clients.mjs';

const OUT = path.join(ROOT, 'screenshots');
const links = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/links.json'), 'utf8'));
const port = 4399;

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined;
  for (const d of fs.readdirSync(base).filter((d) => d.startsWith('chromium')).sort().reverse()) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const p = path.join(base, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/preview.mjs'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 400));
const browser = await chromium.launch({ executablePath: findChrome() });
try {
  for (const [slug, token] of Object.entries(links)) {
    const route = `http://localhost:${port}/p/${slug}-${token}`;
    const html = await (await fetch(route)).text().catch(() => '');
    const langs = [...html.matchAll(/class="langopt" href="[^"]*" data-setlang="(\w+)"/g)].map((m) => m[1]);
    for (const lang of langs.length ? langs : ['']) {
      const dir = path.join(OUT, slug, lang);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (lang) {
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(dir, '00-language.png') });
        await Promise.all([page.waitForLoadState('networkidle'), page.click(`.langopt[data-setlang="${lang}"]`)]);
        await page.waitForSelector('html.lang-set');
        await page.evaluate(() => document.fonts.ready);
      }
      const n = await page.locator('.page').count();
      for (let i = 0; i < n; i++) {
        if (i) await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(i ? 1400 : 2000);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(dir, `${String(i + 1).padStart(2, '0')}.png`) });
      }
      await ctx.close();
      console.log(`✓ ${n} screenshots → screenshots/${slug}/${lang}`);
    }
  }
} finally {
  await browser.close();
  server.kill();
}
