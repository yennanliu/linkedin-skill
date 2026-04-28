/**
 * LinkedIn Profile Scraper — Voyager/RSC Edition
 *
 * Strategy:
 *   1. Visit /in/{vanityName}/details/experience/ to get full work history
 *      (this page triggers an RSC pagination response with structured data)
 *   2. Visit /in/{vanityName}/ to get name, headline, location from the top card
 *   3. Parse experience items from page.body.innerText (reliable, arch-agnostic)
 *
 * Falls back to DOM top-card data if experience page redirects or is empty.
 *
 * Usage: node run_scraper_voyager.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// ── Cookie / session helpers ─────────────────────────────────────────────────
function findCookiesPath() {
  const local = path.join(__dirname, 'cookies.json');
  const parent = path.join(__dirname, '..', 'cookies.json');
  if (fs.existsSync(local)) return local;
  if (fs.existsSync(parent)) return parent;
  return null;
}

// ── Delay helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const jitter = (min, max) => sleep(min + Math.random() * (max - min));

// ── Parse experience text from /details/experience/ page ────────────────────
// Noise patterns to skip
const NOISE = /^(Skills:|Show all|More profiles|People also viewed|You might like|Recommendations|Pending|Cancel|Connect|Message|Follow|Add section|Open to|Experience|Education|Volunteer)/i;
const DATE_RE = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|Present/;
const DURATION_RE = /\d+\s+(?:yrs?|mos?)\b/i;
const EMPLOY_TYPE_RE = /^\s*·?\s*(Permanent|Contract|Internship|Part[- ]time|Full[- ]time|Freelance|Self[- ]employed)\s*$/i;
const LOCATION_MODE_RE = /Hybrid|Remote|On-site|In-person/i;

function isDateOrDuration(s) { return DATE_RE.test(s) || DURATION_RE.test(s); }

function cleanCompany(s) {
  // "Mercari, Inc. · Contract" → "Mercari, Inc."
  return s.replace(/\s*·\s*(Permanent|Contract|Internship|Part[- ]time|Full[- ]time|Freelance|Self[- ]employed).*$/i, '').trim();
}

function parseExperienceText(rawText) {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Find where "Experience" heading starts (standalone line)
  const expIdx = lines.findIndex(l => l === 'Experience');
  if (expIdx === -1) return [];

  // Collect clean content lines between Experience and the next major section
  const stopSections = /^(Education|Skills|Licenses|Recommendations|More profiles|People also viewed|You might like|Interests|Volunteering|Projects|Publications|Courses|Patents)/i;
  const expLines = [];
  for (let i = expIdx + 1; i < lines.length; i++) {
    if (stopSections.test(lines[i])) break;
    expLines.push(lines[i]);
  }

  // Parse into jobs. LinkedIn experience innerText structure (per job):
  //
  //  [CompanyName]                  ← company (may have " · EmploymentType")
  //  [EmploymentType · TotalDuration]  ← optional summary row (multi-role)
  //  [Location · WorkMode]          ← optional
  //  JobTitle                       ← title
  //  DateRange · Duration           ← date line
  //  [description lines...]
  //
  // Heuristic: a line is a TITLE if the NEXT line is a date/duration.
  const workHistory = [];

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const next = expLines[i + 1] || '';

    if (NOISE.test(line)) continue;
    if (isDateOrDuration(line)) continue;
    if (EMPLOY_TYPE_RE.test(line)) continue;
    if (LOCATION_MODE_RE.test(line) && line.length < 50) continue;

    // A job TITLE is a non-noise line immediately followed by a date/duration line
    if (isDateOrDuration(next)) {
      const title = line;
      const dateRange = next;

      // Walk backwards (up to 6 lines) to find company
      let company = null;
      for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
        const prev = expLines[j];
        if (isDateOrDuration(prev)) continue;
        if (EMPLOY_TYPE_RE.test(prev)) continue;
        if (LOCATION_MODE_RE.test(prev) && prev.length < 50) continue;
        if (NOISE.test(prev)) continue;
        company = cleanCompany(prev);
        break;
      }

      // Strip employment type from title if it leaked in (e.g. "Deloitte · Permanent")
      const cleanTitle = cleanCompany(title);

      if (cleanTitle && company &&
          !['Experience', 'Education', 'Skills', 'Interests'].includes(cleanTitle) &&
          cleanTitle !== company) {

        // Detect swapped title/company: if company looks like a job title
        // (contains verb-like words), swap them
        const looksLikeTitle = (s) => /Engineer|Developer|Manager|Analyst|Consultant|Director|Designer|Specialist|Coordinator|Assistant|Intern|Researcher|Scientist|Architect/i.test(s);
        const looksLikeCompany = (s) => /Inc\.|Ltd|LLC|Corp|Co\.|株式会社|University|Institute|Technologies|Systems|Solutions/i.test(s);

        let finalTitle = cleanTitle;
        let finalCompany = company;

        if (looksLikeTitle(company) && !looksLikeTitle(cleanTitle) && !looksLikeCompany(company)) {
          // Swap: company is actually the title
          finalTitle = company;
          finalCompany = cleanTitle;
        }

        workHistory.push({ title: finalTitle, company: finalCompany, dateRange });
      }
      i++; // skip the date line we already consumed
    }
  }

  return workHistory;
}

// ── Scrape a single profile ──────────────────────────────────────────────────
async function scrapeProfile(page, profileUrl) {
  const vanityName = profileUrl.replace(/\/$/, '').split('/').pop();

  // ── Step 1: Get basic info from main profile page ──────────────────────────
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const basicInfo = await page.evaluate(() => {
    // Name: first h2 that's not a UI label
    const nameEl = Array.from(document.querySelectorAll('h1, h2')).find(el => {
      const txt = el.textContent.trim();
      return txt.length > 1 && txt.length < 80 && !txt.match(/^\d/) && !txt.toLowerCase().includes('notification');
    });
    const name = nameEl ? nameEl.textContent.trim() : null;

    // Paragraphs after name in document order
    let headline = null, location = null, companyLine = null;
    if (nameEl) {
      const allPs = Array.from(document.querySelectorAll('p'))
        .map(p => ({ el: p, txt: p.textContent.trim() }))
        .filter(({ txt }) => txt.length > 2);

      const afterName = [];
      for (const { el, txt } of allPs) {
        const pos = nameEl.compareDocumentPosition(el);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) afterName.push(txt);
        if (afterName.length >= 10) break;
      }

      const filtered = afterName.filter(t =>
        t !== name &&
        !t.startsWith('\u00b7') &&
        !t.match(/^\d+(st|nd|rd|th)$/) &&
        t.length > 4
      );

      headline = filtered[0] || null;
      location = filtered.slice(1).find(t => /,/.test(t) && t.length < 60) || null;
      companyLine = filtered[1] || null;
    }

    return { name, headline, location, companyLine };
  });

  // ── Step 2: Get full work history from /details/experience/ ───────────────
  let workHistory = [];
  try {
    await page.goto(`https://www.linkedin.com/in/${vanityName}/details/experience/`,
      { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    // Scroll to trigger all experience items to load
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);

    const rawText = await page.evaluate(() => document.body.innerText);
    workHistory = parseExperienceText(rawText);
  } catch (err) {
    console.log(`   ⚠️  /details/experience/ failed: ${err.message.slice(0, 60)}`);
  }

  // ── Step 3: Derive currentTitle / currentCompany ──────────────────────────
  const currentJob = workHistory[0] || null;
  let currentTitle = currentJob?.title || null;
  let currentCompany = currentJob?.company || null;

  // Fallback to top-card parsing if experience page gave nothing
  if (!currentCompany && basicInfo.companyLine) {
    currentCompany = basicInfo.companyLine.split('·')[0].trim() || null;
  }
  if (!currentTitle && basicInfo.headline) {
    const m = basicInfo.headline.match(/^(.+?)(?:\s+[@|]|\s+at\s)/i);
    currentTitle = m ? m[1].trim() : null;
  }

  return {
    status: 'success',
    name: basicInfo.name,
    headline: basicInfo.headline,
    location: basicInfo.location,
    currentCompany,
    currentTitle,
    industry: null,
    workHistory,
    profileUrl,
  };
}

// ── Collect profile URLs from search ────────────────────────────────────────
async function collectProfileUrls(page, options) {
  const { keywords = '', company = '', country = '', industry = '', maxProfiles = 10, maxPages = 5 } = options;
  const queryParts = [keywords, company, country, industry].filter(Boolean);
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(queryParts.join(' '))}&origin=GLOBAL_SEARCH_HEADER`;

  const profileUrls = new Set();
  let currentPage = 1;

  while (currentPage <= maxPages && profileUrls.size < maxProfiles) {
    const pageUrl = searchUrl + `&page=${currentPage}`;
    console.log(`📄 Search page ${currentPage}: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="linkedin.com/in/"], .entity-result__title-text a');
      const found = new Set();
      links.forEach(a => {
        const match = (a.href || '').match(/linkedin\.com\/in\/([^?/]+)/);
        if (match) found.add(`https://www.linkedin.com/in/${match[1]}/`);
      });
      return [...found];
    });

    console.log(`   Found ${urls.length} profiles`);
    if (urls.length === 0) break;

    urls.forEach(u => { if (profileUrls.size < maxProfiles) profileUrls.add(u); });
    currentPage++;
    await jitter(2000, 4000);
  }

  return profileUrls;
}

// ── CLI args ─────────────────────────────────────────────────────────────────
// Usage:
//   node run_scraper_voyager.js --keywords "UI UX designer" --country Japan --max 10
//   node run_scraper_voyager.js --keywords "software engineer" --country "United States" --max 20
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { keywords: '', country: '', industry: '', maxProfiles: 10 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keywords' || args[i] === '-k') result.keywords = args[++i] || '';
    else if (args[i] === '--country'  || args[i] === '-c') result.country  = args[++i] || '';
    else if (args[i] === '--industry' || args[i] === '-i') result.industry = args[++i] || '';
    else if (args[i] === '--max'      || args[i] === '-n') result.maxProfiles = parseInt(args[++i], 10) || 10;
  }
  return result;
}

// ── Output path ───────────────────────────────────────────────────────────────
function buildOutputPath(keywords, country) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'); // 2026-04-28-14-30-00
  const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const parts = [slug(keywords), slug(country), ts].filter(Boolean);
  const filename = parts.join('_') + '.json';
  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return path.join(outDir, filename);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const { keywords, country, industry, maxProfiles } = parseArgs();

  if (!keywords && !country && !industry) {
    console.log('Usage: node run_scraper_voyager.js --keywords "UI UX designer" --country Japan [--max 10]');
    console.log('       node run_scraper_voyager.js -k "software engineer" -c "United States" -n 20');
    process.exit(1);
  }

  const cookiesPath = findCookiesPath();
  const browser = await chromium.launch({ headless: true });
  const ctxOptions = { viewport: { width: 1280, height: 900 } };
  if (cookiesPath) ctxOptions.storageState = cookiesPath;
  const context = await browser.newContext(ctxOptions);
  const page = await context.newPage();

  try {
    if (cookiesPath) {
      console.log('🍪 Using saved session from', path.basename(cookiesPath));
      await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      if (!page.url().includes('linkedin.com/feed')) {
        throw new Error('Session expired — delete cookies.json and re-run login_cli.js');
      }
      console.log('✅ Session valid.\n');
    } else {
      console.log('🚀 No saved session — logging in...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.fill('#username', config.linkedin.email);
      await page.fill('#password', config.linkedin.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.waitForURL(/linkedin\.com\/feed/, { timeout: 60000 }).catch(() => {});
      console.log('✅ Logged in.\n');
    }

    console.log('='.repeat(60));
    console.log('🔎 LinkedIn Profile Scraper (Voyager/RSC edition)');
    console.log(`   keywords: ${keywords || '(none)'}`);
    console.log(`   country:  ${country  || '(none)'}`);
    console.log(`   industry: ${industry || '(none)'}`);
    console.log(`   max:      ${maxProfiles}`);
    console.log('='.repeat(60) + '\n');

    const profileUrls = await collectProfileUrls(page, { keywords, country, industry, maxProfiles });

    console.log(`\n✅ Collected ${profileUrls.size} profiles to scrape\n`);

    const profiles = [];
    let idx = 0;

    for (const url of profileUrls) {
      idx++;
      console.log(`[${idx}/${profileUrls.size}] ${url}`);
      try {
        const data = await scrapeProfile(page, url);
        console.log(`   ✅ ${data.name || 'Unknown'} | ${data.currentCompany || '—'} | ${data.location || '—'} | ${data.workHistory.length} jobs`);
        profiles.push(data);
      } catch (err) {
        console.log(`   ❌ ${err.message.slice(0, 80)}`);
        profiles.push({ status: 'error', reason: err.message, profileUrl: url });
      }
      if (idx < profileUrls.size) await jitter(2000, 4000);
    }

    const outPath = buildOutputPath(keywords || industry, country);
    fs.writeFileSync(outPath, JSON.stringify(profiles, null, 2));

    const ok = profiles.filter(p => p.status === 'success').length;
    const withJobs = profiles.filter(p => p.workHistory?.length > 0).length;
    console.log('\n' + '='.repeat(60));
    console.log(`📊 Done  ✅ ${ok} success  💼 ${withJobs} with workHistory`);
    console.log(`💾 Saved → ${path.relative(process.cwd(), outPath)}`);
    console.log('='.repeat(60));

    console.log('\nSCRAPE_RESULTS_START');
    console.log(JSON.stringify(profiles, null, 2));
    console.log('SCRAPE_RESULTS_END');

  } catch (err) {
    console.error('❌ Fatal:', err.message);
  } finally {
    await browser.close();
  }
})();
