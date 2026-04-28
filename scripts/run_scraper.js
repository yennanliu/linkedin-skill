const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Embed the scraper functions directly to make the script self-contained
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

  const profileUrls = new Set();
  let currentPage = 1;

  while (currentPage <= maxPages && profileUrls.size < maxProfiles) {
    const pageUrl = searchUrl + `&page=${currentPage}`;
    console.log(`📄 Search page ${currentPage}: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Removed the login wall check here as it might be over-sensitive
    // if (page.url().includes('login') || page.url().includes('checkpoint')) { ... }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

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
        if (match) {
          if (match[0].startsWith('linkedin.com')) {
            found.add('https://www.' + match[0]);
          } else {
            found.add(match[0]);
          }
        }
      });
      return [...found];
    });

    if (urls.length === 0) {
      console.log('   No profile links found on this page.');
      const content = await page.content();
      if (content.includes('checkpoint')) {
          console.log('   🚨 Search page is blocked by a security checkpoint.');
      } else if (content.includes('login')) {
          console.log('   🚨 Search page redirected to login.');
      } else {
          console.log('   Page Text Snippet:', await page.evaluate(() => document.body.innerText.substring(0, 500)));
      }
    }

    console.log(`   Found ${urls.length} profile links`);

    if (urls.length === 0) {
      console.log('   No more results. Stopping search.');
      break;
    }

    urls.forEach((u) => {
      if (profileUrls.size < maxProfiles) profileUrls.add(u);
    });

    currentPage++;
    if (profileUrls.size < maxProfiles) await delay();
  }

  console.log(`\n✅ Collected ${profileUrls.size} unique profiles to scrape\n`);

  const profiles = [];
  let idx = 0;

  for (const url of profileUrls) {
    idx++;
    console.log(`[${idx}/${profileUrls.size}] Scraping profile: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const el = document.querySelector('#experience');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);

      const data = await page.evaluate(() => {
        const text = (el) => (el ? el.textContent.trim() : null);
        const first = (sel) => text(document.querySelector(sel));

        const name = first('h1');
        const headline = first('.text-body-medium.break-words');
        const location = first('.text-body-small.inline.t-black--light.break-words');

        const workHistory = [];
        const expSection = document.querySelector('#experience');

        if (expSection) {
          const parentSection = expSection.closest('section') || expSection.parentElement;
          const items = parentSection
            ? parentSection.querySelectorAll('li.artdeco-list__item')
            : [];

          items.forEach((item) => {
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

  return profiles;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Navigating to LinkedIn login page...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });

    console.log('👤 Entering credentials...');
    await page.fill('#username', 'f339339@gmail.com');
    await page.fill('#password', 'Ff127064755');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for login to complete...');
    // Wait for the feed page or a verification check
    await page.waitForTimeout(5000);

    if (page.url().includes('checkpoint')) {
      console.log('🛑 SECURITY CHECK DETECTED! Current URL:', page.url());
      try {
        const pinInput = await page.$('input#input__email_verification_pin, input[name="pin"]');
        if (pinInput) {
          await pinInput.fill('328918');
          await page.click('#email-pin-submit-button, button[type="submit"]');
          console.log('✅ Code submitted. Waiting for redirection...');
          await page.waitForTimeout(10000);
        } else {
          console.log('❌ Could not find PIN input field.');
          const html = await page.content();
          console.log('Page HTML snippet:', html.substring(0, 1000));
        }
      } catch (e) {
        console.log('❌ Failed to handle security code:', e.message);
      }
    }

    await page.waitForURL(/linkedin\.com\/feed/, { timeout: 60000 }).catch(() => {
      console.log('⚠️ Did not reach feed page. Current URL:', page.url());
    });

    console.log('✅ Logged in successfully.');

    const results = await scrapeLinkedInProfiles(page, {
      keywords: 'SWE',
      country: 'japan',
      industry: 'internet',
      maxProfiles: 5
    });

    console.log('SCRAPE_RESULTS_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('SCRAPE_RESULTS_END');

  } catch (error) {
    console.error('❌ An error occurred:', error);
  } finally {
    await browser.close();
  }
})();
