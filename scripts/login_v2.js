const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Show browser for manual intervention if needed
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Navigating to LinkedIn login page...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });

    console.log('👤 Entering credentials...');
    await page.fill('#username', 'f339339@gmail.com');
    await page.fill('#password', 'Ff127064755');
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
