const puppeteer = require('puppeteer');

function cssEscape(ident) {
  return ident.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|/@])/g, '\\$1');
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: null });
  const page = await browser.newPage();

  const url = 'https://citizen.bmi.gv.at/at.gv.bmi.fnsetvweb-p/etv/public/sva/Terminvereinbarung?locale=de';
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Select Bundesland: Steiermark (value="6")
  const bundeslandId = 'bundesland#terminanfrage@.@main';
  await page.waitForSelector(`#${cssEscape(bundeslandId)}`);
  await page.select(`#${cssEscape(bundeslandId)}`, '6');


  // Wait briefly for autocomplete suggestions to appear

// Fill Schlagwort autocomplete input
const schlagwortId = 'schlagwort.textbox#terminanfrage@.@main';
await page.waitForSelector(`#${cssEscape(schlagwortId)}`, { visible: true });
await page.type(`#${cssEscape(schlagwortId)}`, 'Führerschein - Umtausch ausländischer NICHT EU Führerschein', { delay: 100 });

// Wait for autocomplete suggestions and select the exact one
const suggestionSelector = `#${cssEscape(schlagwortId)}_listbox div[role="option"]`;
try {
  await page.waitForSelector(suggestionSelector, { timeout: 5000 });
  const options = await page.$$(suggestionSelector);

  let found = false;
  for (const option of options) {
    const text = await page.evaluate(el => el.textContent.trim(), option);
    if (text.includes('Führerschein - Umtausch ausländischer NICHT EU Führerschein')) {
      await option.evaluate(el => el.scrollIntoView());
      try {
        await option.click();
      } catch {
        // fallback to JS click if normal click fails
        await option.evaluate(el => el.click());
      }
      found = true;
      break;
    }
  }

  if (!found) {
    console.error('Autocomplete suggestion not found, trying keyboard navigation');
    // Fallback: Use keyboard to select suggestion
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }
} catch (err) {
  console.error('Autocomplete suggestions did not appear:', err);
  // Optional: fallback keyboard navigation here too
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}
await new Promise(resolve => setTimeout(resolve, 1000));


  // Select Stelle: Steiermark LPD SVA Referat 2 Verkehrsamt (value="1071")
  const stelleId = 'stelle#terminanfrage@.@main';
  await page.waitForSelector(`#${cssEscape(stelleId)}`);
  await page.select(`#${cssEscape(stelleId)}`, '1071');

  // Select Anzahl: 1
  const anzahlId = 'anzahl#terminanfrage@.@main';
  await page.waitForSelector(`#${cssEscape(anzahlId)}`);
  await page.select(`#${cssEscape(anzahlId)}`, '1');

  // Fill personal data helper
  const fillInput = async (id, value) => {
    const selector = `#${cssEscape(id)}`;
    await page.waitForSelector(selector);
    // Clear existing value
    await page.evaluate(sel => { document.querySelector(sel).value = ''; }, selector);
    await page.type(selector, value, { delay: 50 });
  };

  await fillInput('nachname#terminanfrage@.@main', 'HASANI');
  await fillInput('vorname#terminanfrage@.@main', 'FJOLLA');
  await fillInput('geburtsdatum#terminanfrage@.@main', '14.09.1993');
  await fillInput('telefonnummer#terminanfrage@.@main', '+4367763136131');
  await fillInput('gemeinde#terminanfrage@.@main', 'Graz');
  await fillInput('strasse#terminanfrage@.@main', 'Kreuzgasse 34');
  await fillInput('hausnummer#terminanfrage@.@main', '34');
  await fillInput('tuer#terminanfrage@.@main', '12');
  await fillInput('plz#terminanfrage@.@main', '8010');
  await fillInput('ort#terminanfrage@.@main', 'Graz');
  await fillInput('email#terminanfrage@.@main', 'fjolla.h14@gmail.com');

  // Click "Mögliche Termine anzeigen" button
const buttonId = 'timeslots#@.@timeslotssub';
const buttonSelector = `#${cssEscape(buttonId)}`;

console.log('Waiting for Mögliche Termine button...');
await page.waitForSelector(buttonSelector, { visible: true, timeout: 45000 })
  .catch(() => {
    throw new Error('Mögliche Termine button not found or not visible!');
  });

console.log('Clicking Mögliche Termine button...');
await page.click(buttonSelector);


  // Wait for possible dates to load (adjust the wait as needed)
await new Promise(resolve => setTimeout(resolve, 1000));

 
  // Wait for the appointment table to load
  await page.waitForSelector('#no-more-tables tbody tr', { visible: true, timeout: 15000 });

  // Define your desired date range
  const fromDate = new Date('2025-08-18T00:00:00');
  const toDate = new Date('2025-09-08T23:59:59');

  // Function to parse German datetime string to JS Date
  function parseGermanDateTime(dateStr) {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('.');
    return new Date(`${year}-${month}-${day}T${timePart}`);
  }

  // Get all rows in the table
  const rows = await page.$$('#no-more-tables tbody tr');
  if (rows.length === 0) {
    console.log('No appointment rows found');
    await browser.close();
    return;
  }

  // Extract the date from the first row
  const firstRow = rows[0];
  const dateText = await firstRow.$eval('td div label', el => el.textContent.trim());
  const appointmentDate = parseGermanDateTime(dateText);

  console.log('First available appointment date:', appointmentDate.toISOString());

  if (appointmentDate >= fromDate && appointmentDate <= toDate) {
    const button = await firstRow.$('button.btn-primary');
    if (!button) {
      console.error('Booking button not found for the first appointment');
      await browser.close();
      return;
    }

    await button.click();
    console.log('Clicked the booking button for the first available appointment');
  } else {
    console.log(`First appointment date ${appointmentDate.toLocaleString()} is outside the allowed range.`);
  }

  // Uncomment if you want to close the browser at the end
 await browser.close();

})();