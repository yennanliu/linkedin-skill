const { chromium } = require('playwright');
const fs = require('fs');

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
    console.log('🌐 Navigating to LinkedIn Feed...');
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle' });
    
    console.log('Current URL:', page.url());
    if (page.url().includes('linkedin.com/feed')) {
      console.log('✅ Session is still valid.');
    } else {
      console.log('❌ Session has expired or is redirected.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
})();
