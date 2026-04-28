const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({ headless: false }); // Show browser for manual intervention if needed
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Navigating to LinkedIn login page...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });

    console.log('👤 Entering credentials...');
    await page.fill('#username', config.linkedin.email);
    await page.fill('#password', config.linkedin.password);
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for manual verification or feed page (60s)...');
    try {
      await page.waitForURL(/linkedin\.com\/feed/, { timeout: 60000 });
      console.log('✅ Login successful!');
      await context.storageState({ path: 'cookies.json' });
      console.log('💾 Session saved to cookies.json');
    } catch (e) {
      console.log('❌ Timeout waiting for feed page. Current URL:', page.url());
    }

  } catch (error) {
    console.error('❌ Error during login:', error);
  } finally {
    await browser.close();
  }
})();
