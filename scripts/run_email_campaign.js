/**
 * LinkedIn Email Campaign Scraper
 *
 * Systematically scrapes LinkedIn profiles for sales outreach data.
 * Saves progress after every profile so runs are resumable.
 *
 * Output per campaign:
 *   output/campaigns/{title}_{country}/
 *     progress.json   ← queue + done + failed URLs (resume state)
 *     results.json    ← clean records array
 *     results.csv     ← CRM-ready flat file
 *
 * Usage:
 *   node run_email_campaign.js --title "CTO" --country "Japan" --max 50
 *   node run_email_campaign.js --title "VP Sales" --country "United States" --max 100
 *
 * Re-run the same command to resume from where it stopped.
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const jitter = (min, max) => sleep(min + Math.random() * (max - min));

function findCookiesPath() {
  const local  = path.join(__dirname, 'cookies.json');
  const parent = path.join(__dirname, '..', 'cookies.json');
  return fs.existsSync(local) ? local : fs.existsSync(parent) ? parent : null;
}

// ── Campaign paths ────────────────────────────────────────────────────────────
function campaignDir(title, country) {
  const slug = s => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const dir  = path.join(__dirname, '..', 'output', 'campaigns', `${slug(title)}_${slug(country)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadProgress(dir) {
  const p = path.join(dir, 'progress.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return { queued: [], done: [], failed: [], meta: {} };
}

function saveProgress(dir, progress) {
  fs.writeFileSync(path.join(dir, 'progress.json'), JSON.stringify(progress, null, 2));
}

function loadResults(dir) {
  const p = path.join(dir, 'results.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
}

function saveResults(dir, results) {
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(dir, 'results.csv'), toCSV(results));
}

// ── CSV serialiser ────────────────────────────────────────────────────────────
function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(records) {
  const cols = ['name', 'email', 'title', 'company', 'country', 'linkedinUrl', 'emailCandidates'];
  const header = cols.join(',');
  const rows   = records.map(r =>
    cols.map(c =>
      c === 'emailCandidates' ? csvCell((r[c] || []).join(' | ')) : csvCell(r[c])
    ).join(',')
  );
  return [header, ...rows].join('\n');
}

// ── Email generation ──────────────────────────────────────────────────────────
const EMAIL_PATTERNS = [
  (f, l) => `${f}.${l}`,
  (f, l) => `${f}`,
  (f, l) => `${f[0]}${l}`,
  (f, l) => `${f}${l}`,
  (f, l) => `${f[0]}.${l}`,
  (f, l) => `${l}`,
];

function normalise(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function generateEmails(fullName, domain) {
  if (!fullName || !domain) return [];
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return [];
  const f = normalise(parts[0]);
  const l = normalise(parts[parts.length - 1]);
  if (!f || !l) return [];
  return EMAIL_PATTERNS.map(fn => `${fn(f, l)}@${domain}`);
}

// ── Domain inference ──────────────────────────────────────────────────────────
const TITLE_WORDS = /\b(cto|ceo|cfo|coo|vp|founder|director|manager|engineer|developer|analyst|consultant|researcher|scientist|architect|officer|president|intern|retired|freelance|self.?employed|independent|最高技術責任者|代表取締役)\b/i;

function companyToDomain(company) {
  if (!company) return null;
  if (TITLE_WORDS.test(company)) return null;
  const d = company.toLowerCase()
    .replace(/\b(inc|ltd|llc|corp|co|plc|gmbh|srl|bv|ag|sa|株式会社|有限会社)\b\.?/gi, '')
    .replace(/[^a-z0-9]+/g, '').trim();
  return d.length > 1 ? `${d}.com` : null;
}

// ── Experience page parser ────────────────────────────────────────────────────
const DATE_RE     = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|Present/;
const DUR_RE      = /\d+\s+(?:yrs?|mos?)\b/i;
const EMP_TYPE_RE = /^\s*·?\s*(Permanent|Contract|Internship|Part[- ]time|Full[- ]time|Freelance|Self[- ]employed)\s*$/i;
const LOC_MODE_RE = /Hybrid|Remote|On-site|In-person/i;
const STOP_RE     = /^(Education|Skills|Licenses|Recommendations|More profiles|People also viewed|Interests|Volunteering|Projects)/i;

const isDate  = s => DATE_RE.test(s) || DUR_RE.test(s);
const isNoise = s => isDate(s) || EMP_TYPE_RE.test(s) || (LOC_MODE_RE.test(s) && s.length < 50);

const LOOKS_TITLE   = s => /Engineer|Developer|Manager|Analyst|Consultant|Director|Designer|Specialist|Coordinator|Intern|Researcher|Scientist|Architect|Officer|President|Founder|CEO|CTO|CFO|COO|VP|Head|Lead|Principal/i.test(s);
const LOOKS_COMPANY = s => /Inc\.|Ltd|LLC|Corp|Co\.|株式会社|有限会社|University|Institute|Technologies|Systems|Solutions|Group|Holdings|Partners|Labs|Studio/i.test(s);

function parseFirstJob(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const expIdx = lines.findIndex(l => l === 'Experience');
  if (expIdx === -1) return null;

  const expLines = [];
  for (let i = expIdx + 1; i < lines.length; i++) {
    if (STOP_RE.test(lines[i])) break;
    expLines.push(lines[i]);
  }

  for (let i = 0; i < expLines.length - 1; i++) {
    if (isDate(expLines[i + 1]) && !isNoise(expLines[i])) {
      const rawTitle = expLines[i].replace(/\s*·\s*(Permanent|Contract|Internship|Part[- ]time|Full[- ]time|Freelance|Self[- ]employed).*/i, '').trim();
      let rawCompany = null;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (!isNoise(expLines[j]) && expLines[j].length > 1) {
          rawCompany = expLines[j].replace(/\s*·\s*.+$/, '').trim();
          break;
        }
      }

      // Swap if company looks like a title and title doesn't look like a company
      if (rawCompany && LOOKS_TITLE(rawCompany) && !LOOKS_TITLE(rawTitle) && !LOOKS_COMPANY(rawCompany)) {
        return { title: rawCompany, company: rawTitle };
      }
      return { title: rawTitle, company: rawCompany };
    }
  }
  return null;
}

// ── Scrape a single profile ───────────────────────────────────────────────────
async function scrapeProfile(page, profileUrl) {
  const vanity = profileUrl.replace(/\/$/, '').split('/').pop();

  // Top-card: name + country
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  const topCard = await page.evaluate(() => {
    const nameEl = Array.from(document.querySelectorAll('h1, h2')).find(el => {
      const t = el.textContent.trim();
      return t.length > 1 && t.length < 80 && !t.match(/^\d/) && !t.toLowerCase().includes('notification');
    });
    const name = nameEl ? nameEl.textContent.trim() : null;

    let country = null;
    if (nameEl) {
      const paras = Array.from(document.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .filter(t => t.length > 2 && t !== name && !t.match(/^\d+(st|nd|rd|th)$/));
      country = paras.slice(1).find(t =>
        /,/.test(t) && t.length < 60 && !/follower|connection|mutual|reaction|comment/i.test(t)
      ) || null;
    }
    return { name, country };
  });

  // Experience subpage: title + company
  let title = null, company = null;
  try {
    await page.goto(`https://www.linkedin.com/in/${vanity}/details/experience/`,
      { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(300);
    }
    const rawText = await page.evaluate(() => document.body.innerText);
    const job = parseFirstJob(rawText);
    if (job) { title = job.title; company = job.company; }
  } catch (_) {}

  const domain = companyToDomain(company);
  const emails = generateEmails(topCard.name, domain);

  return {
    name:            topCard.name,
    linkedinUrl:     profileUrl,
    email:           emails[0] || null,
    emailCandidates: emails,
    title,
    company,
    country:         topCard.country,
  };
}

// ── Search: collect profile URLs ──────────────────────────────────────────────
async function collectProfileUrls(page, title, country, targetTotal, alreadyKnown) {
  const query = [title, country].filter(Boolean).join(' ');
  const base  = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;

  const urls = new Set(alreadyKnown);
  let pg = 1;

  while (urls.size < targetTotal) {
    process.stdout.write(`\r📄 Search page ${pg} — ${urls.size}/${targetTotal} URLs found   `);
    await page.goto(`${base}&page=${pg}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const found = await page.evaluate(() => {
      const out = new Set();
      document.querySelectorAll('a[href*="linkedin.com/in/"], .entity-result__title-text a').forEach(a => {
        const m = (a.href || '').match(/linkedin\.com\/in\/([^?/]+)/);
        if (m) out.add(`https://www.linkedin.com/in/${m[1]}/`);
      });
      return [...out];
    });

    if (found.length === 0) break; // no more results
    found.forEach(u => urls.add(u));
    pg++;
    await jitter(2000, 3500);
  }
  process.stdout.write('\n');
  return [...urls].slice(0, targetTotal);
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const r = { title: '', country: '', max: 50 };
  for (let i = 0; i < args.length; i++) {
    if      (args[i] === '--title'   || args[i] === '-t') r.title   = args[++i] || '';
    else if (args[i] === '--country' || args[i] === '-c') r.country = args[++i] || '';
    else if (args[i] === '--max'     || args[i] === '-n') r.max     = parseInt(args[++i], 10) || 50;
  }
  return r;
}

// ── Progress display ──────────────────────────────────────────────────────────
function printProgress(progress, results, startedAt) {
  const done    = progress.done.length;
  const failed  = progress.failed.length;
  const total   = progress.queued.length;
  const withEmail = results.filter(r => r.email).length;
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
  const rate    = done > 0 ? (done / (elapsed / 60)).toFixed(1) : '—';
  process.stdout.write(
    `\r✅ ${done}/${total}  📧 ${withEmail} emails  ❌ ${failed} failed  ⏱ ${elapsed}s  📈 ${rate}/min   `
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const { title, country, max } = parseArgs();
  if (!title || !country) {
    console.log('Usage: node run_email_campaign.js --title "CTO" --country "Japan" --max 50');
    process.exit(1);
  }

  const dir      = campaignDir(title, country);
  const progress = loadProgress(dir);
  const results  = loadResults(dir);

  const isResume = progress.done.length > 0 || progress.queued.length > 0;

  console.log('\n' + '='.repeat(62));
  console.log('📧 LinkedIn Email Campaign Scraper');
  console.log(`   title:   ${title}`);
  console.log(`   country: ${country}`);
  console.log(`   target:  ${max} profiles`);
  console.log(`   mode:    ${isResume ? '▶ RESUMING' : '🆕 NEW CAMPAIGN'}`);
  console.log(`   dir:     ${path.relative(process.cwd(), dir)}`);
  console.log('='.repeat(62) + '\n');

  const cookiesPath = findCookiesPath();
  const browser     = await chromium.launch({ headless: true });
  const ctxOpts     = { viewport: { width: 1280, height: 900 } };
  if (cookiesPath) ctxOpts.storageState = cookiesPath;
  const context = await browser.newContext(ctxOpts);
  const page    = await context.newPage();

  try {
    // Session
    if (cookiesPath) {
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

    // ── Phase 1: Collect URLs (skip if we already have enough queued) ─────────
    const knownUrls   = new Set([...progress.queued, ...progress.done, ...progress.failed]);
    const needMore    = max > knownUrls.size;

    if (needMore) {
      console.log('🔍 Collecting profile URLs from search...');
      const allUrls = await collectProfileUrls(page, title, country, max, knownUrls);
      // Add newly found URLs to the queue (skip already processed)
      const doneSet   = new Set(progress.done);
      const failedSet = new Set(progress.failed);
      allUrls.forEach(u => {
        if (!doneSet.has(u) && !failedSet.has(u) && !progress.queued.includes(u))
          progress.queued.push(u);
      });
      progress.meta = { title, country, max, updatedAt: new Date().toISOString() };
      saveProgress(dir, progress);
      console.log(`✅ ${progress.queued.length} profiles queued  (${progress.done.length} already done)\n`);
    } else {
      console.log(`📋 ${progress.queued.length} in queue, ${progress.done.length} already done — skipping search\n`);
    }

    // ── Phase 2: Scrape queued profiles ───────────────────────────────────────
    const pending   = progress.queued.filter(u => !progress.done.includes(u) && !progress.failed.includes(u));
    const startedAt = Date.now();

    console.log(`🚀 Scraping ${pending.length} profiles...\n`);

    for (let i = 0; i < pending.length; i++) {
      const url = pending[i];
      printProgress(progress, results, startedAt);

      try {
        const data = await scrapeProfile(page, url);
        results.push(data);
        progress.done.push(url);
      } catch (err) {
        progress.failed.push(url);
        results.push({ linkedinUrl: url, error: err.message.slice(0, 120) });
      }

      // Save after every profile — crash-safe
      saveProgress(dir, progress);
      saveResults(dir, results);

      if (i < pending.length - 1) await jitter(2500, 4500);
    }

    printProgress(progress, results, startedAt);
    process.stdout.write('\n\n');

    // ── Summary ───────────────────────────────────────────────────────────────
    const ok       = results.filter(r => r.name);
    const withEmail = results.filter(r => r.email);

    console.log('='.repeat(62));
    console.log(`✅ Done  |  ${ok.length} profiles  |  ${withEmail.length} emails generated`);
    console.log(`❌ Failed: ${progress.failed.length}`);
    console.log(`💾 results.json  → ${path.relative(process.cwd(), path.join(dir, 'results.json'))}`);
    console.log(`📊 results.csv   → ${path.relative(process.cwd(), path.join(dir, 'results.csv'))}`);
    console.log('='.repeat(62));

    // Print last 5 results as preview
    console.log('\nRecent results:');
    ok.slice(-5).forEach(r =>
      console.log(`  ${(r.name || '').padEnd(22)} ${(r.email || '—').padEnd(34)} ${r.title || '—'}`)
    );

  } catch (err) {
    console.error('\n❌ Fatal:', err.message);
  } finally {
    await browser.close();
  }
})();
