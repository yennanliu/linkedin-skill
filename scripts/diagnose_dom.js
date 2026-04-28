const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const storageState = 'cookies.json';
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    const testUrl = 'https://www.linkedin.com/in/rossrmartin/';
    console.log(`🌐 Navigating to: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(10000);

    const diagnostics = await page.evaluate(() => {
      const results = {};
      results.url = window.location.href;
      results.title = document.title;
      results.h1Count = document.querySelectorAll('h1').length;
      results.h1Texts = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
      
      // Check for common LinkedIn containers
      results.hasMain = !!document.querySelector('main');
      results.hasExperience = !!document.querySelector('#experience');
      
      // Look for any text containing "Ross Martin"
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      results.matches = [];
      while (node = walker.nextNode()) {
        if (node.textContent.includes('Ross Martin')) {
          results.matches.push({
            text: node.textContent.trim(),
            parentTag: node.parentElement.tagName,
            parentClass: node.parentElement.className
          });
        }
      }
      
      return results;
    });

    console.log('Diagnostic Results:', JSON.stringify(diagnostics, null, 2));

  } catch (error) {
    console.error('❌ Error during diagnostics:', error);
  } finally {
    await browser.close();
  }
})();
