/**
 * LinkedIn Profile Batch Scraper
 *
 * Searches LinkedIn people by company / country / industry,
 * then visits each profile and extracts structured data.
 *
 * Usage:
 * ```javascript
 * const results = await scrapeLinkedInProfiles(page, {
 *   company: 'Google',
 *   country: 'United States',
 *   industry: 'Software Development',
 *   maxProfiles: 20
 * });
 * console.log(JSON.stringify(results, null, 2));
 * ```
 */

async function scrapeLinkedInProfiles(page, options = {}) {
  const {
    company = '',
    country = '',
    industry = '',
    keywords = '',
    maxProfiles = 10,
    maxPages = 5,
    delayMin = 2000,
    delayMax = 4000
  } = options;

  const delay = () =>
    page.waitForTimeout(delayMin + Math.random() * (delayMax - delayMin));

  // ── Build search URL ───────────────────────────────────────────────────
  // Combine filters into a keyword query — simplest approach that works
  // without needing LinkedIn URNs for company/geo/industry IDs.
  const queryParts = [keywords, company, country, industry].filter(Boolean);
  const searchQuery = queryParts.join(' ');

  const searchUrl =
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}` +
    `&origin=GLOBAL_SEARCH_HEADER`;

  console.log('\n' + '='.repeat(60));
  console.log('🔎 LinkedIn Profile Scraper');
  console.log(`   Company  : ${company || '—'}`);
  console.log(`   Country  : ${country || '—'}`);
  console.log(`   Industry : ${industry || '—'}`);
  console.log(`   Keywords : ${keywords || '—'}`);
  console.log(`   Max      : ${maxProfiles} profiles`);
  console.log('='.repeat(60) + '\n');

  // ── Phase 1: Collect profile URLs from search results ─────────────────
  const profileUrls = new Set();
  let currentPage = 1;

  while (currentPage <= maxPages && profileUrls.size < maxProfiles) {
    const pageUrl = searchUrl + `&page=${currentPage}`;
    console.log(`📄 Search page ${currentPage}: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Scroll to load all results
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll(
        'a[href*="/in/"][data-control-name="search_srp_result"], ' +
        'a[href*="linkedin.com/in/"], ' +
        '.entity-result__title-text a'
      );
      const found = new Set();
      links.forEach((a) => {
        const href = a.href || '';
        const match = href.match(/linkedin\.com\/in\/[^?/]+/);
        if (match) found.add('https://www.' + match[0]);
      });
      return [...found];
    });

    console.log(`   Found ${urls.length} profile links`);

    if (urls.length === 0) {
      console.log('   No more results. Stopping search.');
      break;
    }

    urls.forEach((u) => {
      if (profileUrls.size < maxProfiles) profileUrls.add(u);
    });

    currentPage++;
    await delay();
  }

  console.log(`\n✅ Collected ${profileUrls.size} unique profiles to scrape\n`);

  // ── Phase 2: Visit each profile and extract data ───────────────────────
  const profiles = [];
  let idx = 0;

  for (const url of profileUrls) {
    idx++;
    console.log(`[${idx}/${profileUrls.size}] Scraping profile...`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // Scroll to trigger lazy-loaded experience section.
      // Scroll #experience anchor into view via evaluate (not page.locator)
      // so the same code works in both Playwright and the mock test environment.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        const el = document.querySelector('#experience');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      await page.waitForTimeout(900);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);

      const data = await page.evaluate(() => {
        const text = (el) => (el ? el.textContent.trim() : null);
        const first = (sel) => text(document.querySelector(sel));

        // Auth wall detection — if redirected to login, bail early
        const currentUrl = window.location.href;
        if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint') || currentUrl.includes('/authwall')) {
          return { _authWall: true, profileUrl: currentUrl };
        }

        // Basic info
        const main = document.querySelector('main [role="main"]') || document.querySelector('main');
        const nameEl = main ? (main.querySelector('h1') || main.querySelector('h2')) : null;
        let name = nameEl ? nameEl.textContent.trim() : null;
        
        // Sanity check: if it looks like a UI label, it's probably not the name
        if (name && (name.toLowerCase().includes('notification') || name.length > 50)) {
          name = first('h1') || first('h2');
        }

        // Headline discovery - Look for significant text and split by degree marks
        let headline = first('.text-body-medium') || first('[data-field="headline"]');
        let location = first('.text-body-small.inline') || text(document.querySelector('[data-field="location"]'));

        const blocks = main ? Array.from(main.querySelectorAll('p, div')) : [];
        const headerBlock = blocks.find(b => {
            const text = b.textContent.trim();
            return text.length > 30 && text.includes('·');
        });

        if (headerBlock) {
            const parts = headerBlock.textContent.split('·').map(p => p.trim());
            const filteredParts = parts.filter(p => p !== name && !p.match(/^\d+(st|nd|rd|th)$/i));
            if (!headline || headline.startsWith('·')) headline = filteredParts[0] || headline;
            if (!location) location = filteredParts[2] || location;
        }

        // Work history - Filter out UI noise like 'notifications'
        const workHistory = [];
        let expContainer = null;
        const sections = Array.from(document.querySelectorAll('section'));
        expContainer = sections.find(s => {
            const h = s.querySelector('h2, h3, span');
            return h && h.textContent.trim().includes('Experience');
        });

        if (expContainer) {
          const items = expContainer.querySelectorAll('li');
          items.forEach((item) => {
            const spans = Array.from(item.querySelectorAll('span[aria-hidden="true"]'));
            const contentSpans = spans.filter(s => {
                const t = s.textContent.trim();
                return t.length > 3 && !t.toLowerCase().includes('notification') && !t.includes('connection');
            });
            
            if (contentSpans.length >= 2) {
              const title = contentSpans[0].textContent.trim();
              const company = contentSpans[1].textContent.trim();
              const dateRange = spans.find(s => s.textContent.match(/\d{4}/))?.textContent.trim() || null;
              
              if (title && !['Experience', 'Education', 'Skills', 'Interests'].includes(title)) {
                workHistory.push({ title, company, dateRange });
              }
            }
          });
        }

        const currentJob = workHistory[0] || null;

        // Industry — sometimes shown in the intro card
        const industryEl = document.querySelector(
          '.pv-text-details__right-panel .t-14, ' +
          '.pv-top-card--list li:last-child'
        );
        const industry = industryEl ? industryEl.textContent.trim() : null;

        return {
          name,
          headline,
          location,
          currentCompany: currentJob ? currentJob.company : null,
          currentTitle: currentJob ? currentJob.title : null,
          industry,
          workHistory,
          profileUrl: window.location.href
        };
      });

      if (data._authWall) {
        console.log(`   ⚠️  Auth wall detected — LinkedIn requires login. URL: ${data.profileUrl}`);
        profiles.push({ status: 'error', reason: 'auth_wall', profileUrl: url });
      } else {
        console.log(`   ✅ ${data.name || 'Unknown'} | ${data.currentCompany || '—'} | ${data.location || '—'}`);
        profiles.push({ status: 'success', ...data });
      }

    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      profiles.push({ status: 'error', reason: err.message, profileUrl: url });
    }

    if (idx < profileUrls.size) await delay();
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const succeeded = profiles.filter((p) => p.status === 'success').length;
  const failed = profiles.filter((p) => p.status === 'error').length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Scrape Complete');
  console.log(`   ✅ Success : ${succeeded}`);
  console.log(`   ❌ Failed  : ${failed}`);
  console.log('='.repeat(60) + '\n');

  return profiles;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scrapeLinkedInProfiles };
}
