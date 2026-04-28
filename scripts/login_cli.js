const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Navigating to LinkedIn login page...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });

    console.log('👤 Entering credentials...');
    await page.fill('#username', 'REDACTED_EMAIL');
    await page.fill('#password', 'REDACTED');
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for navigation...');
    await page.waitForTimeout(10000);

    console.log('Current URL:', page.url());
    
    if (page.url().includes('checkpoint')) {
       console.log('🛑 SECURITY CHECK DETECTED!');
       // If there's a PIN, we can't solve it without user input.
    }

    if (page.url().includes('linkedin.com/feed')) {
      console.log('✅ Login successful!');
      await context.storageState({ path: 'cookies.json' });
      console.log('💾 Session saved to cookies.json');
    } else {
      console.log('❌ Login failed or redirected to:', page.url());
    }

  } catch (error) {
    console.error('❌ Error during login:', error);
  } finally {
    await browser.close();
  }
})();
