const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const storageState = 'cookies.json';
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    const testUrl = 'https://www.linkedin.com/in/kanako-takahashi-496200140/';
    console.log(`Navigating to: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'networkidle' });
    
    console.log('Final URL:', page.url());
    const title = await page.title();
    console.log('Page Title:', title);
    
    const h1 = await page.locator('h1').first().textContent().catch(() => 'N/A');
    console.log('H1 content:', h1.trim());

    // Save a snippet of the HTML to see what's actually there
    const body = await page.content();
    fs.writeFileSync('debug_profile.html', body);
    console.log('Saved debug_profile.html');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
