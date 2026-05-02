const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launchPersistentContext('/Users/yennanliu/Library/Caches/ms-playwright/mcp-chrome-d0e78b9', {
    headless: true,
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.linkedin.com/jobs/search/?currentJobId=4400701938&distance=25&f_AL=true&geoId=104187078&keywords=software%20engineer&origin=JOB_SEARCH_PAGE_KEYWORD_HISTORY&refresh=true&start=75', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'linkedin_check.png' });
    console.log('Page title:', await page.title());
    const isLoggedIn = await page.evaluate(() => !!document.querySelector('.global-nav__me-photo'));
    console.log('Is logged in:', isLoggedIn);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
