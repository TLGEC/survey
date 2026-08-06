import assert from 'node:assert/strict';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:4190/';
const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { chromium } = await import(playwrightModule);

const browser = await chromium.launch({ headless: true, executablePath: chromePath });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text());
});

async function openApp() {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.LGV3?.APP_VERSION === 'v3.0.0');
}

async function buildSolarBatteryVisit() {
  const wrappedCsv = `Here is the appointment information you requested.\n\n\`\`\`csv\nCustomer Name,Address,Postcode,Email,Phone,Annual kWh,Notes,Unexpected Column\nAlex Morgan,1 Test Road,AB1 2CD,alex@example.com,01234567890,4200,Interested in lower bills,Trace only\n\`\`\``;
  await page.fill('#mondayPaste', wrappedCsv);
  await page.click('#previewMonday');
  await page.waitForSelector('#importPreview:not([hidden])');
  assert.match(await page.textContent('#importSummary'), /8 columns and 1 appointment/);
  const unknownMapping = await page.locator('[data-map-column="7"]').inputValue();
  assert.equal(unknownMapping, 'ignore');
  await page.click('[data-import-record="0"]');
  await page.waitForSelector('#discover.active');
  assert.equal(await page.locator('[data-bind="customer.name"]').first().inputValue(), 'Alex Morgan');
  assert.match(await page.locator('[data-bind="customer.address"]').first().inputValue(), /AB1 2CD/);

  await page.click('[data-priority="Reduce electricity bills"]');
  await page.click('[data-priority="Gain more control over energy costs"]');
  await page.click('[data-primary-priority="Reduce electricity bills"]');
  await page.fill('[data-bind="priorities.goodResult"]', 'Lower bills with a system that is simple to understand.');
  await page.fill('[data-bind="priorities.mainConcern"]', 'Total price');
  await page.fill('[data-bind="priorities.decisionMakers"]', 'Alex and Sam');
  await page.click('[data-funding="Own savings / cash"]');

  await page.click('[data-next-panel="property"]');
  await page.fill('[data-roof-field="width"]', '8');
  await page.fill('[data-roof-field="slope"]', '5');
  await page.fill('[data-roof-field="pitch"]', '35');
  await page.fill('[data-roof-field="azimuth"]', '180');
  await page.fill('[data-bind="site.batteryLocation"]', 'Garage wall');
  await page.fill('[data-bind="site.cableRoute"]', 'External route to garage');
  await page.check('[data-check="site.routeAgreed"]');
  await page.click('#validateRoof');
  await page.waitForFunction(() => ['validated', 'validated-with-warnings'].includes(window.LGV3.priceState().reason ? window.LGV3.Store && window.LGV3.recommendationSummary() && document.querySelector('#roofFitPill')?.textContent.toLowerCase().includes('validated') ? 'validated' : '' : ''));
  await page.click('[data-next-panel="design"]');
  const suggestedPanels = Number(await page.locator('#panelCount').inputValue());
  assert.ok(suggestedPanels > 0, 'roof validation should set a starting panel count');
  await page.fill('[data-bind="design.reasonForRecommendation"]', 'This design matches the recorded energy use and the customer priority of reducing electricity bills.');
  await page.fill('[data-bind="design.batteryReason"]', 'Sized against annual use and evening consumption.');
  await page.fill('[data-bind="design.limitations"]', 'Final electrical checks and DNO approval remain outstanding.');
  await page.fill('[data-bind="design.warrantyInfo"]', 'Warranty details will be confirmed in the formal quote.');
  await page.fill('[data-bind="design.finalPriceOverride"]', '15000');
  await page.fill('[data-bind="design.priceAuthorityNote"]', 'Authorised by James for this quote');
  await page.check('[data-check="design.priceAuthorised"]');
  await page.waitForFunction(() => window.LGV3.priceState().ready === true);
  assert.match(await page.textContent('#quoteLive'), /£15,000/);
  assert.doesNotMatch(await page.textContent('#design'), /margin|profit|supplier cost/i);
}

async function runAdditionalScenarios() {
  const extraContext = await browser.newContext({ viewport: { width: 900, height: 1180 } });
  const extraPage = await extraContext.newPage();
  extraPage.on('pageerror', error => errors.push(error.message));
  extraPage.on('console', message => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
  try {
    await extraPage.goto(appUrl, { waitUntil: 'networkidle' });
    await extraPage.click('#startBlank');
    await extraPage.click('[data-panel="design"]');
    assert.match(await extraPage.textContent('#quoteLive'), /Customer price hidden/);

    await extraPage.click('[data-system-type="battery-only"]');
    await extraPage.waitForFunction(() => document.querySelector('#roofFitPill')?.textContent === 'Not required');
    await extraPage.fill('[data-bind="design.finalPriceOverride"]', '7850');
    await extraPage.fill('[data-bind="design.priceAuthorityNote"]', 'Authorised Powerwall customer total');
    await extraPage.check('[data-check="design.priceAuthorised"]');
    await extraPage.click('[data-battery-select="Tesla"]');
    const powerwall = await extraPage.evaluate(() => window.LGV3.recommendationSummary());
    assert.equal(powerwall.battery.referencePrice, 7850);
    assert.equal(powerwall.price.ready, true);
    assert.doesNotMatch(JSON.stringify(powerwall), /rebate/i);

    await extraPage.click('[data-battery-select="Sigenergy"]');
    const sigenergy = await extraPage.evaluate(() => window.LGV3.recommendationSummary().battery.text);
    assert.match(sigenergy, /SigenStor/);
    await extraPage.click('[data-system-type="solar-only"]');
    await extraPage.click('[data-panel="property"]');
    await extraPage.fill('[data-roof-field="width"]', '1');
    await extraPage.fill('[data-roof-field="slope"]', '1');
    await extraPage.click('#validateRoof');
    const failedRoof = await extraPage.evaluate(async () => {
      const survey = await window.LGV3.Store.getSurvey(localStorage.getItem('lg-v2-active-survey-id'));
      return survey.site.validation.status;
    });
    assert.equal(failedRoof, 'failed');

    await extraPage.click('[data-panel="prepare"]');
    await extraPage.fill('#mondayPaste', 'Customer Name,Unexpected Detail\nIncomplete Customer,Keep for traceability');
    await extraPage.click('#previewMonday');
    assert.equal(await extraPage.locator('[data-map-column="1"]').inputValue(), 'ignore');
    await extraPage.click('[data-import-record="0"]');
    await extraPage.waitForSelector('#discover.active');
    assert.match(await extraPage.textContent('#missingInfo'), /address, email, electricity use/);
    await extraPage.fill('[data-bind="priorities.decisionMakers"]', 'Partner will join the final decision');
    await extraPage.check('[data-check="energy.existingSolar"]');

    await extraPage.click('[data-panel="property"]');
    const files = Array.from({ length: 12 }, (_, index) => ({ name: `roof_${index + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(`test-image-${index + 1}`) }));
    await extraPage.locator('#mediaInput').setInputFiles(files);
    await extraPage.waitForFunction(() => Number(document.querySelector('#mediaCount')?.textContent) === 12);
    const mediaIsolation = await extraPage.evaluate(async () => {
      const id = localStorage.getItem('lg-v2-active-survey-id');
      const media = await window.LGV3.Store.getMedia(id);
      return { count: media.length, allMatch: media.every(item => item.surveyId === id) };
    });
    assert.deepEqual(mediaIsolation, { count: 12, allMatch: true });
  } finally {
    await extraContext.close();
  }
}

try {
  await openApp();
  await buildSolarBatteryVisit();

  await page.click('#presentRecommendation');
  assert.equal(await page.locator('#customerApp').isVisible(), true);
  assert.match(await page.textContent('#customerStage'), /You told us/i);
  await page.click('#customerContinue');
  assert.match(await page.textContent('#customerStage'), /Our recommendation/i);
  assert.match(await page.textContent('#customerStage'), /£15,000/);
  assert.doesNotMatch(await page.textContent('#customerApp'), /margin|profit|supplier cost|internal pricing/i);
  await page.click('#customerContinue');
  await page.click('[data-decision="Concern raised"]');
  await page.click('[data-concern="Total price"]');
  assert.equal(await page.evaluate(() => window.LGV3.crmSummaryText().includes('Total price')), true);

  await page.click('#returnSurveyor');
  await page.click('[data-panel="complete"]');
  await page.check('[data-check="confirmation.prioritiesUnderstood"]');
  await page.check('[data-check="confirmation.layoutConfirmed"]');
  await page.check('[data-check="confirmation.batteryConfirmed"]');
  await page.check('[data-check="confirmation.recommendationConfirmed"]');
  await page.click('#recordConfirmation');
  await page.waitForFunction(() => document.querySelector('#confirmationStatus')?.textContent.includes('not contract acceptance'));
  const email = await page.locator('#emailDraft').inputValue();
  assert.match(email, /Please confirm that you are happy with the proposed panel layout and battery size/);
  assert.doesNotMatch(email, /If you.d like|Let me know if|Feel free to|—/i);

  const downloadPromise = page.waitForEvent('download');
  await page.click('#downloadPack');
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^morgan_alex_survey_pack_.*\.zip$/);

  const recoveredBefore = await page.evaluate(() => window.LGV3.Store.getSurvey(localStorage.getItem('lg-v2-active-survey-id')).then(s => s.meta.recoveredCount));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.LGV3?.APP_VERSION === 'v3.0.0');
  const recoveredAfter = await page.evaluate(() => window.LGV3.Store.getSurvey(localStorage.getItem('lg-v2-active-survey-id')).then(s => s.meta.recoveredCount));
  assert.ok(recoveredAfter > recoveredBefore, 'reload should recover the active visit');
  assert.equal(await page.textContent('#surveyTitle'), 'Alex Morgan');

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LGV3?.APP_VERSION === 'v3.0.0');
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  assert.equal(await page.textContent('#connectionStatus'), 'Offline ready');
  await page.click('[data-panel="complete"]');
  await page.click('#prepareFormalQuote');
  await page.waitForFunction(async () => (await window.LGV3.Store.getQueueItems()).some(item => item.type === 'formal-quote-handoff'));
  const queued = await page.evaluate(() => window.LGV3.Store.getQueueItems());
  assert.ok(queued.some(item => item.type === 'formal-quote-handoff'));
  await context.setOffline(false);

  await runAdditionalScenarios();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'passed', scenarios: ['AI-wrapped CSV and unknown column', 'solar and battery', 'solar only', 'battery only', 'Powerwall current price and no rebate', 'roof-fit price gate', 'roof that cannot fit', 'existing solar', 'battery preference change', 'another decision maker', 'incomplete Monday data', 'customer view privacy', 'price concern', 'media-heavy isolation', 'pack export', 'interruption recovery', 'offline boot', 'offline formal quote queue'] }, null, 2));
} finally {
  await browser.close();
}
