/**
 * LinkedIn Single Profile Scraper
 *
 * Usage:
 * ```javascript
 * const profile = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');
 * console.log(profile);
 * ```
 */

/**
 * Scrape a single LinkedIn profile page.
 * @param {Page} page - Playwright page object
 * @param {string} profileUrl - Full LinkedIn profile URL (https://www.linkedin.com/in/...)
 * @returns {Promise<Object>} Structured profile data
 */
async function scrapeSingleProfile(page, profileUrl) {
  console.log(`\n🔍 Scraping: ${profileUrl}`);

  try {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Scroll to trigger lazy-loaded sections.
    // Scroll #experience anchor into view (not just the window) so LinkedIn
    // mounts the virtualized experience content before we extract it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(600);
    const expAnchor = page.locator('#experience');
    if (await expAnchor.count() > 0) {
      await expAnchor.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const profile = await page.evaluate(() => {
      const text = (el) => el ? el.textContent.trim() : null;
      const first = (sel) => text(document.querySelector(sel));

      // ── Basic info ──────────────────────────────────────────────────────
      const name = first('h1');
      const headline = first('.text-body-medium.break-words');
      const location = first('.text-body-small.inline.t-black--light.break-words');

      // ── Experience ──────────────────────────────────────────────────────
      const expSection = document.querySelector('#experience');
      const workHistory = [];

      if (expSection) {
        // Each experience entry is a <li> inside the experience section
        const items = expSection.closest('section')
          ? expSection.closest('section').querySelectorAll('li.artdeco-list__item')
          : expSection.querySelectorAll('li');

        items.forEach((item) => {
          // Company name — may appear as a sub-link or span
          const companyEl = item.querySelector(
            '.t-14.t-normal span[aria-hidden="true"], ' +
            '.hoverable-link-text span[aria-hidden="true"]'
          );
          const titleEl = item.querySelector(
            '.t-bold span[aria-hidden="true"], ' +
            '.mr1.t-bold span[aria-hidden="true"]'
          );
          const dateEl = item.querySelector(
            '.t-14.t-normal.t-black--light span[aria-hidden="true"]'
          );
          const locationEl = item.querySelectorAll(
            '.t-14.t-normal.t-black--light span[aria-hidden="true"]'
          );

          const company = companyEl ? companyEl.textContent.trim() : null;
          const title = titleEl ? titleEl.textContent.trim() : null;
          const dateRange = dateEl ? dateEl.textContent.trim() : null;
          // Location is typically the second .t-black--light span
          const loc = locationEl.length > 1 ? locationEl[1].textContent.trim() : null;

          if (company || title) {
            workHistory.push({ title, company, dateRange, location: loc });
          }
        });
      }

      // ── Current position ────────────────────────────────────────────────
      const currentJob = workHistory.length > 0 ? workHistory[0] : null;
      const currentCompany = currentJob ? currentJob.company : null;

      // ── Industry (from About section or meta) ───────────────────────────
      // LinkedIn sometimes surfaces industry in the intro card
      const industryEl = document.querySelector(
        '.pv-text-details__right-panel .t-14, ' +
        '[data-field="industry"] span'
      );
      const industry = industryEl ? industryEl.textContent.trim() : null;

      return {
        name,
        headline,
        location,
        currentCompany,
        industry,
        workHistory,
        profileUrl: window.location.href
      };
    });

    console.log(`   ✅ ${profile.name || 'Unknown'} @ ${profile.currentCompany || '—'}`);
    return { status: 'success', ...profile };

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { status: 'error', reason: error.message, profileUrl };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scrapeSingleProfile };
}
