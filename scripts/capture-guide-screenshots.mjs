/**
 * Captures the screenshots used by the in-app guides.
 *
 * Drives the DEPLOYED site (https://www.arvelo.ee) rather than a local dev server —
 * the deployed backend rejects localhost origins via CORS.
 *
 * Run:
 *   node scripts/capture-guide-screenshots.mjs [slug ...]
 *
 * With no arguments every guide is captured. The backend rate-limits to
 * 100 requests / 15 min per IP and one full run costs ~30 requests, so capture
 * everything in ONE run; do not loop.
 */
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Playwright and its browsers are installed globally in this environment.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '/opt/playwright-browsers';

const require = createRequire(import.meta.url);
const { chromium } = require('/usr/lib/node_modules/playwright');

const BASE_URL = process.env.ARVELO_BASE_URL ?? 'https://www.arvelo.ee';
const EMAIL = process.env.ARVELO_EMAIL ?? 'tester@arvelo.ee';
const PASSWORD = process.env.ARVELO_PASSWORD ?? 'mastermind';

const PUBLIC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/guides');

/** The dashboard scrolls an inner container, not the document. */
const SCROLLER = 'div.min-h-0.flex-1.overflow-y-auto';

/**
 * Blurs tenant data (amounts, counterparties, references, IBANs, table rows) while
 * leaving the chrome we are actually teaching — tabs, buttons, labels — sharp.
 * Toggled per screenshot via the `guide-blur` class on <html>.
 */
const BLUR_CSS = `
  html.guide-blur .font-mono,
  html.guide-blur .tabular-nums,
  html.guide-blur table tbody td,
  html.guide-blur [role="row"] span,
  html.guide-blur section.card p.truncate,
  html.guide-blur div.rounded-xl.bg-slate-50 > div + div,
  html.guide-blur [data-guide-blur] {
    filter: blur(4px);
  }
`;

/**
 * Installed on every document (survives full navigations, unlike addStyleTag):
 * the blur stylesheet plus a rect helper the region screenshots use.
 */
function installPageHelpers(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  if (document.head) document.head.appendChild(style);

  // Union bounding box of the given elements, as a Playwright clip rect.
  window.__guideRect = (elements) => {
    const rects = elements.filter(Boolean).map((el) => el.getBoundingClientRect());
    if (rects.length === 0) return null;
    const x = Math.min(...rects.map((r) => r.x));
    const y = Math.min(...rects.map((r) => r.y));
    return {
      x,
      y,
      width: Math.max(...rects.map((r) => r.right)) - x,
      height: Math.max(...rects.map((r) => r.bottom)) - y,
    };
  };
}

const captured = [];
const skipped = [];

function makeContext(page, slug) {
  const outDir = resolve(PUBLIC_DIR, slug);
  mkdirSync(outDir, { recursive: true });

  const resetScroll = () =>
    page.evaluate((selector) => {
      document.querySelectorAll(selector).forEach((el) => (el.scrollTop = 0));
      window.scrollTo(0, 0);
    }, SCROLLER);

  const record = (name, error) => {
    if (error) skipped.push(`${slug}/${name}: ${error.message.split('\n')[0]}`);
    else captured.push(`${slug}/${name}`);
  };

  const ctx = {
    page,
    async goto(path, settleMs = 3500) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(settleMs);
    },
    /**
     * Blur tenant data in every subsequent screenshot on this page. Re-tags the
     * IBAN-bearing account pickers every time, because a full navigation drops the
     * attribute and each tab renders its own picker.
     */
    async blurData(on = true) {
      await page.evaluate((enabled) => {
        document.querySelectorAll('select').forEach((select) => {
          if (/\b[A-Z]{2}\d{2}[A-Z0-9]{8,}\b/.test(select.textContent || '')) {
            select.setAttribute('data-guide-blur', '');
          }
        });
        document.documentElement.classList.toggle('guide-blur', enabled);
      }, on);
    },
    /** Screenshot a Playwright locator. */
    async shot(target, name) {
      try {
        await resetScroll();
        await target.screenshot({ path: resolve(outDir, `${name}.png`) });
        record(name);
      } catch (error) {
        record(name, error);
      }
    },
    /**
     * Screenshot the rectangle spanning several elements. `pick` runs in the page
     * and returns a clip rect — build it with `window.__guideRect([...])`.
     */
    async shotRegion(pick, name) {
      try {
        await resetScroll();
        const clip = await page.evaluate(pick);
        if (!clip || clip.width <= 0 || clip.height <= 0) throw new Error('region not found');
        await page.screenshot({ path: resolve(outDir, `${name}.png`), clip });
        record(name);
      } catch (error) {
        record(name, error);
      }
    },
    /**
     * The app renders backend failures as an in-page banner, so a rate-limited run
     * silently produces screenshots with a red "429" box in them. Fail loudly instead.
     */
    async assertNoApiError() {
      const text = await page.locator('body').innerText().catch(() => '');
      const match = /Request failed with status code (\d+)|Network Error/.exec(text);
      if (match) throw new Error(`API error visible on ${page.url()}: ${match[0]}`);
    },
    note(message) {
      skipped.push(`${slug}: ${message}`);
    },
  };

  return ctx;
}

/**
 * Logs in and waits for the client-side redirect off /login.
 *
 * Two things bite here, both timing: filling before React hydrates sets the input
 * value without firing onChange (the form then posts empty), and the redirect is a
 * pushState, so waitForURL's "load" state never fires. So: wait for the form to be
 * interactive, verify the values actually landed, and await the login response
 * itself rather than guessing.
 */
async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[type=submit]:not([disabled])', { timeout: 30_000 });
  await page.waitForTimeout(1500);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    const filled = await page.evaluate(() => ({
      email: document.querySelector('input[type=email]')?.value || '',
      passwordLength: (document.querySelector('input[type=password]')?.value || '').length,
    }));
    if (filled.email === EMAIL && filled.passwordLength === PASSWORD.length) break;
    if (attempt === 3) throw new Error(`Login form would not accept input: ${JSON.stringify(filled)}`);
    await page.waitForTimeout(1500);
  }

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/auth/login'), { timeout: 60_000 }),
    page.click('button[type=submit]'),
  ]);
  if (!response.ok()) {
    throw new Error(`Login failed with HTTP ${response.status()} — ${(await response.text().catch(() => '')).slice(0, 200)}`);
  }

  try {
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 60_000 });
  } catch {
    const visible = await page.locator('body').innerText().catch(() => '');
    throw new Error(`Login response was OK but the app stayed on ${page.url()}. Page said: ${visible.slice(0, 200)}`);
  }
}

/** Nearest rounded-card ancestor of the element whose text is exactly `text`. */
function cardFor(page, text) {
  return page.locator(
    `xpath=//*[normalize-space(text())=${JSON.stringify(text)}]/ancestor::div[contains(@class,"rounded-[12px]") or contains(@class,"rounded-[10px]")][1]`
  ).first();
}

const TARGETS = [
  {
    slug: 'algsaldode-import',
    async run(ctx) {
      const { page } = ctx;
      await ctx.goto('/accounting/opening-balances', 4000);

      // Reconciliation panel (layer 4) — the page opens on whichever layer is current.
      await ctx.shot(cardFor(page, 'Kontroll vana tarkvara bilansiga'), '03-kontroll');

      // Layer 1 shows the plain upload state; capture the step bar and drop zone there.
      const yearEndStep = page.getByRole('button', { name: /Aasta lõpu bilanss/ }).first();
      if (await yearEndStep.count()) {
        await yearEndStep.click();
        await page.waitForTimeout(3000);
      } else {
        ctx.note('layer-1 step button not found');
      }

      // Mid-year step bar — the four-layer progress control plus the document stepper.
      await ctx.shot(page.locator('div.rounded-\\[10px\\]').filter({ hasText: 'Aasta lõpu bilanss' }).last(), '01-sammuriba');

      // Upload drop zone with the "Impordi allikas" selector.
      await ctx.shot(page.locator('div.border-dashed').first(), '02-uleslaadimine');
    },
  },
  {
    slug: 'pangatehingud',
    async run(ctx) {
      const { page } = ctx;

      // Switching tabs by clicking stays client-side; a full goto per tab reloads
      // the whole app and triples the request count against a 100/15min limit.
      // Substring match, not exact: the tab's accessible name also carries its
      // count badge ("Ülevaatus 32").
      const openTab = async (label) => {
        await page.getByRole('button', { name: label }).first().click();
        await page.waitForTimeout(4000);
        await ctx.assertNoApiError();
        await ctx.blurData();
      };

      // Every bank screen shows real counterparties and amounts — blur throughout.
      await ctx.goto('/accounting/bank?tab=import', 5000);
      await ctx.assertNoApiError();
      await ctx.blurData();

      // Header + tab bar: the three-step chrome the guide opens with.
      await ctx.shotRegion(() => {
        const heading = Array.from(document.querySelectorAll('h1')).find((el) => el.textContent?.includes('Pangatehingud'));
        const header = heading?.parentElement;
        return window.__guideRect(header ? [header, header.nextElementSibling] : []);
      }, '01-vahekaardid');

      // Import: whatever state the tab is in — drop zone, or the parsed preview
      // rows with their warning filters.
      await ctx.shotRegion(() => {
        const tabs = Array.from(document.querySelectorAll('div.min-h-0.flex-1')).filter((el) => !el.classList.contains('hidden'));
        const tab = tabs.find((el) => el.querySelector('div.border-dashed')) || tabs[0];
        return window.__guideRect(tab ? [tab] : []);
      }, '02-import');

      await openTab('Ülevaatus');

      // Review: queue on the left, action panel on the right, bulk actions in the footer.
      await ctx.shotRegion(() => {
        const tab = Array.from(document.querySelectorAll('div.min-h-0.flex-1')).find(
          (el) => !el.classList.contains('hidden') && el.querySelector('aside.card')
        );
        return window.__guideRect(tab ? [tab] : []);
      }, '03-ulevaatus');

      // The five mutually exclusive routes.
      await ctx.shotRegion(() => {
        const button = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.trim() === 'Kanna kontole');
        return window.__guideRect(button?.parentElement ? [button.parentElement] : []);
      }, '04-marsruudid');

      await openTab('Vastavus');

      // Reconcile: filters, statement balances and the running difference.
      await ctx.shotRegion(() => {
        const tab = Array.from(document.querySelectorAll('div.min-h-0.flex-1')).find(
          (el) => !el.classList.contains('hidden') && el.querySelector('table')
        );
        return window.__guideRect(tab ? [tab] : []);
      }, '05-vastavus');

      await ctx.blurData(false);
    },
  },
];

const main = async () => {
  const requested = process.argv.slice(2);
  const targets = requested.length ? TARGETS.filter((target) => requested.includes(target.slug)) : TARGETS;
  if (targets.length === 0) throw new Error(`No matching guide slug. Known: ${TARGETS.map((t) => t.slug).join(', ')}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript(installPageHelpers, BLUR_CSS);

  await login(page);

  for (const target of targets) {
    await target.run(makeContext(page, target.slug));
  }

  await browser.close();

  console.log('captured:', captured.join(', ') || '(none)');
  if (skipped.length) console.log('skipped:\n  ' + skipped.join('\n  '));
  console.log('output:', PUBLIC_DIR);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
