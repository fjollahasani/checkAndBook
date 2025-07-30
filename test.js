const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('page.waitForTimeout exists?', typeof await new Promise(r => setTimeout(r, 500));
);

  await browser.close();
})();
