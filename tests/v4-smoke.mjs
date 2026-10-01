import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PRICING_V87 } from '../src/pricing-data.js';

const appUrl=process.env.APP_URL||'http://127.0.0.1:4177/';
const playwrightPath=process.env.PLAYWRIGHT_MODULE||'/Users/Cooling/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(playwrightPath);
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1024,height:1366},acceptDownloads:true});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('mailto:'))errors.push(message.text());});

async function open(){await page.goto(appUrl,{waitUntil:'networkidle'});await page.waitForFunction(()=>Boolean(window.LGSurveyTest));}
async function set(path,value){const input=page.locator(`[data-bind="${path}"]:visible`).first();await input.fill(String(value));await input.blur();}
async function select(path,value){const input=page.locator(`[data-bind="${path}"]:visible`).first();await input.selectOption(String(value));}
async function choose(path,value){await page.locator(`[data-choice="${path}"] [data-value="${value}"]`).click();}
async function next(name){await page.locator(`[data-next="${name}"]`).click();await page.locator(`#screen-${name}.active`).waitFor();}
async function price(){return page.evaluate(()=>window.LGSurveyTest.price());}

await open();
assert.equal(await page.locator('#newVisitTop').isVisible(),true,'start action is visible without scrolling');
const approvedPanels=Object.values(PRICING_V87.panels);
assert.equal(approvedPanels.length,4,'only the four approved panel models are available');
assert.deepEqual([...new Set(approvedPanels.map(panel=>panel.unit))],[84],'approved panels share the P7 510W price baseline');
assert.deepEqual([...new Set(approvedPanels.map(panel=>panel.priceBaseline))],['SPR-P7-495/510/-BLK']);
assert.ok(approvedPanels.every(panel=>panel.dimensions.heightMm&&panel.dimensions.widthMm&&panel.dimensions.depthMm),'panel dimensions remain available offline');

const wrapped=`Here is everything for today's appointment.\n\nSome notes first.\n\n\`\`\`csv\nCustomer Name,Address,Email,Phone,Annual kWh,Annual Spend,Bill Status,Monday ID\nAlex Morgan,1 Test Road,alex@example.com,07123456789,5200,1680,Received,MON-101\n\`\`\`\nHope that helps.`;
await page.fill('#mondayPaste',wrapped);
await page.click('#previewMonday');
await page.locator('[data-import-index="0"]').waitFor();
assert.match(await page.textContent('#importStatus'),/Found 1 appointment/);
await page.click('[data-import-index="0"]');
await page.locator('#screen-conversation.active').waitFor();
assert.equal(await page.locator('[data-bind="customer.firstName"]').inputValue(),'Alex');
assert.equal(await page.locator('[data-bind="energy.annualKwh"]').inputValue(),'5200');
await choose('discovery.decisionMakers','Everyone is here');
await page.locator('[data-multi-choice="discovery.goals"] [data-value="Lower bills"]').click();
await page.locator('[data-multi-choice="discovery.goals"] [data-value="Energy independence"]').click();
await choose('discovery.financeRoute','Own savings / cash');
await page.locator('[data-multi-choice="discovery.futureLoads"] [data-value="Electric vehicle"]').click();
await choose('discovery.backupNeed','Important');
await choose('discovery.timeline','Within 3 months');
await choose('discovery.openingCommitment','Yes, if it works');
await set('discovery.notes','Customer is keen but wants a calm explanation. PRIVATE DISCOVERY NOTE');
await next('home');
await set('site.panelCount',12);
await choose('site.roofCovering','Concrete pantile');
await choose('site.framingKey','Pantile');
await set('site.panelAreas','rear south-west roof');
await set('site.roofNotes','Good condition with light morning shading from one tree.');
await set('site.locations.battery','garage side wall');
await set('site.locations.inverter','beside the battery');
await set('site.locations.gateway','inside by incoming supply');
await set('site.locations.meterBox','front external wall');
await set('site.cables.acMeters',14);
await set('site.cables.acRoute','external clipped route to garage');
await set('site.cables.dcMeters',12);
await set('site.cables.dcRoute','loft to garage route');
await page.selectOption('[data-bind="site.scaffold.required"]','yes');
await set('site.scaffold.lifts',2);
await set('site.technicalNotes','INTERNAL ONLY: narrow access on left side.');
assert.equal(await page.locator('#cableReview').isVisible(),true,'long cable review appears over 10m');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
await page.setInputFiles('#mediaInput',{name:'alex-roof.png',mimeType:'image/png',buffer:png});
await page.waitForFunction(()=>document.querySelector('#mediaCount')?.textContent==='1');
await next('solution');
await choose('solution.systemType','solar-battery');
await choose('solution.panelKey','sunpower-p7-500');
await set('solution.panelCount',12);
await choose('solution.batteryBrand','Sigenergy');
await set('solution.batteryQty',1);
let primary=await price();
assert.equal(primary.available,true,primary.errors?.join(' '));
assert.ok(primary.price>5000&&primary.price<50000,'mapped price is credible');
assert.equal(primary.panelPriceBaseline,'SPR-P7-495/510/-BLK');
assert.deepEqual(primary.panelDimensions,{heightMm:1996,widthMm:1134,depthMm:30});
assert.equal(primary.supplyPhase,'Single Phase');
assert.match(primary.controllerName,/6 kW/);
await page.locator('.internalDetails summary').click();
await page.check('[data-check="solution.extras.cableApproved"]');
await set('solution.extras.cableCost',180);
await page.check('[data-check="solution.extras.birdProtection"]');
const withExtras=await price();
assert.ok(withExtras.price>primary.price,'approved extras affect the overall price');
await page.check('[data-check="solution.secondary.enabled"]');
await set('solution.secondary.name','Extended evening cover');
await set('solution.secondary.panelCount',12);
await set('solution.secondary.batteryQty',2);
assert.match(await page.textContent('#secondaryPrice'),/Indicative installed price/);
await next('review');
const customerText=await page.textContent('#customerRecommendation');
assert.match(customerText,/Overall indicative installed price/);
assert.match(customerText,/Options/);
for(const forbidden of ['INTERNAL ONLY','PRIVATE DISCOVERY NOTE','cost allowance','Authorised by','commission','margin'])assert.ok(!customerText.includes(forbidden),`customer view leaked ${forbidden}`);
await page.click('#togglePresentation');
await page.locator('body.presentation').waitFor();
assert.equal(await page.locator('.financePanel').isVisible(),false,'internal finance controls are hidden in presentation mode');
await page.screenshot({path:'/private/tmp/lg-v4-presentation.png',fullPage:true});
await page.click('.presentationExit');
assert.equal(await page.locator('#financeFields').isVisible(),false,'finance is off by default');
await page.locator('.financePanel summary').click();
await page.check('[data-check="finance.enabled"]');
await set('finance.annualRate',4.9);
await set('finance.termYears',10);
assert.match(await page.textContent('#financeResult'),/Estimated monthly payment/);
assert.match(await page.textContent('.financePanel'),/Illustration only/);
await page.screenshot({path:'/private/tmp/lg-v4-customer-tablet.png',fullPage:true});
await next('close');
await choose('close.position','Yes - ready for the formal next step');
await set('close.concerns','Would like partner to read the summary tonight.');
const pdfDownload=page.waitForEvent('download');
await page.click('#downloadPdf');
const pdf=await pdfDownload;
await pdf.saveAs('/private/tmp/lg-v4-customer.pdf');
const pdfStat=await fs.stat('/private/tmp/lg-v4-customer.pdf');
assert.ok(pdfStat.size>5000,'customer PDF is non-empty');
await page.click('#openEmail');
await page.waitForFunction(()=>Boolean(window.__lastMailto));
const mailto=decodeURIComponent(await page.evaluate(()=>window.__lastMailto));
assert.match(mailto,/alex@example.com/);assert.match(mailto,/Indicative Solution Summary/);assert.match(mailto,/not a formal quotation/i);
assert.match(mailto,/home energy proposal/i);
await page.locator('.visitRecords summary').click();
const technicalDownload=page.waitForEvent('download');await page.click('#downloadTechnical');const technical=await technicalDownload;await technical.saveAs('/private/tmp/lg-v4-technical.html');
const technicalText=await fs.readFile('/private/tmp/lg-v4-technical.html','utf8');
for(const required of ['14m','12m','2 lift','garage side wall','narrow access','Single Phase','Concrete pantile','Pantile','SPR-P7-495/510'])assert.match(technicalText,new RegExp(required,'i'),`technical brief missing ${required}`);
const crmDownload=page.waitForEvent('download');await page.click('#downloadCrm');const crm=await crmDownload;await crm.saveAs('/private/tmp/lg-v4-crm.csv');

const firstId=await page.evaluate(()=>window.LGSurveyTest.getSurvey().id);
await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>Boolean(window.LGSurveyTest));
assert.equal(await page.evaluate(()=>window.LGSurveyTest.getSurvey().id),firstId,'active visit recovered after reload');
assert.equal(await page.evaluate(()=>window.LGSurveyTest.media().length),1,'media recovered with visit');
const snapshots=await page.evaluate(async id=>new Promise((resolve,reject)=>{const request=indexedDB.open('lg-survey-pro-v2',3);request.onsuccess=()=>{const tx=request.result.transaction('snapshots');const q=tx.objectStore('snapshots').index('surveyId').getAll(id);q.onsuccess=()=>resolve(q.result.length);q.onerror=()=>reject(q.error)};request.onerror=()=>reject(request.error)}),firstId);
assert.ok(snapshots>0,'recovery snapshot exists');

await page.click('#homeButton');await page.locator('#screen-visits.active').waitFor();await page.click('#newVisitTop');await page.locator('#screen-conversation.active').waitFor();
await set('customer.firstName','Jamie');await set('customer.lastName','Taylor');await set('customer.email','jamie@example.com');await set('customer.address','2 Battery Lane');await set('energy.annualKwh',3600);
await next('home');await set('site.panelCount',0);await page.setInputFiles('#mediaInput',{name:'jamie-meter.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('#mediaCount')?.textContent==='1');
await next('solution');await choose('solution.systemType','battery-only');await choose('solution.batteryBrand','Tesla');await set('solution.batteryQty',1);
const batteryOnly=await price();assert.equal(batteryOnly.available,true);assert.equal(batteryOnly.sizeKw,0);assert.ok(batteryOnly.capacityKwh>=13.5);
await page.click('#homeButton');await page.locator('#screen-visits.active').waitFor();await page.click(`[data-resume-id="${firstId}"]`);await page.locator('#screen-conversation.active').waitFor();await page.locator('[data-next="home"]').click();await page.locator('#screen-home.active').waitFor();
assert.match(await page.textContent('#mediaGrid'),/alex-roof.png/);assert.doesNotMatch(await page.textContent('#mediaGrid'),/jamie-meter.png/);

await page.click('#homeButton');await page.locator('#screen-visits.active').waitFor();await page.click('#newVisitTop');await set('customer.firstName','Sam');await set('customer.lastName','Solar');await set('energy.annualKwh',4200);await next('home');await set('site.panelCount',8);await choose('site.roofCovering','Plain tile');await next('solution');await choose('solution.systemType','solar-only');await choose('solution.panelKey','trina-440');await set('solution.panelCount',8);await choose('solution.inverterBrand','SolarEdge');
const solarOnly=await price();assert.equal(solarOnly.available,true);assert.equal(solarOnly.capacityKwh,0);assert.ok(solarOnly.sizeKw>3);
assert.equal(solarOnly.panelPriceBaseline,'SPR-P7-495/510/-BLK');

await page.check('[data-check="solution.panelOverride.enabled"]');
let manualReview=await price();assert.equal(manualReview.available,false);assert.match(manualReview.errors.join(' '),/product and price confirmation/i);
await page.uncheck('[data-check="solution.panelOverride.enabled"]');
await page.click('[data-screen="home"]');await page.locator('#screen-home.active').waitFor();
await select('site.supplyPhase','Three Phase');
await next('solution');await choose('solution.inverterBrand','SigEnergy');
const threePhase=await price();assert.equal(threePhase.available,false);assert.match(threePhase.errors.join(' '),/approved price/i);assert.equal(threePhase.supplyPhase,'Three Phase');
assert.ok(await page.locator('[data-controller-select]:visible option[value="sig-tp-15"]').count(),'three-phase controller choices are available');
await page.click('[data-screen="home"]');await page.locator('#screen-home.active').waitFor();await select('site.supplyPhase','Single Phase');await next('solution');

await page.setViewportSize({width:800,height:1100});await page.screenshot({path:'/private/tmp/lg-v4-solution-tablet.png',fullPage:true});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(overflow<=1,`tablet layout overflows by ${overflow}px`);
await next('review');await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/private/tmp/lg-v4-customer-mobile.png',fullPage:true});
const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(mobileOverflow<=1,`mobile customer view overflows by ${mobileOverflow}px`);

await page.goto(appUrl,{waitUntil:'networkidle'});await page.reload({waitUntil:'networkidle'});await context.setOffline(true);await page.waitForFunction(()=>navigator.onLine===false);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>Boolean(window.LGSurveyTest));assert.ok(await page.evaluate(()=>Boolean(window.LGSurveyTest.getSurvey())),'active record opens from the offline app shell');await context.setOffline(false);

assert.deepEqual(errors,[],`browser errors: ${errors.join('\n')}`);
console.log(JSON.stringify({ok:true,prices:{solarBattery:withExtras.price,batteryOnly:batteryOnly.price,solarOnly:solarOnly.price},snapshots,pdfBytes:pdfStat.size,artifacts:['/private/tmp/lg-v4-customer-tablet.png','/private/tmp/lg-v4-solution-tablet.png','/private/tmp/lg-v4-customer-mobile.png','/private/tmp/lg-v4-customer.pdf','/private/tmp/lg-v4-technical.html','/private/tmp/lg-v4-crm.csv']},null,2));
await browser.close();
