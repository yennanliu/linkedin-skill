/**
 * LinkedIn Email Scraper — Sales Cold Outreach Edition
 *
 * Collects: name, linkedinUrl, email (generated), title, country
 *
 * Email strategy: generates probable candidates from name + company domain
 * using the most common corporate patterns, ordered by prevalence.
 *
 * Usage:
 *   node run_scraper_email.js --keywords "VP Sales" --country "United States" --max 20
 *   node run_scraper_email.js -k "CTO" -c "Japan" -n 10
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const jitter = (min, max) => sleep(min + Math.random() * (max - min));

function findCookiesPath() {
  const local = path.join(__dirname, 'cookies.json');
  const parent = path.join(__dirname, '..', 'cookies.json');
  if (fs.existsSync(local)) return local;
  if (fs.existsSync(parent)) return parent;
  return null;
}

// ── Email generation ─────────────────────────────────────────────────────────
// Common corporate email patterns, ordered by global prevalence
const EMAIL_PATTERNS = [
  (f, l) => `${f}.${l}`,       // john.smith       ~45%
  (f, l) => `${f}`,            // john             ~20%
  (f, l) => `${f[0]}${l}`,     // jsmith           ~15%
  (f, l) => `${f}${l}`,        // johnsmith        ~10%
  (f, l) => `${f[0]}.${l}`,    // j.smith           ~5%
  (f, l) => `${l}`,            // smith             ~5%
];

function normalise(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
    .replace(/[^a-z0-9]/g, '');       // keep only alphanumeric
}

function generateEmails(fullName, companyDomain) {
  if (!fullName || !companyDomain) return [];

  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return [];

  const first = normalise(parts[0]);
  const last  = normalise(parts[parts.length - 1]);
  if (!first || !last) return [];

  return EMAIL_PATTERNS.map(fn => `${fn(first, last)}@${companyDomain}`);
}

// ── Domain inference ─────────────────────────────────────────────────────────
// Strips generic/free domains; converts company name → probable domain
const FREE_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'me.com', 'protonmail.com',
]);

function companyToDomain(companyName) {
  if (!companyName) return null;

  return companyName
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|corp|co|plc|gmbh|srl|bv|ag|sa|株式会社|有限会社)\b\.?/gi, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim() + '.com';
}

// ── Scrape a single profile ──────────────────────────────────────────────────
async function scrapeProfile(page, profileUrl) {
  // Basic info from main profile page
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const nameEl = Array.from(document.querySelectorAll('h1, h2')).find(el => {
      const txt = el.textContent.trim();
      return txt.length > 1 && txt.length < 80 &&
             !txt.match(/^\d/) &&
             !txt.toLowerCase().includes('notification');
    });
    const name = nameEl ? nameEl.textContent.trim() : null;

    let title = null, country = null, company = null;
    if (nameEl) {
      const paras = Array.from(document.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .filter(t => t.length > 2 && t !== name && !t.match(/^\d+(st|nd|rd|th)$/));

      title   = paras[0] || null;
      country = paras.slice(1).find(t => /,/.test(t) && t.length < 60) || null;
      company = paras[1] || null;
    }

    return { name, title, country, company };
  });

  // Title refinement from /details/experience/ (first job title only)
  let currentTitle = null;
  let currentCompany = info.company;

  try {
    const vanity = profileUrl.replace(/\/$/, '').split('/').pop();
    await page.goto(`https://www.linkedin.com/in/${vanity}/details/experience/`,
      { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const rawText = await page.evaluate(() => document.body.innerText);
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    const DATE_RE = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|Present/;
    const DUR_RE  = /\d+\s+(?:yrs?|mos?)\b/i;
    const isDate  = s => DATE_RE.test(s) || DUR_RE.test(s);

    const expIdx = lines.findIndex(l => l === 'Experience');
    if (expIdx !== -1) {
      for (let i = expIdx + 1; i < lines.length - 1; i++) {
        if (isDate(lines[i + 1]) && !isDate(lines[i])) {
          currentTitle = lines[i].replace(/\s*·\s*(Permanent|Contract|Internship|Part[- ]time|Full[- ]time|Freelance|Self[- ]employed).*/i, '').trim();
          // Company is 1–3 lines before the title
          for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
            if (!isDate(lines[j]) && lines[j].length > 1) {
              currentCompany = lines[j].replace(/\s*·\s*.+$/, '').trim();
              break;
            }
          }
          break;
        }
      }
    }
  } catch (_) {}

  const name    = info.name;
  const title   = currentTitle || info.title;
  const company = currentCompany || info.company;
  const country = info.country;
  const domain  = companyToDomain(company);
  const emails  = generateEmails(name, domain);

  return {
    name,
    linkedinUrl: profileUrl,
    email: emails[0] || null,       // most-likely candidate
    emailCandidates: emails,        // full list for verification
    title,
    country,
    company,
  };
}

// ── Collect profile URLs from search ────────────────────────────────────────
async function collectProfileUrls(page, { keywords, country, maxProfiles, maxPages = 5 }) {
  const query = [keywords, country].filter(Boolean).join(' ');
  const base  = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;

  const urls = new Set();
  for (let pg = 1; pg <= maxPages && urls.size < maxProfiles; pg++) {
    console.log(`📄 Page ${pg} — collected ${urls.size}/${maxProfiles}`);
    await page.goto(`${base}&page=${pg}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const found = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="linkedin.com/in/"], .entity-result__title-text a');
      const out = new Set();
      links.forEach(a => {
        const m = (a.href || '').match(/linkedin\.com\/in\/([^?/]+)/);
        if (m) out.add(`https://www.linkedin.com/in/${m[1]}/`);
      });
      return [...out];
    });

    if (found.length === 0) break;
    found.forEach(u => { if (urls.size < maxProfiles) urls.add(u); });
    await jitter(2000, 3500);
  }

  return urls;
}

// ── CLI args ─────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const r = { keywords: '', country: '', maxProfiles: 10 };
  for (let i = 0; i < args.length; i++) {
    if      (args[i] === '--keywords' || args[i] === '-k') r.keywords    = args[++i] || '';
    else if (args[i] === '--country'  || args[i] === '-c') r.country     = args[++i] || '';
    else if (args[i] === '--max'      || args[i] === '-n') r.maxProfiles = parseInt(args[++i], 10) || 10;
  }
  return r;
}

// ── Output ────────────────────────────────────────────────────────────────────
function buildOutputPath(keywords, country) {
  const ts   = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const slug = s => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const name = [slug(keywords), slug(country), ts].filter(Boolean).join('_') + '_emails.json';
  const dir  = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

function printTable(profiles) {
  const ok = profiles.filter(p => p.name);
  if (!ok.length) return;
  const w = { name: 20, email: 32, title: 28, country: 20 };
  const row = p =>
    (p.name    || '').padEnd(w.name).slice(0, w.name) + '  ' +
    (p.email   || '').padEnd(w.email).slice(0, w.email) + '  ' +
    (p.title   || '').padEnd(w.title).slice(0, w.title) + '  ' +
    (p.country || '');
  console.log('\n' + '─'.repeat(110));
  console.log('NAME'.padEnd(w.name) + '  ' + 'EMAIL'.padEnd(w.email) + '  ' + 'TITLE'.padEnd(w.title) + '  COUNTRY');
  console.log('─'.repeat(110));
  ok.forEach(p => console.log(row(p)));
  console.log('─'.repeat(110));
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const { keywords, country, maxProfiles } = parseArgs();

  if (!keywords && !country) {
    console.log('Usage: node run_scraper_email.js --keywords "VP Sales" --country "United States" --max 20');
    process.exit(1);
  }

  const cookiesPath = findCookiesPath();
  const browser     = await chromium.launch({ headless: true });
  const ctxOpts     = { viewport: { width: 1280, height: 900 } };
  if (cookiesPath) ctxOpts.storageState = cookiesPath;
  const context = await browser.newContext(ctxOpts);
  const page    = await context.newPage();

  try {
    // Session
    if (cookiesPath) {
      console.log('🍪 Using saved session from', path.basename(cookiesPath));
      await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      if (!page.url().includes('linkedin.com/feed'))
        throw new Error('Session expired — run login_cli.js first');
      console.log('✅ Session valid.\n');
    } else {
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.fill('#username', config.linkedin.email);
      await page.fill('#password', config.linkedin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForURL(/linkedin\.com\/feed/, { timeout: 60000 }).catch(() => {});
      console.log('✅ Logged in.\n');
    }

    console.log('='.repeat(60));
    console.log('📧 LinkedIn Email Scraper — Sales Outreach Edition');
    console.log(`   keywords: ${keywords || '(none)'}`);
    console.log(`   country:  ${country  || '(none)'}`);
    console.log(`   max:      ${maxProfiles}`);
    console.log('='.repeat(60) + '\n');

    const profileUrls = await collectProfileUrls(page, { keywords, country, maxProfiles });
    console.log(`\n✅ ${profileUrls.size} profiles to scrape\n`);

    const results = [];
    let idx = 0;

    for (const url of profileUrls) {
      idx++;
      console.log(`[${idx}/${profileUrls.size}] ${url}`);
      try {
        const data = await scrapeProfile(page, url);
        console.log(`   ✅ ${data.name || '?'} | ${data.email || '?'} | ${data.title || '?'} | ${data.country || '?'}`);
        results.push(data);
      } catch (err) {
        console.log(`   ❌ ${err.message.slice(0, 80)}`);
        results.push({ linkedinUrl: url, error: err.message });
      }
      if (idx < profileUrls.size) await jitter(2000, 4000);
    }

    printTable(results);

    const outPath = buildOutputPath(keywords, country);
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

    console.log(`\n💾 Saved → ${path.relative(process.cwd(), outPath)}`);
    console.log(`📊 ${results.filter(r => r.name).length} profiles  |  ${results.filter(r => r.email).length} emails generated\n`);

    console.log('SCRAPE_RESULTS_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('SCRAPE_RESULTS_END');

  } catch (err) {
    console.error('❌ Fatal:', err.message);
  } finally {
    await browser.close();
  }
})();
