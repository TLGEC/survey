import { createSurvey, normaliseSurvey, getPath, setPath, customerName, folderName, uid, SCHEMA_VERSION } from './src/schema.js';
import { parseMondayText } from './src/import.js';
import { panelOptions, priceOption, formatMoney, recommendedBatteryKwh, financeIllustration } from './src/pricing.js';
import { openStore, putSurvey, getSurvey, getSurveys, getActiveId, clearActiveId, putMedia, getMedia, updateMedia, deleteMedia, requestPersistentStorage } from './storage.js';
import { downloadJsonBackup, openCustomerEmail, downloadCustomerPdf, downloadTechnicalBrief, downloadCrmCsv } from './src/outputs.js';

let survey=null;
let media=[];
let importRecords=[];
let saveTimer=null;
let toastTimer=null;
let screen='visits';
const objectUrls=new Map();

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];

init().catch(error=>fatal(error));

async function init(){
  await openStore();
  requestPersistentStorage();
  populatePanels();
  bindEvents();
  updateConnection();
  addEventListener('online',updateConnection);
  addEventListener('offline',updateConnection);
  const active=await getSurvey(getActiveId());
  survey=normaliseSurvey(active);
  if(survey){media=await getMedia(survey.id);screen='conversation';}
  await renderAll();
  if('serviceWorker'in navigator&&location.protocol!=='file:') navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}

function bindEvents(){
  $('#homeButton').addEventListener('click',()=>go('visits'));
  $('#newVisitTop').addEventListener('click',startNew);
  $('#previewMonday').addEventListener('click',previewImport);
  $('#clearImport').addEventListener('click',()=>{$('#mondayPaste').value='';importRecords=[];renderImport();});
  $('#mondayFile').addEventListener('change',async event=>{const file=event.target.files[0];if(file){$('#mondayPaste').value=await file.text();previewImport();}});
  $('#mediaInput').addEventListener('change',event=>addMedia(event.target.files));
  $('#fieldBackup').addEventListener('click',()=>requireSurvey(()=>downloadJsonBackup(survey,media)));
  $('#downloadPdf').addEventListener('click',createPdf);
  $('#openEmail').addEventListener('click',()=>withPricing((primary,secondary)=>{openCustomerEmail(survey,primary,secondary);toast('Email draft opened. Attach the downloaded PDF before sending.');}));
  $('#downloadTechnical').addEventListener('click',()=>withPricing(primary=>downloadTechnicalBrief(survey,primary,media)));
  $('#downloadCrm').addEventListener('click',()=>withPricing(primary=>downloadCrmCsv(survey,primary)));
  $('#completeVisit').addEventListener('click',async()=>{if(!survey)return;survey.status='complete';await saveNow(true);toast('Visit marked complete and saved locally.');go('visits');});
  $('#togglePresentation').addEventListener('click',enterPresentation);
  $('#journeyNav').addEventListener('click',event=>{const button=event.target.closest('[data-screen]');if(button)go(button.dataset.screen);});
  document.addEventListener('click',handleClick);
  document.addEventListener('input',handleInput);
  document.addEventListener('change',handleInput);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&survey)saveNow(true);});
  addEventListener('pagehide',()=>{if(survey)saveNow(false);});
}

async function handleClick(event){
  const next=event.target.closest('[data-next]');if(next){go(next.dataset.next);return;}
  const choice=event.target.closest('[data-choice] button[data-value]');if(choice){
    if(!survey)return toast('Start or continue a visit first.');
    const path=choice.parentElement.dataset.choice;setPath(survey,path,choice.dataset.value);
    if(path==='solution.batteryBrand')applyBatteryBrandDefaults(choice.dataset.value);
    if(path==='solution.systemType')applySystemDefaults(choice.dataset.value);
    queueSave();renderDerived();return;
  }
  const multi=event.target.closest('[data-multi-choice] button[data-value]');if(multi){
    if(!survey)return;const path=multi.parentElement.dataset.multiChoice;const values=[...(getPath(survey,path)||[])];const index=values.indexOf(multi.dataset.value);if(index>=0)values.splice(index,1);else values.push(multi.dataset.value);setPath(survey,path,values);queueSave();renderDerived();return;
  }
  const imported=event.target.closest('[data-import-index]');if(imported){await startImported(importRecords[Number(imported.dataset.importIndex)]);return;}
  const resume=event.target.closest('[data-resume-id]');if(resume){await loadVisit(resume.dataset.resumeId);return;}
  const legacy=event.target.closest('[data-legacy-id]');if(legacy){const record=await getSurvey(legacy.dataset.legacyId);download(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),`legacy_${legacy.dataset.legacyId}.json`);return;}
  const remove=event.target.closest('[data-media-delete]');if(remove){await deleteMedia(remove.dataset.mediaDelete,survey.id);media=await getMedia(survey.id);renderMedia();queueSave();return;}
  const include=event.target.closest('[data-media-customer]');if(include){await updateMedia(include.dataset.mediaCustomer,{customerSelected:include.checked},survey.id);media=await getMedia(survey.id);return;}
}

function handleInput(event){
  if(!survey)return;
  const input=event.target;
  if(input.matches('[data-bind]')){
    const value=input.type==='number'?(input.value===''?'':Number(input.value)):input.value;
    setPath(survey,input.dataset.bind,value);
    if(input.dataset.bind==='site.panelCount'&&!survey.solution.panelCount)survey.solution.panelCount=value;
    syncBound(input.dataset.bind,input);
    queueSave();renderDerived();
  }else if(input.matches('[data-check]')){
    setPath(survey,input.dataset.check,input.checked);
    if(input.dataset.check==='finance.enabled'&&input.checked&&!survey.finance.totalPrice){const price=priceOption(survey);if(price.available)survey.finance.totalPrice=price.price;}
    queueSave();renderDerived();
  }
}

async function startNew(){
  if(survey)await saveNow(true);
  survey=createSurvey();media=[];clearObjectUrls();
  await saveNow(true);go('conversation');toast('New visit started. It is already saving on this tablet.');
}

async function startImported(record){
  if(survey)await saveNow(true);
  survey=createSurvey();
  Object.assign(survey.customer,record.customer);
  Object.assign(survey.source,record.source,{importedAt:new Date().toISOString(),raw:record.raw});
  Object.assign(survey.readiness,record.readiness);
  Object.assign(survey.energy,record.energy);
  media=[];clearObjectUrls();
  await saveNow(true);go('conversation');toast(`${customerName(survey)} is ready.`);
}

async function loadVisit(id){
  if(survey)await saveNow(true);
  const record=normaliseSurvey(await getSurvey(id));
  if(!record)return toast('That is an older read-only record. Use its download button instead.');
  survey=record;media=await getMedia(id);clearObjectUrls();go('conversation');
}

function previewImport(){
  try{const parsed=parseMondayText($('#mondayPaste').value);importRecords=parsed.records;$('#importStatus').textContent=`Found ${importRecords.length} appointment${importRecords.length===1?'':'s'}. Choose one to start.`;renderImport();}
  catch(error){importRecords=[];$('#importStatus').textContent=error.message;renderImport();}
}

async function addMedia(files){
  if(!survey)return toast('Start a visit before adding media.');
  const fileCount=files.length;
  const category=$('#mediaCategory').value;
  for(const file of [...files]){
    const item={id:uid('media'),surveyId:survey.id,createdAt:new Date().toISOString(),name:file.name||`${category}.${file.type.split('/')[1]||'file'}`,type:file.type||'application/octet-stream',size:file.size,category,customerSelected:file.type.startsWith('image/'),blob:file};
    await putMedia(item);
  }
  $('#mediaInput').value='';media=await getMedia(survey.id);await saveNow(true);renderMedia();toast(`${fileCount} file${fileCount===1?'':'s'} saved to ${customerName(survey)} only.`);
}

async function go(name){
  if(name!=='visits'&&!survey)return toast('Start or continue a visit first.');
  if(survey)await saveNow(true);
  screen=name;
  $$('.screen').forEach(section=>section.classList.toggle('active',section.id===`screen-${name}`));
  $$('#journeyNav [data-screen]').forEach(button=>button.classList.toggle('active',button.dataset.screen===name));
  scrollTo({top:0,behavior:'instant'});
  if(name==='visits')await renderVisits();
  if(name==='home')renderMedia();
  renderForm();renderDerived();
}

function queueSave(){
  if(!survey)return;survey.updatedAt=new Date().toISOString();setSaveState('Saving...','');clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNow(false),300);
}

async function saveNow(checkpoint=false){
  if(!survey)return;clearTimeout(saveTimer);
  try{await putSurvey(survey,{checkpoint});setSaveState('Saved locally','saved');renderHeader();}
  catch(error){setSaveState('Save failed','error');toast(`Save failed: ${error.message}`);}
}

async function renderAll(){await renderVisits();renderImport();renderForm();renderDerived();renderMedia();await go(screen);}

function renderForm(){
  if(!survey)return;
  $$('[data-bind]').forEach(input=>{const value=getPath(survey,input.dataset.bind);if(document.activeElement!==input)input.value=value??'';});
  $$('[data-check]').forEach(input=>input.checked=Boolean(getPath(survey,input.dataset.check)));
}

function renderDerived(){
  renderHeader();if(!survey)return;
  $$('[data-choice]').forEach(container=>{const selected=getPath(survey,container.dataset.choice);container.querySelectorAll('[data-value]').forEach(button=>button.classList.toggle('selected',button.dataset.value===String(selected)));});
  $$('[data-multi-choice]').forEach(container=>{const selected=getPath(survey,container.dataset.multiChoice)||[];container.querySelectorAll('[data-value]').forEach(button=>button.classList.toggle('selected',selected.includes(button.dataset.value)));});
  const longCable=Number(survey.site.cables.acMeters)>10||Number(survey.site.cables.dcMeters)>10;
  $('#cableReview').hidden=!longCable;
  const solar=survey.solution.systemType!=='battery-only',battery=survey.solution.systemType!=='solar-only';
  $('#solarBuilder').classList.toggle('hidden',!solar);$('#batteryBuilder').classList.toggle('hidden',!battery);
  $('#sigBatteryFields').classList.toggle('hidden',!battery||survey.solution.batteryBrand!=='Sigenergy');
  $('#teslaBatteryFields').classList.toggle('hidden',!battery||survey.solution.batteryBrand!=='Tesla');
  $('#secondaryFields').hidden=!survey.solution.secondary.enabled;
  $('#financeFields').hidden=!survey.finance.enabled;
  const panel=panelOptions()[survey.solution.panelKey];
  $('#solarSize').textContent=solar&&panel?`${(panel.watts*Number(survey.solution.panelCount||0)/1000).toFixed(2)} kWp`:'No solar';
  const target=recommendedBatteryKwh(survey);$('#batterySuggestion').innerHTML=`<strong>Starting point: around ${target.toFixed(1)} kWh</strong><br><span>Based on usage, future loads and backup preference. You remain in control of the final choice.</span>`;
  const primary=priceOption(survey);renderPrice(primary);
  const secondary=secondaryPrice();
  $('#secondaryPrice').textContent=secondary?.available?`Indicative installed price: ${formatMoney(secondary.price)}`:secondary?secondary.errors.join(' '):'';
  renderCustomer(primary,secondary);
  renderFinance();
  renderForm();
}

function renderPrice(primary){
  $('#primaryPrice').textContent=primary.available?formatMoney(primary.price):'Price needs review';
  $('#pricingStatus').textContent=primary.available?`One overall indicative installed price using Residential Pricing V${primary.authority.version}.`:primary.errors.join(' ');
  $('#batteryCapacity').textContent=primary.available&&primary.capacityKwh?`${primary.capacityKwh.toFixed(1)} kWh`:'No storage';
}

function renderCustomer(primary,secondary){
  const name=survey.customer.firstName||'your home';
  const hasPrice=primary.available;
  const goals=survey.discovery.goals.length?survey.discovery.goals:['A solution shaped around your priorities'];
  const product=survey.solution.batteryBrand==='Tesla'?'tesla-powerwall.webp':'sigenergy-battery.webp';
  const customerImage=media.find(item=>item.customerSelected&&item.type?.startsWith('image/'));
  const homeImage=customerImage?objectUrl(customerImage):'tlgec-home-hero.webp';
  const systemTitle={'solar-battery':'Solar working with intelligent storage','solar-only':'High-quality solar for lower bills','battery-only':'Intelligent storage for greater control'}[survey.solution.systemType];
  const observations=[survey.site.panelAreas&&`Panels proposed for ${survey.site.panelAreas}`,survey.site.roofNotes||'Final roof details will be confirmed during detailed design',survey.site.locations.battery&&`Battery proposed at ${survey.site.locations.battery}`].filter(Boolean);
  $('#customerRecommendation').innerHTML=`<header class="recommendMasthead"><img src="tlgec-logo.png" alt="The Little Green Energy Company"><div><strong>Indicative solution summary</strong><span>Premium renewable energy installations since 2010</span></div></header><div class="recommendHero"><div class="recommendCopy"><span class="eyebrow">Prepared for ${h(name)}</span><h1>A considered energy solution for your home.</h1><p>${h(systemTitle)}. Shaped around your priorities, then confirmed through detailed OpenSolar design.</p><div class="recommendSignature"><span>The Little Green Energy Company</span><small>Kent, Surrey &amp; Sussex</small></div></div><figure class="recommendHome"><img src="${homeImage}" alt="Domestic solar installation"><figcaption>Your home. Your priorities. One clear route.</figcaption></figure></div><div class="recommendBody"><section class="recommendOverview"><div><span class="eyebrow">Our recommendation</span><h2>${h(systemTitle)}</h2><p>High-quality equipment, thoughtfully specified for the way you use energy today and the plans you have for your home.</p></div>${survey.solution.systemType==='solar-only'?'':`<div class="recommendProduct"><img src="${product}" alt="${h(survey.solution.batteryBrand)} battery"><span>${h(survey.solution.batteryBrand)} storage</span></div>`}</section><div class="recommendMetrics"><div class="metric"><span>Solar</span><strong>${primary.sizeKw?`${primary.sizeKw.toFixed(2)} kWp`:'Not included'}</strong></div><div class="metric"><span>Storage</span><strong>${primary.capacityKwh?`${primary.capacityKwh.toFixed(1)} kWh`:'Not included'}</strong></div><div class="metric"><span>Illustrative saving</span><strong>${primary.assumptions?.annualSaving?`${formatMoney(primary.assumptions.annualSaving)} a year`:'Detailed design'}</strong></div><div class="metric"><span>Simple payback</span><strong>${primary.assumptions?.paybackYears?`${primary.assumptions.paybackYears.toFixed(1)} years`:'To confirm'}</strong></div></div><div class="recommendSections"><div><span class="eyebrow">What matters most</span><h2>Built around your priorities</h2><ul class="plainList">${goals.map(goal=>`<li>${h(goal)}</li>`).join('')}</ul></div><div><span class="eyebrow">Your property</span><h2>What we observed</h2><ul class="plainList">${observations.map(item=>`<li>${h(item)}</li>`).join('')}</ul></div></div><div class="priceStatement"><div><span>Overall indicative installed price</span><small>One clear price for the recommended system</small></div><strong>${hasPrice?formatMoney(primary.price):'Needs pricing review'}</strong><p>Indicative only and subject to detailed design. This summary is not a formal quotation.</p></div>${secondary?.available?`<div class="secondCustomerOption"><span class="eyebrow">Optional alternative</span><h2>${h(survey.solution.secondary.name||'Alternative route')}</h2><p>${h(survey.solution.secondary.note||'An alternative configuration for comparison.')}</p><strong>${formatMoney(secondary.price)} indicative installed price</strong></div>`:''}<details class="customerAssumptions"><summary>How these figures were estimated</summary><ul>${(primary.assumptions?.labels||[]).map(label=>`<li>${h(label)}</li>`).join('')}</ul></details><footer class="recommendFooter"><strong>Next step</strong><span>We will confirm the detailed design in OpenSolar before preparing any formal quotation.</span></footer></div>`;
}

function renderFinance(){
  const result=financeIllustration(survey.finance);$('#financeResult').innerHTML=result?`<span>Estimated monthly payment</span><strong>${formatMoney(result.monthly)}</strong><small>Total repayable ${formatMoney(result.total)}</small>`:'<span>Enter a price, illustrative rate and term.</span>';
}

async function renderVisits(){
  const records=await getSurveys();const current=records.filter(item=>Number(item.schemaVersion)===SCHEMA_VERSION);const legacy=records.filter(item=>Number(item.schemaVersion)!==SCHEMA_VERSION);
  $('#savedCount').textContent=current.length;
  $('#savedVisits').innerHTML=current.length?current.map(item=>`<div class="savedItem"><div><strong>${h(customerName(item))}</strong><span>${h(item.customer?.address||'Address not entered')} · ${h(item.status||'active')}</span></div><button data-resume-id="${a(item.id)}">Continue</button></div>`).join(''):'<p>No new-version visits saved yet.</p>';
  $('#legacyVisits').innerHTML=legacy.length?legacy.map(item=>`<div class="savedItem"><div><strong>${h(item.customer?.name||item.customer?.firstName||'Legacy visit')}</strong><span>Read-only previous version</span></div><button data-legacy-id="${a(item.id)}">Download</button></div>`).join(''):'<p>No older records found.</p>';
}

function renderImport(){
  $('#importPreview').innerHTML=importRecords.map((record,index)=>`<div class="appointmentItem"><div><strong>${h([record.customer.firstName,record.customer.lastName].filter(Boolean).join(' ')||'Unnamed customer')}</strong><span>${h(record.customer.address||'No address')} · Bill ${h(record.readiness.billStatus)}</span></div><button data-import-index="${index}">Start visit</button></div>`).join('');
}

function renderMedia(){
  $('#mediaCount').textContent=media.length;
  $('#mediaGrid').innerHTML=media.map(item=>{let preview='';if(item.type.startsWith('image/'))preview=`<img src="${objectUrl(item)}" alt="${a(item.category)}">`;else if(item.type.startsWith('video/'))preview=`<video src="${objectUrl(item)}" controls preload="metadata"></video>`;return `<article class="mediaItem">${preview}<div class="mediaMeta"><strong>${h(item.category)}</strong><span>${h(item.name)}</span>${item.type.startsWith('image/')?`<label><input type="checkbox" data-media-customer="${a(item.id)}" ${item.customerSelected?'checked':''}> Include in customer PDF</label>`:''}<button data-media-delete="${a(item.id)}">Remove</button></div></article>`;}).join('');
}

function renderHeader(){
  $('#activeCustomer').textContent=survey?customerName(survey):'No visit selected';$('#activeAddress').textContent=survey?(survey.customer.address||'Address not entered'):'Start a new visit or import Monday appointments';$('#importSource').textContent=survey?.source.type==='monday-csv'?'Imported from Monday':'Manual visit';
}

function populatePanels(){const select=$('#panelSelect');select.innerHTML=Object.entries(panelOptions()).map(([key,panel])=>`<option value="${key}">${h(panel.name)}${panel.offer?' - warehouse offer':''}</option>`).join('');}
function applyBatteryBrandDefaults(brand){if(brand==='None'){survey.solution.batteryQty=0;if(survey.solution.systemType!=='solar-only')survey.solution.systemType='solar-only';}else{survey.solution.batteryQty=Math.max(1,Number(survey.solution.batteryQty)||1);if(survey.solution.systemType==='solar-only')survey.solution.systemType='solar-battery';survey.solution.inverterBrand=brand==='Tesla'?'Powerwall3':'SigEnergy';}}
function applySystemDefaults(type){if(type==='solar-only'){survey.solution.batteryBrand='None';survey.solution.batteryQty=0;if(survey.solution.inverterBrand==='Powerwall3')survey.solution.inverterBrand='SolarEdge';}else{if(survey.solution.batteryBrand==='None')survey.solution.batteryBrand='Sigenergy';survey.solution.batteryQty=Math.max(1,Number(survey.solution.batteryQty)||1);}}
function secondaryPrice(){if(!survey?.solution.secondary.enabled)return null;const secondary=survey.solution.secondary;return priceOption(survey,{secondary:true,panelCount:secondary.panelCount||survey.solution.panelCount,batteryBrand:secondary.batteryBrand,batteryQty:secondary.batteryQty,expansionQty:secondary.expansionQty,inverterBrand:secondary.batteryBrand==='Tesla'?'Powerwall3':survey.solution.inverterBrand,systemType:secondary.batteryBrand==='None'?'solar-only':survey.solution.systemType});}
function withPricing(action){requireSurvey(()=>{const primary=priceOption(survey),secondary=secondaryPrice();if(!primary.available)throw new Error(primary.errors.join(' '));return action(primary,secondary);});}
async function createPdf(){withPricing(async(primary,secondary)=>{const name=await downloadCustomerPdf(survey,primary,secondary,media);survey.output.lastPdfName=name;survey.output.lastPdfAt=new Date().toISOString();$('#pdfInstruction').textContent=`Downloaded ${name}. Attach this file in Outlook before sending.`;await saveNow(true);toast('Customer PDF downloaded.');});}
function enterPresentation(){document.body.classList.add('presentation');const button=document.createElement('button');button.className='presentationExit';button.textContent='Exit presentation';button.addEventListener('click',()=>{document.body.classList.remove('presentation');button.remove();});document.body.appendChild(button);scrollTo(0,0);}
function requireSurvey(action){if(!survey)return toast('Start or continue a visit first.');try{const result=action();if(result?.catch)result.catch(error=>toast(error.message));}catch(error){toast(error.message);}}
function syncBound(path,source){$$(`[data-bind="${CSS.escape(path)}"]`).forEach(input=>{if(input!==source)input.value=source.value;});}
function setSaveState(text,className){const badge=$('#saveBadge');badge.textContent=text;badge.className=`statusPill ${className}`;}
function updateConnection(){$('#connectionBadge').textContent=navigator.onLine?'Online':'Offline ready';}
function objectUrl(item){if(!objectUrls.has(item.id))objectUrls.set(item.id,URL.createObjectURL(item.blob));return objectUrls.get(item.id);}
function clearObjectUrls(){for(const url of objectUrls.values())URL.revokeObjectURL(url);objectUrls.clear();}
function toast(message){const element=$('#toast');element.textContent=message;element.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('show'),3800);}
function fatal(error){console.error(error);document.body.innerHTML=`<main><article class="card"><h1>LG Survey Pro could not start</h1><p>${h(error.message)}</p><p>Your existing local records have not been changed.</p></article></main>`;}
function h(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function a(value){return h(value).replace(/`/g,'');}
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

window.LGSurveyTest={getSurvey:()=>structuredClone(survey),price:()=>survey?priceOption(survey):null,media:()=>media.map(({blob,...item})=>item),go,startNew};
