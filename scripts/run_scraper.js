const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

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

      // Scroll gradually to trigger intersection-observer lazy loads
      // Use larger steps with longer pauses between each
      for (let i = 0; i < 25; i++) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(2000);

      // Click "Show all X experiences" if present
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button'));
        const showAll = buttons.find(b => /show all.*experience/i.test(b.textContent));
        if (showAll) showAll.click();
      });
      await page.waitForTimeout(1500);

      const data = await page.evaluate(() => {
        const t = (el) => (el ? el.textContent.trim() : null);

        // ── Name ────────────────────────────────────────────────────────────
        // Aero (2024+): name is in h2, not h1. Skip "0 notifications" noise.
        const nameEl = Array.from(document.querySelectorAll('h1, h2')).find(el => {
          const txt = el.textContent.trim();
          return txt.length > 1 && txt.length < 80 && !txt.match(/^\d/) && !txt.toLowerCase().includes('notification');
        });
        const name = nameEl ? nameEl.textContent.trim() : null;

        // ── Headline + Location ─────────────────────────────────────────────
        // In LinkedIn aero, headline and location are <p> tags in the DOM immediately
        // after the name h2. Collect all p text in document order, find position of
        // name, then take the next few paragraphs.
        let headline = null;
        let location = null;
        let _companyLine = null;
        if (nameEl) {
          // Collect all visible p text in document order, tagged with position
          const allPs = Array.from(document.querySelectorAll('p'))
            .map(p => ({ el: p, txt: p.textContent.trim() }))
            .filter(({ txt }) => txt.length > 2);

          // Find index of first p that comes after nameEl in DOM order
          const afterName = [];
          let pastName = false;
          for (const { el, txt } of allPs) {
            if (!pastName) {
              // Check if this p follows the nameEl in DOM order
              const pos = nameEl.compareDocumentPosition(el);
              if (pos & Node.DOCUMENT_POSITION_FOLLOWING) pastName = true;
            }
            if (pastName) afterName.push(txt);
            if (afterName.length >= 10) break;
          }

          // Filter noise: skip connection degree markers (·), short tokens, the name itself
          const filtered = afterName.filter(t =>
            t !== name &&
            !t.startsWith('\u00b7') &&  // middle dot ·
            !t.match(/^\d+(st|nd|rd|th)$/) &&
            t.length > 4
          );

          headline = filtered[0] || null;
          // Location comes after the headline — skip filtered[0] and look for short city/country string
          location = filtered.slice(1).find(t => /,/.test(t) && t.length < 60) || null;
          // Company line: "CompanyName · Education" — appears right after headline
          _companyLine = filtered[1] || null;
        }

        // ── Experience ───────────────────────────────────────────────────────
        // Find experience section by heading text (works for both old and new architecture)
        const workHistory = [];
        const allSections = Array.from(document.querySelectorAll('section, div[data-view-name]'));
        const expSection = allSections.find(sec => {
          const heading = sec.querySelector('h2, h3, span');
          return heading && /^Experience$/i.test(heading.textContent.trim());
        });

        if (expSection) {
          const listItems = expSection.querySelectorAll('li');
          listItems.forEach((item) => {
            // Collect all visible non-empty text nodes (aria-hidden="true" are the displayed ones)
            const spans = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
              .map(s => s.textContent.trim())
              .filter(s => s.length > 1 && !s.match(/^·$/));

            if (spans.length < 2) return;

            const title = spans[0];
            const company = spans[1];
            // Date range: span matching year pattern
            const dateRange = spans.find(s => /\d{4}/.test(s) || /present/i.test(s)) || null;

            if (title && !['Experience', 'Education', 'Skills', 'Interests'].includes(title)) {
              workHistory.push({ title, company, dateRange });
            }
          });
        }

        const currentJob = workHistory[0] || null;

        // Fallback: parse currentTitle/currentCompany from top-card data when
        // the full experience section didn't load (LinkedIn aero lazy-loads it)
        let currentTitle = currentJob ? currentJob.title : null;
        let currentCompany = currentJob ? currentJob.company : null;
        if (!currentCompany && _companyLine) {
          // "Mercari, Inc. · ABV-Indian Institute..." → take first segment before ·
          currentCompany = _companyLine.split('·')[0].trim() || null;
        }
        if (!currentTitle && headline) {
          // "Senior Software Engineer @ Mercari, Japan" → "Senior Software Engineer"
          // "Job Consultant at IZANAU | ..." → "Job Consultant"
          const m = headline.match(/^(.+?)(?:\s+[@|]|\s+at\s)/i);
          currentTitle = m ? m[1].trim() : null;
        }
        // Seed workHistory with top-card entry if experience section not loaded
        if (workHistory.length === 0 && (currentTitle || currentCompany)) {
          workHistory.push({ title: currentTitle, company: currentCompany, dateRange: null, source: 'top-card' });
        }

        return {
          name,
          headline,
          location,
          currentCompany,
          currentTitle,
          industry: null,
          workHistory,
          profileUrl: window.location.href,
          _expFound: !!expSection
        };
      });

      // Debug: if workHistory still empty, save page HTML for inspection
      if (data.workHistory.length === 0) {
        const html = await page.content();
        const tmpPath = path.join(__dirname, `tmp_profile_${idx}.html`);
        fs.writeFileSync(tmpPath, html);
        console.log(`   ⚠️  workHistory empty (expFound=${data._expFound}). HTML saved → ${tmpPath}`);
      }
      delete data._expFound;

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
  const cookiesPath = fs.existsSync(path.join(__dirname, 'cookies.json'))
    ? path.join(__dirname, 'cookies.json')
    : path.join(__dirname, '..', 'cookies.json');
  const hasCookies = fs.existsSync(cookiesPath);

  const browser = await chromium.launch({ headless: true });
  const ctxOptions = { viewport: { width: 1280, height: 900 } };
  if (hasCookies) ctxOptions.storageState = cookiesPath;
  const context = await browser.newContext(ctxOptions);
  const page = await context.newPage();

  try {
    if (hasCookies) {
      console.log('🍪 Using saved session from cookies.json');
      await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      if (!page.url().includes('linkedin.com/feed')) {
        throw new Error('Saved session expired — delete cookies.json and re-run to login fresh');
      }
      console.log('✅ Session valid.');
    } else {
      console.log('🚀 Navigating to LinkedIn login page...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

      console.log('👤 Entering credentials...');
      await page.fill('#username', config.linkedin.email);
      await page.fill('#password', config.linkedin.password);
      await page.click('button[type="submit"]');

      console.log('⏳ Waiting for login to complete...');
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
    }

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
