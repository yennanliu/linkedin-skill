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
      // LinkedIn virtualizes section content — scroll the #experience anchor
      // into view rather than the window, then wait for content to mount.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
      await page.waitForTimeout(600);
      const expAnchor = page.locator('#experience');
      if (await expAnchor.count() > 0) {
        await expAnchor.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);

      const data = await page.evaluate(() => {
        const text = (el) => (el ? el.textContent.trim() : null);
        const first = (sel) => text(document.querySelector(sel));

        // Basic info
        const name = first('h1');
        const headline = first('.text-body-medium.break-words');
        const location = first('.text-body-small.inline.t-black--light.break-words');

        // Work history from experience section
        const workHistory = [];
        const expSection = document.querySelector('#experience');

        if (expSection) {
          const parentSection = expSection.closest('section') || expSection.parentElement;
          const items = parentSection
            ? parentSection.querySelectorAll('li.artdeco-list__item')
            : [];

          items.forEach((item) => {
            const spans = item.querySelectorAll('span[aria-hidden="true"]');
            const boldEl = item.querySelector('.t-bold span[aria-hidden="true"], .mr1.t-bold span[aria-hidden="true"]');
            const normalEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
            const lightEls = item.querySelectorAll('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

            const title = boldEl ? boldEl.textContent.trim() : null;
            const company = normalEls.length > 0 ? normalEls[0].textContent.trim() : null;
            const dateRange = lightEls.length > 0 ? lightEls[0].textContent.trim() : null;
            const workLocation = lightEls.length > 1 ? lightEls[1].textContent.trim() : null;

            if (title || company) {
              workHistory.push({ title, company, dateRange, location: workLocation });
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

      console.log(`   ✅ ${data.name || 'Unknown'} | ${data.currentCompany || '—'} | ${data.location || '—'}`);
      profiles.push({ status: 'success', ...data });

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
