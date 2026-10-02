// Re-renders every screenshot and portfolio cover from the live pages.
//
//   npm i --no-save playwright         # once (uses your installed Chromium via CHROME_PATH if set)
//   npx serve -l 8090 .                # or any static server, in another terminal
//   node scripts/render-portfolio.mjs [http://localhost:8090]
//   bash scripts/make_images.sh        # rebuilds the .webp versions used by index.html
//
// Writes: assets/work/{cadence,northvault,brightwater}{,-mobile}.jpg, portfolio/*-cover.jpg,
// portfolio/*-full-page.jpg and the matching copies in showreel/public/.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || 'http://localhost:8090').replace(/\/$/, '');
const SITES = [
  { key: 'lk-media', path: '/', title: 'LK Media', sub: 'Studio website · lk-media.netlify.app', bg: 'linear-gradient(135deg,#BE185D 0%,#831843 55%,#4A0D29 100%)', ink: '#FDF2F8', font: 'Archivo', url: 'lk-media.netlify.app' },
  { key: 'cadence', path: '/work/cadence/', title: 'Cadence', sub: 'SaaS landing page · concept', bg: 'linear-gradient(135deg,#0F766E 0%,#134E4A 60%,#042F2C 100%)', ink: '#F0FDFA', font: 'Plus Jakarta Sans', url: 'lk-media.netlify.app/work/cadence' },
  { key: 'northvault', path: '/work/northvault/', title: 'Northvault', sub: 'Fintech marketing site · concept', bg: 'radial-gradient(120% 120% at 80% 0%,#3B2A6B 0%,#0F172A 55%,#020617 100%)', ink: '#F8FAFC', font: 'IBM Plex Sans', url: 'lk-media.netlify.app/work/northvault' },
  { key: 'brightwater', path: '/work/brightwater/', title: 'Brightwater', sub: 'Local service booking site · concept', bg: 'linear-gradient(135deg,#22D3EE 0%,#0891B2 45%,#0E7490 100%)', ink: '#ffffff', font: 'Lexend', url: 'lk-media.netlify.app/work/brightwater' },
];
const FULL_PAGE_CSS = '.stack-card{position:relative!important;top:auto!important}.lg\\:sticky{position:static!important}[data-sticky-bar]{display:none!important}';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const out = (...p) => path.join(ROOT, ...p);
const tmp = fs.mkdtempSync(path.join((await import('os')).tmpdir(), 'lk-'));

async function shot(site, { w, h, reduced = true, full = false, file, motionWait = 4200 }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  await page.goto(BASE + site.path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (!reduced) { await page.mouse.move(w * 0.7, h * 0.4); await page.waitForTimeout(motionWait); await page.mouse.move(w * 0.75, h * 0.35); }
  else await page.waitForTimeout(400);
  if (full) await page.addStyleTag({ content: FULL_PAGE_CSS });
  await page.screenshot({ path: file, fullPage: full, type: 'jpeg', quality: 86 });
  await ctx.close();
  return file;
}

const dataUrl = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
async function compose(html, file) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const page = await ctx.newPage();
  await page.route(BASE + '/__cover.html', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(BASE + '/__cover.html');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: file, type: 'jpeg', quality: 90 });
  await ctx.close();
}
const shell = (body, bg) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/fonts/fonts.css"><style>
*{box-sizing:border-box;margin:0}body{width:1600px;height:1200px;overflow:hidden;background:${bg};font-family:'Space Grotesk',sans-serif;position:relative}
.browser{position:absolute;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 60px 120px -30px rgba(0,0,0,.55)}
.browser .bar{height:40px;background:#E5E7EB;display:flex;align-items:center;gap:8px;padding:0 16px}.browser .bar i{width:12px;height:12px;border-radius:50%;background:#C4C7CC}
.browser .bar span{margin-left:14px;font:500 15px 'Space Grotesk';color:#475569;background:#fff;border-radius:8px;padding:4px 14px}
.browser img{display:block;width:100%}
.phone{position:absolute;border-radius:46px;background:#0B0B0F;padding:12px;box-shadow:0 60px 120px -30px rgba(0,0,0,.6)}.phone img{display:block;width:100%;border-radius:36px}
.chip{display:inline-block;border:2px solid rgba(255,255,255,.55);color:#fff;border-radius:99px;padding:12px 22px;font:600 28px 'Space Grotesk';margin-right:14px}
</style></head><body>${body}</body></html>`;

const shots = {};
for (const s of SITES) {
  const d = s.key === 'lk-media';
  shots[s.key] = {
    desk: await shot(s, { w: 1440, h: 900, reduced: !d, file: path.join(tmp, s.key + '.jpg') }),
    mob: await shot(s, { w: 390, h: 844, file: path.join(tmp, s.key + '-mobile.jpg') }),
  };
  await shot(s, { w: 1440, h: 900, full: true, file: out('portfolio', s.key + '-full-page.jpg') });
  fs.copyFileSync(out('portfolio', s.key + '-full-page.jpg'), out('showreel/public', s.key + '-full-page.jpg'));
  fs.copyFileSync(shots[s.key].mob, out('showreel/public', s.key + '-mobile.jpg'));
  if (!d) { fs.copyFileSync(shots[s.key].desk, out('assets/work', s.key + '.jpg')); fs.copyFileSync(shots[s.key].mob, out('assets/work', s.key + '-mobile.jpg')); }
  console.log('captured', s.key);

  // Project cover: title, browser + phone mock-ups
  await compose(shell(`
    <div style="position:absolute;left:96px;top:84px;color:${s.ink}"><h1 style="font:800 84px/1 '${s.font}';letter-spacing:-.02em${d ? ";font-family:Archivo;font-stretch:118%" : ''}">${s.title}</h1><p style="margin-top:20px;font:500 32px '${s.font}';opacity:.85">${s.sub}</p></div>
    <p style="position:absolute;right:96px;top:92px;text-align:right;color:${s.ink};font:600 26px/1.3 'Space Grotesk';opacity:.9">Design &amp; build<br>LK Media</p>
    <div class="browser" style="left:96px;top:270px;width:1150px"><div class="bar"><i></i><i></i><i></i><span>${s.url}</span></div><img src="${dataUrl(shots[s.key].desk)}"></div>
    <div class="phone" style="left:1166px;top:390px;width:330px"><img src="${dataUrl(shots[s.key].mob)}"></div>`, s.bg), out('portfolio', s.key + '-cover.jpg'));
}

// Service covers (LK Media brand)
const logo = 'data:image/png;base64,' + fs.readFileSync(out('brand/lk-media-logo-a.png')).toString('base64');
const brandHead = `<div style="position:absolute;left:96px;top:84px;display:flex;align-items:center;gap:22px"><img src="${logo}" style="width:92px;height:92px;border-radius:50%;box-shadow:0 0 0 4px rgba(255,255,255,.25)"><span style="font:900 54px Archivo;font-stretch:118%;color:#fff">LK<span style="color:#06B6D4">.</span>media</span></div>`;
const service = (title, price, sub, imgs) => shell(`${brandHead}
  <h1 style="position:absolute;left:96px;top:300px;font:900 118px/.95 Archivo;font-stretch:118%;letter-spacing:-.03em;color:#fff">${title}</h1>
  <p style="position:absolute;left:96px;top:600px;background:#06B6D4;color:#083344;border-radius:20px;padding:18px 32px;font:700 56px 'Space Grotesk'">${price}</p>
  <p style="position:absolute;left:96px;top:730px;color:#FBCFE8;font:500 36px 'Space Grotesk'">${sub}</p>
  <div style="position:absolute;left:96px;bottom:96px"><span class="chip">Mobile-first</span><span class="chip">Animated</span><span class="chip">Fixed price</span></div>
  ${imgs}`, 'radial-gradient(120% 120% at 0% 0%,#BE185D 0%,#831843 50%,#2A0716 100%)');
await compose(service('Startup<br>Launch Page', 'from $600', 'Delivered in about 1 week',
  `<div class="browser" style="left:940px;top:610px;width:900px"><div class="bar"><i></i><i></i><i></i></div><img src="${dataUrl(shots.cadence.desk)}"></div>`), out('portfolio/service-launch-page-cover.jpg'));
await compose(service('Startup<br>Website', 'from $1,500', 'Up to 6 pages · 2–3 weeks',
  `<div class="browser" style="left:1060px;top:150px;width:760px;opacity:.95"><div class="bar"><i></i><i></i><i></i></div><img src="${dataUrl(shots.northvault.desk)}"></div>
   <div class="browser" style="left:1000px;top:330px;width:760px"><div class="bar"><i></i><i></i><i></i></div><img src="${dataUrl(shots.brightwater.desk)}"></div>
   <div class="browser" style="left:940px;top:520px;width:760px"><div class="bar"><i></i><i></i><i></i></div><img src="${dataUrl(shots.cadence.desk)}"></div>`), out('portfolio/service-startup-website-cover.jpg'));

fs.copyFileSync(shots['lk-media'].desk, out('assets/work', 'lk-media-og.jpg'));
fs.rmSync(tmp, { recursive: true, force: true });
await browser.close();
console.log('done');
