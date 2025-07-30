const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://www.etermin.net/buergerinnenamt?servicegroupid=150800', { waitUntil: 'networkidle2' });

    const serviceLi = 'li#\\31 88562';
    console.log('⏳ Waiting for service li element...');
    await page.waitForSelector(serviceLi, { timeout: 30000 });

    await page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: 'center' });
    }, serviceLi);

    await new Promise(r => setTimeout(r, 500));
    await page.click(serviceLi);
    console.log('✅ Clicked on service li');

    const plusBtn = `${serviceLi} .counterPlus`;
    await page.waitForSelector(plusBtn, { timeout: 5000 });
    const currCount = await page.$eval('#capvalue188562', el => parseInt(el.textContent.trim(), 10));
    if (currCount < 1) {
      await page.click(plusBtn);
      console.log('🔁 Increased count to 1');
    } else {
      console.log('ℹ️ Count already 1 or more');
    }

    const weiter1 = '#bp1';
    await page.waitForSelector(weiter1, { timeout: 10000 });
    await page.click(weiter1);
    console.log('➡️ Clicked "Weiter zur Terminauswahl"');

    await page.waitForSelector('#divSlotsList li.timeslot', { timeout: 20000 });

    // Print out slots info for debugging
    const slotInfo = await page.$$eval('#divSlotsList li.timeslot', slots =>
      slots.map(slot => {
        const header = slot.closest('#divSlotsList').querySelector('.slotsHeader b');
        const time = slot.textContent.trim();
        const date = header ? header.textContent.trim() : 'NO HEADER';
        return { date, time };
      })
    );
    console.log('🗓️ Found slots:', JSON.stringify(slotInfo, null, 2));

    const targetDate = new Date('2025-08-1');
    let slotClicked = false;

    const slotElements = await page.$$('#divSlotsList li.timeslot');
    for (const slot of slotElements) {
      // Get the header date text
      const headerHandle = await slot.evaluateHandle(el => {
        return el.closest('#divSlotsList')?.querySelector('.slotsHeader b') || null;
      });
      if (!headerHandle) continue;

      const headerText = await headerHandle.evaluate(el => el.textContent);
      const dateMatch = headerText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (!dateMatch) continue;

      const [_, day, month, year] = dateMatch;
      const slotDate = new Date(`${year}-${month}-${day}`);

      if (slotDate < targetDate) {
        // Check visibility
        const isVisible = await slot.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 0 && el.offsetWidth > 0;
        });
        if (!isVisible) {
          console.log(`⚠️ Slot on ${headerText} not visible, skipping`);
          continue;
        }

        // Scroll slot into view
        await slot.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await new Promise(r => setTimeout(r, 500));

        // Get bounding box and click by coordinates
        const box = await slot.boundingBox();
        if (!box) {
          console.log(`⚠️ Slot bounding box not found for ${headerText}, skipping`);
          continue;
        }
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await new Promise(r => setTimeout(r, 1000));

        console.log(`✅ Clicked slot on ${headerText}`);
        slotClicked = true;
        break;
      }
    }

    if (!slotClicked) {
      console.log('❌ No slots available before 18 August 2025');
      await browser.close();
      return;
    }




    await page.waitForSelector('#FirstName', { timeout: 10000 });
    await page.type('#FirstName', 'Fjolla');
    await page.type('#LastName', 'Hasani');
    await page.type('#Birthday', '14.09.1993');
    await page.type('#Phone', '067763136131');
    await page.type('#Email', 'fjolla.h14@gmail.com');
    console.log('📝 Filled form fields');
const checkboxSelector = '#chkdp';
await page.waitForSelector(checkboxSelector, { visible: true, timeout: 10000 });

// Check if checkbox is already checked
const isChecked = await page.$eval(checkboxSelector, el => el.checked);
if (!isChecked) {
  await page.click(checkboxSelector);
  console.log('✅ Checked consent checkbox');
} else {
  console.log('ℹ️ Consent checkbox already checked');
}

    const bookBtn = '#cmdBookAppointment';
    await page.waitForSelector(bookBtn, { timeout: 10000 });
    await page.click(bookBtn);
    console.log('🎉 Attempted to book appointment');

    // Optionally close the browser here or keep it open for debugging
    // await browser.close();

  } catch (err) {
    console.error('❌ Error:', err);
    await browser.close();
  }
})();
