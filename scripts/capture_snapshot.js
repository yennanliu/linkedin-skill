const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const storageState = 'cookies.json';
  
  if (!fs.existsSync(storageState)) {
    console.error('❌ Error: cookies.json not found.');
    process.exit(1);
  }

  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    const testUrl = 'https://www.linkedin.com/in/rossrmartin/';
    console.log(`🌐 Navigating to: ${testUrl}`);
    
    // Use a longer timeout and wait for network idle to ensure everything is loaded
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    // Extra wait for any late-loading JS and to be less "active"
    await page.waitForTimeout(10000);
    
    console.log('📄 Page loaded. Current URL:', page.url());
    console.log('📑 Page Title:', await page.title());

    // Scroll to ensure virtualized content is rendered
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const html = await page.content();
    const filePath = path.join(process.cwd(), 'profile_snapshot.html');
    fs.writeFileSync(filePath, html);
    
    console.log(`✅ Snapshot saved to: ${filePath}`);
    console.log(`📏 HTML size: ${(html.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Error during snapshot:', error);
  } finally {
    await browser.close();
  }
})();
