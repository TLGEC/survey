const KEY='tlgec_current_draft_v1'; const SURVEYS_KEY='tlgec_surveys_saved_v1';
let selectedFiles=[]; let currentSavedId=null; let signatureData=''; let signaturePadDirty=false;
const ids=['customerName','surveyDate','address','phone','email','decisionMakers','competitors','mondayId','leadSource','appointmentTime','crmStatus','crmNotes','preInterest','preUsage','promisesMade','timing','crmPaste','wants','whyNow','roof','roof1Name','roof1Width','roof1Slope','roof1Pitch','roof1Azimuth','roof2Name','roof2Width','roof2Slope','roof2Pitch','roof2Azimuth','dims','shade','batteryLoc','invLoc','meter','cable','access','photoNotes','siteRiskNotes','annualKwh','dailyKwh','tariff','peak','offpeak','annualSpend','paybackNightRate','miles','exportRate','solarSelfUsePct','autoPanelChoice','autoPanelMargin','panelModel','panelCount','systemOverride','framingSelection','tigoQty','tigoPrice','batteryBrand','sigBatteryModel','sigModuleQty','sigInstallType','sigControllerMode','sigBatteryOnlyController','teslaSaleType','pw3Qty','dcExpQty','pw3Price','gatewayPrice','dcPrice','teslaDiscounts','teslaOtherNotes','sigController','sigControllerOverride','sigGatewayPrice','sig6Qty','sig10Qty','sig6Price','sig10Price','scaffoldLifts','zappiPrice','eddiPrice','otherExtraName','otherExtraPrice','extrasNote','manualDiscount','commercialNote','acceptanceNote','nextAction','followUp','confidence','gut','salesStatus','mainBlocker','customerLikelihood','blockerReason'];
const checks=['heatPump','highEvening','backupNeeded','askBill','askDecisionMaker','askCompetitors','askTiming','askBackup','askBudget','solar','battery','ev','eddi','otherExtra','tigo','bird','spds','pw3','gateway','dcExp','sigGateway','photoRoofFront','photoRoofRear','photoMeter','photoCU','photoFuse','photoBatteryLoc','photoInverterLoc','photoCableRoute','photoAccess','customerRouteAgreed'];
function $(x){return document.getElementById(x)}

function migrateOldStorageKeys(){
  const oldSurveyKeys=[
    'tlgec_survey_v10_saved','tlgec_survey_v13_saved','tlgec_survey_v14_saved','tlgec_survey_v15_saved',
    'tlgec_survey_v16_saved','tlgec_survey_v17_saved','tlgec_survey_v18_saved','tlgec_survey_v19_saved',
    'tlgec_survey_v20_saved','tlgec_survey_v21_saved','tlgec_survey_v22_saved','tlgec_survey_v23_saved',
    'tlgec_survey_v24_saved','tlgec_survey_v25_saved','tlgec_survey_v26_saved'
  ];
  const oldDraftKeys=[
    'tlgec_survey_v10_draft','tlgec_survey_v13_draft','tlgec_survey_v14_draft','tlgec_survey_v15_draft',
    'tlgec_survey_v16_draft','tlgec_survey_v17_draft','tlgec_survey_v18_draft','tlgec_survey_v19_draft',
    'tlgec_survey_v20_draft','tlgec_survey_v21_draft','tlgec_survey_v22_draft','tlgec_survey_v23_draft',
    'tlgec_survey_v24_draft','tlgec_survey_v25_draft','tlgec_survey_v26_draft'
  ];
  if(!localStorage.getItem(SURVEYS_KEY)){
    for(const k of oldSurveyKeys){
      const v=localStorage.getItem(k);
      if(v){localStorage.setItem(SURVEYS_KEY,v);break;}
    }
  }
  if(!localStorage.getItem(KEY)){
    for(const k of oldDraftKeys){
      const v=localStorage.getItem(k);
      if(v){localStorage.setItem(KEY,v);break;}
    }
  }
}

function today(){return new Date().toISOString().slice(0,10)}

const PRICE_GUIDE = {
  markup: 0.3793,
  salesCommission: 0.03,
  marketing: 0.02,
  panelCosts: {
    "AIKO 540W": 84,
    "AIKO 495W": 84,
    "SunPower P7 500W": 84,
    "SunPower P7 450W": 82.5
  },
  framingCosts: {"Pantile":30,"Plain Tile":73,"Trapezoidal":22.5,"Slate":57,"Standing Seam":31,"Flat Roof":80,"In-Roof":135,"Fibre Cement":50,"Quattro":97.5,"Ground Screws":97.5},
  optimiserCosts: {"Tigo":30},
  scaffoldFirstLift: 500,
  scaffoldExtraFactor: 0.85,
  spdSingle: 75,
  spdThree: 200,
  birdPerPanel: 17.5,
  evCharger: 900,
  otherCosts: 105,
  carriage: 55,
  labour: {pvInstaller:150, electrician:180, pvLabourer:130, pm:200, designer:200, admin:150}
};
const framingDayBands = {
  "Pantile":[0,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,2.5,2.5,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,3.5,3.5],
  "Plain Tile":[0,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,2.5,2.5,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,3.5,3.5],
  "Trapezoidal":[0,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2.25,2.25,2.25,2.25,2.25,2.5,2.5,2.5,2.5,2.5,2.75,2.75,2.75,2.75,2.75,2.75,2.75,2.75,2.75],
  "Slate":[0,1,1,1,1,1,2.25,2.25,2.25,2.25,2.25,3.25,3.25,3.25,3.25,3.25,4.5,4.5,4.5,4.5,4.5,5.5,5.5,5.5,5.5,5.5,6.75,6.75,6.75,6.75,6.75,8,8,8,8,8],
  "Standing Seam":[0,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1.75,1.75,1.75,1.75,1.75,2.5,2.5,2.5,2.5,2.5,3.25,3.25,3.25,3.25,3.25,4,4,4,4,4,4.5,4.5,4.5,4.5,4.5],
  "Flat Roof":[0,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,2.5,2.5,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,3.5,3.5],
  "In-Roof":[0,1,1,1,1,1,1.75,1.75,1.75,1.75,1.75,2.5,2.5,2.5,2.5,2.5,3.5,3.5,3.5,3.5,3.5,4.1,4.1,4.1,4.1,4.1,5.25,5.25,5.25,5.25,5.25,6.25,6.25,6.25,6.25,6.25],
  "Fibre Cement":[0,1,1,1,1,1,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,2.5,2.5,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,3.5,3.5],
  "Quattro":[0,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,3,3,3,3,3,3.75,3.75,3.75,3.75,3.75,4.5,4.5,4.5,4.5,4.5,5.25,5.25,5.25,5.25,5.25],
  "Ground Screws":[0,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,3,3,3,3,3,3.75,3.75,3.75,3.75,3.75,4.5,4.5,4.5,4.5,4.5,5.25,5.25,5.25,5.25,5.25]
};
function num(v){return Number(v||0)||0}

function clampNumber(v,min,max,fallback=0){
  let n=Number(v);
  if(!Number.isFinite(n)) n=fallback;
  return Math.max(min,Math.min(max,Math.round(n)));
}
function teslaPw3Qty(){
  const el=$('pw3Qty');
  if(el) return clampNumber(el.value,0,4,$('pw3')?.checked?1:0);
  return $('pw3')?.checked?1:0;
}
function teslaExpansionQty(){
  const el=$('dcExpQty');
  if(el) return clampNumber(el.value,0,3,$('dcExp')?.checked?1:0);
  return $('dcExp')?.checked?1:0;
}
function syncTeslaOptions(){
  const saleType=$('teslaSaleType')?.value||'solarBattery';
  let pw3=teslaPw3Qty();
  let exp=teslaExpansionQty();
  if(saleType==='gatewayOnly'){ pw3=0; exp=0; }
  if(exp>0 && pw3<1) pw3=1;
  pw3=Math.min(pw3,4); exp=Math.min(exp,3);
  if($('pw3Qty') && Number($('pw3Qty').value)!==pw3) $('pw3Qty').value=pw3;
  if($('dcExpQty') && Number($('dcExpQty').value)!==exp) $('dcExpQty').value=exp;
  if($('pw3')) $('pw3').checked=pw3>0;
  if($('dcExp')) $('dcExp').checked=exp>0;
  if($('gateway') && (saleType==='batteryGateway'||saleType==='gatewayOnly')) $('gateway').checked=true;
  if($('gateway') && saleType==='batteryOnly') $('gateway').checked=false;
  renderTeslaConfigGuide();
}
function teslaStorageKwh(){
  return (teslaPw3Qty()+teslaExpansionQty())*13.5;
}
function teslaRetailGuide(){
  const pw3=teslaPw3Qty(), exp=teslaExpansionQty();
  const gateway=$('gateway')?.checked ? 1 : 0;
  const gross=(pw3*num($('pw3Price')?.value||6500))+(gateway*num($('gatewayPrice')?.value||1000))+(exp*num($('dcPrice')?.value||5200));
  const discounts=num($('teslaDiscounts')?.value||0);
  return {gross,discounts,net:Math.max(0,gross-discounts),pw3,exp,gateway};
}
function teslaConfigMessages(){
  const saleType=$('teslaSaleType')?.value||'solarBattery';
  const pw3=teslaPw3Qty(), exp=teslaExpansionQty();
  const messages=[];
  if(exp>0 && pw3<1) messages.push('DC Expansion requires at least one Powerwall 3.');
  if(pw3>4) messages.push('Powerwall 3 quantity capped at 4.');
  if(exp>3) messages.push('DC Expansion quantity capped at 3 total.');
  if(pw3+exp>7) messages.push('Tesla maximum total system size is 7 units.');
  if(saleType==='gatewayOnly' && pw3>0) messages.push('Gateway-only mode should not include Powerwall units.');
  return messages;
}
function teslaConfigText(){
  const saleType=$('teslaSaleType')?.value||'solarBattery';
  const guide=teslaRetailGuide();
  const parts=[];
  if(guide.pw3) parts.push(`${guide.pw3} x Powerwall 3`);
  if(guide.gateway) parts.push('Backup Gateway');
  if(guide.exp) parts.push(`${guide.exp} x DC Expansion`);
  if(!parts.length && saleType==='gatewayOnly') parts.push('Backup Gateway only');
  if(!parts.length) parts.push('No Tesla hardware selected');
  return parts.join(' + ');
}
function renderTeslaConfigGuide(){
  const box=$('teslaConfigGuide');
  if(!box) return;
  const guide=teslaRetailGuide();
  const messages=teslaConfigMessages();
  const storage=teslaStorageKwh();
  box.innerHTML=`<div class="${messages.length?'quoteWarn':'quoteGood'}"><b>${teslaConfigText()}</b><p>${storage?storage.toFixed(1)+' kWh nominal storage':'Gateway-only / manual configuration'}</p><p>Guide gross ${money(guide.gross)}${guide.discounts?` less discounts ${money(guide.discounts)} = ${money(guide.net)}`:''}</p>${messages.length?'<ul>'+messages.map(m=>`<li>${m}</li>`).join('')+'</ul>':'<p>Configuration sense check passed. Final Tesla design remains subject to survey and product rules.</p>'}</div>`;
}


function money(n){return '£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0})}
function panelParts(){let [name,watt,dim,weight]=($('panelModel').value||'AIKO 495W|495|1762 x 1134 x 30 mm|20.6 kg').split('|');return {name,watt:+watt,dim,weight}}
function kWp(){let p=panelParts();return ((+($('panelCount').value||0)*p.watt)/1000).toFixed(2)}
function scope(){return [ $('solar').checked?'Solar':null,$('battery').checked?'Battery':null,$('ev').checked?'EV':null].filter(Boolean).join(', ')}
function flags(){return [ $('heatPump').checked?'Heat pump':null,$('highEvening').checked?'High evening use':null,$('backupNeeded').checked?'Backup wanted':null].filter(Boolean).join(', ')}
function sigStorage(){
  if($('sigBatteryModel')){
    const qty=num($('sigModuleQty')?.value||0);
    return qty*(($('sigBatteryModel').value==='6')?6.02:9.04);
  }
  return (+$('sig6Qty').value||0)*6.02+(+$('sig10Qty').value||0)*9.04
}
function sigUsable(){
  if($('sigBatteryModel')){
    const qty=num($('sigModuleQty')?.value||0);
    return qty*(($('sigBatteryModel').value==='6')?5.84:8.76);
  }
  return (+$('sig6Qty').value||0)*5.84+(+$('sig10Qty').value||0)*8.76
}

function getRoofPlanes(){
  const rows=[...document.querySelectorAll('.roofPlaneRow')];
  return rows.map((r,i)=>({
    name:r.querySelector('.roofName')?.value||`Roof ${i+1}`,
    width:r.querySelector('.roofWidth')?.value||'',
    slope:r.querySelector('.roofSlope')?.value||'',
    pitch:r.querySelector('.roofPitch')?.value||'',
    azimuth:r.querySelector('.roofAzimuth')?.value||'',
    panels:r.querySelector('.roofPanels')?.value||''
  })).filter(x=>x.name||x.width||x.slope||x.pitch||x.azimuth||x.panels);
}
function setRoofPlanes(planes){
  const box=$('roofPlanes'); if(!box) return;
  box.innerHTML='';
  (planes&&planes.length?planes:[{name:'Main roof'}]).forEach(p=>addRoofPlane(p));
}
function addRoofPlane(data={}){
  const box=$('roofPlanes'); if(!box) return;
  const idx=box.children.length+1;
  const div=document.createElement('div');
  div.className='roofPlaneRow';
  div.innerHTML=`<div class="roofRowHead"><b>Roof/elevation ${idx}</b><button type="button" class="removeRoof">Remove</button></div>
    <div class="roofGrid dynamic">
      <label>Name<input class="roofName" placeholder="Main rear roof" value="${data.name||''}"></label>
      <label>Width m<input class="roofWidth" type="number" inputmode="decimal" step="0.1" value="${data.width||''}"></label>
      <label>Slope m<input class="roofSlope" type="number" inputmode="decimal" step="0.1" value="${data.slope||''}"></label>
      <label>Pitch °<input class="roofPitch" type="number" inputmode="decimal" value="${data.pitch||''}"></label>
      <label>Azimuth °<input class="roofAzimuth" type="number" inputmode="decimal" value="${data.azimuth||''}"></label>
      <label>Panels here<input class="roofPanels" type="number" inputmode="numeric" value="${data.panels||''}"><span class="fieldHint">Auto-filled from roof fit. Edit manually for obstructions.</span></label>
    </div>
    <div class="roofFitResult">Add dimensions to calculate panel fit.</div>`;
  box.appendChild(div);
  div.querySelectorAll('input').forEach(el=>{
    el.addEventListener('input',()=>{
      if(el.classList.contains('roofPanels')) el.dataset.manual='yes';
      try{ if(typeof autoFitRoofPanels === 'function' && !el.classList.contains('roofPanels')) autoFitRoofPanels(false); }catch(e){}
      save();
    });
  });
  div.querySelector('.removeRoof').onclick=()=>{div.remove();renumberRoofPlanes();try{ if(typeof autoFitRoofPanels === 'function') autoFitRoofPanels(true); }catch(e){} save()};
  try{ if(typeof autoFitRoofPanels === 'function') autoFitRoofPanels(false); }catch(e){}
}
function renumberRoofPlanes(){document.querySelectorAll('.roofPlaneRow').forEach((r,i)=>{let b=r.querySelector('.roofRowHead b'); if(b)b.textContent=`Roof/elevation ${i+1}`})}
function roofLines(){
  const planes=getRoofPlanes();
  if(!planes.length)return 'None captured';
  return planes.map((r,i)=>`${i+1}. ${r.name||'Roof'}: width ${r.width||'?'} m, slope ${r.slope||'?'} m, pitch ${r.pitch||'?'}°, azimuth ${r.azimuth||'?'}°, panels ${r.panels||'not allocated'}`).join('\n');
}

function getData(){let d={};ids.forEach(i=>d[i]=$(i)?.value||'');checks.forEach(i=>d[i]=$(i)?.checked||false);d.scope=scope();d.flags=flags();d.files=selectedFiles.map(f=>f.name);d.roofPlanes=getRoofPlanes();d.batteryGuide=$('batteryGuide').textContent;d.quote=quote();d.present=$('presentSummary').innerText||'';d.acceptance=$('acceptanceStamp').innerText||'';d.signatureData=signatureData;d.currentSavedId=currentSavedId;return d}
function save(){
  // v58 stability: avoid heavy redraw/save loops while typing into high-frequency numeric fields.
  const activeId = document.activeElement && document.activeElement.id;
  if(activeId === 'tigoQty'){
    if(window.__lgSurveyTigoSaveTimer) clearTimeout(window.__lgSurveyTigoSaveTimer);
    window.__lgSurveyTigoSaveTimer = setTimeout(() => {
      try{
        localStorage.setItem(KEY,JSON.stringify(getData()));
        if(typeof updateHeader === 'function') updateHeader();
      }catch(e){}
    }, 300);
    return;
  }
  localStorage.setItem(KEY,JSON.stringify(getData()));
  if(window.__lgSurveyRenderLock) return;
  window.__lgSurveyRenderLock = true;
  try{ render(); }catch(e){}
  window.__lgSurveyRenderLock = false;
  try{ renderSavedList(); }catch(e){}
  try{ renderHomeSavedList(); }catch(e){}
}
function load(){let raw=localStorage.getItem(KEY);if(raw){try{let d=JSON.parse(raw);ids.forEach(i=>{if($(i))$(i).value=d[i]||''});checks.forEach(i=>{if($(i))$(i).checked=!!d[i]}); if(d.acceptance)$('acceptanceStamp').innerText=d.acceptance; currentSavedId=d.currentSavedId||null; signatureData=d.signatureData||''; setRoofPlanes(d.roofPlanes||[]);}catch(e){}}if(!document.querySelector('.roofPlaneRow')) setRoofPlanes([]);if(!$('surveyDate').value)$('surveyDate').value=today();if(!$('nextAction').value)$('nextAction').value='Send formal quote';if($('customerName').value && $('saveName')) $('saveName').value=$('customerName').value;render();updateSigPreview();refreshPresent();renderSavedList();renderHomeSavedList();updateSaveStatus();toggleConditionalFields();syncTeslaOptions();recommendBattery(false);renderTeslaConfigGuide();renderCustomerAgreementSummary()}
function syncUsage(changed){let a=parseFloat($('annualKwh').value||0), d=parseFloat($('dailyKwh').value||0);if(changed==='annual' && a>0)$('dailyKwh').value=(a/365).toFixed(1);if(changed==='daily' && d>0)$('annualKwh').value=Math.round(d*365)}
function recommendBattery(shouldSave=true){let k=parseFloat($('annualKwh')?.value||0), daily=parseFloat($('dailyKwh')?.value||0), hp=$('heatPump')?.checked, ev=$('ev')?.checked, backup=$('backupNeeded')?.checked;let txt='Enter annual or daily usage to guide battery sizing.';if(k||daily){if(!daily)daily=k/365;if(!k)k=daily*365;let rec='';if(daily<10)rec='Sigenergy 6.0 or Sigenergy 10.0.';else if(daily<18)rec='Sigenergy 10.0 as the clean default, or Powerwall 3 if Tesla/backup route is preferred.';else if(daily<28)rec='Powerwall 3 or 2 x Sigenergy 10.0.';else rec='Powerwall 3 + DC Expansion, or a larger Sigenergy stack.';if(ev||hp)rec+=' EV/heat pump usage may justify stepping up storage once the load profile is reviewed.';if(backup)rec+=' Backup requirement pushes the design toward a Gateway/backup-capable route.';txt=`Guide: ${rec} Average use is about ${daily.toFixed(1)} kWh/day (${Math.round(k)} kWh/year).`;}if($('batteryGuide'))$('batteryGuide').textContent=txt;if(shouldSave)save()}
function toggleConditionalFields(){const wants=(($('wants')?.value||'')+' '+($('preInterest')?.value||'')).toLowerCase();const evRelevant=!!$('ev')?.checked||wants.includes('ev')||wants.includes('electric vehicle')||wants.includes('zappi');const wrap=$('evMilesWrap');if(wrap)wrap.style.display=evRelevant?'block':'none';}

function panelCost(){
  const p=panelParts();
  return PRICE_GUIDE.panelCosts[p.name] ?? 84;
}
function framingDays(selection,count){
  const arr=framingDayBands[selection]||framingDayBands["Plain Tile"];
  const idx=Math.max(0,Math.min(Math.round(num(count)),arr.length-1));
  return arr[idx]||0;
}
function scaffoldCost(lifts, hasSolar){
  lifts=num(lifts);
  if(!hasSolar||lifts<=0)return 0;
  if(lifts===1)return PRICE_GUIDE.scaffoldFirstLift;
  return PRICE_GUIDE.scaffoldFirstLift+((lifts-1)*PRICE_GUIDE.scaffoldExtraFactor*PRICE_GUIDE.scaffoldFirstLift);
}
function sigPvInverterBand(systemKw){
  const s=num(systemKw);
  if(s<2)return 0;
  if(s<3)return 3;
  if(s<4)return 4;
  if(s<6)return 5;
  if(s<8)return 8;
  if(s<10)return 10;
  if(s<12)return 12;
  if(s<14)return 14;
  if(s<16)return 16;
  if(s<18)return 18;
  return 20;
}
function sigPvInverterCost(systemKw){
  const prices={3:780,4:850,5:835,6:866,8:1287,10:1402.5,12:1520,14:1662,16:1862,18:1976,20:2081};
  return prices[sigPvInverterBand(systemKw)]||0;
}
function sigBatteryOnlyControllerCost(){
  if(!$('sigInstallType','sigControllerMode','sigBatteryOnlyController')) return 0;
  let ctrl=$('sigInstallType','sigControllerMode','sigBatteryOnlyController').value.split('|');
  return num(ctrl[0]);
}
function sigBatteryDescription(){
  const model=($('sigBatteryModel')?.value||'10');
  const qty=num($('sigModuleQty')?.value||0);
  if(qty<=0)return 'No Sigenergy battery selected';
  const moduleName=model==='6'?'SigenStor BAT 6.0':'SigenStor BAT 10.0';
  const nominal=sigStorage().toFixed(2);
  const usable=sigUsable().toFixed(2);
  const gateway=$('sigGateway')?.checked?'Gateway included':'No Gateway';
  return `${moduleName} x ${qty} | ${nominal} kWh nominal / ${usable} kWh usable | ${gateway}`;
}
function updateSigPreview(){
  if(!$('sigPreviewBox'))return;
  const model=($('sigBatteryModel')?.value||'10');
  const qty=num($('sigModuleQty')?.value||0);
  const moduleName=model==='6'?'SigenStor BAT 6.0':'SigenStor BAT 10.0';
  $('sigPreviewBox').innerHTML=`<div class="sigPreviewMain">${moduleName}</div><div class="sigPreviewSub">${qty} module${qty===1?'':'s'} • ${sigStorage().toFixed(2)} kWh nominal • ${sigUsable().toFixed(2)} kWh usable • ${$('sigGateway')?.checked?'Gateway included':'No Gateway'}</div>`;
}
function batteryCostInternal(){
  let brand=$('batteryBrand').value, cost=0, text='None', inverterCost=0, controllerText='';
  if(brand==='Tesla'){
    syncTeslaOptions();
    const pw3=teslaPw3Qty();
    const exp=teslaExpansionQty();
    const hasGateway=!!$('gateway')?.checked;
    if(pw3>0){cost+=pw3*4075;}
    if(hasGateway){cost+=680;}
    if(exp>0){cost+=exp*3275;}
    cost-=num($('teslaDiscounts')?.value||0);
    text=teslaConfigText();
    controllerText='Tesla configuration guide: '+teslaStorageKwh().toFixed(1)+' kWh nominal storage';
  }
  if(brand==='Sigenergy'){
    const hasSolar=$('solar')?.checked && num($('panelCount')?.value)>0;
    const model=($('sigBatteryModel')?.value||'10');
    const qty=num($('sigModuleQty')?.value||0);
    const base=model==='6'?1575:2050;
    const gateway=$('sigGateway')?.checked?785:0;
    if(qty>0) cost += base + gateway + Math.max(qty-1,0)*base;
    if(hasSolar){
      inverterCost=sigPvInverterCost(kWp());
      controllerText=`PV inverter auto-sized to ${sigPvInverterBand(kWp())} kW`;
    } else {
      inverterCost=sigBatteryOnlyControllerCost();
      controllerText=($('sigInstallType','sigControllerMode','sigBatteryOnlyController')?.value||'0|None').split('|')[1]||'None';
    }
    text=sigBatteryDescription();
  }
  return {cost,text,inverterCost,controllerText};
}
function quote(){
  const hasSolar=$('solar').checked && num($('panelCount').value)>0;
  const hasBattery=$('battery').checked && $('batteryBrand').value!=='None';
  const panelCount=num($('panelCount').value);
  const frame=$('framingSelection')?.value||'Plain Tile';
  const batteryObj=batteryCostInternal();

  let panels = hasSolar ? panelCount*panelCost() : 0;
  let tigoQty = hasSolar && $('tigo')?.checked ? Math.max(0, Math.min(panelCount, num($('tigoQty')?.value || 0))) : 0;
  let optimisers = tigoQty*(num($('tigoPrice')?.value)||30);
  let framing = hasSolar ? panelCount*(PRICE_GUIDE.framingCosts[frame]||73) : 0;
  let inverter = hasBattery ? (batteryObj.inverterCost||0) : 0; // Sigenergy controller/PV inverter cost follows Residential Pricing V8.6.
  let battery = hasBattery ? batteryObj.cost : 0;
  let keyMaterials = panels+optimisers+framing+inverter+battery;

  let installDays = hasSolar ? framingDays(frame,panelCount) : 0;
  let pvInstaller = installDays*PRICE_GUIDE.labour.pvInstaller;
  let pvLabourer = installDays*PRICE_GUIDE.labour.pvLabourer;
  let electricianDays = (hasSolar?1:0) + (hasBattery?2:0) + ($('ev').checked?1:0);
  let electrician = electricianDays*PRICE_GUIDE.labour.electrician;
  let pm = (hasSolar&&hasBattery ? 0.5 : 0.25)*PRICE_GUIDE.labour.pm;
  let designer = 0.25*PRICE_GUIDE.labour.designer;
  let admin = 0.25*PRICE_GUIDE.labour.admin;
  let labour = pvInstaller+pvLabourer+electrician+pm+designer+admin;

  let carriage = (kWp()>8 || ((num($('sigModuleQty')?.value||0)>1)||(num($('sig6Qty')?.value||0)+num($('sig10Qty')?.value||0)>1)) || teslaExpansionQty()>0) ? PRICE_GUIDE.carriage*2 : PRICE_GUIDE.carriage;
  let logistics = carriage;
  let access = scaffoldCost($('scaffoldLifts').value,hasSolar);
  let other = PRICE_GUIDE.otherCosts;

  let spds = $('spds').checked ? PRICE_GUIDE.spdSingle : 0;
  let sundries = spds;
  let bird = (hasSolar && $('bird').checked) ? panelCount*PRICE_GUIDE.birdPerPanel : 0;
  let ev = $('ev')?.checked ? (num($('zappiPrice')?.value)||PRICE_GUIDE.evCharger) : 0;
  let eddi = $('eddi')?.checked ? num($('eddiPrice')?.value) : 0;
  let otherExtra = $('otherExtra')?.checked ? num($('otherExtraPrice')?.value) : 0;
  let extras = eddi + otherExtra;
  let extrasList = [];
  if($('ev')?.checked) extrasList.push('Zappi EV charger');
  if($('eddi')?.checked) extrasList.push('Eddi / hot water diverter');
  if($('otherExtra')?.checked) extrasList.push(($('otherExtraName')?.value||'Other extra').trim());
  let extrasText = extrasList.length ? extrasList.join(', ') : 'No manual extras selected';
  let optional = bird+ev+extras;

  let totalCost = keyMaterials+labour+logistics+access+other+sundries+optional;
  let discount=num($('manualDiscount').value);
  let calculatedTotal = totalCost*(1+PRICE_GUIDE.markup+PRICE_GUIDE.salesCommission+PRICE_GUIDE.marketing)-discount;
  let override=num($('systemOverride').value);
  let total = override>0 ? override : calculatedTotal;

  return {panels,optimisers,tigoQty,framing,inverter,battery,batteryText:batteryObj.text,controllerText:batteryObj.controllerText,scaff:access,ev,eddi,otherExtra,extras,extrasText,discount,total,totalCost,calculatedTotal,override,spds,bird,keyMaterials,labour,logistics,access,other,sundries,optional,kWp:kWp(),panel:panelParts(),sigNominal:sigStorage().toFixed(2),sigUsable:sigUsable().toFixed(2),framingSelection:frame};
}
function calculate(){let q=quote();let overrideText=q.override>0?'Approved override used. Included items are listed without cost breakdown.':'Calculated from Residential Pricing V8.6 logic.';if($('quoteTotal'))$('quoteTotal').innerHTML=`<b>Total: ${money(q.total)}</b><br>${overrideText}<br>${$('panelCount').value||0} x ${q.panel.name}, ${q.kWp} kWp<br>Battery: ${q.batteryText}<br>${q.controllerText?('Controller: '+q.controllerText+'<br>'):''}Bird protection: ${$('bird').checked&&$('solar').checked?'Included':'Not included'} | Tigo: ${q.tigoQty||0} optimiser(s) | SPDs: ${$('spds').checked?'Included':'Not included'} | Scaffold: ${$('scaffoldLifts').value||0} lift(s) included<br>Extras: ${q.extrasText||'No manual extras selected'}`;try{if((document.activeElement&&document.activeElement.id)!=='tigoQty')renderPanelSenseCheck()}catch(e){}if((document.activeElement&&document.activeElement.id)!=='tigoQty')refreshPresent();save()}






function getNumber(id, fallback=0){
  const el=$(id);
  if(!el) return fallback;
  const raw=(el.value||'').toString().trim();
  if(raw==='') return fallback;
  const n=Number(raw);
  return Number.isFinite(n)?n:fallback;
}
function getAnnualUsageForPayback(){
  const annual=getNumber('annualKwh',0);
  const daily=getNumber('dailyKwh',0);
  if(annual>0) return annual;
  if(daily>0) return daily*365;
  return 0;
}
function getPeakRateForPayback(){
  const peak=getNumber('peak',0);
  if(peak>0) return peak;
  const annualSpend=getNumber('annualSpend',0);
  const usage=getAnnualUsageForPayback();
  if(annualSpend>0 && usage>0) return (annualSpend/usage)*100;
  return 29;
}
function getNightRateForPayback(){
  const night=getNumber('paybackNightRate',0);
  if(night>0) return night;
  const offpeak=getNumber('offpeak',0);
  if(offpeak>0) return offpeak;
  return 5;
}
function batteryUsableKwhForPayback(){
  const brand=$('batteryBrand')?.value||'None';
  if(brand==='Tesla'){
    return teslaStorageKwh();
  }
  if(brand==='Sigenergy'){
    if($('sigBatteryModel')){
      const qty=getNumber('sigModuleQty',0);
      return qty*(($('sigBatteryModel').value==='6')?5.84:8.76);
    }
    const six=getNumber('sig6Qty',0);
    const ten=getNumber('sig10Qty',0);
    return six*5.84 + ten*8.76;
  }
  return 0;
}
function estimateAnnualGeneration(){
  const q=quote();
  const kwp=Number(q.kWp||0);
  const manual=getNumber('annualGeneration',0);
  if(manual>0) return manual;
  return kwp*900;
}
function estimatePayback(){
  const q=quote();
  const systemPrice=Number(q.total||0);
  const annualLoad=getAnnualUsageForPayback();
  const peak=getPeakRateForPayback();
  const night=getNightRateForPayback();
  const exportRate=getNumber('exportRate',15);
  const gen=estimateAnnualGeneration();
  const batt=batteryUsableKwhForPayback();
  const selfUsePct=Math.max(0,Math.min(getNumber('solarSelfUsePct', batt>0?75:45),95))/100;

  if(!systemPrice || (!annualLoad && !gen)){
    return {ok:false, systemPrice, annualLoad, peak, night, exportRate, gen, batt, totalSaving:0, payback:0, reason:'missing usage or price'};
  }

  const solarUsed=Math.min(gen*selfUsePct, annualLoad);
  const exportKwh=Math.max(gen-solarUsed,0);

  const remainingLoad=Math.max(annualLoad-solarUsed,0);
  const batteryNightCapacity=batt>0 ? batt*365*0.9 : 0;
  const nightShiftKwh=Math.min(remainingLoad, batteryNightCapacity);

  const solarSaving=solarUsed*(peak/100);
  const arbitrageSaving=nightShiftKwh*Math.max((peak-night)/100,0);
  const exportIncome=exportKwh*(exportRate/100);
  const totalSaving=solarSaving+arbitrageSaving+exportIncome;
  const payback=totalSaving>0 ? systemPrice/totalSaving : 0;

  return {ok:true, systemPrice, annualLoad, peak, night, exportRate, gen, batt, selfUsePct, solarUsed, exportKwh, nightShiftKwh, solarSaving, arbitrageSaving, exportIncome, totalSaving, payback};
}
function renderPaybackSummary(){
  if(!$('paybackSummary')) return;
  const p=estimatePayback();
  if(!p.ok || !p.totalSaving){
    $('paybackSummary').innerHTML='<div class="paybackCard"><b>Estimated payback</b><span>Add annual usage and proposal price to show the estimate.</span></div>';
    return;
  }
  const years=p.payback.toFixed(1);
  $('paybackSummary').innerHTML=`<div class="paybackCard">
    <div><span class="smallCaps">Estimated payback</span><b>${years} years</b><span>Approx. first-year benefit ${money(p.totalSaving)}</span></div>
    <div class="paybackBreakdown">
      <span>Solar offset ${money(p.solarSaving)}</span>
      <span>Cheap night-rate use ${money(p.arbitrageSaving)}</span>
      <span>Export ${money(p.exportIncome)}</span>
    </div>
    <p>Estimate uses ${Math.round(p.annualLoad).toLocaleString()} kWh/year usage, ${Math.round(p.gen).toLocaleString()} kWh/year solar generation, ${p.peak.toFixed(1)}p peak rate, ${p.night.toFixed(1)}p night rate, ${p.exportRate.toFixed(1)}p export and ${(p.selfUsePct*100).toFixed(0)}% solar self-use.</p>
  </div>`;
}


function customerStoryHTML(){
  const name=($('customerName')?.value||'').trim();
  const priorities=($('wants')?.value||'Not captured yet').trim();
  const reason=($('whyNow')?.value||'Reason not captured yet').trim();
  const concern=($('blockerReason')?.value||$('mainBlocker')?.value||'No concern captured yet').trim();
  const decision=($('decisionMakers')?.value||'Decision path not captured').trim();
  const flagsText=flags ? flags() : '';
  return `<div class="premiumCard storyCard">
    <div class="cardKicker">Your priorities</div>
    <h3>${name || 'Survey guidance'}</h3>
    <div class="statusRow">
      ${priorities!=='Not captured yet'?'<span class="statusPill good">Priorities captured</span>':'<span class="statusPill warn">Priorities missing</span>'}
      ${decision!=='Decision path not captured'?'<span class="statusPill good">Decision path noted</span>':'<span class="statusPill warn">Decision path optional</span>'}
      ${flagsText?`<span class="statusPill">${flagsText}</span>`:''}
    </div>
    <p><b>What matters:</b> ${priorities}</p>
    <p><b>Reason for looking:</b> ${reason}</p>
    <p><b>Anything to clarify:</b> ${concern}</p>
  </div>`;
}
function designConfidence(){
  let checks=[];
  const add=(label,ok,weight=1)=>checks.push({label,ok:!!ok,weight});
  add('Usage captured', !!(($('annualKwh')?.value||'')||($('dailyKwh')?.value||'')), 2);
  add('Roof dimensions captured', (typeof getRoofPlanes==='function' && getRoofPlanes().some(r=>r.width&&r.slope)), 2);
  add('Panel count selected', Number($('panelCount')?.value||0)>0 || !$('solar')?.checked, 2);
  add('Panel fit sense checked', !!($('panelSenseCheck')?.innerText||'').includes('fit'), 1);
  add('Battery/inverter location agreed', !!(($('batteryLoc')?.value||'') && ($('invLoc')?.value||'')), 2);
  add('Cable route captured', !!($('cable')?.value||''), 2);
  add('Meter/CU/supply captured', !!($('meter')?.value||''), 2);
  add('Customer route agreement ticked', !!$('customerRouteAgreed')?.checked, 2);
  add('Customer close temperature captured', !!($('customerLikelihood')?.value||''), 1);
  const done=checks.reduce((a,c)=>a+(c.ok?c.weight:0),0);
  const max=checks.reduce((a,c)=>a+c.weight,0);
  const score=Math.round(done/max*100);
  const missing=checks.filter(c=>!c.ok).map(c=>c.label);
  return {score,missing,checks};
}
function designConfidenceHTML(){
  const d=designConfidence();
  const cls=d.score>=85?'good':d.score>=65?'warn':'bad';
  return `<div class="premiumCard confidenceCard ${cls}">
    <div><span class="cardKicker">Design confidence</span><b>${d.score}%</b></div>
    <p>${d.missing.length?'Strong enough to discuss, with items still to confirm.':'Core design information captured for a clean formal quote.'}</p>
    <div class="statusRow">${d.checks.slice(0,6).map(c=>`<span class="statusPill ${c.ok?'good':'warn'}">${c.ok?'✓':'•'} ${c.label}</span>`).join('')}</div>
    ${d.missing.length?`<div class="missingMini"><b>Confirm next:</b> ${d.missing.slice(0,4).join(', ')}</div>`:''}
  </div>`;
}
function whyThisSystemHTML(){
  const q=quote(), p=panelParts();
  const usage=getAnnualUsageForPayback ? getAnnualUsageForPayback() : 0;
  const battery=customerBatteryTitle();
  const tariff=($('tariff')?.value||'the current tariff').trim();
  const fit=($('panelSenseCheck')?.innerText||'Panel fit has been sense checked from the entered roof information where available.');
  const points=[
    $('solar')?.checked ? `The solar recommendation is based on ${$('panelCount')?.value||0} x ${p.name} panels for a proposed ${q.kWp} kWp array.` : 'No solar roof works are included in this route.',
    ($('batteryBrand')?.value||'None')!=='None' ? `The storage route is ${battery}, selected around usage, tariff opportunity and evening demand.` : 'No battery has been selected at this stage.',
    usage ? `Usage basis: around ${Math.round(usage).toLocaleString()} kWh/year on ${tariff}.` : `Tariff basis: ${tariff}. Usage should be confirmed before final savings are relied on.`,
    fit.length>20 ? fit.split('\n')[0] : 'Roof fit remains subject to measured survey and final design.'
  ];
  return `<div class="premiumCard whyCard"><div class="cardKicker">Why this system</div><h3>Right-sized around the home, not just maximum kit</h3><ul>${points.map(p=>`<li>${p}</li>`).join('')}</ul></div>`;
}

function refreshPresent(){
  syncTeslaOptions();
  const q=quote(), p=panelParts();
  if($('customerStoryCard')) $('customerStoryCard').innerHTML=customerStoryHTML();
  if($('designConfidenceCard')) $('designConfidenceCard').innerHTML=designConfidenceHTML();
  if($('whyThisSystem')) $('whyThisSystem').innerHTML=whyThisSystemHTML();
  if($('presentVisuals')) $('presentVisuals').innerHTML=customerVisuals();
  if($('batteryImagePanel')) $('batteryImagePanel').innerHTML=customerBatteryImageHTML();
  const included=cleanIncludedList();
  const customer=$('customerName')?.value||'Customer';
  const aim=$('wants')?.value||'Lower bills and better energy control';
  $('presentSummary').innerHTML=`<div class="customerIntro"><span>Prepared for</span><b>${customer}</b><p>${aim}</p></div>
  <div class="summaryGrid">
    <div class="summaryItem"><b>Solar PV</b><span>${$('solar')?.checked?`${$('panelCount')?.value||0} x ${p.name}, ${q.kWp} kWp`:'Not included'}</span></div>
    <div class="summaryItem"><b>Battery</b><span>${customerBatteryTitle()}</span></div>
    <div class="summaryItem"><b>Storage</b><span>${customerBatteryStorageText()}</span></div>
    <div class="summaryItem"><b>Extras</b><span>${typeof customerExtrasTitle==='function'?customerExtrasTitle():($('ev')?.checked?'Zappi EV charger':'No extras included')}</span></div>
  </div>
  <div class="includedBox"><b>Included in this recommendation</b><ul>${included.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  ${cleanCommercialLine()}
  <p class="nextStepClean">Next step: prepare the formal quote for review and e-signing.</p>`;
  if(typeof renderPaybackSummary==='function') renderPaybackSummary();
  if(typeof renderCustomerAgreementSummary==='function') renderCustomerAgreementSummary();
  render();
}

function renderCustomerAgreementSummary(){
  const box=$('customerAgreementSummary');
  if(!box) return;
  const route=($('cable')?.value||'Route to be confirmed in final design.');
  const batteryLoc=($('batteryLoc')?.value||'Battery location to be confirmed.');
  const invLoc=($('invLoc')?.value||'Battery / controller location to be confirmed.');
  const access=($('access')?.value||'Access/scaffold to be confirmed.');
  const q=quote(), p=panelParts();
  const solar=$('solar')?.checked?`${$('panelCount')?.value||0} x ${p.name}, ${q.kWp} kWp`:'No solar included';
  const battery=customerBatteryTitle ? customerBatteryTitle() : 'Battery route to be confirmed';
  box.innerHTML=`<div class="agreementGrid">
    <div><b>Recommendation</b><span>${solar}<br>${battery}</span></div>
    <div><b>Equipment location</b><span>Battery: ${batteryLoc}<br>Inverter/controller: ${invLoc}</span></div>
    <div><b>Route and access</b><span>${route}<br>${access}</span></div>
    <div><b>Final checks</b><span>Subject to roof, electrical, DNO and final design checks.</span></div>
  </div>
  <p>This confirms the survey guidance can be turned into a formal quote for review. The quote is not treated as final installation design until the checks are complete.</p>`;
}

function prompt(){let d=getData(), q=d.quote;return `Survey pack for ${d.customerName||'[Customer]'}.

Use the notes, photos and any SRT transcripts to create:
1. Survey summary
2. monday CRM note
3. OpenSolar/PandaDoc proposal brief
4. Customer follow-up email
5. Sales strategy
6. Next action list

Customer: ${d.customerName}
Address: ${d.address}
Phone: ${d.phone}
Email: ${d.email}
Survey date: ${d.surveyDate}

Pre-survey:
monday item ID: ${d.mondayId}
Lead source: ${d.leadSource}
Appointment time: ${d.appointmentTime}
CRM status: ${d.crmStatus}
CRM notes: ${d.crmNotes}
Pre-survey interest: ${d.preInterest}
Known usage / bill notes: ${d.preUsage}
Promises already made: ${d.promisesMade}
Questions to ask: ${[d.askBill?'Confirm usage/tariff':null,d.askDecisionMaker?'Confirm decision maker':null,d.askCompetitors?'Ask about competitors':null,d.askTiming?'Confirm timing':null,d.askBackup?'Clarify backup':null,d.askBudget?'Test budget comfort':null].filter(Boolean).join(', ')}

System scope: ${d.scope}
What they want: ${d.wants}
Why now: ${d.whyNow}
Decision makers: ${d.decisionMakers}
Competitors: ${d.competitors}

Roof notes: ${d.roof}
Roof planes:
${roofLines()}
Dimension notes: ${d.dims}
Obstructions / shading: ${d.shade}
Battery location: ${d.batteryLoc}
Battery / controller location: ${d.invLoc}
Meter/CU/supply: ${d.meter}
Cable route: ${d.cable}
Access/scaffold: ${d.access}

Annual kWh: ${d.annualKwh}
Daily average kWh: ${d.dailyKwh}
Current tariff: ${d.tariff}
Day/peak p/kWh: ${d.peak}
Off-peak p/kWh: ${d.offpeak}
Annual spend: ${d.annualSpend}
EV miles/year: ${d.miles}
Usage flags: ${d.flags}
Battery guide: ${d.batteryGuide}

Quote builder:
Panel: ${q.panel.name}
Panel count: ${d.panelCount}
Pricing engine: Residential Pricing V8.6 internal cost build
System override: ${d.systemOverride||0}
Framing: ${d.framingSelection}
Calculated proposal before override: ${money(q.calculatedTotal)}
System size: ${q.kWp} kWp
Tigo: ${d.tigo?((q.tigoQty||0)+' optimiser(s) at £'+d.tigoPrice+' each'):'No'}
SPDs: ${d.spds?'Yes':'No'}
Battery: ${q.batteryText}
Tesla configuration: ${($('batteryBrand')?.value==='Tesla')?teslaConfigText():''}
Tesla storage: ${($('batteryBrand')?.value==='Tesla')?teslaStorageKwh().toFixed(1)+' kWh':''}
Sig storage: ${q.sigNominal} kWh nominal / ${q.sigUsable} kWh usable
Sigenergy controller/PV inverter: ${q.controllerText||''}
Scaffold: ${d.scaffoldLifts} lift(s) included
EV: ${d.ev?'Zappi':'No'}
Manual extras: ${q.extrasText||'No manual extras selected'}
Eddi/manual diverter: ${d.eddi?'Yes at £'+(d.eddiPrice||0):'No'}
Other extra: ${d.otherExtra?(d.otherExtraName||'Other extra')+' at £'+(d.otherExtraPrice||0):'No'}
Extras notes: ${d.extrasNote}
Commercial note: ${d.commercialNote}
Calculated proposal position: ${money(q.total)}
Estimated payback: ${estimatePayback().ok?estimatePayback().payback.toFixed(1)+' years':'Not calculated'}
Estimated first-year benefit: ${money(estimatePayback().totalSaving||0)}

Customer proposal summary:
${d.present}

Acceptance:
${d.acceptance}
Signature captured: ${d.signatureData?'Yes':'No'}

Next action: ${d.nextAction}
Follow-up date: ${d.followUp}
Confidence: ${d.confidence}
Internal gut feel: ${d.gut}
Attachments: ${d.files.length?d.files.join(', '):'None'}`}

function cleanTel(v){return (v||'').replace(/[^0-9+]/g,'')}
function updateHeader(){
  if(!$('appTitle')||!$('headerContact')) return;
  const name=($('customerName')?.value||'').trim();
  const address=($('address')?.value||'').trim();
  const phone=($('phone')?.value||'').trim();
  const email=($('email')?.value||'').trim();
  $('appTitle').textContent = name ? `LG Survey - ${name}` : 'LG Survey';
  let bits=[];
  if(address) bits.push(`<span>${address}</span>`);
  if(phone) bits.push(`<a href="tel:${cleanTel(phone)}">${phone}</a>`);
  if(email) bits.push(`<a href="mailto:${email}">${email}</a>`);
  $('headerContact').innerHTML = bits.length ? bits.join('<span class="dotSep">•</span>') : 'No survey loaded';
}
function surveyDisplayName(d){
  return ((d&&d.customerName)||($('customerName')?.value)||'Untitled survey').trim() || 'Untitled survey';
}

function render(){$('out').textContent=prompt();updateHeader()}
function getSavedSurveys(){try{return JSON.parse(localStorage.getItem(SURVEYS_KEY)||'[]')}catch(e){return []}}
function setSavedSurveys(arr){localStorage.setItem(SURVEYS_KEY,JSON.stringify(arr))}
function updateSaveStatus(){if(!$('saveStatus'))return;$('saveStatus').innerText=currentSavedId?`Editing saved survey. Use Save Survey to update it, or choose Save as new survey to duplicate it.`:'This survey is currently only a draft. Save it to access it later.'}
function renderSavedList(){if(!$('savedList'))return;const list=getSavedSurveys().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));if(!list.length){$('savedList').innerHTML='<p class="hint">No saved surveys yet.</p>';return;}$('savedList').innerHTML=list.map(s=>`<div class="savedCard"><b>${s.customerName||s.name||'Untitled survey'}</b><div class="savedMeta">${s.customerName||''}<br>${s.address||''}<br>Updated ${new Date(s.updatedAt).toLocaleString()}${s.quote&&s.quote.total?` • ${money(s.quote.total)}`:''}</div><div class="savedActions"><button class="primaryMini" data-load="${s.id}">Open</button><button data-duplicate="${s.id}">Duplicate</button><button data-delete="${s.id}">Delete</button></div></div>`).join('');document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>loadSavedSurvey(b.dataset.load));document.querySelectorAll('[data-duplicate]').forEach(b=>b.onclick=()=>duplicateSavedSurvey(b.dataset.duplicate));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteSavedSurvey(b.dataset.delete))}
function loadSavedSurvey(id){const s=getSavedSurveys().find(x=>x.id===id);if(!s)return;ids.forEach(i=>{if($(i))$(i).value=s[i]||''});checks.forEach(i=>{if($(i))$(i).checked=!!s[i]});if(s.acceptance)$('acceptanceStamp').innerText=s.acceptance;signatureData=s.signatureData||'';setRoofPlanes(s.roofPlanes||[]);currentSavedId=s.id;if($('saveName'))$('saveName').value=s.customerName||s.name||'';save();refreshPresent();updateSaveStatus();alert('Saved survey opened')}
function duplicateSavedSurvey(id){const s=getSavedSurveys().find(x=>x.id===id);if(!s)return;const copy={...s,id:'svy_'+Date.now(),name:(s.name||s.customerName||'Survey')+' copy',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const arr=getSavedSurveys();arr.push(copy);setSavedSurveys(arr);renderSavedList();renderHomeSavedList();alert('Survey duplicated')}
function deleteSavedSurvey(id){if(!confirm('Delete this saved survey?'))return;let arr=getSavedSurveys().filter(x=>x.id!==id);setSavedSurveys(arr);if(currentSavedId===id){currentSavedId=null;updateSaveStatus();save()}renderSavedList()}
function saveCurrentSurvey(){const mode=$('saveMode')?.value||'update';const draft=getData();let arr=getSavedSurveys();let targetId=(mode==='update'&&currentSavedId)?currentSavedId:null;const name=surveyDisplayName(draft); if($('saveName')) $('saveName').value=name;if(targetId){arr=arr.map(s=>s.id===targetId?{...draft,id:targetId,name,createdAt:s.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}:s)}else{targetId='svy_'+Date.now();arr.push({...draft,id:targetId,name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});currentSavedId=targetId}setSavedSurveys(arr);if($('saveMode'))$('saveMode').value='update';updateSaveStatus();renderSavedList();save();alert('Survey saved')}
function internalBrief(){const d=getData(),q=d.quote;return `INTERNAL OPERATIONS BRIEF

Customer: ${d.customerName}
Address: ${d.address}
Phone: ${d.phone}
Email: ${d.email}

Pre-survey:
monday item ID: ${d.mondayId}
Lead source: ${d.leadSource}
Appointment time: ${d.appointmentTime}
CRM status: ${d.crmStatus}
CRM notes: ${d.crmNotes}
Pre-survey interest: ${d.preInterest}
Known usage / bill notes: ${d.preUsage}
Promises already made: ${d.promisesMade}

Scope: ${d.scope}
What they want: ${d.wants}
Decision makers: ${d.decisionMakers}
Competitors: ${d.competitors}

Roof: ${d.roof}
Roof planes:
${roofLines()}
Dimension notes: ${d.dims}
Shading / obstructions: ${d.shade}
Battery location: ${d.batteryLoc}
Inverter / controller: ${d.invLoc}
Meter / CU / supply: ${d.meter}
Cable route: ${d.cable}
Access / scaffold: ${d.access}

Usage: ${d.annualKwh} kWh/year, ${d.dailyKwh} kWh/day
Tariff: ${d.tariff}
Peak / off-peak: ${d.peak} / ${d.offpeak}
EV miles: ${d.miles}
Flags: ${d.flags}

Recommended quote route:
Panel: ${q.panel.name}
Panel count: ${d.panelCount}
System size: ${q.kWp} kWp
Battery: ${q.batteryText}
Tesla configuration: ${($('batteryBrand')?.value==='Tesla')?teslaConfigText():''}
Tesla storage: ${($('batteryBrand')?.value==='Tesla')?teslaStorageKwh().toFixed(1)+' kWh':''}
Sig storage: ${q.sigNominal} kWh nominal / ${q.sigUsable} kWh usable
Sigenergy controller/PV inverter: ${q.controllerText||''}
Scaffold lifts: ${d.scaffoldLifts} included, internal pricing guide used
Bird protection: ${d.bird?'Yes':'No'}
Tigo: ${d.tigo?((q.tigoQty||0)+' optimiser(s)'):'No'}
EV charger: ${d.ev?'Yes':'No'}
Commercial note: ${d.commercialNote}
Proposal position: ${money(q.total)}
Internal calculated position: ${money(q.calculatedTotal)}
Override active: ${q.override>0?'Yes':'No'}

Customer agreement:
${d.acceptance}
Signature captured: ${d.signatureData?'Yes':'No'}

Next action: ${d.nextAction}
Follow-up date: ${d.followUp}
Confidence: ${d.confidence}
Gut feel: ${d.gut}
Attachments: ${d.files.length?d.files.join(', '):'None'}` }
function download(name,text,type='text/plain'){let b=new Blob([text],{type});let u=URL.createObjectURL(b);let a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
function safeName(){return ($('customerName').value||'survey').replace(/[^a-z0-9]+/gi,'_')}

function initSignaturePad(){
  const canvas=$('signatureCanvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#0b1f18';
  let drawing=false, last=null;
  function pos(e){
    const r=canvas.getBoundingClientRect();
    const touch=e.touches&&e.touches[0];
    const clientX=touch?touch.clientX:e.clientX;
    const clientY=touch?touch.clientY:e.clientY;
    return {x:(clientX-r.left)*(canvas.width/r.width), y:(clientY-r.top)*(canvas.height/r.height)};
  }
  function start(e){e.preventDefault();drawing=true;last=pos(e)}
  function move(e){if(!drawing)return;e.preventDefault();const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;signaturePadDirty=true;signatureData=canvas.toDataURL('image/png');save()}
  function end(e){if(!drawing)return;e.preventDefault();drawing=false;signatureData=canvas.toDataURL('image/png');save()}
  canvas.addEventListener('mousedown',start); canvas.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
  canvas.addEventListener('touchstart',start,{passive:false}); canvas.addEventListener('touchmove',move,{passive:false}); canvas.addEventListener('touchend',end,{passive:false});
  if(signatureData){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=signatureData;}
  if($('clearSignature')) $('clearSignature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signatureData='';signaturePadDirty=false;save()};
}
function hasSignature(){return !!signatureData && signatureData.length>1000}


function parseCSV(text){
  const rows=[]; let row=[], cell='', quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && quote && n==='"'){cell+='"';i++;continue}
    if(c==='"'){quote=!quote;continue}
    if(c===',' && !quote){row.push(cell);cell='';continue}
    if((c==='\n'||c==='\r') && !quote){
      if(cell!==''||row.length){row.push(cell);rows.push(row);row=[];cell=''}
      if(c==='\r'&&n==='\n')i++;
      continue
    }
    cell+=c;
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row)}
  return rows;
}
function norm(s){return (s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function findVal(obj,names){
  const keys=Object.keys(obj);
  for(const name of names){
    const wanted=norm(name);
    const k=keys.find(x=>norm(x)===wanted || norm(x).includes(wanted) || wanted.includes(norm(x)));
    if(k && obj[k]) return obj[k];
  }
  return '';
}



function clearCurrentSurvey(){
  if(!confirm('Start a blank new survey? The current draft will be cleared. Save first if you need to keep it.')) return;
  localStorage.removeItem(KEY);
  currentSavedId=null;
  location.reload();renderHomeSavedList();
}
function saveAndStartNew(){
  saveCurrentSurvey();
  localStorage.removeItem(KEY);
  currentSavedId=null;
  setTimeout(()=>location.reload(),300);
}
function applyCRMObject(obj, sourceLabel){
  const get=(names)=>findVal(obj,names);
  const name=get(['Name','Customer name','Contact Name','Client','Item Name']);
  const phone=get(['Contact Number','Phone','Telephone','Mobile','Contact number']);
  const email=get(['Contact Email','Email','Email address']);
  const address=[get(['Site Address','Address','Property address','Location']), get(['Site Post Code','Post Code','Postcode'])].filter(Boolean).join(', ');
  const status=get(['Lead Status','Status','CRM status','Stage']);
  const leadType=get(['Lead Type','System interest','Interest']);
  const source=get(['Lead source','Source','Channel']);
  const surveyTime=get(['Survey Scheduled','Appointment time','Appointment']);
  const usage=get(['Energy Usage','Annual kWh','Usage notes','Known usage']);
  const reason=get(['Reason for Install','Why now','Motivation']);
  const otherQuotes=get(['Other quotes','Competitors']);
  const brand=get(['Specific Brand Requested','Brand requested']);
  const timescale=get(['Timescale','Timing']);
  const qualNotes=get(['Qualification Notes','Notes','CRM notes']);
  const leadNotes=get(['Lead Notes','Last update']);
  const propType=get(['Property Type']);
  const bedrooms=get(['Bedrooms']);
  const roofType=get(['Roof Type']);
  const owner=get(['Property Ownership']);
  const ev=get(['Looking to buy EV?','EV']);
  const itemId=get(['Item ID','Pulse ID','ID','monday item ID']);

  if(name) $('customerName').value=name;
  if(phone) $('phone').value=phone;
  if(email) $('email').value=email;
  if(address) $('address').value=address;
  if(status) $('crmStatus').value=status;
  if(source) $('leadSource').value=source;
  if(itemId) $('mondayId').value=itemId;
  if(surveyTime) $('appointmentTime').value=surveyTime.replace(' ','T').slice(0,16);
  if(usage && !isNaN(parseFloat(usage))){$('annualKwh').value=parseFloat(usage); syncUsage('annual');}
  if(reason) $('wants').value=$('wants').value?$('wants').value+', '+reason:reason;
  if(timescale) $('timing').value=timescale;
  if(otherQuotes) $('competitors').value=otherQuotes;
  if(brand) $('preInterest').value=($('preInterest').value?$('preInterest').value+'\n':'')+'Specific brand requested: '+brand;
  if(leadType) $('preInterest').value=($('preInterest').value?$('preInterest').value+'\n':'')+'Lead type: '+leadType;
  if(ev && /^yes/i.test(ev)) $('ev').checked=true;
  const notes=[
    propType?'Property type: '+propType:null,
    bedrooms?'Bedrooms: '+bedrooms:null,
    roofType?'Roof type: '+roofType:null,
    owner?'Ownership: '+owner:null,
    qualNotes?'Qualification notes: '+qualNotes:null,
    leadNotes?'Lead notes: '+leadNotes:null
  ].filter(Boolean).join('\n');
  if(notes) $('crmNotes').value=notes;
  if($('askBill')) $('askBill').checked=true;
  if($('askDecisionMaker')) $('askDecisionMaker').checked=true;
  if($('askCompetitors')) $('askCompetitors').checked=true;
  if($('askTiming')) $('askTiming').checked=true;
  if($('saveName')) $('saveName').value=$('customerName').value || name || 'Untitled survey';
  $('importStatus').innerText=`Imported pre-survey data from ${sourceLabel}. Saved survey and opened Customer page.`;
  save();
}

function finishImportFlow(){
  if($('saveName')) $('saveName').value = $('customerName').value || 'Untitled survey';
  saveCurrentSurvey();
  renderHomeSavedList();
  switchTab('customer');
}






async function updateApp(){
  try{
    if($('appVersionBadge')) $('appVersionBadge').innerText='Updating app...';
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg){try{await reg.update();}catch(e){}}
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs){try{await r.unregister();}catch(e){}}
    }
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    sessionStorage.setItem('tlgec_last_update_attempt', new Date().toISOString());
    const baseUrl=location.origin + location.pathname.replace(/\/?index\.html$/,'/');
    location.replace(baseUrl + '?appUpdate=' + Date.now());
  }catch(e){
    alert('Update attempted. If the old version remains, close the app fully and reopen it from the browser link.');
    location.reload();
  }
}
function hardRefreshApp(){
  const url=location.origin + location.pathname.replace(/\/?index\.html$/,'/') + '?hardRefresh=' + Date.now();
  location.replace(url);
}
function panelVisualHTML(count){
  const n=Math.max(0,Math.min(parseInt(count||0),24));
  let cells='';
  for(let i=0;i<n;i++) cells+='<div class="miniPanel"></div>';
  return cells || '<div class="hint">No solar panels selected</div>';
}



function customerBatteryTitle(){
  const brand=$('batteryBrand')?.value||'None';
  if(brand==='Tesla'){
    return teslaConfigText();
  }
  if(brand==='Sigenergy'){
    if($('sigBatteryModel')){
      const qty=Number($('sigModuleQty')?.value||0);
      const model=($('sigBatteryModel')?.value||'10')==='6'?'Sigen BAT 6.0':'Sigen BAT 10.0';
      return qty ? `Sigenergy ${qty} x ${model}` : 'Sigenergy SigenStor battery';
    }
    const six=Number($('sig6Qty')?.value||0);
    const ten=Number($('sig10Qty')?.value||0);
    const parts=[];
    if(six) parts.push(`${six} x Sigen BAT 6.0`);
    if(ten) parts.push(`${ten} x Sigen BAT 10.0`);
    return parts.length ? `Sigenergy ${parts.join(' + ')}` : 'Sigenergy SigenStor battery';
  }
  return 'Battery storage';
}
function customerBatteryStorageText(){
  const brand=$('batteryBrand')?.value||'None';
  if(brand==='Tesla'){
    const kwh=teslaStorageKwh();
    return kwh ? `${kwh.toFixed(1)} kWh storage` : (($('gateway')?.checked||$('teslaSaleType')?.value==='gatewayOnly')?'Gateway only / no battery storage':'No Tesla storage selected');
  }
  if(brand==='Sigenergy'){
    const nominal=Number(sigStorage ? sigStorage() : 0);
    const usable=Number(sigUsable ? sigUsable() : 0);
    if(nominal) return `${nominal.toFixed(2)} kWh nominal / ${usable.toFixed(2)} kWh usable`;
    return 'Modular SigenStor storage';
  }
  return 'No battery selected';
}
function customerBatteryImageHTML(){
  const brand=$('batteryBrand')?.value||'None';
  if(brand==='Tesla'){
    return `<div class="productHero teslaHero"><img src="tesla-powerwall.webp" alt="Tesla Powerwall 3"><div><span class="brandPill teslaPill">TESLA</span><h3>${customerBatteryTitle()}</h3><p>${customerBatteryStorageText()}</p></div></div>`;
  }
  if(brand==='Sigenergy'){
    return `<div class="productHero sigHero"><img src="sigenergy-battery.webp" alt="Sigenergy battery"><div><span class="brandPill sigPill">Sigenergy</span><h3>${customerBatteryTitle()}</h3><p>${customerBatteryStorageText()}</p></div></div>`;
  }
  return '';
}
function panelVisualHTML(count){
  const n=Math.max(0,Math.min(parseInt(count||0),30));
  let cells='';
  for(let i=0;i<n;i++) cells+='<div class="miniPanel"></div>';
  return cells || '<div class="hint">No solar panels selected</div>';
}
function customerVisuals(){
  const q=quote(), p=panelParts();
  const brand=$('batteryBrand')?.value||'None';
  const storageText=customerBatteryStorageText();
  const mainMetric=(brand==='Tesla'||brand==='Sigenergy') ? storageText.split(' ')[0] : '0';
  return `<div class="visualCard solarVisual"><h3>Your solar array</h3><span class="brandBadge brandAiko">${p.name||'Solar PV'}</span><div class="panelStack">${panelVisualHTML($('panelCount')?.value)}</div><div class="summaryGrid"><div class="summaryItem"><b>${$('panelCount')?.value||0} panels</b><span>${p.name}</span></div><div class="summaryItem"><b>${q.kWp} kWp</b><span>Proposed system size</span></div></div></div>
  <div class="visualCard"><h3>Storage and control</h3><span class="brandBadge ${brand==='Tesla'?'brandTesla':brand==='Sigenergy'?'brandSig':'brandAiko'}">${brand==='None'?'Storage':brand}</span><div class="bigMetric">${mainMetric}</div><div class="metricLabel">${storageText}</div><div class="summaryGrid"><div class="summaryItem"><b>${customerBatteryTitle()}</b><span>Battery route</span></div><div class="summaryItem"><b>${typeof customerExtrasTitle==='function'?customerExtrasTitle():'No extras included'}</b><span>Extras</span></div></div></div>`;
}

function customerExtrasList(){
  const items=[];
  if($('ev')?.checked) items.push('Zappi EV charger');
  if($('eddi')?.checked) items.push('Eddi / hot water diverter');
  if($('otherExtra')?.checked) items.push(($('otherExtraName')?.value||'Other extra').trim());
  return items.filter(Boolean);
}
function customerExtrasTitle(){
  const items = customerExtrasList();
  return items.length ? items.join(' + ') : 'No extras included';
}

function cleanIncludedList(){
  const items=[];
  if($('solar')?.checked){
    const p=panelParts(), q=quote();
    items.push(`${$('panelCount')?.value||0} x ${p.name} solar panels`);
    items.push(`${q.kWp} kWp solar PV system`);
    if($('bird')?.checked) items.push('Bird protection');
    if($('tigo')?.checked) items.push(`${quote().tigoQty||0} Tigo optimiser${(quote().tigoQty||0)===1?'':'s'}`);
    if($('spd')?.checked || $('spds')?.checked) items.push('SPDs');
  }
  if(($('batteryBrand')?.value||'None')!=='None') items.push(customerBatteryTitle());
  if(typeof customerExtrasList === 'function') customerExtrasList().forEach(x=>items.push(x));
  const roofs = (typeof getRoofs === 'function') ? getRoofs() : [];
  if(roofs.length) items.push(`${roofs.length} roof elevation${roofs.length>1?'s':''} captured`);
  return items;
}
function cleanCommercialLine(){
  const q=quote();
  return `<div class="proposalPrice">${money(q.total)}</div><div class="proposalSub">Proposal position</div>`;
}





function switchTab(tabId){
  const btn=[...document.querySelectorAll('nav button')].find(b=>b.dataset.tab===tabId);
  if(btn){btn.click();return;}
}
function renderHomeSavedList(){
  if(!$('homeSavedList')) return;
  const list=getSavedSurveys().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  if(!list.length){
    $('homeSavedList').innerHTML='<div class="emptyState"><b>No saved surveys yet</b><p>Tap New survey, complete the customer details, then press Save survey on Home.</p></div>';
    return;
  }
  $('homeSavedList').innerHTML=list.map(s=>`<div class="savedCard homeCard"><b>${s.customerName||s.name||'Untitled survey'}</b><div class="savedMeta">${s.address||''}<br>${s.phone?`<a href="tel:${cleanTel(s.phone)}">${s.phone}</a>`:''}${s.email?` • <a href="mailto:${s.email}">${s.email}</a>`:''}<br>Updated ${new Date(s.updatedAt).toLocaleString()}${s.quote&&s.quote.total?` • ${money(s.quote.total)}`:''}</div><div class="savedActions"><button class="primaryMini" data-home-load="${s.id}">Open survey</button><button data-home-duplicate="${s.id}">Duplicate</button><button data-home-delete="${s.id}">Delete</button></div></div>`).join('');
  document.querySelectorAll('[data-home-load]').forEach(b=>b.onclick=()=>{loadSavedSurvey(b.dataset.homeLoad); switchTab('customer');});
  document.querySelectorAll('[data-home-duplicate]').forEach(b=>b.onclick=()=>duplicateSavedSurvey(b.dataset.homeDuplicate));
  document.querySelectorAll('[data-home-delete]').forEach(b=>b.onclick=()=>deleteSavedSurvey(b.dataset.homeDelete));
}


function exportSurveyBackup(){
  const backup={
    exportedAt:new Date().toISOString(),
    app:'LG Survey',
    version:'storage-v1',
    savedSurveys:getSavedSurveys(),
    currentDraft:JSON.parse(localStorage.getItem(KEY)||'null')
  };
  download('tlgec_survey_backup_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(backup,null,2),'application/json');
}
function importSurveyBackup(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      const incoming=Array.isArray(data.savedSurveys)?data.savedSurveys:[];
      if(!incoming.length){alert('No saved surveys found in this backup.');return;}
      const existing=getSavedSurveys();
      const byId=new Map(existing.map(s=>[s.id,s]));
      incoming.forEach(s=>{
        if(!s.id)s.id='svy_'+Date.now()+'_'+Math.random().toString(16).slice(2);
        byId.set(s.id,s);
      });
      setSavedSurveys([...byId.values()]);
      renderSavedList();
      if(typeof renderHomeSavedList==='function')renderHomeSavedList();
      alert('Survey backup imported.');
    }catch(e){
      alert('Could not import this backup file.');
    }
  };
  reader.readAsText(file);
}


function openTab(tabId){
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));
  const btn=[...document.querySelectorAll('nav button')].find(b=>b.dataset.tab===tabId);
  const panel=$(tabId);
  if(btn) btn.classList.add('on');
  if(panel) panel.classList.add('on');
  window.scrollTo({top:0,behavior:'smooth'});
}
function startNewSurveyNow(){
  const hasData=($('customerName')?.value||$('address')?.value||$('phone')?.value||$('email')?.value||'').trim();
  if(hasData){
    const ok=confirm('Start a blank new survey? Save the current survey first if you need to keep it.');
    if(!ok) return;
  }
  localStorage.removeItem(KEY);
  currentSavedId=null;
  // Reload to reset all default pricing/configuration fields, then open the Customer stage automatically.
  location.href=location.pathname + '?newSurvey=' + Date.now() + '#customer';
}
function saveImportedSurveyAndOpenCustomer(){
  const customer=($('customerName')?.value||'Untitled survey').trim() || 'Untitled survey';
  if($('saveName')) $('saveName').value=customer;
  const draft=getData();
  let arr=getSavedSurveys();
  const now=new Date().toISOString();

  // If this draft already has a saved ID, update it. Otherwise create a new saved survey.
  let id=currentSavedId || ('svy_' + Date.now());
  const existing=arr.find(s=>s.id===id);
  const record={...draft,id,name:customer,customerName:customer,createdAt:existing?.createdAt||now,updatedAt:now,currentSavedId:id};

  if(existing) arr=arr.map(s=>s.id===id?record:s);
  else arr.push(record);

  currentSavedId=id;
  setSavedSurveys(arr);
  localStorage.setItem(KEY,JSON.stringify(record));
  render();
  renderSavedList();
  if(typeof renderHomeSavedList==='function') renderHomeSavedList();
  updateSaveStatus();
  if($('importStatus')) $('importStatus').innerText='Imported and saved as ' + customer + '. Customer page opened.';
  openTab('customer');
}
function readPastedCRMAndSave(){
  const text=($('crmPaste')?.value||'').trim();
  if(!text){alert('Paste the monday CSV text first.');return;}
  const rows=parseCSV(text);
  if(!rows.length){alert('Could not read the pasted CSV text.');return;}
  let obj={};
  const h0=(rows[0][0]||'').trim().toLowerCase();
  const h1=(rows[0][1]||'').trim().toLowerCase();
  if(h0==='field' && h1==='value'){
    rows.slice(1).forEach(r=>{if(r[0]) obj[r[0].trim()]=r.slice(1).join(',').trim();});
  } else {
    const headers=rows[0].map(h=>h.trim());
    const current=($('customerName')?.value||'').toLowerCase();
    const dataRows=rows.slice(1).filter(r=>r.some(x=>(x||'').trim()));
    let chosen=dataRows[0]||[];
    if(current){
      const match=dataRows.find(r=>r.join(' ').toLowerCase().includes(current));
      if(match) chosen=match;
    }
    headers.forEach((h,i)=>obj[h]=chosen[i]||'');
  }
  applyCRMObject(obj,'pasted monday text');
  saveImportedSurveyAndOpenCustomer();
}
function readCSVFileAndSave(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const rows=parseCSV(reader.result);
    if(rows.length<2){alert('No rows found in the CSV.');return;}
    let obj={};
    const h0=(rows[0][0]||'').trim().toLowerCase();
    const h1=(rows[0][1]||'').trim().toLowerCase();
    if(h0==='field' && h1==='value'){
      rows.slice(1).forEach(r=>{if(r[0]) obj[r[0].trim()]=r.slice(1).join(',').trim();});
    } else {
      const headers=rows[0].map(h=>h.trim());
      const dataRows=rows.slice(1).filter(r=>r.some(x=>(x||'').trim()));
      const current=($('customerName')?.value||'').toLowerCase();
      let chosen=dataRows[0]||[];
      if(current){
        const match=dataRows.find(r=>r.join(' ').toLowerCase().includes(current));
        if(match) chosen=match;
      }
      headers.forEach((h,i)=>obj[h]=chosen[i]||'');
    }
    applyCRMObject(obj,file.name);
    saveImportedSurveyAndOpenCustomer();
  };
  reader.readAsText(file);
}
function bindCriticalButtons(){
  document.addEventListener('click', e=>{
    const id=e.target && e.target.id;
    if(id==='homeNewSurvey' || id==='newSurveyTop' || id==='newSurveySaved'){
      e.preventDefault();
      startNewSurveyNow();
    }
    if(id==='importPastedCRM'){
      e.preventDefault();
      readPastedCRMAndSave();
    }
  });
  const monday=$('mondayImport');
  if(monday) monday.onchange=e=>readCSVFileAndSave((e.target.files||[])[0]);
}

document.addEventListener('DOMContentLoaded',()=>{bindCriticalButtons();migrateOldStorageKeys();if($('appVersionBadge'))$('appVersionBadge').innerText='App version: v58';load();initSignaturePad();
document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{if(el.id==='tigoQty'){if($('tigo'))$('tigo').checked=(num(el.value)>0);save();return;}if(el.id==='annualKwh')syncUsage('annual');if(el.id==='dailyKwh')syncUsage('daily');if(el.id==='customerName'&&$('saveName')&&!$('saveName').value)$('saveName').value=el.value;if(el.id==='solar'&&el.checked){if($('bird'))$('bird').checked=true;if($('spds'))$('spds').checked=true;}if(['annualKwh','dailyKwh','heatPump','highEvening','backupNeeded','ev','wants','preInterest'].includes(el.id))recommendBattery(false);if(['teslaSaleType','pw3Qty','dcExpQty','gateway','pw3Price','gatewayPrice','dcPrice','teslaDiscounts','batteryBrand'].includes(el.id))syncTeslaOptions();if(['ev','wants','preInterest'].includes(el.id))toggleConditionalFields();save()}));
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));b.classList.add('on');$(b.dataset.tab).classList.add('on')});
document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{let target=$(b.parentElement.dataset.target);target.value=target.value?target.value+', '+b.textContent:b.textContent;save()});
if($('batteryGuideBtn'))$('batteryGuideBtn').onclick=()=>recommendBattery(true);if($('calcQuote'))$('calcQuote').onclick=calculate;$('refreshPresent').onclick=refreshPresent;
$('stampAccept').onclick=()=>{
  if(!hasSignature()){alert('Please ask the customer to sign with their finger before accepting.');return;}
  let name = $('customerName').value || 'Customer';
  let stamp=`${name} signed and agreed to proceed to formal quote on ${new Date().toLocaleString()}. ${$('acceptanceNote').value||''}`;
  $('acceptanceStamp').innerText=stamp;
  save();
};
$('copy').onclick=async()=>{await navigator.clipboard.writeText(prompt());alert('Prompt copied')};
$('txt').onclick=()=>download(safeName()+'_survey_notes.txt',prompt());
if($('brief'))$('brief').onclick=()=>download(safeName()+'_internal_brief.txt',internalBrief());
$('json').onclick=()=>download(safeName()+'_survey_data.json',JSON.stringify(getData(),null,2),'application/json');
if($('saveSurvey'))$('saveSurvey').onclick=saveCurrentSurvey;
if($('updateApp'))$('updateApp').onclick=updateApp;
if($('homeUpdateApp'))$('homeUpdateApp').onclick=updateApp;
if($('homeHardRefresh'))$('homeHardRefresh').onclick=hardRefreshApp;
if($('homeContinueDraft'))$('homeContinueDraft').onclick=()=>switchTab('customer');
if($('homeSaveCurrent'))$('homeSaveCurrent').onclick=()=>{saveCurrentSurvey();renderHomeSavedList();};
if($('exportBackup'))$('exportBackup').onclick=exportSurveyBackup;
if($('importBackup'))$('importBackup').onchange=e=>importSurveyBackup((e.target.files||[])[0]);
if($('addRoofPlane'))$('addRoofPlane').onclick=()=>{addRoofPlane({});save()};
if($('saveAndNew'))$('saveAndNew').onclick=saveAndStartNew;
if($('reset'))$('reset').onclick=()=>{if(confirm('Clear local survey?')){localStorage.removeItem(KEY);location.reload()}};
if($('filesInput'))$('filesInput').onchange=e=>{selectedFiles=Array.from(e.target.files||[]);if($('preview'))$('preview').innerHTML='';selectedFiles.forEach(f=>{if(f.type.startsWith('image/')&&$('preview')){let img=document.createElement('img');img.src=URL.createObjectURL(f);$('preview').appendChild(img)}});if($('fileNames'))$('fileNames').textContent=selectedFiles.length?selectedFiles.map(f=>f.name).join('\n'):'No photos selected yet.';save()};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
});


/* v41 button repair, quote check and signature repair */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);

  function money(n){
    try{
      if(window.money && window.money !== money) return window.money(n);
    }catch(e){}
    return '£' + Math.round(Number(n)||0).toLocaleString();
  }

  function showTab(tabId){
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tabId));
    document.querySelectorAll('main > section.panel').forEach(p => p.classList.toggle('on', p.id === tabId));
    const panel = $(tabId);
    if(panel) panel.classList.add('on');
    window.scrollTo(0,0);
  }

  function safeQuote(){
    try{
      if(typeof quote === 'function') return quote();
    }catch(e){}
    return {total:0,kWp:0,batteryText:''};
  }

  function safePanelParts(){
    try{
      if(typeof panelParts === 'function') return panelParts();
    }catch(e){}
    return {name:($('panelModel')?.value||'Solar panel').split('|')[0]};
  }

  function roofPanelTotal(){
    let total = 0;
    try{
      if(typeof getRoofs === 'function'){
        getRoofs().forEach(r => {
          const n = Number(r.panels || r.panelCount || r.panel_count || 0);
          if(Number.isFinite(n)) total += n;
        });
      }
    }catch(e){}
    if(!total){
      document.querySelectorAll('#roofPlanes input').forEach(inp => {
        const text = ((inp.closest('label')?.textContent || '') + ' ' + (inp.id||'') + ' ' + (inp.name||'')).toLowerCase();
        if(text.includes('panel')){
          const n = Number(inp.value || 0);
          if(Number.isFinite(n)) total += n;
        }
      });
    }
    return total;
  }

  function syncPanelCountFromRoofs(){
    const total = roofPanelTotal();
    if(total && $('panelCount')) $('panelCount').value = total;
  }

  function calculateQuote(){
    syncPanelCountFromRoofs();
    syncTeslaOptions();
    let q = safeQuote();
    const p = safePanelParts();
    const count = Number($('panelCount')?.value || 0);
    const brand = $('batteryBrand')?.value || 'None';
    const errors = [];
    const messages = [];
    if($('solar')?.checked && !count) errors.push('No panel count entered.');
    if($('solar')?.checked && !($('framingSelection')?.value)) errors.push('No roof mounting selected.');
    if(($('battery')?.checked || brand !== 'None') && brand === 'None') errors.push('Battery selected but no battery brand chosen.');
    if(brand === 'Sigenergy'){
      const sigQty = Number($('sigModuleQty')?.value || $('sig6Qty')?.value || 0) + Number($('sig10Qty')?.value || 0);
      if(!sigQty) errors.push('Sigenergy selected but no battery module quantity entered.');
    }
    if(brand === 'Tesla'){
      const pw3 = teslaPw3Qty();
      const exp = teslaExpansionQty();
      const saleType = $('teslaSaleType')?.value || 'solarBattery';
      if(saleType !== 'gatewayOnly' && !pw3 && !exp) errors.push('Tesla selected but no Powerwall 3 or DC Expansion quantity entered.');
      if(exp && !pw3) errors.push('DC Expansion requires at least one Powerwall 3.');
      if(pw3 > 4) errors.push('Tesla supports up to 4 Powerwall 3 units.');
      if(exp > 3) errors.push('Tesla supports up to 3 DC Expansion packs total.');
      if(pw3 + exp > 7) errors.push('Tesla maximum system size is 7 units.');
      messages.push(teslaConfigText());
    }

    const box = $('quoteCheck');
    if(box){
      box.innerHTML = `<div class="${errors.length?'quoteWarn':'quoteGood'}">
        <b>${errors.length?'Check before presenting':'Quote calculated'}</b>
        <p>${count ? `${count} x ${p.name}` : 'No panels selected'} ${q.kWp ? ' • ' + q.kWp + ' kWp' : ''}</p>
        <p>Battery: ${brand}${brand==='Tesla'?' • '+teslaConfigText():''}</p>
        <p class="quoteTotal">Proposal position: ${money(q.total || 0)}</p>
        ${brand==='Tesla' ? `<p>${customerBatteryStorageText()}</p>` : ''}
        ${messages.length ? '<ul>' + messages.map(x=>'<li>'+x+'</li>').join('') + '</ul>' : ''}
        ${errors.length ? '<ul>' + errors.map(x=>'<li>'+x+'</li>').join('') + '</ul>' : '<p>No obvious missing build items found.</p>'}
      </div>`;
    }

    try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(e){}
    try{ if(typeof renderTeslaConfigGuide === 'function') renderTeslaConfigGuide(); }catch(e){}
    try{ if(typeof save === 'function') save(); }catch(e){}
    return !errors.length;
  }

  function initSignaturePad(){
    const canvas = $('signatureCanvas');
    if(!canvas || canvas.dataset.v39Ready === 'yes') return;
    canvas.dataset.v39Ready = 'yes';
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b1f18';
    let drawing = false;
    let last = null;

    function point(e){
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches && e.touches[0];
      const x = (touch ? touch.clientX : e.clientX) - rect.left;
      const y = (touch ? touch.clientY : e.clientY) - rect.top;
      return {x: x * (canvas.width / rect.width), y: y * (canvas.height / rect.height)};
    }

    function start(e){ e.preventDefault(); drawing = true; last = point(e); }
    function move(e){
      if(!drawing) return;
      e.preventDefault();
      const p = point(e);
      ctx.beginPath();
      ctx.moveTo(last.x,last.y);
      ctx.lineTo(p.x,p.y);
      ctx.stroke();
      last = p;
      window.signatureData = canvas.toDataURL('image/png');
    }
    function end(e){
      if(!drawing) return;
      e.preventDefault();
      drawing = false;
      window.signatureData = canvas.toDataURL('image/png');
      try{ if(typeof save === 'function') save(); }catch(err){}
    }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, {passive:false});
    canvas.addEventListener('touchmove', move, {passive:false});
    canvas.addEventListener('touchend', end, {passive:false});

    const clear = $('clearSignature');
    if(clear){
      clear.onclick = function(e){
        e.preventDefault();
        ctx.clearRect(0,0,canvas.width,canvas.height);
        window.signatureData = '';
        try{ if(typeof save === 'function') save(); }catch(err){}
      };
    }

    if(window.signatureData){
      const img = new Image();
      img.onload = () => ctx.drawImage(img,0,0,canvas.width,canvas.height);
      img.src = window.signatureData;
    }
  }

  function signatureCaptured(){
    const canvas = $('signatureCanvas');
    if(!canvas) return false;
    if(window.signatureData && window.signatureData.length > 1000) return true;
    try{
      const data = canvas.toDataURL('image/png');
      if(data && data.length > 1000){
        window.signatureData = data;
        return true;
      }
    }catch(e){}
    return false;
  }

  function acceptFormalQuote(){
    if(!signatureCaptured()){
      alert('Please ask the customer to sign before accepting.');
      return;
    }
    const name = $('customerName')?.value || 'Customer';
    const likelihood = $('customerLikelihood')?.value || 'Not recorded';
    const note = $('acceptanceNote')?.value || '';
    const stamp = `${name} signed to confirm they would like the formal quote prepared on ${new Date().toLocaleString()}. Customer response: ${likelihood}. ${note}`;
    if($('acceptanceStamp')) $('acceptanceStamp').innerText = stamp;
    if($('salesStatus')) $('salesStatus').value = 'Formal quote needed';
    if($('nextAction')) $('nextAction').value = 'Prepare formal quote';
    try{ if(typeof save === 'function') save(); }catch(e){}
    alert('Accepted for formal quote and saved.');
  }

  function updateLikelihoodWording(){
    const ans = $('customerLikelihood')?.value || '';
    const p = $('blockerPrompt');
    if(!p) return;
    if(!ans){
      p.textContent = 'Choose the closest answer above.';
      p.className = 'blockerPrompt';
      return;
    }
    if(ans.includes('route I want')){
      p.textContent = 'Great. I will prepare the formal quote for review and e-signing based on this recommendation.';
      p.className = 'blockerPrompt good';
      if($('salesStatus')) $('salesStatus').value = 'Formal quote needed';
      if($('mainBlocker')) $('mainBlocker').value = 'None known';
    } else if(ans.includes('question') || ans.includes('concern')){
      p.textContent = 'That is useful to know. What would you want changed, clarified or confirmed before this feels right?';
      p.className = 'blockerPrompt warn';
      if($('salesStatus')) $('salesStatus').value = 'Proposal to prepare';
      if($('mainBlocker') && $('mainBlocker').value === 'None known') $('mainBlocker').value = 'Needs more information';
    } else {
      p.textContent = 'Thanks for being direct. What is the main reason this does not feel like the right route?';
      p.className = 'blockerPrompt danger';
      if($('salesStatus')) $('salesStatus').value = 'Closed lost';
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
  }

  function bind(){
    // navigation
    document.querySelectorAll('nav button[data-tab]').forEach(btn => {
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        showTab(btn.dataset.tab);
        if(btn.dataset.tab === 'present'){
          calculateQuote();
          initSignaturePad();
        }
      };
    });

    // site panel count syncing
    document.addEventListener('input', e => {
      if(e.target && e.target.closest && e.target.closest('#roofPlanes')) syncPanelCountFromRoofs();
    }, true);

    // build
    const calc = $('calculateQuote');
    if(calc) calc.onclick = e => { e.preventDefault(); calculateQuote(); };

    // present
    const refresh = $('refreshPresent');
    if(refresh) refresh.onclick = e => { e.preventDefault(); calculateQuote(); };
    const likelihood = $('customerLikelihood');
    if(likelihood) likelihood.onchange = updateLikelihoodWording;
    const accept = $('stampAccept');
    if(accept) accept.onclick = e => { e.preventDefault(); acceptFormalQuote(); };

    initSignaturePad();

    document.addEventListener('input', e => { if(e.target && ['teslaSaleType','pw3Qty','dcExpQty','gateway','pw3Price','gatewayPrice','dcPrice','teslaDiscounts'].includes(e.target.id)){ syncTeslaOptions(); try{ if(typeof save==='function') save(); }catch(err){} } }, true);

    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v41 local-only survey quality, panel sense check, extras and safer handover */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);

  const REQUIRED = [
    ['customerName','Customer name'],
    ['address','Address'],
    ['phone','Phone number'],
    ['email','Email address'],
    ['wants','Customer goal'],
    ['annualKwh','Annual usage or daily average', () => val('annualKwh') || val('dailyKwh')],
    ['roofPlanes','At least one roof/elevation with dimensions', () => hasRoofPlane()],
    ['shade','Obstructions / shading notes'],
    ['meter','Meter / CU / incoming supply notes'],
    ['batteryLoc','Battery location'],
    ['invLoc','Battery / controller location'],
    ['cable','Cable route'],
    ['access','Access / scaffold notes'],
    ['photoRoofFront','Roof front/access photo ticked', () => checked('photoRoofFront')],
    ['photoRoofRear','Roof rear/main plane photo ticked', () => checked('photoRoofRear')],
    ['photoMeter','Meter photo ticked', () => checked('photoMeter')],
    ['photoCU','Consumer unit photo ticked', () => checked('photoCU')],
    ['photoFuse','Incoming supply/fuse photo ticked', () => checked('photoFuse')],
    ['photoBatteryLoc','Battery location photo ticked', () => checked('photoBatteryLoc')],
    ['photoInverterLoc','Battery / controller location photo ticked', () => checked('photoInverterLoc')],
    ['photoCableRoute','Cable route photo ticked', () => checked('photoCableRoute')],
    ['photoAccess','Access/scaffold photo ticked', () => checked('photoAccess')],
    ['customerRouteAgreed','Customer route/location agreement ticked', () => checked('customerRouteAgreed')],
    ['panelCount','Panel count entered', () => Number(val('panelCount')) > 0 || !checked('solar')],
    ['framingSelection','Roof mounting selected'],
    ['nextAction','Next action'],
    ['followUp','Follow-up date']
  ];

  const IMPORTANT = [
    ['roof','Roof notes'],
    ['dims','Reference measurement / dimension notes'],
    ['decisionMakers','Decision maker confirmed'],
    ['competitors','Competitor context'],
    ['whyNow','Why now'],
    ['tariff','Current tariff'],
    ['peak','Peak rate'],
    ['offpeak','Off-peak rate'],
    ['photoNotes','Photo notes'],
    ['siteRiskNotes','Site risk/blocker notes'],
    ['customerLikelihood','Customer close temperature captured']
  ];

  function val(id){ return ($(id)?.value || '').toString().trim(); }
  function checked(id){ return !!$(id)?.checked; }

  function hasRoofPlane(){
    try{
      if(typeof getRoofPlanes === 'function'){
        return getRoofPlanes().some(r => (r.width && r.slope) || r.panels || r.pitch || r.azimuth);
      }
    }catch(e){}
    const rows = Array.from(document.querySelectorAll('.roofPlaneRow'));
    return rows.some(row => {
      const w = row.querySelector('.roofWidth')?.value;
      const s = row.querySelector('.roofSlope')?.value;
      const p = row.querySelector('.roofPanels')?.value;
      return (w && s) || p;
    });
  }

  function missingFrom(list){
    return list.filter(([id,label,test]) => {
      try{
        if(test) return !test();
        const el = $(id);
        if(!el) return false;
        if(el.type === 'checkbox') return !el.checked;
        return !val(id);
      }catch(e){ return false; }
    }).map(x => x[1]);
  }

  function readiness(){
    const missingRequired = missingFrom(REQUIRED);
    const missingImportant = missingFrom(IMPORTANT);
    const requiredDone = REQUIRED.length - missingRequired.length;
    const importantDone = IMPORTANT.length - missingImportant.length;
    const score = Math.round(((requiredDone * 2) + importantDone) / ((REQUIRED.length * 2) + IMPORTANT.length) * 100);
    return {score, missingRequired, missingImportant};
  }

  function readinessClass(score){
    if(score >= 90) return 'readyGood';
    if(score >= 70) return 'readyWarn';
    return 'readyBad';
  }

  function renderReadiness(){
    const r = readiness();
    const html = `<div class="readinessScore ${readinessClass(r.score)}">
      <div><span class="smallCaps">Survey readiness</span><b>${r.score}%</b></div>
      <p>${r.missingRequired.length ? 'Missing critical items before proposal handover.' : 'Critical handover items captured.'}</p>
    </div>
    ${r.missingRequired.length ? `<b>Critical missing</b><ul>${r.missingRequired.slice(0,12).map(x=>`<li>${x}</li>`).join('')}</ul>` : '<p class="goodText">No critical survey gaps found.</p>'}
    ${r.missingImportant.length ? `<details><summary>Useful improvements</summary><ul>${r.missingImportant.map(x=>`<li>${x}</li>`).join('')}</ul></details>` : ''}`;

    ['readinessBox','homeReadinessCard'].forEach(id => {
      const box = $(id);
      if(box) box.innerHTML = html;
    });
    return r;
  }

  function updateAgreementSummary(){
    const box = $('customerAgreementSummary');
    if(!box) return;
    const battery = val('batteryLoc') || 'Battery location not yet captured';
    const inverter = val('invLoc') || 'Battery / controller location not yet captured';
    const cable = val('cable') || 'Cable route not yet captured';
    const access = val('access') || 'Access/scaffold notes not yet captured';
    const next = val('nextAction') || 'Prepare formal quote for review and e-signing';
    box.innerHTML = `<b>Customer confirmation</b>
      <p>I confirm the proposed battery/inverter location, cable route, access notes and next step have been discussed. Final design remains subject to measured survey, DNO approval where needed and design checks.</p>
      <ul>
        <li><b>Battery location:</b> ${escapeHtml(battery)}</li>
        <li><b>Inverter/controller:</b> ${escapeHtml(inverter)}</li>
        <li><b>Cable route:</b> ${escapeHtml(cable)}</li>
        <li><b>Access/scaffold:</b> ${escapeHtml(access)}</li>
        <li><b>Next step:</b> ${escapeHtml(next)}</li>
      </ul>`;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }

  function updatePhotoNames(){
    const input = $('filesInput');
    const names = $('fileNames');
    if(!input || !names) return;
    const files = Array.from(input.files || []);
    names.textContent = files.length ? files.map(f => f.name).join('\n') : 'No photos selected yet.';
  }

  function localPhotoPreview(e){
    const files = Array.from(e?.target?.files || []);
    if(typeof selectedFiles !== 'undefined') selectedFiles = files;
    const preview = $('preview');
    if(preview) preview.innerHTML = '';
    files.forEach(f => {
      if(f.type && f.type.startsWith('image/') && preview){
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.alt = f.name;
        preview.appendChild(img);
      }
    });
    updatePhotoNames();
    try{ if(typeof save === 'function') save(); }catch(e){}
    renderReadiness();
  }

  function defaultAcceptanceText(){
    const note = $('acceptanceNote');
    if(note && !note.value.trim()){
      note.value = 'Customer agreed to proceed to formal quote based on the recommendation, proposed equipment locations and cable route discussed today. Subject to final design, survey checks and DNO approval where required.';
    }
  }

  function markCompleteV39(){
    const r = renderReadiness();
    updateAgreementSummary();
    if($('salesStatus')) $('salesStatus').value = r.missingRequired.length ? 'Proposal to prepare' : 'Survey completed';
    if($('nextAction') && !$('nextAction').value) $('nextAction').value = r.missingRequired.length ? 'Resolve missing survey items' : 'Prepare formal quote';
    try{ if(typeof save === 'function') save(); }catch(e){}
    alert(r.missingRequired.length ? `Survey saved at ${r.score}%. Resolve critical items before a clean handover.` : 'Survey marked complete. Critical handover items are captured.');
  }

  function makeCheckReadinessVisible(){
    const oldCheck = window.checkReadiness;
    window.tlgecReadinessV39 = readiness;
    window.checkReadiness = function(){
      const r = renderReadiness();
      if(typeof oldCheck === 'function'){
        try{ oldCheck(); }catch(e){}
      }
      return r.missingRequired;
    };
  }

  function patchPrompt(){
    const oldPrompt = window.prompt;
    window.prompt = function(){
      let base = '';
      try{ base = typeof oldPrompt === 'function' ? oldPrompt() : ''; }catch(e){ base = ''; }
      const r = readiness();
      const evidence = [
        ['Roof front/access', checked('photoRoofFront')],
        ['Roof rear/main plane', checked('photoRoofRear')],
        ['Meter position', checked('photoMeter')],
        ['Consumer unit', checked('photoCU')],
        ['Incoming supply/fuse', checked('photoFuse')],
        ['Battery location', checked('photoBatteryLoc')],
        ['Battery / controller location', checked('photoInverterLoc')],
        ['Cable route', checked('photoCableRoute')],
        ['Access/scaffold', checked('photoAccess')]
      ].map(([name,ok]) => `${ok ? '✓' : '✗'} ${name}`).join('\n');

      return `${base}

LG Survey local readiness:
Survey readiness score: ${r.score}%
Critical missing items:
${r.missingRequired.length ? r.missingRequired.map(x=>'- '+x).join('\n') : 'None'}

Photo/evidence checklist:
${evidence}

Customer route/location agreement: ${checked('customerRouteAgreed') ? 'Yes' : 'No'}
Photo notes: ${val('photoNotes')}
Site risk/blocker notes: ${val('siteRiskNotes')}`;
    };
  }

  function setDefaultPanelForNewDraft(){
    const panel = $('panelModel');
    if(panel && !localStorage.getItem('tlgec_current_draft_v1')){
      const opt = Array.from(panel.options).find(o => o.value.startsWith('AIKO 495W|'));
      if(opt) panel.value = opt.value;
    }
  }

  function bind(){
    setDefaultPanelForNewDraft();

    const file = $('filesInput');
    if(file) file.onchange = localPhotoPreview;

    ['checkReadiness','markSurveyComplete'].forEach(id => {
      const btn = $(id);
      if(!btn) return;
      btn.onclick = e => {
        e.preventDefault();
        if(id === 'checkReadiness') renderReadiness();
        if(id === 'markSurveyComplete') markCompleteV39();
      };
    });

    document.addEventListener('input', e => {
      if(e.target && e.target.id === 'tigoQty') return;
      if(e.target && (e.target.matches('input, textarea, select') || e.target.closest('#roofPlanes'))){
        renderReadiness();
        updateAgreementSummary();
      }
    }, true);
    document.addEventListener('change', e => {
      if(e.target && e.target.id === 'tigoQty') return;
      if(e.target && (e.target.matches('input, textarea, select') || e.target.closest('#roofPlanes'))){
        renderReadiness();
        updateAgreementSummary();
      }
    }, true);

    const stamp = $('stampAccept');
    if(stamp){
      stamp.addEventListener('click', defaultAcceptanceText, true);
    }

    document.addEventListener('input', e => { if(e.target && ['teslaSaleType','pw3Qty','dcExpQty','gateway','pw3Price','gatewayPrice','dcPrice','teslaDiscounts'].includes(e.target.id)){ syncTeslaOptions(); try{ if(typeof save==='function') save(); }catch(err){} } }, true);

    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;

    renderReadiness();
    updateAgreementSummary();
    updatePhotoNames();
    toggleConditionalFields();
    recommendBattery(false);
    makeCheckReadinessVisible();
    patchPrompt();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();



/* v50 auto panel fit, panel-first roof sense check and manual extras */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').toString().trim();
  const num = v => Number(v || 0) || 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  const PANEL_OPTIONS = [
    {name:'AIKO 495W', value:'AIKO 495W|495|1762 x 1134 x 30 mm|20.6 kg', watt:495, long:1.762, short:1.134},
    {name:'AIKO 540W', value:'AIKO 540W|540|1954 x 1134 x 30 mm|27.1 kg', watt:540, long:1.954, short:1.134},
    {name:'SunPower P7 500W', value:'SunPower P7 500W|500|1996 x 1134 x 30 mm|27.5 kg', watt:500, long:1.996, short:1.134},
    {name:'SunPower P7 450W', value:'SunPower P7 450W|450|1790 x 1134 x 30 mm|24.8 kg', watt:450, long:1.790, short:1.134}
  ];

  function optionByValue(value){
    return PANEL_OPTIONS.find(p => p.value === value) || PANEL_OPTIONS.find(p => p.name === value) || PANEL_OPTIONS[0];
  }

  function currentPanelOption(){
    const choice = val('autoPanelChoice');
    if(choice && choice !== 'AUTO') return optionByValue(choice);
    try{
      const selected = $('panelModel')?.value || '';
      if(selected) return optionByValue(selected);
    }catch(e){}
    return PANEL_OPTIONS[0];
  }

  function marginsToTry(){
    const basis = val('autoPanelMargin') || 'auto';
    if(basis === '0.4') return [0.4];
    if(basis === '0.3') return [0.3];
    return [0.4, 0.3];
  }

  function panelDimsM(){
    const p = currentPanelOption();
    return {long:p.long, short:p.short, text:`${Math.round(p.long*1000)} x ${Math.round(p.short*1000)} mm`};
  }

  function capacityLayout(roofW, roofS, across, up, margin){
    const gap = 0.02;
    const availW = Math.max(0, roofW - (margin * 2));
    const availS = Math.max(0, roofS - (margin * 2));
    const cols = Math.max(0, Math.floor((availW + gap) / (across + gap)));
    const rows = Math.max(0, Math.floor((availS + gap) / (up + gap)));
    const count = cols * rows;
    const arrW = cols ? (cols * across) + (Math.max(0, cols - 1) * gap) : 0;
    const arrS = rows ? (rows * up) + (Math.max(0, rows - 1) * gap) : 0;
    return {cols, rows, count, arrW, arrS, margin};
  }

  function bestForCandidateOnPlane(plane, panel){
    const roofW = num(plane.width);
    const roofS = num(plane.slope);
    if(!roofW || !roofS) return null;
    const orientations = [
      {name:'portrait', across:panel.short, up:panel.long},
      {name:'landscape', across:panel.long, up:panel.short}
    ];
    let best = null;
    marginsToTry().forEach(margin => {
      orientations.forEach(o => {
        const layout = capacityLayout(roofW, roofS, o.across, o.up, margin);
        const kwp = (layout.count * panel.watt) / 1000;
        const score = (kwp * 100000) + (layout.count * 100) + (margin === 0.4 ? 10 : 0) + (o.name === 'landscape' ? 1 : 0);
        const candidate = {...layout, orientation:o.name, panel, kwp, roofW, roofS, score};
        if(!best || candidate.score > best.score) best = candidate;
      });
    });
    return best;
  }

  function getRoofRows(){
    return [...document.querySelectorAll('.roofPlaneRow')];
  }

  function planeFromRow(row, i){
    return {
      name: row.querySelector('.roofName')?.value || `Roof ${i+1}`,
      width: row.querySelector('.roofWidth')?.value || '',
      slope: row.querySelector('.roofSlope')?.value || '',
      pitch: row.querySelector('.roofPitch')?.value || '',
      azimuth: row.querySelector('.roofAzimuth')?.value || '',
      panels: row.querySelector('.roofPanels')?.value || ''
    };
  }

  function chooseBestPanelForRows(rows){
    const choice = val('autoPanelChoice') || 'AUTO';
    if(choice && choice !== 'AUTO') return optionByValue(choice);
    let best = null;
    PANEL_OPTIONS.forEach(panel => {
      let count = 0, kwp = 0, usable = 0, squeeze = 0;
      rows.forEach((row, i) => {
        const r = planeFromRow(row, i);
        const fit = bestForCandidateOnPlane(r, panel);
        if(fit && fit.count){
          usable++;
          count += fit.count;
          kwp += fit.kwp;
          if(fit.margin < 0.4) squeeze++;
        }
      });
      const score = (kwp * 100000) + (count * 100) + (panel.name.includes('AIKO') ? 2 : 0) - squeeze;
      const option = {panel, count, kwp, usable, squeeze, score};
      if(!best || option.score > best.score) best = option;
    });
    return (best && best.panel) || PANEL_OPTIONS[0];
  }

  function setBuildPanel(panel){
    const select = $('panelModel');
    if(select && select.value !== panel.value){
      select.value = panel.value;
    }
  }

  function updateTigoDefault(){
    // Tigos are not always needed on every panel. Keep quantity manual.
    const tigoQty = $('tigoQty');
    if(tigoQty && tigoQty.value === '') tigoQty.value = '0';
    if(tigoQty) tigoQty.dataset.auto = '';
  }

  function applyFitToRow(row, fit, force){
    const panelsInput = row.querySelector('.roofPanels');
    const result = row.querySelector('.roofFitResult');
    if(!fit || !fit.roofW || !fit.roofS){
      if(result) result.innerHTML = '<span class="fitWarn">Add roof width and slope length to calculate this elevation.</span>';
      return {count:0, kwp:0};
    }
    if(panelsInput && (force || panelsInput.value === '' || panelsInput.dataset.auto === 'yes')){
      panelsInput.value = fit.count || 0;
      panelsInput.dataset.auto = 'yes';
      if(force) panelsInput.dataset.manual = '';
    }
    const pitch = row.querySelector('.roofPitch')?.value || '?';
    const az = row.querySelector('.roofAzimuth')?.value || '?';
    const cls = fit.count ? (fit.margin < 0.4 ? 'fitSqueeze' : 'fitGood') : 'fitBad';
    const marginText = fit.margin < 0.4 ? '300 mm squeeze target' : '400 mm preferred margin';
    const kWpText = fit.kwp ? fit.kwp.toFixed(2) : '0.00';
    if(result){
      result.innerHTML = `<span class="${cls}"><b>${fit.count} panel${fit.count===1?'':'s'} suggested</b> using ${esc(fit.panel.name)} ${esc(fit.orientation)}, ${marginText}. ${kWpText} kWp DC. Pitch ${esc(pitch)}°, azimuth ${esc(az)}°. ${fit.count ? `Indicative array ${fit.arrW.toFixed(2)} m x ${fit.arrS.toFixed(2)} m.` : 'No sensible fit from entered dimensions.'}</span>`;
    }
    return {count:fit.count || 0, kwp:fit.kwp || 0};
  }

  function autoFitRoofPanels(force=false){
    const rows = getRoofRows();
    const summary = $('autoFitSummary');
    if(!rows.length){
      if(summary) summary.innerHTML = 'Add a roof/elevation to calculate panel fit.';
      return null;
    }
    const selectedPanel = chooseBestPanelForRows(rows);
    setBuildPanel(selectedPanel);
    let totalPanels = 0, totalKwp = 0, usableRows = 0, squeezeRows = 0;
    rows.forEach((row, i) => {
      const plane = planeFromRow(row, i);
      const fit = bestForCandidateOnPlane(plane, selectedPanel);
      const applied = applyFitToRow(row, fit, force);
      totalPanels += applied.count;
      totalKwp += applied.kwp;
      if(fit && fit.count) usableRows++;
      if(fit && fit.count && fit.margin < 0.4) squeezeRows++;
    });
    if($('panelCount') && (force || !$('panelCount').dataset.manual || $('panelCount').value === '0' || $('panelCount').value === '')){
      $('panelCount').value = totalPanels;
      $('panelCount').dataset.auto = 'yes';
    }else{
      const roofTotal = rows.reduce((sum,row)=>sum+num(row.querySelector('.roofPanels')?.value||0),0);
      if(roofTotal && $('panelCount')) $('panelCount').value = roofTotal;
    }
    updateTigoDefault();

    if(summary){
      const choice = val('autoPanelChoice') === 'AUTO' || !val('autoPanelChoice') ? 'Auto selected' : 'Using selected panel';
      const squeeze = squeezeRows ? ` ${squeezeRows} elevation${squeezeRows===1?'':'s'} use the 300 mm squeeze target.` : ' 400 mm preferred margin used where panels fit.';
      summary.innerHTML = `<div class="autoFitResult ${totalPanels?'fitGood':'fitWarn'}"><b>${choice}: ${esc(selectedPanel.name)}</b><p>${totalPanels} panel${totalPanels===1?'':'s'} suggested across ${usableRows || rows.length} roof elevation${(usableRows || rows.length)===1?'':'s'} = ${totalKwp.toFixed(2)} kWp DC.${squeeze}</p><p>Manual edits to “panels here” are kept until you tap Auto fit again.</p></div>`;
    }
    try{ if(typeof renderPanelSenseCheck === 'function') renderPanelSenseCheck(); }catch(e){}
    try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(e){}
    return {panel:selectedPanel, totalPanels, totalKwp};
  }

  function checkPlane(plane, panels, panel){
    const roofW = num(plane.width);
    const roofS = num(plane.slope);
    const name = plane.name || 'Roof';
    if(!roofW || !roofS){
      return {level:'warn', html:`<div class="senseItem senseWarn"><b>${esc(name)}</b><p>Add roof width and slope length to sense check this elevation.</p></div>`};
    }
    const fit = bestForCandidateOnPlane(plane, panel);
    if(!panels){
      return {level:fit && fit.count ? 'warn' : 'bad', html:`<div class="senseItem ${fit && fit.count ? 'senseWarn' : 'senseBad'}"><b>${esc(name)}</b><p>No manual panel allocation entered. Auto guide: ${fit ? `${fit.count} x ${esc(panel.name)} ${esc(fit.orientation)} using ${fit.margin < 0.4 ? '300 mm squeeze' : '400 mm preferred'} margin` : 'not enough data'}.</p></div>`};
    }
    const manualFit = bestLayoutForManual(panels, roofW, roofS, panel);
    let cls='senseBad', status='Does not look to fit from the entered dims', note='Review obstructions, roof dimensions, margins, split across elevations or reduce panel count.', level='bad';
    let layout = manualFit.raw || manualFit.tight || manualFit.preferred;
    let marginText = 'before margins';
    if(manualFit.preferred && manualFit.preferred.fits){
      cls='senseGood'; status='Looks sensible with preferred 400 mm margins'; note='Still subject to measured survey, fixing positions and obstruction clearance.'; level='good'; layout=manualFit.preferred; marginText='400 mm preferred margins';
    }else if(manualFit.tight && manualFit.tight.fits){
      cls='senseWarn'; status='Likely tight. 300 mm margin target may be needed'; note='Treat as a survey target only. Flag reduced edge margins and check rail/fixing positions.'; level='warn'; layout=manualFit.tight; marginText='300 mm squeeze margins';
    }else if(manualFit.raw && manualFit.raw.fits){
      cls='senseWarn'; status='Borderline. Fits only before proper margins'; note='Do not rely on this without a measured layout. Consider fewer panels or another roof plane.'; level='warn'; layout=manualFit.raw; marginText='no margin allowance';
    }
    const rowsCols = layout ? `${layout.cols} col x ${layout.rows} row` : 'no layout';
    return {level, html:`<div class="senseItem ${cls}">
      <b>${esc(name)}: ${panels} panel${panels===1?'':'s'} ${esc(panel.name)}</b>
      <p>${status}</p>
      <p>Roof ${roofW.toFixed(2)} m wide x ${roofS.toFixed(2)} m slope. Pitch ${esc(plane.pitch || '?')}°, azimuth ${esc(plane.azimuth || '?')}°. Indicative array ${layout ? layout.arrW.toFixed(2) : '0.00'} m x ${layout ? layout.arrS.toFixed(2) : '0.00'} m, ${rowsCols}, ${marginText}.</p>
      <p>${note}</p>
    </div>`};
  }

  function bestLayoutForManual(n, roofW, roofS, panel){
    const gap = 0.02;
    function bestFor(across, up, margin){
      const availW = Math.max(0, roofW - (margin * 2));
      const availS = Math.max(0, roofS - (margin * 2));
      let best = null;
      for(let cols=1; cols<=Math.max(1,n); cols++){
        const rows = Math.ceil(n / cols);
        const arrW = (cols * across) + (Math.max(0,cols-1) * gap);
        const arrS = (rows * up) + (Math.max(0,rows-1) * gap);
        const fits = arrW <= availW && arrS <= availS;
        const spill = Math.max(0, arrW-availW) + Math.max(0, arrS-availS);
        const waste = Math.max(0, availW-arrW) + Math.max(0, availS-arrS);
        const score = (fits ? -1000 : spill*100) + rows*2 + cols*0.1 + waste*0.01;
        if(!best || score < best.score) best = {cols, rows, arrW, arrS, fits, spill, score};
      }
      return best;
    }
    const orientations = [
      {name:'portrait', across:panel.short, up:panel.long},
      {name:'landscape', across:panel.long, up:panel.short}
    ];
    function bestMargin(margin){
      const res = orientations.map(o => ({...bestFor(o.across, o.up, margin), orientation:o.name}));
      return res.find(r => r.fits) || res.sort((a,b)=>a.spill-b.spill)[0];
    }
    return {preferred:bestMargin(0.4), tight:bestMargin(0.3), raw:bestMargin(0)};
  }

  function renderPanelSenseCheck(){
    const box = $('panelSenseCheck');
    if(!box) return null;
    let planes = [];
    try{ planes = typeof getRoofPlanes === 'function' ? getRoofPlanes() : []; }catch(e){}
    const totalPanels = num(val('panelCount'));
    const panel = currentPanelOption();

    if(!planes.length){
      box.innerHTML = '<div class="senseItem senseWarn"><b>No roof dimensions yet</b><p>Add roof width and slope length in Survey, then run the sense check. This will not block the survey.</p></div>';
      return null;
    }

    const allocated = planes.reduce((sum,r)=>sum+num(r.panels),0);
    let checkPlanes = planes.map((r,i) => {
      let p = num(r.panels);
      if(!allocated && planes.length === 1) p = totalPanels;
      return checkPlane(r, p, panel);
    });

    const issues = checkPlanes.filter(x => x.level !== 'good').length;
    const summary = `<div class="senseSummary ${issues?'senseWarn':'senseGood'}">
      <b>Panel-first sense check</b>
      <p>Using ${esc(panel.name)} dimensions: ${Math.round(panel.long*1000)} x ${Math.round(panel.short*1000)} mm. Preferred margin check is 400 mm. Squeeze check is 300 mm. This is advisory only and does not block the survey.</p>
      ${allocated ? `<p>${allocated} panel${allocated===1?'':'s'} allocated across roof elevations. Build panel count is ${totalPanels || 0}.</p>` : `<p>${totalPanels || 0} panel${totalPanels===1?'':'s'} in build. Add “panels here” on each roof for a better split check.</p>`}
    </div>`;

    box.innerHTML = summary + checkPlanes.map(x=>x.html).join('');
    return {issues, allocated, totalPanels, text:box.innerText};
  }

  function syncPanelSenseEvents(){
    ['panelModel','panelCount','solar','autoPanelChoice','autoPanelMargin','tigo'].forEach(id => {
      const el = $(id);
      if(el && !el.dataset.v50Sense){
        el.dataset.v50Sense='yes';
        el.addEventListener('input', () => {
          if(id === 'panelCount') el.dataset.manual='yes';
          if(id === 'panelModel' && $('autoPanelChoice')) $('autoPanelChoice').value = el.value || 'AUTO';
          if(id === 'tigoQty') el.dataset.auto='';
          autoFitRoofPanels(false);
          renderPanelSenseCheck();
        });
        el.addEventListener('change', () => {
          if(id === 'panelModel' && $('autoPanelChoice')) $('autoPanelChoice').value = el.value || 'AUTO';
          if(id === 'tigo' && $('tigoQty') && $('tigoQty').value === ''){
            $('tigoQty').value = '0';
            $('tigoQty').dataset.auto='';
          }
          autoFitRoofPanels(false);
          renderPanelSenseCheck();
        });
      }
    });

    document.querySelectorAll('.roofPlaneRow input').forEach(el => {
      if(el.dataset.v50Sense) return;
      el.dataset.v50Sense='yes';
      el.addEventListener('input', () => {
        if(el.classList.contains('roofPanels')){
          el.dataset.manual='yes';
          const total = Array.from(document.querySelectorAll('.roofPanels')).reduce((sum,input)=>sum + num(input.value),0);
          if(total > 0 && $('panelCount')) $('panelCount').value = total;
        }else{
          autoFitRoofPanels(false);
        }
        renderPanelSenseCheck();
      });
      el.addEventListener('change', () => { autoFitRoofPanels(false); renderPanelSenseCheck(); });
    });
  }

  function customerExtrasListV49(){
    const items=[];
    if($('ev')?.checked) items.push('Zappi EV charger');
    if($('eddi')?.checked) items.push('Eddi / hot water diverter');
    if($('otherExtra')?.checked) items.push((val('otherExtraName') || 'Other extra'));
    return items;
  }

  window.customerExtrasList = customerExtrasListV49;
  window.customerExtrasTitle = function(){
    const items = customerExtrasListV49();
    return items.length ? items.join(' + ') : 'No extras included';
  };
  window.renderPanelSenseCheck = renderPanelSenseCheck;
  window.autoFitRoofPanels = autoFitRoofPanels;

  function patchCalculateQuote(){
    const old = window.calculateQuote;
    window.calculateQuote = function(){
      try{ autoFitRoofPanels(false); }catch(e){}
      const result = typeof old === 'function' ? old.apply(this, arguments) : true;
      renderPanelSenseCheck();
      const q = typeof quote === 'function' ? quote() : {};
      const box = $('quoteCheck');
      if(box && q.extrasText && !box.innerHTML.includes('Manual extras')){
        box.innerHTML += `<div class="quoteExtraLine"><b>Manual extras:</b> ${esc(q.extrasText)}</div>`;
      }
      if(box && $('tigo')?.checked && !box.innerHTML.includes('Tigo optimisers')){
        box.innerHTML += `<div class="quoteExtraLine"><b>Tigo optimisers:</b> ${q.tigoQty||0} selected</div>`;
      }
      return result;
    };
  }

  function patchPrompt(){
    const oldPrompt = window.prompt;
    window.prompt = function(){
      let base = '';
      try{ base = typeof oldPrompt === 'function' ? oldPrompt() : ''; }catch(e){}
      const sense = renderPanelSenseCheck();
      const q = typeof quote === 'function' ? quote() : {};
      return `${base}

LG Survey panel-first sense check:
${sense && sense.text ? sense.text : 'No panel sense check available yet.'}

Tigo optimisers:
${$('tigo')?.checked ? (q.tigoQty||0) + ' selected' : 'Not selected'}

Manual extras:
${q.extrasText || window.customerExtrasTitle()}
Extras notes: ${val('extrasNote')}`;
    };
  }

  function bind(){
    syncPanelSenseEvents();
    const run = $('runPanelSenseCheck');
    if(run && !run.dataset.v50Ready){
      run.dataset.v50Ready='yes';
      run.onclick = e => { e.preventDefault(); syncPanelSenseEvents(); renderPanelSenseCheck(); };
    }
    const autoBtn = $('autoFitRoofs');
    if(autoBtn && !autoBtn.dataset.v50Ready){
      autoBtn.dataset.v50Ready = 'yes';
      autoBtn.onclick = e => { e.preventDefault(); document.querySelectorAll('.roofPanels').forEach(i=>{i.dataset.manual='';}); autoFitRoofPanels(true); renderPanelSenseCheck(); try{ if(typeof save==='function') save(); }catch(err){} };
    }
    document.addEventListener('input', e => {
      if(e.target && (e.target.closest('#roofPlanes') || ['autoPanelChoice','autoPanelMargin','panelModel','panelCount','tigo','ev','eddi','otherExtra','eddiPrice','otherExtraName','otherExtraPrice','extrasNote'].includes(e.target.id))){
        syncPanelSenseEvents();
        if(!e.target.classList.contains('roofPanels')) autoFitRoofPanels(false);
        renderPanelSenseCheck();
      }
    }, true);
    document.addEventListener('change', e => {
      if(e.target && (e.target.closest('#roofPlanes') || ['autoPanelChoice','autoPanelMargin','panelModel','panelCount','tigo','ev','eddi','otherExtra','eddiPrice','otherExtraName','otherExtraPrice','extrasNote'].includes(e.target.id))){
        syncPanelSenseEvents();
        if(e.target.id === 'panelModel' && $('autoPanelChoice')) $('autoPanelChoice').value = e.target.value || 'AUTO';
        autoFitRoofPanels(false);
        renderPanelSenseCheck();
        try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(err){}
      }
    }, true);
    document.addEventListener('input', e => { if(e.target && ['teslaSaleType','pw3Qty','dcExpQty','gateway','pw3Price','gatewayPrice','dcPrice','teslaDiscounts'].includes(e.target.id)){ syncTeslaOptions(); try{ if(typeof save==='function') save(); }catch(err){} } }, true);

    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
    ['calculateQuote','refreshPresent','calcQuote'].forEach(id => {
      const btn = $(id);
      if(btn && !btn.dataset.v50Extras){
        btn.dataset.v50Extras = 'yes';
        btn.addEventListener('click', () => {
          setTimeout(() => {
            autoFitRoofPanels(false);
            renderPanelSenseCheck();
            try{
              const q = typeof quote === 'function' ? quote() : {};
              const box = $('quoteCheck');
              if(box && q.extrasText && !box.innerHTML.includes('Manual extras')){
                box.innerHTML += `<div class="quoteExtraLine"><b>Manual extras:</b> ${esc(q.extrasText)}</div>`;
              }
            }catch(e){}
          }, 0);
        });
      }
    });
    patchCalculateQuote();
    patchPrompt();
    setTimeout(()=>{ autoFitRoofPanels(false); renderPanelSenseCheck(); }, 100);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v43/v50: repair Continue buttons and keep bottom buttons non-sticky */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);

  function showSurveySyncTab(tabId){
    if(!tabId) return;

    document.querySelectorAll('nav button[data-tab]').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('main > section.panel').forEach(panel => {
      panel.classList.toggle('on', panel.id === tabId);
    });

    const target = $(tabId);
    if(target) target.classList.add('on');

    if(tabId === 'present'){
      setTimeout(() => {
        try{ if(typeof calculateQuote === 'function') calculateQuote(); }catch(e){}
        try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(e){}
        try{ if(typeof initSignaturePad === 'function') initSignaturePad(); }catch(e){}
      }, 0);
    }

    window.scrollTo({top:0, left:0, behavior:'smooth'});
  }

  function bindContinueButtons(){
    document.querySelectorAll('.continueBtn[data-next]').forEach(btn => {
      if(btn.dataset.v43ContinueBound === 'yes') return;
      btn.dataset.v43ContinueBound = 'yes';
      btn.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        showSurveySyncTab(btn.dataset.next);
      });
    });
  }

  function bind(){
    bindContinueButtons();
    document.addEventListener('click', function(e){
      const btn = e.target && e.target.closest ? e.target.closest('.continueBtn[data-next]') : null;
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      showSurveySyncTab(btn.dataset.next);
    }, true);

    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v50 premium guided consultation layer */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  const order = ['home','customer','usage','site','build','present','agreement','internal'];
  const journeyMap = {
    customer:0,
    usage:1,
    site:2,
    build:3,
    present:4,
    agreement:5
  };

  function afterTab(tabId){
    if(tabId === 'present' || tabId === 'agreement'){
      setTimeout(() => {
        try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(e){}
        try{ if(window.renderPanelSenseCheck) window.renderPanelSenseCheck(); }catch(e){}
        try{ if(typeof initSignaturePad === 'function') initSignaturePad(); }catch(e){}
      }, 25);
    }
    updateJourney(tabId);
  }

  function updateJourney(tabId){
    const idx = journeyMap.hasOwnProperty(tabId) ? journeyMap[tabId] : -1;
    document.querySelectorAll('.journeyStep[data-jump]').forEach((step,i) => {
      step.classList.toggle('on', i === idx);
      step.classList.toggle('done', idx > i);
    });
    document.body.dataset.activeTab = tabId || '';
  }

  function showTab(tabId){
    if(!tabId) return;
    document.querySelectorAll('nav button[data-tab]').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('main > section.panel').forEach(panel => {
      panel.classList.toggle('on', panel.id === tabId);
    });
    const panel = $(tabId);
    if(panel) panel.classList.add('on');
    afterTab(tabId);
    window.scrollTo({top:0,left:0,behavior:'smooth'});
  }

  function activeTab(){
    const panel = document.querySelector('main > section.panel.on');
    return panel ? panel.id : 'home';
  }

  function bindPremiumNavigation(){
    document.addEventListener('click', function(e){
      const navBtn = e.target && e.target.closest ? e.target.closest('nav button[data-tab]') : null;
      const continueBtn = e.target && e.target.closest ? e.target.closest('.continueBtn[data-next]') : null;
      const journeyBtn = e.target && e.target.closest ? e.target.closest('.journeyStep[data-jump]') : null;
      const target = navBtn?.dataset.tab || continueBtn?.dataset.next || journeyBtn?.dataset.jump;
      if(!target) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      showTab(target);
    }, true);
  }

  function addFastCustomerRefresh(){
    document.addEventListener('input', function(e){
      const id = e.target && e.target.id;
      if(!id) return;
      if(['customerName','wants','whyNow','annualKwh','dailyKwh','tariff','peak','offpeak','panelCount','batteryBrand','sigBatteryModel','sigModuleQty','pw3Qty','dcExpQty','cable','batteryLoc','invLoc','access','customerLikelihood','blockerReason'].includes(id)){
        try{ if(activeTab()==='present' || activeTab()==='agreement') refreshPresent(); }catch(err){}
      }
    }, true);
    document.addEventListener('change', function(e){
      const id = e.target && e.target.id;
      if(['solar','battery','ev','eddi','otherExtra','customerRouteAgreed','customerLikelihood','gateway','pw3','dcExp'].includes(id)){
        try{ if(activeTab()==='present' || activeTab()==='agreement') refreshPresent(); }catch(err){}
      }
    }, true);
  }

  function polishDynamicCards(){
    try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(e){}
    try{ if(window.renderPanelSenseCheck) window.renderPanelSenseCheck(); }catch(e){}
    updateJourney(activeTab());
    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
  }

  function bind(){
    bindPremiumNavigation();
    addFastCustomerRefresh();
    document.querySelectorAll('.journeyStep[data-jump]').forEach(btn => {
      btn.type = 'button';
    });
    polishDynamicCards();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v50: open the Customer stage after Start new consultation reset */
(function(){
  function openHashStage(){
    const hash=(location.hash||'').replace('#','');
    if(!hash) return;
    const btn=document.querySelector('nav button[data-tab="'+hash+'"]');
    if(btn) setTimeout(()=>btn.click(), 80);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openHashStage);
  else openHashStage();
})();


/* v50 acceptance flow, dynamic proof cards and email draft */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').toString().trim();
  const checked = id => !!$(id)?.checked;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const clip = (s, n=82) => {
    const t = String(s || '').replace(/\s+/g,' ').trim();
    return t.length > n ? t.slice(0,n-1).trim() + '…' : t;
  };

  function qSafe(){
    try{ return typeof quote === 'function' ? quote() : {total:0,kWp:0}; }catch(e){ return {total:0,kWp:0}; }
  }
  function pSafe(){
    try{ return typeof panelParts === 'function' ? panelParts() : {name:'Solar panel'}; }catch(e){ return {name:'Solar panel'}; }
  }
  function paybackSafe(){
    try{ return typeof estimatePayback === 'function' ? estimatePayback() : {ok:false}; }catch(e){ return {ok:false}; }
  }
  function batteryTitle(){
    try{ return typeof customerBatteryTitle === 'function' ? customerBatteryTitle() : (val('batteryBrand') || 'No battery selected'); }catch(e){ return val('batteryBrand') || 'No battery selected'; }
  }
  function storageText(){
    try{ return typeof customerBatteryStorageText === 'function' ? customerBatteryStorageText() : ''; }catch(e){ return ''; }
  }
  function extrasText(){
    try{ return typeof customerExtrasTitle === 'function' ? customerExtrasTitle() : (checked('ev') ? 'Zappi EV charger' : 'No extras included'); }catch(e){ return checked('ev') ? 'Zappi EV charger' : 'No extras included'; }
  }
  function roofSummary(){
    try{
      if(typeof getRoofPlanes === 'function'){
        const planes = getRoofPlanes();
        const withData = planes.filter(r => r.width || r.slope || r.pitch || r.azimuth || r.panels);
        if(withData.length){
          return withData.map(r => `${r.name || 'Roof'}: ${r.panels || '?'} panels, ${r.width || '?'}m x ${r.slope || '?'}m`).join(' | ');
        }
      }
    }catch(e){}
    return val('roof') || val('dims') || '';
  }
  function proofData(){
    const q = qSafe(), p = pSafe();
    const usage = val('annualKwh') ? `${Number(val('annualKwh')).toLocaleString()} kWh/year` : (val('dailyKwh') ? `${val('dailyKwh')} kWh/day` : '');
    const priorities = val('wants') || val('whyNow');
    const roof = roofSummary();
    const routeBits = [val('cable') ? `route: ${clip(val('cable'),35)}` : '', val('access') ? `access: ${clip(val('access'),35)}` : ''].filter(Boolean).join(' · ');
    const designBits = [
      checked('solar') && val('panelCount') ? `${val('panelCount')} x ${p.name} (${q.kWp} kWp)` : '',
      batteryTitle() && batteryTitle() !== 'Battery not included' ? batteryTitle() : '',
      usage ? `usage: ${usage}` : ''
    ].filter(Boolean).join(' · ');
    const protectedBits = [
      checked('customerRouteAgreed') ? 'locations and route accepted' : '',
      val('nextAction') ? val('nextAction') : 'formal quote next',
      'subject to final design checks'
    ].filter(Boolean).join(' · ');
    return [
      {
        n:'1', title:'Understood',
        ok:!!priorities,
        text:priorities ? clip(priorities,92) : 'Add priorities or main reason.'
      },
      {
        n:'2', title:'Checked',
        ok:!!(roof || routeBits || val('meter')),
        text:clip([roof, routeBits, val('meter') ? 'meter/CU checked' : ''].filter(Boolean).join(' · '),110) || 'Add roof, route and electrical notes.'
      },
      {
        n:'3', title:'Right-sized',
        ok:!!designBits,
        text:clip(designBits,110) || 'Select panels, battery and usage.'
      },
      {
        n:'4', title:'Protected',
        ok:!!(checked('customerRouteAgreed') || val('nextAction') || q.total),
        text:clip(protectedBits,110)
      }
    ];
  }
  function updateConsultationProof(){
    const box = $('consultationProof') || document.querySelector('.consultationProof');
    if(!box) return;
    box.innerHTML = proofData().map(item => `<div class="${item.ok ? 'proofComplete' : 'proofPending'}">
      <span>${item.n}</span>
      <b>${item.title}</b>
      <small>${esc(item.text)}</small>
    </div>`).join('');
  }

  function setLikelihood(value){
    const input = $('customerLikelihood');
    if(input) input.value = value || '';
    document.querySelectorAll('#likelihoodButtons button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.likelihood === value);
    });
    const prompt = $('blockerPrompt');
    if(prompt){
      prompt.className = 'blockerPrompt';
      if(!value){
        prompt.textContent = 'Choose the closest option above.';
      } else if(value.includes('Ready')){
        prompt.textContent = 'Good. The quote can now be formalised from today’s survey guidance.';
        prompt.classList.add('good');
        if($('salesStatus')) $('salesStatus').value = 'Formal quote needed';
        if($('mainBlocker')) $('mainBlocker').value = 'None known';
      } else if(value.includes('Question')){
        prompt.textContent = 'No problem. Add the question or change below so it is handled before the quote is finalised.';
        prompt.classList.add('warn');
        if($('salesStatus')) $('salesStatus').value = 'Clarification before quote';
        if($('mainBlocker') && !$('mainBlocker').value) $('mainBlocker').value = 'Question or change to resolve';
      } else {
        prompt.textContent = 'Thanks. Add the reason below so the follow-up is handled properly.';
        prompt.classList.add('danger');
        if($('salesStatus')) $('salesStatus').value = 'Not ready';
      }
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
  }

  function syncLikelihoodButtons(){
    const v = val('customerLikelihood');
    document.querySelectorAll('#likelihoodButtons button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.likelihood === v);
    });
  }

  function buildEmailBody(){
    const q = qSafe(), p = pSafe(), pb = paybackSafe();
    const name = val('customerName') || 'there';
    const first = name.split(/\s+/)[0] || name;
    const solar = checked('solar') ? `${val('panelCount') || 0} x ${p.name}, ${q.kWp || '0.00'} kWp` : 'Not included at this stage';
    const battery = batteryTitle();
    const storage = storageText();
    const extras = extrasText();
    const price = q.total ? (typeof money === 'function' ? money(q.total) : '£' + Math.round(q.total).toLocaleString()) : 'To be confirmed';
    const usage = val('annualKwh') ? `${Number(val('annualKwh')).toLocaleString()} kWh/year` : (val('dailyKwh') ? `${val('dailyKwh')} kWh/day` : 'To be confirmed');
    const paybackLine = (pb && pb.ok && pb.totalSaving) ? `Estimated first-year benefit: ${typeof money === 'function' ? money(pb.totalSaving) : '£' + Math.round(pb.totalSaving).toLocaleString()} | Estimated payback: ${pb.payback.toFixed(1)} years` : 'Savings and payback remain subject to final usage, tariff and design checks.';
    const roof = roofSummary() || 'Roof details captured during survey.';
    const route = val('cable') || 'Cable route to be confirmed in final design.';
    const access = val('access') || 'Access/scaffold to be confirmed.';
    const priorities = val('wants') || 'Lower bills and improved energy control.';
    const why = val('whyNow') || '';
    const clarify = val('blockerReason') || '';
    return [
      `Hi ${first},`,
      '',
      'Thank you for going through the survey today.',
      '',
      'Below is the recommendation we discussed. It is subject to final roof, electrical, DNO and design checks before the formal paperwork is issued.',
      '',
      'THE LITTLE GREEN ENERGY COMPANY',
      'LG Survey recommendation',
      '',
      '1. UNDERSTOOD',
      `Priorities: ${priorities}`,
      why ? `Reason for looking: ${why}` : '',
      '',
      '2. CHECKED',
      `Roof/access: ${roof}`,
      `Cable route: ${route}`,
      `Access/scaffold: ${access}`,
      '',
      '3. RIGHT-SIZED RECOMMENDATION',
      `Solar PV: ${solar}`,
      `Battery: ${battery}`,
      storage ? `Storage: ${storage}` : '',
      `Extras: ${extras}`,
      `Proposal position: ${price}`,
      paybackLine,
      '',
      '4. PROTECTED NEXT STEP',
      'James will prepare the detailed proposal and paperwork for review. The final design remains subject to survey validation, DNO and technical checks.',
      clarify ? `Question/change to note: ${clarify}` : '',
      '',
      'Kind regards,',
      'James Cooling',
      'The Little Green Energy Company',
      '01622 832834',
      '07714292169'
    ].filter(line => line !== '').join('\r\n');
  }

  function openRecommendationEmail(){
    const email = val('email');
    const name = val('customerName') || 'your home';
    const subject = `Your solar recommendation - subject to final design checks`;
    const body = buildEmailBody();
    const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(body).catch(()=>{});
      }
    }catch(e){}
    window.location.href = href;
  }

  function signatureCaptured(){
    const canvas = $('signatureCanvas');
    if(!canvas) return false;
    try{
      const ctx = canvas.getContext('2d');
      const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<pixels.length;i+=4){
        if(pixels[i] > 10){
          window.signatureData = canvas.toDataURL('image/png');
          return true;
        }
      }
    }catch(e){
      return !!(window.signatureData && window.signatureData.length > 1000);
    }
    return false;
  }

  function acceptSurveyGuidance(){
    if(!signatureCaptured()){
      alert('Please sign before accepting the survey guidance.');
      return;
    }
    if(!val('customerLikelihood')) setLikelihood('Ready to formalise the quote');
    const name = val('customerName') || 'Survey';
    const now = new Date().toLocaleString();
    if($('salesStatus')) $('salesStatus').value = 'Formal quote needed';
    if($('nextAction')) $('nextAction').value = 'Prepare formal quote and send paperwork for review';
    if($('acceptanceStamp')){
      $('acceptanceStamp').innerHTML = `<div class="thanksCard">
        <b>👍 Thank you.</b>
        <p>The recommendation email is ready in the mailbox. James will come back later with the detailed proposal and paperwork for review.</p>
        <small>${esc(name)} accepted the survey guidance on ${esc(now)}. Final design checks still apply.</small>
      </div>`;
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
    openRecommendationEmail();
  }

  function patchRefresh(){
    if(window.__v50RefreshPatched) return;
    window.__v50RefreshPatched = true;
    const original = window.refreshPresent;
    if(typeof original === 'function'){
      window.refreshPresent = function(){
        const out = original.apply(this, arguments);
        updateConsultationProof();
        syncLikelihoodButtons();
        return out;
      };
    }
  }

  function bind(){
    patchRefresh();
    updateConsultationProof();
    syncLikelihoodButtons();

    document.querySelectorAll('#likelihoodButtons button').forEach(btn => {
      btn.onclick = e => {
        e.preventDefault();
        setLikelihood(btn.dataset.likelihood || '');
      };
    });

    const accept = $('stampAccept');
    if(accept){
      accept.onclick = e => {
        e.preventDefault();
        acceptSurveyGuidance();
      };
    }

    document.addEventListener('input', e => {
      if(e.target && e.target.id === 'tigoQty') return;
      if(e.target && (e.target.matches('input,textarea,select') || e.target.closest('#roofPlanes'))){
        updateConsultationProof();
        syncLikelihoodButtons();
      }
    }, true);
    document.addEventListener('change', e => {
      if(e.target && e.target.id === 'tigoQty') return;
      if(e.target && (e.target.matches('input,textarea,select') || e.target.closest('#roofPlanes'))){
        updateConsultationProof();
        syncLikelihoodButtons();
      }
    }, true);

    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v50: polished Little Green Energy recommendation email */
(function(){
  const VERSION = 'v58';
  const LOGO_DATA_URI = "data:image/png;base64,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";
const TESLA_EMAIL_IMG = "data:image/jpeg;base64,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";
const SIGENERGY_EMAIL_IMG = "data:image/jpeg;base64,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";
  const EMAIL_SUBJECT = 'Your Little Green Energy survey recommendation';
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').toString().trim();
  const checked = id => !!$(id)?.checked;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const txt = s => String(s ?? '').replace(/\s+/g,' ').trim();
  const clip = (s,n=150) => { const t=txt(s); return t.length>n ? t.slice(0,n-1).trim()+'…' : t; };

  function qSafe(){ try{ return typeof quote === 'function' ? quote() : {total:0,kWp:'0.00'}; }catch(e){ return {total:0,kWp:'0.00'}; } }
  function pSafe(){ try{ return typeof panelParts === 'function' ? panelParts() : {name:'Solar panel'}; }catch(e){ return {name:'Solar panel'}; } }
  function paybackSafe(){ try{ return typeof estimatePayback === 'function' ? estimatePayback() : {ok:false}; }catch(e){ return {ok:false}; } }
  function moneySafe(n){ try{ return typeof money === 'function' ? money(n) : '£'+Math.round(Number(n)||0).toLocaleString('en-GB'); }catch(e){ return '£'+Math.round(Number(n)||0).toLocaleString('en-GB'); } }
  function firstName(){ const n=val('customerName') || 'there'; return n.split(/\s+/)[0] || n; }
  function fullName(){ return val('customerName') || 'your home'; }
  function batteryTitle(){ try{ return typeof customerBatteryTitle === 'function' ? customerBatteryTitle() : (val('batteryBrand') || 'Battery route to confirm'); }catch(e){ return val('batteryBrand') || 'Battery route to confirm'; } }
  function storageText(){ try{ return typeof customerBatteryStorageText === 'function' ? customerBatteryStorageText() : ''; }catch(e){ return ''; } }
  function extrasText(){ try{ return typeof customerExtrasTitle === 'function' ? customerExtrasTitle() : (checked('ev') ? 'Zappi EV charger' : 'None selected'); }catch(e){ return checked('ev') ? 'Zappi EV charger' : 'None selected'; } }
  function roofSummary(){
    try{
      if(typeof getRoofPlanes === 'function'){
        const planes=getRoofPlanes().filter(r => r.width || r.slope || r.pitch || r.azimuth || r.panels);
        if(planes.length){
          return planes.map(r => `${r.name || 'Roof'}: ${r.panels || '?'} panels, ${r.width || '?'}m x ${r.slope || '?'}m`).join(' | ');
        }
      }
    }catch(e){}
    return val('roof') || val('dims') || 'Roof and site details captured during survey.';
  }
  function recommendationData(){
    const q=qSafe(), p=pSafe(), pb=paybackSafe();
    const usage = val('annualKwh') ? `${Number(val('annualKwh')).toLocaleString('en-GB')} kWh/year` : (val('dailyKwh') ? `${val('dailyKwh')} kWh/day` : 'To be confirmed');
    const solar = checked('solar') ? `${val('panelCount') || 0} x ${p.name}, ${q.kWp || '0.00'} kWp` : 'Not included at this stage';
    const price = q.total ? moneySafe(q.total) : 'To be confirmed after final design checks';
    const payback = (pb && pb.ok && pb.totalSaving) 
      ? `${moneySafe(pb.totalSaving)} estimated first-year benefit, approx. ${pb.payback.toFixed(1)} year payback`
      : 'Savings and payback are subject to final usage, tariff and design checks.';
    return {
      first:firstName(),
      name:fullName(),
      address:val('address'),
      email:val('email'),
      priorities: val('wants') || 'Lower bills and improved energy control',
      reason: val('whyNow') || 'Noted during the survey',
      concern: val('blockerReason') || val('mainBlocker') || '',
      usage,
      roof: roofSummary(),
      route: val('cable') || 'Cable route to be confirmed within final design',
      access: val('access') || 'Access/scaffold to be confirmed',
      meter: val('meter') || 'Meter/CU details captured during survey',
      solar,
      battery: batteryTitle(),
      storage: storageText(),
      extras: extrasText(),
      price,
      payback,
      next: 'A formal quote will now be prepared for review. Final roof, electrical, DNO and design checks still apply.'
    };
  }

  function buildRecommendationEmailText(){
    const d=recommendationData();
    return [
      `Hi ${d.first},`,
      '',
      'Thank you for going through the survey today.',
      '',
      'Here is your Little Green Energy survey recommendation.',
      '',
      'This is based on today’s survey guidance and remains subject to final roof, electrical, DNO and design checks before the formal paperwork is issued.',
      '',
      'UNDERSTOOD',
      '----------------------------------------',
      `Priorities: ${d.priorities}`,
      d.reason ? `Reason for looking: ${d.reason}` : '',
      '',
      'CHECKED',
      '----------------------------------------',
      `Roof/access: ${d.roof}`,
      `Meter/CU: ${d.meter}`,
      `Cable route: ${d.route}`,
      `Access/scaffold: ${d.access}`,
      '',
      'RIGHT-SIZED RECOMMENDATION',
      '----------------------------------------',
      `Solar PV: ${d.solar}`,
      `Battery: ${d.battery}`,
      d.storage ? `Storage: ${d.storage}` : '',
      `Extras: ${d.extras}`,
      `Proposal position: ${d.price}`,
      d.payback,
      '',
      'PROTECTED NEXT STEP',
      '----------------------------------------',
      d.next,
      d.concern ? `Question/change to note: ${d.concern}` : '',
      '',
      'James will prepare the detailed proposal and paperwork for review. Nothing is treated as final installation design until the checks above are complete.',
      '',
      'Kind regards,',
      'James Cooling',
      'The Little Green Energy Company',
      '01622 832834',
      '07714292169'
    ].filter(Boolean).join('\r\n');
  }

  function card(title, body, accent='#79ac20'){
    return `<div style="border:1px solid #dbe6de;border-radius:18px;padding:18px;margin:12px 0;background:#ffffff;box-shadow:0 4px 18px rgba(6,40,25,.06);">
      <div style="display:inline-block;background:#eef7ee;border:1px solid #cfe5d1;border-radius:999px;padding:7px 12px;color:#087347;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">${title}</div>
      <div style="margin-top:12px;color:#0b1f18;font-size:15px;line-height:1.55;">${body}</div>
    </div>`;
  }

  function emailBatteryImageHTML(){
    const brand = val('batteryBrand');
    let src = '';
    let label = '';
    if(brand === 'Tesla'){
      src = TESLA_EMAIL_IMG;
      label = 'Tesla Powerwall recommendation';
    } else if(brand === 'Sigenergy'){
      src = SIGENERGY_EMAIL_IMG;
      label = 'Sigenergy battery recommendation';
    }
    if(!src) return '';
    return `<tr><td style="padding:12px 0 2px;">
      <img src="${src}" alt="${esc(label)}" width="620" style="display:block;width:100%;max-width:620px;height:auto;border-radius:18px;border:1px solid #dbe6de;background:#f5f7f3;">
    </td></tr>`;
  }

  function emailInfoBlock(title, body, number){
    return `<td class="stack" width="50%" style="width:50%;padding:8px;vertical-align:top;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dbe6de;border-radius:20px;">
        <tr>
          <td style="padding:18px 18px 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
              <tr>
                <td style="width:42px;height:42px;border-radius:21px;background:#06391f;color:#ffffff;text-align:center;font-weight:900;font-size:20px;line-height:42px;">${number}</td>
                <td style="padding-left:10px;color:#087347;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">${title}</td>
              </tr>
            </table>
            <div style="color:#0b1f18;font-size:15px;line-height:1.55;">${body}</div>
          </td>
        </tr>
      </table>
    </td>`;
  }

  function buildRecommendationEmailHTML(){
    const d=recommendationData();
    const line = (label,value) => value ? `<p style="margin:0 0 8px;"><strong style="color:#062819;">${esc(label)}:</strong> <span style="color:#34463c;">${esc(value)}</span></p>` : '';
    const understood = `${line('Priorities', d.priorities)}${line('Reason for looking', d.reason)}`;
    const checkedHtml = `${line('Roof/access', d.roof)}${line('Meter/CU', d.meter)}${line('Cable route', d.route)}${line('Access/scaffold', d.access)}`;
    const designHtml = `${line('Solar PV', d.solar)}${line('Battery', d.battery)}${line('Storage', d.storage)}${line('Extras', d.extras)}${line('Proposal position', d.price)}${line('Indicative benefit', d.payback)}`;
    const protectHtml = `<p style="margin:0 0 8px;color:#34463c;line-height:1.55;">${esc(d.next)}</p>${d.concern ? line('Question/change to note', d.concern) : ''}`;
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media screen and (max-width:640px){.stack{display:block!important;width:100%!important}.pad{padding:16px!important}.heroTitle{font-size:28px!important}.logoText{font-size:24px!important}}
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f7f1;font-family:Arial,Helvetica,sans-serif;color:#0b1f18;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f1;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:22px 12px;">
        <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #dbe6de;border-radius:28px;overflow:hidden;box-shadow:0 8px 28px rgba(6,40,25,.10);">
          <tr>
            <td class="pad" style="padding:22px 24px;background:linear-gradient(135deg,#ffffff 0%,#eef7ee 100%);border-bottom:1px solid #dbe6de;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:78px;vertical-align:middle;">
                    <img src="${LOGO_DATA_URI}" alt="The Little Green Energy Company" width="66" height="66" style="display:block;border-radius:18px;background:#ffffff;border:1px solid #e4ece5;padding:6px;">
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <div style="font-size:13px;color:#637268;font-weight:800;">The Little Green Energy Company</div>
                    <div class="logoText" style="font-size:28px;line-height:1.05;font-weight:900;color:#062819;">Your survey recommendation</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pad" style="padding:28px 24px;background:linear-gradient(135deg,#06391f 0%,#0b7a46 62%,#79ac20 100%);color:#ffffff;">
              <div style="font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#e6f4d7;">Little Green Energy survey recommendation</div>
              <h1 class="heroTitle" style="margin:8px 0 10px;font-size:34px;line-height:1.08;color:#ffffff;font-weight:900;">Hi ${esc(d.first)}, here is the recommendation from today’s survey.</h1>
              <p style="margin:0;font-size:17px;line-height:1.55;color:#efffed;">Built around the home, usage and priorities discussed today. The formal proposal remains subject to final roof, electrical, DNO and design checks.</p>
            </td>
          </tr>

          <tr>
            <td class="pad" style="padding:18px 16px 8px;background:#f8fbf7;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${emailInfoBlock('Understood', understood, '1')}
                  ${emailInfoBlock('Checked', checkedHtml, '2')}
                </tr>
                <tr>
                  ${emailInfoBlock('Right-sized', designHtml, '3')}
                  ${emailInfoBlock('Protected next step', protectHtml, '4')}
                </tr>
              </table>
            </td>
          </tr>

          ${emailBatteryImageHTML()}

          <tr>
            <td class="pad" style="padding:22px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef7ee;border-left:6px solid #79ac20;border-radius:18px;">
                <tr>
                  <td style="padding:18px 18px;">
                    <strong style="display:block;font-size:19px;color:#062819;margin-bottom:6px;">What happens next</strong>
                    <p style="margin:0;color:#34463c;font-size:15px;line-height:1.55;">James will prepare the detailed proposal and paperwork for review. Nothing is treated as final installation design until the final checks are complete.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                <tr>
                  <td style="color:#0b1f18;font-size:15px;line-height:1.55;">
                    <p style="margin:0 0 4px;">Kind regards,</p>
                    <p style="margin:0;font-weight:900;">James Cooling</p>
                    <p style="margin:0;">The Little Green Energy Company</p>
                    <p style="margin:8px 0 0;">01622 832834<br>07714292169</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  function copyHtmlViaSelection(html, text){
    const holder=document.createElement('div');
    holder.setAttribute('contenteditable','true');
    holder.style.position='fixed';
    holder.style.left='-9999px';
    holder.style.top='0';
    holder.style.width='680px';
    holder.innerHTML=html;
    document.body.appendChild(holder);
    const range=document.createRange();
    range.selectNodeContents(holder);
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok=false;
    try{ ok=document.execCommand('copy'); }catch(e){ ok=false; }
    sel.removeAllRanges();
    document.body.removeChild(holder);
    return ok;
  }

  async function copyStyledRecommendationEmail(showToast){
    const html=buildRecommendationEmailHTML();
    const text=buildRecommendationEmailText();
    let ok=false;
    try{
      ok = copyHtmlViaSelection(html, text);
    }catch(e){ ok=false; }
    if(!ok){
      try{
        if(navigator.clipboard && window.ClipboardItem){
          await navigator.clipboard.write([new ClipboardItem({
            'text/html': new Blob([html], {type:'text/html'}),
            'text/plain': new Blob([text], {type:'text/plain'})
          })]);
          ok=true;
        }
      }catch(e){ ok=false; }
    }
    if(!ok){
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(text);
          ok=false;
        }
      }catch(e){}
    }
    if(showToast){
      showEmailToast(ok ? 'Styled email copied. Paste into the Outlook body to keep the logo, colours and image.' : 'Plain text copied. Outlook blocked the styled copy on this device.');
    }
    return ok;
  }

  function openRecommendationDraft(){
    const email=val('email');
    const href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`;
    window.location.href=href;
  }

  function emailPreviewHTML(){
    const d=recommendationData();
    const brand = val('batteryBrand');
    const batteryImg = brand === 'Tesla' ? 'tesla-powerwall.webp' : (brand === 'Sigenergy' ? 'sigenergy-battery.webp' : '');
    return `<div class="emailPreviewCard">
      <div class="emailPreviewHead">
        <img src="tlgec-logo.png" alt="The Little Green Energy Company logo">
        <div><span>The Little Green Energy Company</span><b>${esc(EMAIL_SUBJECT)}</b></div>
      </div>
      <div class="emailPreviewHero">
        <span>Your survey recommendation</span>
        <b>Ready for ${esc(d.first)}</b>
        <p>The styled email has been copied. The draft opens with the address and subject ready, then paste into the message body to keep the premium layout.</p>
      </div>
      <div class="emailPreviewGrid">
        <div><b>Understood</b><small>${esc(clip(d.priorities,90))}</small></div>
        <div><b>Checked</b><small>${esc(clip(d.roof,90))}</small></div>
        <div><b>Right-sized</b><small>${esc(clip(d.solar + ' · ' + d.battery,90))}</small></div>
        <div><b>Protected</b><small>Final roof, electrical, DNO and design checks apply.</small></div>
      </div>
      ${batteryImg ? `<img class="emailPreviewBattery" src="${batteryImg}" alt="${esc(brand)} battery image">` : ''}
      <div class="emailPreviewPasteHint"><b>Outlook step:</b> tap in the blank email body and paste. The logo, green cards and battery image should appear where the device allows styled clipboard.</div>
      <div class="emailPreviewActions">
        <button type="button" class="secondary" id="copyStyledEmailAgain">Copy styled email again</button>
        <button type="button" class="secondary" id="openRecommendationDraftAgain">Open email draft again</button>
        <button type="button" class="secondary" id="copyPlainEmailAgain">Copy plain text fallback</button>
      </div>
    </div>`;
  }

  function showEmailToast(message){
    const box=$('emailCopyNotice');
    if(box) box.textContent=message;
  }

  function signatureCaptured(){
    const canvas=$('signatureCanvas');
    if(!canvas) return false;
    try{
      const ctx=canvas.getContext('2d');
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<pixels.length;i+=4){
        if(pixels[i] > 10){
          window.signatureData = canvas.toDataURL('image/png');
          return true;
        }
      }
    }catch(e){
      return !!(window.signatureData && window.signatureData.length > 1000);
    }
    return false;
  }

  function setReadyChoice(){
    const input=$('customerLikelihood');
    if(input && !input.value) input.value='Ready to formalise the quote';
    document.querySelectorAll('#likelihoodButtons button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.likelihood === 'Ready to formalise the quote');
    });
    if($('salesStatus')) $('salesStatus').value='Formal quote needed';
    if($('mainBlocker') && !$('mainBlocker').value) $('mainBlocker').value='None known';
    if($('nextAction')) $('nextAction').value='Prepare formal quote and send paperwork for review';
  }

  function acceptAndPrepareEmail(){
    if(!signatureCaptured()){
      alert('Please sign before accepting the survey guidance.');
      return;
    }
    setReadyChoice();
    const name=fullName();
    const now=new Date().toLocaleString();
    const stamp=$('acceptanceStamp');
    if(stamp){
      stamp.innerHTML = `<div class="thanksCard enhancedThanks">
        <b>👍 Thank you. Your recommendation is ready.</b>
        <p>The branded email has been copied. Outlook will open with the address and subject ready. Tap in the blank message body and paste to keep the proposal-style layout.</p>
        <small>${esc(name)} accepted the survey guidance on ${esc(now)}. Final design checks still apply.</small>
        <div id="emailCopyNotice" class="emailCopyNotice">Preparing styled email…</div>
      </div>` + emailPreviewHTML();
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
    copyStyledRecommendationEmail(false).then(ok => {
      showEmailToast(ok ? 'Styled email copied. Open Outlook, tap the body and paste.' : 'Plain text copied. Outlook/browser blocked the styled copy on this device.');
    });
    setTimeout(openRecommendationDraft, 350);
    setTimeout(bindEmailPreviewButtons, 450);
  }

  function bindEmailPreviewButtons(){
    const copy=$('copyStyledEmailAgain');
    if(copy) copy.onclick = e => { e.preventDefault(); copyStyledRecommendationEmail(true); };
    const open=$('openRecommendationDraftAgain');
    if(open) open.onclick = e => { e.preventDefault(); openRecommendationDraft(); };
    const plain=$('copyPlainEmailAgain');
    if(plain) plain.onclick = async e => {
      e.preventDefault();
      try{
        await navigator.clipboard.writeText(buildRecommendationEmailText());
        showEmailToast('Plain text fallback copied.');
      }catch(err){
        showEmailToast('Could not copy on this device.');
      }
    };
  }

  function bind(){
    if($('homeVersionSmall')) $('homeVersionSmall').textContent=VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent='App version: '+VERSION;
    const accept=$('stampAccept');
    if(accept){
      accept.textContent='Accept and prepare recommendation email';
      accept.onclick = e => { e.preventDefault(); acceptAndPrepareEmail(); };
    }
  }

  window.copyStyledRecommendationEmail = copyStyledRecommendationEmail;
  window.openRecommendationDraft = openRecommendationDraft;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();



/* v51: branded customer recommendation templates and Tigo manual quantity fix */
(function(){
  const VERSION = 'v58';
  const EMAIL_SUBJECT = 'Your Little Green Energy survey recommendation';
  const LOGO_URI = "data:image/png;base64,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";
  const TESLA_URI = "data:image/webp;base64,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";
  const SIG_URI = "data:image/webp;base64,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";
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').toString().trim();
  const checked = id => !!$(id)?.checked;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const clean = s => String(s ?? '').replace(/\s+/g,' ').trim();
  const num = v => Number(v || 0) || 0;
  const moneySafe = n => {
    try { return typeof money === 'function' ? money(n) : '£' + Math.round(Number(n)||0).toLocaleString('en-GB'); }
    catch(e){ return '£' + Math.round(Number(n)||0).toLocaleString('en-GB'); }
  };
  const qSafe = () => { try { return typeof quote === 'function' ? quote() : {kWp:'0.00', total:0}; } catch(e){ return {kWp:'0.00', total:0}; } };
  const pSafe = () => { try { return typeof panelParts === 'function' ? panelParts() : {name:'Solar panel', watt:0, dim:'', weight:''}; } catch(e){ return {name:'Solar panel', watt:0, dim:'', weight:''}; } };
  const paybackSafe = () => { try { return typeof estimatePayback === 'function' ? estimatePayback() : {ok:false}; } catch(e){ return {ok:false}; } };
  const firstName = () => {
    const n = val('customerName') || 'there';
    return n.split(/\s+/)[0] || n;
  };
  const fullName = () => val('customerName') || 'Your home';
  const prettyDate = () => {
    const raw = val('surveyDate');
    if(!raw) return new Date().toLocaleDateString('en-GB');
    try { return new Date(raw + 'T12:00:00').toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'}); }
    catch(e){ return raw; }
  };
  function batteryTitle(){
    try { return typeof customerBatteryTitle === 'function' ? customerBatteryTitle() : (val('batteryBrand') || 'Battery route'); }
    catch(e){ return val('batteryBrand') || 'Battery route'; }
  }
  function storageText(){
    try { return typeof customerBatteryStorageText === 'function' ? customerBatteryStorageText() : ''; }
    catch(e){ return ''; }
  }
  function extrasList(){
    const out = [];
    if(checked('ev')) out.push('Zappi EV charger');
    if(checked('eddi')) out.push('Eddi / hot water diverter');
    if(checked('otherExtra')) out.push(val('otherExtraName') || 'Additional extra');
    if(checked('tigo')){
      const q = qSafe();
      const qty = num(q.tigoQty || val('tigoQty'));
      if(qty > 0) out.push(`${qty} Tigo optimiser${qty === 1 ? '' : 's'}`);
    }
    return out;
  }
  function roofLines(){
    try{
      if(typeof getRoofPlanes === 'function'){
        const planes = getRoofPlanes().filter(r => r.width || r.slope || r.pitch || r.azimuth || r.panels);
        if(planes.length){
          return planes.map((r,i) => {
            const bits = [];
            bits.push(`${r.name || 'Roof ' + (i+1)}`);
            if(r.panels) bits.push(`${r.panels} panel${Number(r.panels) === 1 ? '' : 's'}`);
            if(r.width || r.slope) bits.push(`${r.width || '?'}m x ${r.slope || '?'}m`);
            if(r.pitch) bits.push(`${r.pitch}° pitch`);
            if(r.azimuth) bits.push(`${r.azimuth}° azimuth`);
            return bits.join(' · ');
          });
        }
      }
    }catch(e){}
    const roof = clean(val('roof') || val('dims'));
    return roof ? [roof] : ['Site details reviewed during survey.'];
  }
  function recommendationData(){
    const q = qSafe();
    const p = pSafe();
    const pb = paybackSafe();
    const brand = val('batteryBrand') || 'None';
    const solarSelected = checked('solar') && num(val('panelCount')) > 0;
    const panelCount = num(val('panelCount'));
    const solar = solarSelected ? `${panelCount} x ${p.name} panels` : 'Solar PV not included at this stage';
    const kwp = solarSelected ? `${q.kWp || ((panelCount * num(p.watt)) / 1000).toFixed(2)} kWp` : '';
    const usage = val('annualKwh') ? `${Number(val('annualKwh')).toLocaleString('en-GB')} kWh per year` : (val('dailyKwh') ? `${val('dailyKwh')} kWh per day` : 'Usage reviewed during survey');
    const price = q.total ? moneySafe(q.total) : 'To be confirmed in the formal proposal';
    const benefit = (pb && pb.ok && pb.totalSaving) ? `${moneySafe(pb.totalSaving)} estimated first-year benefit` : 'Estimated benefit will be confirmed in the formal proposal';
    const payback = (pb && pb.ok && pb.payback) ? `${pb.payback.toFixed(1)} year indicative payback` : 'Payback subject to final design and tariff checks';
    const extras = extrasList();
    const template = brand === 'Tesla' ? 'Tesla' : (brand === 'Sigenergy' ? 'Sigenergy' : 'General');
    let image = '';
    let productTitle = 'Solar and storage recommendation';
    let productSub = 'Designed around the property, usage and survey guidance.';
    let productBadge = 'Recommendation';
    let controller = 'Controller to be confirmed in the final design';
    let productPoints = ['Right-sized around usage', 'Designed around survey guidance', 'Final checks before formal proposal'];
    if(template === 'Tesla'){
      image = TESLA_URI;
      productTitle = 'Tesla Powerwall recommendation';
      productSub = 'A high-power battery route for strong home energy control and backup options where selected.';
      productBadge = 'Tesla route';
      controller = checked('gateway') ? 'Backup Gateway included' : 'Battery configuration selected';
      productPoints = ['13.5 kWh per Powerwall unit', 'Expansion-ready route', checked('gateway') ? 'Backup Gateway included' : 'Gateway not selected'];
    } else if(template === 'Sigenergy'){
      image = SIG_URI;
      productTitle = 'Sigenergy modular recommendation';
      productSub = 'A compact modular storage route sized around day-to-day use, tariff strategy and future flexibility.';
      productBadge = 'Sigenergy route';
      const qController = q.controllerText || '';
      controller = qController ? qController.replace(/controller\/PV inverter/gi, 'Controller') : 'Sigen controller route included where required';
      productPoints = ['Modular 6.0 / 10.0 kWh battery route', 'Compact storage design', 'Flexible sizing for future use'];
    }
    return {
      template, brand, image, productTitle, productSub, productBadge, productPoints, controller,
      name: fullName(), first: firstName(), address: val('address'), date: prettyDate(),
      priorities: val('wants') || 'Lower bills and improved energy control',
      reason: val('whyNow') || 'A cleaner, more controlled energy setup for the home',
      usage,
      solar, kwp, panelName: p.name || 'Solar panel', panelDim: p.dim || '', panelWeight: p.weight || '',
      battery: brand === 'None' ? 'No battery selected at this stage' : batteryTitle(),
      storage: storageText(),
      extras,
      price,
      benefit,
      payback,
      roofLines: roofLines(),
      route: val('cable') || 'Cable route reviewed as part of the survey guidance',
      locations: [val('batteryLoc') ? `Battery: ${val('batteryLoc')}` : '', val('invLoc') ? `Controller: ${val('invLoc')}` : ''].filter(Boolean).join(' · '),
      access: val('access') || 'Access and scaffold position reviewed during the survey',
      meter: val('meter') || 'Meter and electrical position reviewed during the survey',
      note: val('commercialNote') || '',
      extrasNote: val('extrasNote') || '',
      finalCheck: 'This recommendation is based on the survey guidance and remains subject to final roof, electrical, DNO and design checks before the formal proposal is issued.'
    };
  }
  function row(label, value){
    if(!clean(value)) return '';
    return `<div class="r"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
  }
  function chip(value){ return `<span class="chip">${esc(value)}</span>`; }
  function recommendationHTML(){
    const d = recommendationData();
    const extras = d.extras.length ? d.extras.map(chip).join('') : chip('No additional extras selected');
    const standard = checked('solar')
      ? [chip('Bird protection included as standard'), chip('SPDs included as standard'), chip('Subject to final design checks')]
      : [chip('SPDs included where required'), chip('Subject to final design checks')];
    const productImage = d.image ? `<img class="productImg" src="${d.image}" alt="${esc(d.productTitle)}">` : '';
    const productPoints = d.productPoints.map(p => `<li>${esc(p)}</li>`).join('');
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(EMAIL_SUBJECT)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin:0; background:#eef5eb; color:#092117; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 940px; margin: 0 auto; padding: 24px; }
  .sheet { background:#fff; border-radius:30px; overflow:hidden; box-shadow:0 16px 44px rgba(6,40,25,.14); border:1px solid #dbe8dd; }
  .top { padding:22px 28px; display:flex; align-items:center; gap:16px; background:linear-gradient(135deg,#ffffff 0%,#edf8ea 100%); border-bottom:1px solid #dbe8dd; }
  .logo { width:74px; height:74px; object-fit:contain; border-radius:20px; background:#fff; padding:8px; border:1px solid #dfe9df; }
  .brand small { display:block; color:#5c7064; font-weight:800; letter-spacing:.02em; }
  .brand b { display:block; color:#06391f; font-size:31px; line-height:1; margin-top:4px; }
  .hero { padding:34px 30px 30px; color:white; background:radial-gradient(circle at 95% 0%, rgba(143,210,47,.9) 0, rgba(143,210,47,.25) 26%, transparent 42%), linear-gradient(135deg,#062819 0%,#0b7a46 68%,#79ac20 100%); }
  .kicker { font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.16em; color:#dbffd0; }
  h1 { margin:10px 0 12px; font-size:43px; line-height:1.04; max-width:780px; }
  .hero p { margin:0; font-size:17px; line-height:1.55; max-width:760px; color:#efffed; }
  .heroMeta { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
  .heroMeta span { background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.24); padding:9px 12px; border-radius:999px; font-weight:800; color:white; }
  .content { padding:26px 28px 30px; }
  .sectionTitle { display:flex; align-items:center; gap:12px; margin:4px 0 16px; }
  .sectionTitle span { width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; color:white; background:#79ac20; font-weight:900; }
  .sectionTitle h2 { margin:0; color:#062819; font-size:23px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:22px; }
  .card { border:1px solid #dbe8dd; background:#f8fbf7; border-radius:22px; padding:18px; break-inside:avoid; page-break-inside:avoid; }
  .card h3 { margin:0 0 8px; font-size:16px; color:#087347; text-transform:uppercase; letter-spacing:.07em; }
  .card p { margin:0; font-size:18px; line-height:1.42; color:#092117; font-weight:800; }
  .card small { display:block; margin-top:8px; color:#53685d; line-height:1.45; }
  .product { border-radius:26px; padding:22px; margin:2px 0 24px; background:linear-gradient(135deg,#062819 0%,#0a4d31 100%); color:white; display:flex; gap:24px; align-items:center; break-inside:avoid; page-break-inside:avoid; }
  .productImg { width:260px; max-width:34%; height:170px; object-fit:contain; background:white; border-radius:22px; padding:12px; border:1px solid rgba(255,255,255,.5); flex-shrink:0; }
  .productText { flex:1; min-width:0; }
  .badge { display:inline-block; background:#9be23a; color:#062819; padding:8px 12px; border-radius:999px; font-size:12px; text-transform:uppercase; font-weight:900; letter-spacing:.08em; margin-bottom:10px; }
  .product h2 { margin:0 0 8px; font-size:28px; line-height:1.1; color:white; }
  .product p { margin:0; color:#ecffdf; line-height:1.5; }
  .product ul { margin:14px 0 0; padding-left:18px; color:#ecffdf; line-height:1.55; }
  .detailRows { display:grid; gap:9px; }
  .r { display:grid; grid-template-columns:150px 1fr; gap:12px; padding:11px 12px; background:#fff; border:1px solid #e3eee4; border-radius:14px; }
  .r span { color:#637268; font-weight:800; }
  .r b { color:#092117; font-weight:900; }
  .chips { display:flex; flex-wrap:wrap; gap:9px; }
  .chip { display:inline-flex; align-items:center; padding:9px 12px; border-radius:999px; background:#eaf7e6; color:#06391f; border:1px solid #cbe8c9; font-weight:850; }
  .bright { background:linear-gradient(135deg,#eaffdf 0%,#f9fff6 100%); border:1px solid #bfe6b6; }
  .benefit { margin-top:30px; border:1px solid #b7dfad; background:linear-gradient(135deg,#f0ffe8 0%,#ffffff 58%,#eef9ea 100%); border-radius:26px; padding:22px; break-inside:avoid; page-break-inside:avoid; }
  .benefitGrid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:14px; }
  .metric { background:#fff; border:1px solid #dbe8dd; border-radius:18px; padding:16px; }
  .metric span { color:#087347; text-transform:uppercase; font-size:11px; letter-spacing:.08em; font-weight:900; }
  .metric b { display:block; margin-top:5px; font-size:21px; color:#062819; }
  .next { margin-top:24px; padding:22px; border-radius:24px; background:#062819; color:white; break-inside:avoid; page-break-inside:avoid; }
  .next h2 { margin:0 0 8px; color:white; }
  .next p { margin:0; color:#eaffdf; line-height:1.55; }
  .footer { padding:22px 28px 26px; background:#f5faf4; border-top:1px solid #dbe8dd; display:flex; justify-content:space-between; gap:18px; color:#496056; line-height:1.5; }
  .footer b { color:#062819; }
  @media print {
    body { background:#fff; }
    .page { padding:0; max-width:none; }
    .sheet { box-shadow:none; border-radius:0; border:0; }
    .hero { padding-top:28px; }
    .content { padding-bottom:16px; }
  }
  @media (max-width:720px){
    .page { padding:12px; }
    .grid, .benefitGrid { grid-template-columns:1fr; }
    .product { display:block; }
    .productImg { width:100%; max-width:100%; margin-bottom:16px; }
    h1 { font-size:32px; }
    .footer { display:block; }
    .r { grid-template-columns:1fr; gap:4px; }
  }
</style>
</head>
<body>
  <div class="page">
    <article class="sheet">
      <div class="top">
        <img class="logo" src="${LOGO_URI}" alt="The Little Green Energy Company">
        <div class="brand"><small>The Little Green Energy Company</small><b>Survey recommendation</b></div>
      </div>
      <section class="hero">
        <div class="kicker">Little Green Energy survey recommendation</div>
        <h1>${esc(d.first)}, here is the recommendation from today’s survey.</h1>
        <p>${esc(d.finalCheck)}</p>
        <div class="heroMeta">
          <span>${esc(d.name)}</span>
          <span>${esc(d.date)}</span>
          ${d.address ? `<span>${esc(d.address)}</span>` : ''}
        </div>
      </section>
      <div class="content">
        <div class="sectionTitle"><span>1</span><h2>What this is designed around</h2></div>
        <div class="grid">
          <div class="card"><h3>Priorities</h3><p>${esc(d.priorities)}</p></div>
          <div class="card"><h3>Energy use</h3><p>${esc(d.usage)}</p><small>${esc(d.reason)}</small></div>
        </div>

        <div class="sectionTitle"><span>2</span><h2>Recommended system</h2></div>
        <div class="product">
          ${productImage}
          <div class="productText">
            <span class="badge">${esc(d.productBadge)}</span>
            <h2>${esc(d.productTitle)}</h2>
            <p>${esc(d.productSub)}</p>
            <ul>${productPoints}</ul>
          </div>
        </div>
        <div class="grid">
          <div class="card bright"><h3>Solar PV</h3><p>${esc(d.solar)}</p><small>${esc(d.kwp || 'Output subject to final panel layout')} · ${esc(d.panelName)}</small></div>
          <div class="card bright"><h3>Battery</h3><p>${esc(d.battery)}</p><small>${esc(d.storage || 'Storage to be confirmed')}</small></div>
          <div class="card bright"><h3>Controller</h3><p>${esc(d.controller)}</p><small>${esc(d.locations || 'Equipment location reviewed during the survey')}</small></div>
          <div class="card bright"><h3>Recommendation total</h3><p>${esc(d.price)}</p><small>Formal paperwork will confirm the final specification.</small></div>
        </div>

        <div class="sectionTitle"><span>3</span><h2>Survey details reviewed</h2></div>
        <div class="detailRows">
          ${row('Roof layout', d.roofLines.join(' | '))}
          ${row('Meter / CU', d.meter)}
          ${row('Cable route', d.route)}
          ${row('Access', d.access)}
        </div>

        <div class="grid" style="margin-top:20px;">
          <div class="card"><h3>Included as standard</h3><div class="chips">${standard.join('')}</div></div>
          <div class="card"><h3>Selected extras</h3><div class="chips">${extras}</div>${d.extrasNote ? `<small>${esc(d.extrasNote)}</small>` : ''}</div>
        </div>

        <section class="benefit">
          <div class="sectionTitle" style="margin:0 0 6px;"><span>4</span><h2>Estimated benefit</h2></div>
          <p style="margin:0;color:#34463c;line-height:1.55;">These figures are indicative and will be checked again before the formal proposal is issued.</p>
          <div class="benefitGrid">
            <div class="metric"><span>System size</span><b>${esc(d.kwp || 'To confirm')}</b></div>
            <div class="metric"><span>First-year benefit</span><b>${esc(d.benefit)}</b></div>
            <div class="metric"><span>Payback guide</span><b>${esc(d.payback)}</b></div>
          </div>
        </section>

        <section class="next">
          <h2>Next step</h2>
          <p>A formal quote will now be prepared for review. The final design will be checked against the roof layout, electrical position, DNO requirements and installation details before paperwork is issued.</p>
        </section>
      </div>
      <footer class="footer">
        <div><b>James Cooling</b><br>The Little Green Energy Company<br>01622 832834 · 07714292169</div>
        <div>Recommendation prepared from LG Survey<br>Subject to final roof, electrical, DNO and design checks</div>
      </footer>
    </article>
  </div>
</body>
</html>`;
  }
  function openTemplate(printNow){
    const html = recommendationHTML();
    const win = window.open('', '_blank');
    if(!win){
      alert('Please allow pop-ups to preview or print the recommendation.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    if(printNow){
      setTimeout(() => {
        try { win.focus(); win.print(); } catch(e){}
      }, 700);
    }
  }
  function downloadTemplate(){
    const html = recommendationHTML();
    const name = (fullName() || 'LG Survey').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'') || 'LG-Survey-Recommendation';
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-recommendation.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function openShortEmailDraft(){
    const email = val('email');
    const first = firstName();
    const body = [
      `Hi ${first},`,
      '',
      'Thank you for going through the survey today.',
      '',
      'I’ve attached your Little Green Energy survey recommendation based on what we reviewed at the property. This remains subject to final roof, electrical, DNO and design checks before the formal paperwork is issued.',
      '',
      'I’ll review the final details and come back to you with the full proposal and paperwork for review.',
      '',
      'Kind regards,',
      'James Cooling',
      'The Little Green Energy Company',
      '01622 832834',
      '07714292169'
    ].join('\r\n');
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
  }
  function signatureCaptured(){
    const canvas = $('signatureCanvas');
    if(!canvas) return false;
    try{
      const ctx = canvas.getContext('2d');
      const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for(let i=3;i<pixels.length;i+=4){
        if(pixels[i] > 10){
          window.signatureData = canvas.toDataURL('image/png');
          return true;
        }
      }
    }catch(e){ return !!(window.signatureData && window.signatureData.length > 1000); }
    return false;
  }
  function setTigoManualMode(){
    const qty = $('tigoQty');
    if(!qty) return;
    qty.dataset.auto = '';
    if(!qty.dataset.v51Bound){
      qty.dataset.v51Bound = 'yes';
      qty.addEventListener('input', () => { qty.dataset.manual = 'yes'; qty.dataset.auto = ''; });
      qty.addEventListener('focus', () => { qty.dataset.auto = ''; });
    }
  }
  function undoTigoAutoFillSoon(){
    const qty = $('tigoQty');
    if(!qty) return;
    const previous = qty.value;
    setTimeout(() => {
      if(qty.dataset.manual !== 'yes' && Number(qty.value || 0) === Number(val('panelCount') || 0)){
        qty.value = previous === '0' ? '0' : '';
        qty.dataset.auto = '';
        try{ if(typeof save === 'function') save(); }catch(e){}
      }
    }, 30);
  }
  function acceptAndCreateRecommendation(){
    if(!signatureCaptured()){
      alert('Please sign before accepting the survey guidance.');
      return;
    }
    const likelihood = $('customerLikelihood');
    if(likelihood && !likelihood.value) likelihood.value = 'Ready to formalise the quote';
    if($('salesStatus')) $('salesStatus').value = 'Formal quote needed';
    if($('nextAction')) $('nextAction').value = 'Prepare formal quote and send paperwork for review';
    const now = new Date().toLocaleString();
    const stamp = $('acceptanceStamp');
    if(stamp){
      stamp.innerHTML = `<div class="thanksCard enhancedThanks">
        <b>👍 Thank you. The recommendation document is ready.</b>
        <p>Use the buttons below to preview it, print or save it as a PDF, then send from Outlook with the short email draft.</p>
        <small>${esc(fullName())} accepted the survey guidance on ${esc(now)}. Final design checks still apply.</small>
      </div>`;
    }
    const notice = $('templateNotice');
    if(notice){
      const d = recommendationData();
      notice.innerHTML = `<b>${esc(d.template)} template ready.</b> It will pull through ${esc(d.panelName)}, ${esc(d.solar)}, ${esc(d.battery)}, extras, bird protection and SPDs.`;
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
  }
  function bind(){
    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
    const accept = $('stampAccept');
    if(accept){
      accept.textContent = 'Accept and create recommendation';
      accept.onclick = e => { e.preventDefault(); acceptAndCreateRecommendation(); };
    }
    const preview = $('previewRecommendationTemplate');
    if(preview) preview.onclick = e => { e.preventDefault(); openTemplate(false); };
    const print = $('printRecommendationTemplate');
    if(print) print.onclick = e => { e.preventDefault(); openTemplate(true); };
    const download = $('downloadRecommendationTemplate');
    if(download) download.onclick = e => { e.preventDefault(); downloadTemplate(); };
    const email = $('openShortRecommendationEmail');
    if(email) email.onclick = e => { e.preventDefault(); openShortEmailDraft(); };
    setTigoManualMode();
    const tigo = $('tigo');
    if(tigo && !tigo.dataset.v51Manual){
      tigo.dataset.v51Manual = 'yes';
      tigo.addEventListener('change', undoTigoAutoFillSoon);
    }
    document.addEventListener('input', e => {
      if(e.target && e.target.id === 'tigoQty') setTigoManualMode();
    }, true);
    document.addEventListener('change', e => {
      if(e.target && e.target.id === 'tigo') undoTigoAutoFillSoon();
    }, true);
  }
  window.LGSurveyRecommendationTemplate = {
    data: recommendationData,
    html: recommendationHTML,
    preview: () => openTemplate(false),
    print: () => openTemplate(true),
    download: downloadTemplate,
    email: openShortEmailDraft
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v52 export pack, local media pack and completion workflow */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  const EMAIL_SUBJECT = 'Your Little Green Energy survey recommendation';

  function escText(v){
    return String(v == null ? '' : v);
  }

  function safeFilePart(v, fallback){
    const base = escText(v || fallback || 'LG Survey').trim() || 'LG Survey';
    return base.replace(/[^a-z0-9 £._-]+/gi,' ').replace(/\s+/g,' ').trim().replace(/\s/g,'_').slice(0,80) || fallback || 'LG_Survey';
  }

  function todayStamp(){
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  function fullNameSafe(){
    try{
      if(typeof fullName === 'function') return fullName();
    }catch(e){}
    const el = $('customerName');
    return el ? (el.value || 'Customer') : 'Customer';
  }

  function firstNameSafe(){
    try{
      if(typeof firstName === 'function') return firstName();
    }catch(e){}
    return (fullNameSafe().trim().split(/\s+/)[0] || 'there');
  }

  function valSafe(id){
    const el = $(id);
    return el ? (el.value || '') : '';
  }

  function currentSurveyData(){
    try{
      if(typeof getData === 'function') return getData();
    }catch(e){}
    return {};
  }

  function currentPrompt(){
    try{
      if(typeof window.prompt === 'function') return window.prompt();
    }catch(e){}
    return 'LG Survey customer pack could not be generated on this device.';
  }

  function currentInternalBrief(){
    try{
      if(typeof internalBrief === 'function') return internalBrief();
    }catch(e){}
    return 'Internal brief could not be generated on this device.';
  }

  function currentRecommendationHTML(){
    try{
      if(window.LGSurveyRecommendationTemplate && typeof window.LGSurveyRecommendationTemplate.html === 'function'){
        return window.LGSurveyRecommendationTemplate.html();
      }
    }catch(e){}
    return `<!doctype html><html><head><meta charset="utf-8"><title>LG Survey Recommendation</title></head><body><pre>${currentPrompt().replace(/[<>&]/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[ch]))}</pre></body></html>`;
  }

  function shortEmailText(){
    const first = firstNameSafe();
    return [
      `Hi ${first},`,
      '',
      'Thank you for going through the survey today.',
      '',
      'I’ve attached your Little Green Energy survey recommendation based on what we reviewed at the property. This remains subject to final roof, electrical, DNO and design checks before the formal paperwork is issued.',
      '',
      'I’ll review the final details and come back to you with the full proposal and paperwork for review.',
      '',
      'Kind regards,',
      'James Cooling',
      'The Little Green Energy Company',
      '01622 832834',
      '07714292169'
    ].join('\r\n');
  }

  function readSignatureBlob(){
    return new Promise(resolve => {
      try{
        let data = '';
        if(typeof signatureData !== 'undefined' && signatureData) data = signatureData;
        if(!data && window.signatureData) data = window.signatureData;
        const canvas = $('signatureCanvas');
        if(!data && canvas){
          try{ data = canvas.toDataURL('image/png'); }catch(e){}
        }
        if(!data || !data.startsWith('data:image')) return resolve(null);
        const parts = data.split(',');
        const mime = (parts[0].match(/data:([^;]+)/)||[])[1] || 'image/png';
        const binary = atob(parts[1] || '');
        const u8 = new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++) u8[i]=binary.charCodeAt(i);
        resolve(new Blob([u8], {type:mime}));
      }catch(e){ resolve(null); }
    });
  }

  function filesFromSession(){
    try{
      if(typeof selectedFiles !== 'undefined' && selectedFiles && selectedFiles.length) return Array.from(selectedFiles);
    }catch(e){}
    const input = $('filesInput');
    return input && input.files ? Array.from(input.files) : [];
  }

  function extForType(file){
    const n = file && file.name ? file.name : '';
    if(n.includes('.')) return n.split('.').pop().toLowerCase();
    const t = (file && file.type) || '';
    if(t.includes('jpeg')) return 'jpg';
    if(t.includes('png')) return 'png';
    if(t.includes('webp')) return 'webp';
    if(t.includes('pdf')) return 'pdf';
    if(t.includes('mp4')) return 'mp4';
    if(t.includes('quicktime')) return 'mov';
    return 'bin';
  }

  function uniquePath(path, used){
    let clean = path.replace(/[\\:*?"<>|]+/g,'_').replace(/^\/+/, '');
    if(!used.has(clean)){ used.add(clean); return clean; }
    const dot = clean.lastIndexOf('.');
    const base = dot > -1 ? clean.slice(0,dot) : clean;
    const ext = dot > -1 ? clean.slice(dot) : '';
    let i = 2;
    while(used.has(`${base}_${i}${ext}`)) i++;
    const out = `${base}_${i}${ext}`;
    used.add(out);
    return out;
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n]=c >>> 0;
    }
    return table;
  })();

  function crc32(u8){
    let c = 0xffffffff;
    for(let i=0;i<u8.length;i++) c = crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function u16(n){ return [n & 255, (n >>> 8) & 255]; }
  function u32(n){ return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }

  function dosTimeDate(date){
    const d = date || new Date();
    const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | (Math.floor(d.getSeconds()/2) & 31);
    const year = Math.max(1980, d.getFullYear());
    const dateBits = (((year - 1980) & 127) << 9) | (((d.getMonth()+1) & 15) << 5) | (d.getDate() & 31);
    return {time, date: dateBits};
  }

  async function entryFromText(name, text, type){
    const data = new TextEncoder().encode(escText(text));
    return {name, data, type: type || 'text/plain', date: new Date()};
  }

  async function entryFromBlob(name, blob){
    const data = new Uint8Array(await blob.arrayBuffer());
    return {name, data, type: blob.type || 'application/octet-stream', date: new Date()};
  }

  function buildZipBlob(entries){
    const chunks = [];
    const central = [];
    let offset = 0;
    const encoder = new TextEncoder();

    entries.forEach(entry => {
      const nameBytes = encoder.encode(entry.name);
      const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data || []);
      const crc = crc32(data);
      const dt = dosTimeDate(entry.date || new Date());
      const flags = 0x0800; // UTF-8

      const local = new Uint8Array([
        ...u32(0x04034b50),
        ...u16(20),
        ...u16(flags),
        ...u16(0),
        ...u16(dt.time),
        ...u16(dt.date),
        ...u32(crc),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(nameBytes.length),
        ...u16(0)
      ]);
      chunks.push(local, nameBytes, data);

      const centralHeader = new Uint8Array([
        ...u32(0x02014b50),
        ...u16(20),
        ...u16(20),
        ...u16(flags),
        ...u16(0),
        ...u16(dt.time),
        ...u16(dt.date),
        ...u32(crc),
        ...u32(data.length),
        ...u32(data.length),
        ...u16(nameBytes.length),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u16(0),
        ...u32(0),
        ...u32(offset)
      ]);
      central.push(centralHeader, nameBytes);
      offset += local.length + nameBytes.length + data.length;
    });

    const centralSize = central.reduce((sum, c) => sum + c.length, 0);
    const eocd = new Uint8Array([
      ...u32(0x06054b50),
      ...u16(0),
      ...u16(0),
      ...u16(entries.length),
      ...u16(entries.length),
      ...u32(centralSize),
      ...u32(offset),
      ...u16(0)
    ]);
    return new Blob([...chunks, ...central, eocd], {type:'application/zip'});
  }

  function downloadBlob(blob, filename){
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
  }

  function setNotice(id, message){
    const el = $(id);
    if(el) el.innerHTML = message;
  }

  async function createSurveyPackZip(downloadNow, source){
    const used = new Set();
    const name = safeFilePart(fullNameSafe(), 'LG_Survey');
    const stamp = todayStamp();
    const root = `${name}_LG_Survey_Pack_${stamp}`;
    const entries = [];

    entries.push(await entryFromText(uniquePath(`${root}/README.txt`, used), [
      'LG Survey export pack',
      '',
      'This pack was generated locally on this device.',
      '',
      'Contents:',
      '01_Customer_Recommendation.html - customer-facing recommendation. Open it in a browser and use Print / Save as PDF if a PDF copy is needed.',
      '02_Outlook_Email.txt - short email body to send from James.',
      '03_ChatGPT_Survey_Pack_Prompt.txt - full customer survey pack prompt for ChatGPT handover.',
      '04_Internal_Brief.txt - internal operations brief.',
      '05_Survey_Data.json - raw survey data backup.',
      '06_Acceptance_Signature.png - signature where captured.',
      '07_Site_Files - photos, videos, PDFs and files selected in this session.',
      '',
      'Note: mobile browsers cannot silently attach files to Outlook. Save/share this ZIP or attach the generated recommendation manually from Outlook.'
    ].join('\r\n')));

    entries.push(await entryFromText(uniquePath(`${root}/01_Customer_Recommendation.html`, used), currentRecommendationHTML(), 'text/html'));
    entries.push(await entryFromText(uniquePath(`${root}/02_Outlook_Email.txt`, used), shortEmailText(), 'text/plain'));
    entries.push(await entryFromText(uniquePath(`${root}/03_ChatGPT_Survey_Pack_Prompt.txt`, used), currentPrompt(), 'text/plain'));
    entries.push(await entryFromText(uniquePath(`${root}/04_Internal_Brief.txt`, used), currentInternalBrief(), 'text/plain'));
    entries.push(await entryFromText(uniquePath(`${root}/05_Survey_Data.json`, used), JSON.stringify(currentSurveyData(), null, 2), 'application/json'));

    const sig = await readSignatureBlob();
    if(sig) entries.push(await entryFromBlob(uniquePath(`${root}/06_Acceptance_Signature.png`, used), sig));

    const files = filesFromSession();
    for(let i=0;i<files.length;i++){
      const f = files[i];
      const fileName = safeFilePart(f.name || `site_file_${i+1}.${extForType(f)}`, `site_file_${i+1}.${extForType(f)}`);
      entries.push(await entryFromBlob(uniquePath(`${root}/07_Site_Files/${String(i+1).padStart(2,'0')}_${fileName}`, used), f));
    }

    entries.push(await entryFromText(uniquePath(`${root}/07_Site_Files/_selected_files.txt`, used), files.length ? files.map((f,i) => `${i+1}. ${f.name || 'Unnamed file'} (${f.type || 'unknown type'}, ${Math.round((f.size||0)/1024)} KB)`).join('\r\n') : 'No site photos/videos were selected in this session.', 'text/plain'));

    const zip = buildZipBlob(entries);
    const filename = `${root}.zip`;
    if(downloadNow !== false) downloadBlob(zip, filename);
    const message = `<b>Export pack created.</b> ${entries.length} files included${files.length ? `, including ${files.length} selected site file${files.length===1?'':'s'}` : ''}.`;
    setNotice('exportPackNotice', message);
    setNotice('toolsExportPackNotice', message);
    return {zip, filename, entries: entries.length, media: files.length};
  }

  function enhanceMediaPreview(){
    const input = $('filesInput');
    if(!input || input.dataset.v52MediaBound) return;
    input.dataset.v52MediaBound = 'yes';
    input.onchange = e => {
      try{ selectedFiles = Array.from(e.target.files || []); }catch(err){}
      const files = filesFromSession();
      const preview = $('preview');
      if(preview) preview.innerHTML = '';
      files.forEach(f => {
        if(!preview) return;
        if((f.type || '').startsWith('image/')){
          const img = document.createElement('img');
          img.src = URL.createObjectURL(f);
          img.alt = f.name || 'Survey photo';
          preview.appendChild(img);
        } else if((f.type || '').startsWith('video/')){
          const wrap = document.createElement('div');
          wrap.className = 'videoPreviewTile';
          const vid = document.createElement('video');
          vid.src = URL.createObjectURL(f);
          vid.controls = true;
          vid.muted = true;
          vid.playsInline = true;
          wrap.appendChild(vid);
          const cap = document.createElement('small');
          cap.textContent = f.name || 'Survey video';
          wrap.appendChild(cap);
          preview.appendChild(wrap);
        } else {
          const tile = document.createElement('div');
          tile.className = 'filePreviewTile';
          tile.textContent = f.name || 'Selected file';
          preview.appendChild(tile);
        }
      });
      const names = $('fileNames');
      if(names) names.textContent = files.length ? files.map(f => `${f.name || 'Unnamed file'} (${Math.round((f.size||0)/1024)} KB)`).join('\n') : 'No photos selected yet.';
      try{ if(typeof save === 'function') save(); }catch(err){}
    };
  }

  function bindExportButtons(){
    const ids = ['exportSurveyPackZip','toolsExportSurveyPackZip'];
    ids.forEach(id => {
      const btn = $(id);
      if(btn && !btn.dataset.v52Bound){
        btn.dataset.v52Bound = 'yes';
        btn.onclick = async e => {
          e.preventDefault();
          btn.disabled = true;
          const old = btn.textContent;
          btn.textContent = 'Creating export pack…';
          try{
            await createSurveyPackZip(true, id);
          }catch(err){
            alert('Could not create the export pack on this device. Try closing other tabs or reducing very large video files.');
            console.error(err);
          }finally{
            btn.disabled = false;
            btn.textContent = old;
          }
        };
      }
    });
  }

  function patchAcceptanceExport(){
    const btn = $('stampAccept');
    if(!btn || btn.dataset.v52AcceptExport) return;
    btn.dataset.v52AcceptExport = 'yes';
    const old = btn.onclick;
    btn.onclick = async e => {
      if(e) e.preventDefault();
      if(typeof old === 'function') old.call(btn, e);
      setTimeout(() => {
        createSurveyPackZip(true, 'accept').catch(err => console.error('Export pack failed', err));
      }, 800);
    };
  }

  function patchMarkCompleteExport(){
    const btn = $('markSurveyComplete');
    if(!btn || btn.dataset.v52CompleteExport) return;
    btn.dataset.v52CompleteExport = 'yes';
    const old = btn.onclick;
    btn.onclick = async e => {
      if(e) e.preventDefault();
      if(typeof old === 'function') old.call(btn, e);
      setTimeout(() => {
        createSurveyPackZip(true, 'complete').catch(err => console.error('Export pack failed', err));
      }, 650);
    };
  }

  function bind(){
    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
    enhanceMediaPreview();
    bindExportButtons();
    // Patch after earlier v51 binds have attached handlers.
    setTimeout(() => {
      patchAcceptanceExport();
      patchMarkCompleteExport();
      bindExportButtons();
      enhanceMediaPreview();
    }, 200);
  }

  window.LGSurveyExportPack = {
    create: () => createSurveyPackZip(true, 'manual'),
    blob: () => createSurveyPackZip(false, 'manual')
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v53 persistent quick capture gallery */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  const DB_NAME = 'lg_survey_media_v1';
  const DB_VERSION = 1;
  const STORE = 'media';
  const SESSION_KEY = 'lg_survey_media_session_v1';
  let pendingCategory = 'Other';
  let loadedItems = [];
  let dbPromise = null;

  const categories = [
    'Roof',
    'Distribution board / CU',
    'Meter / fuse',
    'Battery / controller location',
    'Cable route',
    'Access / scaffold',
    'Other'
  ];

  function uid(){
    return 'media_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function ensureSessionId(){
    // Starting a blank survey via the customer screen uses ?newSurvey.
    if(location.search.includes('newSurvey=')){
      const fresh = 'session_' + Date.now() + '_' + Math.random().toString(16).slice(2);
      localStorage.setItem(SESSION_KEY, fresh);
      return fresh;
    }
    let id = localStorage.getItem(SESSION_KEY);
    if(!id){
      id = 'session_' + Date.now() + '_' + Math.random().toString(16).slice(2);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function newSession(){
    const id = 'session_' + Date.now() + '_' + Math.random().toString(16).slice(2);
    localStorage.setItem(SESSION_KEY, id);
    loadedItems = [];
    try{ selectedFiles = []; }catch(e){}
    renderGallery();
    return id;
  }

  function currentSession(){
    return ensureSessionId();
  }

  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if(!('indexedDB' in window)) return reject(new Error('IndexedDB not available'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store = db.createObjectStore(STORE, {keyPath:'id'});
          store.createIndex('sessionId', 'sessionId', {unique:false});
          store.createIndex('capturedAt', 'capturedAt', {unique:false});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Could not open media database'));
    });
    return dbPromise;
  }

  async function txStore(mode){
    const db = await openDB();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  function promisify(req){
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
    });
  }

  async function getAllForSession(sessionId){
    const store = await txStore('readonly');
    const idx = store.index('sessionId');
    const req = idx.getAll(sessionId || currentSession());
    const items = await promisify(req);
    return (items || []).sort((a,b) => (a.capturedAt || 0) - (b.capturedAt || 0));
  }

  async function putItem(item){
    const store = await txStore('readwrite');
    await promisify(store.put(item));
  }

  async function deleteItem(id){
    const store = await txStore('readwrite');
    await promisify(store.delete(id));
  }

  async function clearCurrentSession(){
    const sessionId = currentSession();
    const items = await getAllForSession(sessionId);
    const store = await txStore('readwrite');
    await Promise.all(items.map(i => promisify(store.delete(i.id))));
    loadedItems = [];
    syncSelectedFiles();
    renderGallery();
  }

  function cleanFileName(v){
    return String(v || 'site_file').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim().slice(0,100) || 'site_file';
  }

  function cleanCategory(v){
    return categories.includes(v) ? v : 'Other';
  }

  function categoryPrefix(cat){
    return cleanCategory(cat).replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase() || 'site';
  }

  function fileFromItem(item, index){
    const original = cleanFileName(item.name || ('site_file_' + (index+1)));
    const prefixed = `${String(index+1).padStart(2,'0')}_${categoryPrefix(item.category)}_${original}`;
    try{
      return new File([item.blob], prefixed, {type:item.type || item.blob?.type || 'application/octet-stream', lastModified:item.lastModified || Date.now()});
    }catch(e){
      const blob = item.blob || new Blob([]);
      blob.name = prefixed;
      blob.lastModified = item.lastModified || Date.now();
      return blob;
    }
  }

  function syncSelectedFiles(){
    try{
      selectedFiles = loadedItems.map((item, idx) => fileFromItem(item, idx));
    }catch(e){}
    const names = $('fileNames');
    if(names){
      const total = loadedItems.reduce((s,i) => s + (Number(i.size)||0), 0);
      names.textContent = loadedItems.length
        ? `${loadedItems.length} gallery item${loadedItems.length===1?'':'s'} ready for export (${Math.round(total/1024)} KB)\n` + loadedItems.map((i,idx) => `${idx+1}. ${i.category || 'Other'} - ${i.name || 'Unnamed file'}`).join('\n')
        : 'No site media captured yet.';
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
  }

  function autoTickForCategory(cat){
    const map = {
      'Roof': ['photoRoofFront','photoRoofRear'],
      'Distribution board / CU': ['photoCU'],
      'Meter / fuse': ['photoMeter','photoFuse'],
      'Battery / controller location': ['photoBatteryLoc','photoInverterLoc'],
      'Cable route': ['photoCableRoute'],
      'Access / scaffold': ['photoAccess']
    };
    (map[cat] || []).forEach(id => {
      const el = $(id);
      if(el) el.checked = true;
    });
  }

  async function addFiles(files, category){
    const arr = Array.from(files || []).filter(Boolean);
    if(!arr.length) return;
    const cat = cleanCategory(category || pendingCategory);
    const sessionId = currentSession();
    for(const f of arr){
      const item = {
        id: uid(),
        sessionId,
        name: cleanFileName(f.name || `${cat}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`),
        type: f.type || 'application/octet-stream',
        size: f.size || 0,
        lastModified: f.lastModified || Date.now(),
        category: cat,
        capturedAt: Date.now(),
        blob: f
      };
      await putItem(item);
      loadedItems.push(item);
    }
    autoTickForCategory(cat);
    syncSelectedFiles();
    renderGallery();
  }

  async function loadGallery(){
    try{
      loadedItems = await getAllForSession(currentSession());
      syncSelectedFiles();
      renderGallery();
    }catch(e){
      const names = $('fileNames');
      if(names) names.textContent = 'Gallery storage is not available on this device. Files will still attach during this session.';
    }
  }

  function formatSize(bytes){
    const n = Number(bytes)||0;
    if(n > 1024*1024) return (n/(1024*1024)).toFixed(1) + ' MB';
    return Math.round(n/1024) + ' KB';
  }

  function iconFor(item){
    const t = item.type || '';
    if(t.includes('pdf')) return 'PDF';
    if(t.startsWith('video/')) return '▶';
    return 'FILE';
  }

  function renderGallery(){
    const box = $('mediaGallery');
    const legacy = $('preview');
    if(legacy) legacy.innerHTML = '';
    if(!box) return;
    if(!loadedItems.length){
      box.innerHTML = '<div class="galleryEmpty">No photos or videos captured yet. Tap a quick capture button to start building the survey gallery.</div>';
      return;
    }
    box.innerHTML = '';
    loadedItems.forEach((item, idx) => {
      const tile = document.createElement('div');
      tile.className = 'mediaTile';
      tile.dataset.mediaId = item.id;

      const thumb = document.createElement('div');
      thumb.className = 'mediaThumb';
      const url = item.blob ? URL.createObjectURL(item.blob) : '';
      if((item.type || '').startsWith('image/') && url){
        const img = document.createElement('img');
        img.src = url;
        img.alt = item.name || 'Survey photo';
        img.onload = () => setTimeout(() => URL.revokeObjectURL(url), 1000);
        thumb.appendChild(img);
      } else if((item.type || '').startsWith('video/') && url){
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        thumb.appendChild(video);
      } else {
        const icon = document.createElement('div');
        icon.className = 'mediaFileIcon';
        icon.textContent = iconFor(item);
        thumb.appendChild(icon);
      }

      const body = document.createElement('div');
      body.className = 'mediaBody';
      const name = document.createElement('div');
      name.className = 'mediaName';
      name.textContent = item.name || `Survey file ${idx+1}`;
      const meta = document.createElement('div');
      meta.className = 'mediaMeta';
      meta.textContent = `${formatSize(item.size)} • ${item.type || 'file'}`;

      const select = document.createElement('select');
      select.className = 'mediaCategorySelect';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if(cleanCategory(item.category) === c) opt.selected = true;
        select.appendChild(opt);
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mediaRemove';
      remove.textContent = 'Remove from gallery';

      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(select);
      body.appendChild(remove);
      tile.appendChild(thumb);
      tile.appendChild(body);
      box.appendChild(tile);
    });
  }

  function bindInputs(){
    const photoInput = $('quickPhotoInput');
    const videoInput = $('quickVideoInput');
    const fileInput = $('filesInput');

    document.querySelectorAll('.mediaQuickBtn').forEach(btn => {
      if(btn.dataset.v53Bound) return;
      btn.dataset.v53Bound = 'yes';
      btn.addEventListener('click', e => {
        e.preventDefault();
        pendingCategory = cleanCategory(btn.dataset.mediaCat || 'Other');
        if(photoInput){
          photoInput.value = '';
          photoInput.click();
        }
      });
    });

    const addFilesBtn = $('addSiteFiles');
    if(addFilesBtn && !addFilesBtn.dataset.v53Bound){
      addFilesBtn.dataset.v53Bound = 'yes';
      addFilesBtn.addEventListener('click', e => {
        e.preventDefault();
        pendingCategory = 'Other';
        if(fileInput){
          fileInput.value = '';
          fileInput.click();
        }
      });
    }

    const recordBtn = $('recordSiteVideo');
    if(recordBtn && !recordBtn.dataset.v53Bound){
      recordBtn.dataset.v53Bound = 'yes';
      recordBtn.addEventListener('click', e => {
        e.preventDefault();
        pendingCategory = 'Other';
        if(videoInput){
          videoInput.value = '';
          videoInput.click();
        }
      });
    }

    const clearBtn = $('clearSiteGallery');
    if(clearBtn && !clearBtn.dataset.v53Bound){
      clearBtn.dataset.v53Bound = 'yes';
      clearBtn.addEventListener('click', async e => {
        e.preventDefault();
        if(!loadedItems.length) return;
        if(!confirm('Clear all site media from this survey gallery?')) return;
        await clearCurrentSession();
      });
    }

    if(photoInput && !photoInput.dataset.v53Bound){
      photoInput.dataset.v53Bound = 'yes';
      photoInput.onchange = async e => {
        await addFiles(e.target.files, pendingCategory);
        photoInput.value = '';
      };
    }

    if(videoInput && !videoInput.dataset.v53Bound){
      videoInput.dataset.v53Bound = 'yes';
      videoInput.onchange = async e => {
        await addFiles(e.target.files, pendingCategory || 'Other');
        videoInput.value = '';
      };
    }

    if(fileInput){
      fileInput.dataset.v52MediaBound = 'yes';
      fileInput.onchange = async e => {
        await addFiles(e.target.files, pendingCategory || 'Other');
        fileInput.value = '';
      };
    }

    const gallery = $('mediaGallery');
    if(gallery && !gallery.dataset.v53Bound){
      gallery.dataset.v53Bound = 'yes';
      gallery.addEventListener('change', async e => {
        const sel = e.target.closest('.mediaCategorySelect');
        if(!sel) return;
        const tile = sel.closest('.mediaTile');
        const id = tile?.dataset.mediaId;
        const item = loadedItems.find(x => x.id === id);
        if(!item) return;
        item.category = cleanCategory(sel.value);
        await putItem(item);
        autoTickForCategory(item.category);
        syncSelectedFiles();
      });
      gallery.addEventListener('click', async e => {
        const btn = e.target.closest('.mediaRemove');
        if(!btn) return;
        e.preventDefault();
        const tile = btn.closest('.mediaTile');
        const id = tile?.dataset.mediaId;
        if(!id) return;
        await deleteItem(id);
        loadedItems = loadedItems.filter(x => x.id !== id);
        syncSelectedFiles();
        renderGallery();
      });
    }
  }

  function patchSurveySession(){
    // Create a fresh gallery when a new survey starts. The old files remain archived in IndexedDB but are not attached to the new job.
    document.addEventListener('click', e => {
      const id = e.target && e.target.id;
      if(['homeNewSurvey','newSurveyTop','newSurveySaved','saveAndNew'].includes(id)){
        newSession();
      }
    }, true);

    try{
      const oldGetData = getData;
      if(typeof oldGetData === 'function' && !oldGetData.v53MediaWrapped){
        getData = function(){
          const d = oldGetData();
          d.mediaSessionId = currentSession();
          d.mediaFiles = loadedItems.map((i,idx) => ({
            file: fileFromItem(i,idx).name,
            originalName: i.name,
            category: i.category,
            type: i.type,
            size: i.size,
            capturedAt: i.capturedAt
          }));
          return d;
        };
        getData.v53MediaWrapped = true;
      }
    }catch(e){}

    try{
      const oldLoadSavedSurvey = loadSavedSurvey;
      if(typeof oldLoadSavedSurvey === 'function' && !oldLoadSavedSurvey.v53MediaWrapped){
        loadSavedSurvey = function(id){
          const surveys = typeof getSavedSurveys === 'function' ? getSavedSurveys() : [];
          const rec = surveys.find(x => x.id === id);
          oldLoadSavedSurvey(id);
          const mediaId = rec && rec.mediaSessionId ? rec.mediaSessionId : localStorage.getItem(SESSION_KEY);
          if(mediaId) localStorage.setItem(SESSION_KEY, mediaId);
          setTimeout(loadGallery, 150);
        };
        loadSavedSurvey.v53MediaWrapped = true;
      }
    }catch(e){}
  }

  function bind(){
    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
    ensureSessionId();
    bindInputs();
    patchSurveySession();
    loadGallery();
    // Re-bind after earlier v52 handlers, because v52 used to replace the file input contents.
    setTimeout(() => {
      bindInputs();
      loadGallery();
    }, 500);
  }

  window.LGSurveyMediaGallery = {
    load: loadGallery,
    clear: clearCurrentSession,
    session: currentSession,
    files: () => selectedFiles,
    items: () => loadedItems.slice()
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();



/* v54: survey media stay-on-page, combined equipment location, simplified Tesla route */
(function(){
  const VERSION = 'v58';
  const ACTIVE_TAB_KEY = 'lg_survey_active_tab_v1';
  const $ = id => document.getElementById(id);

  function rememberTab(tabId){
    if(!tabId) return;
    try{ localStorage.setItem(ACTIVE_TAB_KEY, tabId); }catch(e){}
    try{
      const url = new URL(location.href);
      url.hash = tabId;
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }catch(e){}
  }

  function activateTab(tabId, opts={}){
    const target = $(tabId);
    if(!target) return;
    document.querySelectorAll('nav button[data-tab]').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('main > section.panel').forEach(panel => {
      panel.classList.toggle('on', panel.id === tabId);
    });
    target.classList.add('on');
    rememberTab(tabId);
    if(opts.scroll !== false){
      try{ window.scrollTo({top:0,left:0,behavior:opts.smooth?'smooth':'auto'}); }catch(e){ window.scrollTo(0,0); }
    }
    if(tabId === 'present'){
      setTimeout(() => {
        try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(e){}
        try{ if(typeof renderRecommendationPreview === 'function') renderRecommendationPreview(); }catch(e){}
      }, 0);
    }
    if(tabId === 'agreement'){
      setTimeout(() => {
        try{ if(typeof initSignaturePad === 'function') initSignaturePad(); }catch(e){}
      }, 0);
    }
  }

  function restoreTab(){
    let tab = '';
    try{ tab = (location.hash || '').replace('#',''); }catch(e){}
    if(!tab){
      try{ tab = localStorage.getItem(ACTIVE_TAB_KEY) || ''; }catch(e){}
    }
    if(location.search.includes('newSurvey=')) tab = 'customer';
    if(!$(tab)) tab = 'home';
    activateTab(tab, {scroll:false});
  }

  function bindNavigation(){
    document.querySelectorAll('nav button[data-tab]').forEach(btn => {
      btn.onclick = function(e){
        e.preventDefault();
        activateTab(btn.dataset.tab, {smooth:false});
      };
    });

    document.addEventListener('click', function(e){
      const continueBtn = e.target && e.target.closest ? e.target.closest('.continueBtn[data-next]') : null;
      if(continueBtn){
        e.preventDefault();
        e.stopImmediatePropagation();
        activateTab(continueBtn.dataset.next, {smooth:true});
        return;
      }

      const navBtn = e.target && e.target.closest ? e.target.closest('nav button[data-tab]') : null;
      if(navBtn){
        rememberTab(navBtn.dataset.tab);
      }

      const mediaBtn = e.target && e.target.closest ? e.target.closest('.mediaQuickBtn,#addSiteFiles,#recordSiteVideo') : null;
      if(mediaBtn){
        rememberTab('site');
      }
    }, true);

    ['quickPhotoInput','quickVideoInput','filesInput'].forEach(id => {
      const el = $(id);
      if(!el || el.dataset.v54StayBound) return;
      el.dataset.v54StayBound = 'yes';
      el.addEventListener('click', () => rememberTab('site'), true);
      el.addEventListener('change', () => {
        rememberTab('site');
        setTimeout(() => activateTab('site', {scroll:false}), 250);
        setTimeout(() => activateTab('site', {scroll:false}), 900);
      }, true);
    });
  }

  function syncEquipmentLocation(){
    const battery = $('batteryLoc');
    const legacyInv = $('invLoc');
    if(!battery || !legacyInv) return;
    if(!battery.value && legacyInv.value) battery.value = legacyInv.value;
    legacyInv.value = battery.value || legacyInv.value || '';
    if(!battery.dataset.v54Combined){
      battery.dataset.v54Combined = 'yes';
      battery.addEventListener('input', () => {
        legacyInv.value = battery.value;
        try{ if(typeof save === 'function') save(); }catch(e){}
      });
    }
  }

  function simplifyTeslaDefaults(){
    const brand = $('batteryBrand');
    const battery = $('battery');
    const pw3Qty = $('pw3Qty');
    const pw3 = $('pw3');
    const gateway = $('gateway');
    const saleType = $('teslaSaleType');

    function applyDefault(){
      if(brand && brand.value === 'Tesla'){
        if(battery) battery.checked = true;
        if(pw3Qty && !Number(pw3Qty.value || 0)) pw3Qty.value = '1';
        if(pw3) pw3.checked = Number(pw3Qty?.value || 1) > 0;
        if(gateway && gateway.dataset.userChanged !== 'yes') gateway.checked = true;
        if(saleType) saleType.value = 'solarBattery';
      }
      try{ if(typeof syncTeslaOptions === 'function') syncTeslaOptions(); }catch(e){}
      try{ if(typeof calculate === 'function') calculate(); }catch(e){}
      try{ if(typeof save === 'function') save(); }catch(e){}
    }

    if(brand && !brand.dataset.v54Tesla){
      brand.dataset.v54Tesla = 'yes';
      brand.addEventListener('change', applyDefault);
    }
    if(gateway && !gateway.dataset.v54Tesla){
      gateway.dataset.v54Tesla = 'yes';
      gateway.addEventListener('change', () => {
        gateway.dataset.userChanged = 'yes';
        if(saleType) saleType.value = 'solarBattery';
        try{ if(typeof syncTeslaOptions === 'function') syncTeslaOptions(); }catch(e){}
        try{ if(typeof save === 'function') save(); }catch(e){}
      });
    }
    ['pw3Qty','dcExpQty'].forEach(id => {
      const el = $(id);
      if(el && !el.dataset.v54Tesla){
        el.dataset.v54Tesla = 'yes';
        el.addEventListener('input', () => {
          if(saleType) saleType.value = 'solarBattery';
          try{ if(typeof syncTeslaOptions === 'function') syncTeslaOptions(); }catch(e){}
          try{ if(typeof save === 'function') save(); }catch(e){}
        });
      }
    });
    // On normal page load, keep any saved Gateway choice. The HTML default is already checked for new surveys.
    if(brand && brand.value === 'Tesla'){
      if(battery) battery.checked = true;
      if(pw3Qty && !Number(pw3Qty.value || 0)) pw3Qty.value = '1';
      if(pw3) pw3.checked = Number(pw3Qty?.value || 1) > 0;
      if(saleType) saleType.value = 'solarBattery';
      try{ if(typeof syncTeslaOptions === 'function') syncTeslaOptions(); }catch(e){}
    }
  }

  function fixTigoManual(){
    const tigoQty = $('tigoQty');
    const tigo = $('tigo');
    if(tigoQty){
      tigoQty.dataset.auto = '';
      if(tigoQty.value === '') tigoQty.value = '0';
      if(!tigoQty.dataset.v54Manual){
        tigoQty.dataset.v54Manual = 'yes';
        tigoQty.addEventListener('focus', () => { tigoQty.dataset.auto = ''; });
        tigoQty.addEventListener('input', () => { tigoQty.dataset.auto = ''; });
      }
    }
    if(tigo && !tigo.dataset.v54Manual){
      tigo.dataset.v54Manual = 'yes';
      tigo.addEventListener('change', () => {
        setTimeout(() => {
          const q = $('tigoQty');
          if(q && q.dataset.auto === 'yes'){
            q.value = '0';
            q.dataset.auto = '';
          }
        }, 0);
      }, true);
    }
  }

  function patchVersion(){
    const home = $('homeVersionSmall');
    if(home) home.textContent = VERSION;
    const badge = $('appVersionBadge');
    if(badge) badge.textContent = 'App version: ' + VERSION;
  }

  function bind(){
    bindNavigation();
    syncEquipmentLocation();
    simplifyTeslaDefaults();
    fixTigoManual();
    patchVersion();
    restoreTab();
    setTimeout(() => {
      bindNavigation();
      syncEquipmentLocation();
      simplifyTeslaDefaults();
      fixTigoManual();
      patchVersion();
      restoreTab();
    }, 700);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.LGSurveyActivateTab = activateTab;
})();



/* v55: robust media gallery save/export and stay-on-survey fixes */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  const DB_NAME = 'lg_survey_media_v1';
  const DB_VERSION = 1;
  const STORE = 'media';
  const SESSION_KEY = 'lg_survey_media_session_v1';
  const ACTIVE_TAB_KEY = 'lg_survey_active_tab_v1';

  const categories = [
    'Roof',
    'Distribution board / CU',
    'Meter / fuse',
    'Battery / controller location',
    'Cable route',
    'Access / scaffold',
    'Other'
  ];

  let pendingCategory = 'Other';
  let loadedItems = [];
  let dbPromise = null;

  function setVersion(){
    const home = $('homeVersionSmall');
    if(home) home.textContent = VERSION;
    const badge = $('appVersionBadge');
    if(badge) badge.textContent = 'App version: ' + VERSION;
  }

  function activePanelId(){
    const on = document.querySelector('main > section.panel.on');
    return on ? on.id : '';
  }

  function rememberSite(){
    try{ localStorage.setItem(ACTIVE_TAB_KEY, 'site'); }catch(e){}
    try{
      if(location.hash !== '#site') history.replaceState(null, '', location.pathname + location.search + '#site');
    }catch(e){}
  }

  function activateSite(delay){
    window.setTimeout(() => {
      try{
        if(typeof window.LGSurveyActivateTab === 'function'){
          window.LGSurveyActivateTab('site', {scroll:false});
          return;
        }
      }catch(e){}
      const target = $('site');
      if(!target) return;
      document.querySelectorAll('nav button[data-tab]').forEach(btn => btn.classList.toggle('on', btn.dataset.tab === 'site'));
      document.querySelectorAll('main > section.panel').forEach(panel => panel.classList.toggle('on', panel.id === 'site'));
      target.classList.add('on');
      rememberSite();
    }, delay || 0);
  }

  function uid(){
    return 'media_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function ensureSessionId(){
    let id = '';
    try{ id = localStorage.getItem(SESSION_KEY) || ''; }catch(e){}
    if(!id){
      id = 'session_' + Date.now() + '_' + Math.random().toString(16).slice(2);
      try{ localStorage.setItem(SESSION_KEY, id); }catch(e){}
    }
    return id;
  }

  function cleanCategory(v){
    return categories.includes(v) ? v : 'Other';
  }

  function cleanFileName(v){
    return String(v || 'site_file')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,' ')
      .trim()
      .slice(0,110) || 'site_file';
  }

  function categoryPrefix(cat){
    return cleanCategory(cat).replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').toLowerCase() || 'site';
  }

  function fileExtension(file){
    const n = file && file.name ? String(file.name) : '';
    if(n.includes('.')) return n.split('.').pop().toLowerCase();
    const t = (file && file.type) || '';
    if(t.includes('jpeg')) return 'jpg';
    if(t.includes('png')) return 'png';
    if(t.includes('webp')) return 'webp';
    if(t.includes('pdf')) return 'pdf';
    if(t.includes('mp4')) return 'mp4';
    if(t.includes('quicktime')) return 'mov';
    return 'bin';
  }

  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if(!('indexedDB' in window)) return reject(new Error('IndexedDB is not available on this device.'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store = db.createObjectStore(STORE, {keyPath:'id'});
          store.createIndex('sessionId', 'sessionId', {unique:false});
          store.createIndex('capturedAt', 'capturedAt', {unique:false});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Could not open gallery storage.'));
    });
    return dbPromise;
  }

  function reqPromise(req){
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Storage request failed.'));
    });
  }

  async function store(mode){
    const db = await openDB();
    return db.transaction(STORE, mode).objectStore(STORE);
  }

  async function putItem(item){
    const s = await store('readwrite');
    await reqPromise(s.put(item));
  }

  async function deleteItem(id){
    const s = await store('readwrite');
    await reqPromise(s.delete(id));
  }

  async function getItems(sessionId){
    const s = await store('readonly');
    const idx = s.index('sessionId');
    const items = await reqPromise(idx.getAll(sessionId || ensureSessionId()));
    return (items || []).sort((a,b) => (a.capturedAt || 0) - (b.capturedAt || 0));
  }

  function safeFileFromItem(item, index){
    const blob = item.blob instanceof Blob ? item.blob : new Blob([item.blob || ''], {type:item.type || 'application/octet-stream'});
    const original = cleanFileName(item.name || `site_file_${index+1}.${fileExtension(blob)}`);
    const name = `${String(index+1).padStart(2,'0')}_${categoryPrefix(item.category)}_${original}`;
    try{
      return new File([blob], name, {type:item.type || blob.type || 'application/octet-stream', lastModified:item.lastModified || Date.now()});
    }catch(e){
      blob.name = name;
      blob.lastModified = item.lastModified || Date.now();
      return blob;
    }
  }

  function syncSelectedFiles(){
    try{
      window.selectedFiles = loadedItems.map((item, idx) => safeFileFromItem(item, idx));
      if(typeof selectedFiles !== 'undefined') selectedFiles = window.selectedFiles;
    }catch(e){}
    const names = $('fileNames');
    if(names){
      if(!loadedItems.length){
        names.textContent = 'No site media captured yet.';
      }else{
        const total = loadedItems.reduce((sum,i) => sum + (Number(i.size)||0), 0);
        names.textContent = `${loadedItems.length} gallery item${loadedItems.length===1?'':'s'} ready for export (${Math.round(total/1024)} KB)\n` +
          loadedItems.map((i,idx) => `${idx+1}. ${i.category || 'Other'} - ${i.name || 'Unnamed file'}`).join('\n');
      }
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
  }

  function autoTickForCategory(cat){
    const map = {
      'Roof': ['photoRoofFront','photoRoofRear'],
      'Distribution board / CU': ['photoCU'],
      'Meter / fuse': ['photoMeter','photoFuse'],
      'Battery / controller location': ['photoBatteryLoc','photoInverterLoc'],
      'Cable route': ['photoCableRoute'],
      'Access / scaffold': ['photoAccess']
    };
    (map[cat] || []).forEach(id => {
      const el = $(id);
      if(el) el.checked = true;
    });
    try{ if(typeof save === 'function') save(); }catch(e){}
  }

  function formatSize(bytes){
    const n = Number(bytes)||0;
    if(n > 1024*1024) return (n/(1024*1024)).toFixed(1) + ' MB';
    return Math.round(n/1024) + ' KB';
  }

  function iconFor(item){
    const t = item.type || '';
    if(t.includes('pdf')) return 'PDF';
    if(t.startsWith('video/')) return '▶';
    return 'FILE';
  }

  function renderGallery(){
    const box = $('mediaGallery');
    const preview = $('preview');
    if(preview) preview.innerHTML = '';
    if(!box) return;
    if(!loadedItems.length){
      box.innerHTML = '<div class="galleryEmpty">No photos or videos captured yet. Tap a quick capture button to start building the survey gallery.</div>';
      return;
    }
    box.innerHTML = '';
    loadedItems.forEach((item, idx) => {
      const tile = document.createElement('div');
      tile.className = 'mediaTile';
      tile.dataset.mediaId = item.id;

      const thumb = document.createElement('div');
      thumb.className = 'mediaThumb';

      const blob = item.blob instanceof Blob ? item.blob : null;
      const url = blob ? URL.createObjectURL(blob) : '';

      if((item.type || '').startsWith('image/') && url){
        const img = document.createElement('img');
        img.src = url;
        img.alt = item.name || 'Survey photo';
        img.onload = () => setTimeout(() => URL.revokeObjectURL(url), 1200);
        thumb.appendChild(img);
      }else if((item.type || '').startsWith('video/') && url){
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        thumb.appendChild(video);
      }else{
        const icon = document.createElement('div');
        icon.className = 'mediaFileIcon';
        icon.textContent = iconFor(item);
        thumb.appendChild(icon);
      }

      const body = document.createElement('div');
      body.className = 'mediaBody';

      const name = document.createElement('div');
      name.className = 'mediaName';
      name.textContent = item.name || `Survey file ${idx+1}`;

      const meta = document.createElement('div');
      meta.className = 'mediaMeta';
      meta.textContent = `${formatSize(item.size)} • ${item.type || 'file'}`;

      const select = document.createElement('select');
      select.className = 'mediaCategorySelect';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        if(cleanCategory(item.category) === c) opt.selected = true;
        select.appendChild(opt);
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mediaRemove';
      remove.textContent = 'Remove from gallery';

      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(select);
      body.appendChild(remove);

      tile.appendChild(thumb);
      tile.appendChild(body);
      box.appendChild(tile);
    });
  }

  async function loadGallery(){
    try{
      loadedItems = await getItems(ensureSessionId());
      syncSelectedFiles();
      renderGallery();
    }catch(e){
      const names = $('fileNames');
      if(names) names.textContent = 'Gallery storage was blocked on this device. Use Add photos / files again before export.';
      console.error('LG Survey gallery load failed', e);
    }
  }

  async function addFiles(fileList, category){
    const arr = Array.from(fileList || []).filter(Boolean);
    if(!arr.length){
      activateSite(0);
      return;
    }
    rememberSite();
    activateSite(0);
    const cat = cleanCategory(category || pendingCategory);
    const sessionId = ensureSessionId();

    for(const f of arr){
      const now = Date.now();
      const extension = fileExtension(f);
      const defaultName = `${categoryPrefix(cat)}_${new Date(now).toISOString().slice(0,19).replace(/[:T]/g,'-')}.${extension}`;
      const item = {
        id: uid(),
        sessionId,
        name: cleanFileName(f.name || defaultName),
        type: f.type || 'application/octet-stream',
        size: f.size || 0,
        lastModified: f.lastModified || now,
        category: cat,
        capturedAt: now,
        blob: f
      };
      await putItem(item);
      loadedItems.push(item);
    }

    autoTickForCategory(cat);
    syncSelectedFiles();
    renderGallery();

    activateSite(0);
    activateSite(300);
    activateSite(900);
  }

  async function clearGallery(){
    if(!loadedItems.length) return;
    if(!confirm('Clear all site media from this survey gallery?')) return;
    const ids = loadedItems.map(i => i.id);
    for(const id of ids) await deleteItem(id);
    loadedItems = [];
    syncSelectedFiles();
    renderGallery();
    activateSite(0);
  }

  function prepareInput(input, category){
    if(!input) return;
    pendingCategory = cleanCategory(category || 'Other');
    rememberSite();
    try{ input.value = ''; }catch(e){}
    input.click();
    activateSite(150);
  }

  function bindButtons(){
    // Intercept quick capture buttons before the older handlers can fire, so each button follows the same stable route.
    document.addEventListener('click', function(e){
      const quick = e.target && e.target.closest ? e.target.closest('.mediaQuickBtn') : null;
      const add = e.target && e.target.closest ? e.target.closest('#addSiteFiles') : null;
      const video = e.target && e.target.closest ? e.target.closest('#recordSiteVideo') : null;
      const clear = e.target && e.target.closest ? e.target.closest('#clearSiteGallery') : null;

      if(quick || add || video || clear){
        e.preventDefault();
        e.stopImmediatePropagation();
        rememberSite();

        if(quick){
          prepareInput($('quickPhotoInput'), quick.dataset.mediaCat || 'Other');
          return;
        }
        if(add){
          prepareInput($('filesInput'), 'Other');
          return;
        }
        if(video){
          prepareInput($('quickVideoInput'), 'Other');
          return;
        }
        if(clear){
          clearGallery().catch(err => console.error(err));
          return;
        }
      }
    }, true);

    const pairs = [
      ['quickPhotoInput', () => pendingCategory || 'Other'],
      ['quickVideoInput', () => pendingCategory || 'Other'],
      ['filesInput', () => pendingCategory || 'Other']
    ];

    pairs.forEach(([id, catGetter]) => {
      const input = $(id);
      if(!input || input.dataset.v55Bound) return;
      input.dataset.v55Bound = 'yes';
      input.onchange = null;
      input.addEventListener('click', function(){
        rememberSite();
      }, true);
      input.addEventListener('change', function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        const files = e.target.files;
        const cat = catGetter();
        addFiles(files, cat)
          .catch(err => {
            console.error('Could not save site media', err);
            alert('That photo/video could not be saved into the gallery. Please try Add photos / files, or close other tabs and try again.');
          })
          .finally(() => {
            try{ input.value = ''; }catch(err){}
            rememberSite();
            activateSite(0);
            activateSite(400);
            activateSite(1000);
          });
      }, true);
    });

    const gallery = $('mediaGallery');
    if(gallery && !gallery.dataset.v55Bound){
      gallery.dataset.v55Bound = 'yes';
      gallery.addEventListener('change', function(e){
        const sel = e.target.closest('.mediaCategorySelect');
        if(!sel) return;
        e.preventDefault();
        const tile = sel.closest('.mediaTile');
        const id = tile && tile.dataset.mediaId;
        const item = loadedItems.find(x => x.id === id);
        if(!item) return;
        item.category = cleanCategory(sel.value);
        putItem(item)
          .then(() => {
            autoTickForCategory(item.category);
            syncSelectedFiles();
            renderGallery();
          })
          .catch(err => console.error(err));
      }, true);

      gallery.addEventListener('click', function(e){
        const btn = e.target.closest('.mediaRemove');
        if(!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const tile = btn.closest('.mediaTile');
        const id = tile && tile.dataset.mediaId;
        if(!id) return;
        deleteItem(id)
          .then(() => {
            loadedItems = loadedItems.filter(x => x.id !== id);
            syncSelectedFiles();
            renderGallery();
          })
          .catch(err => console.error(err));
      }, true);
    }
  }

  function patchNewSurveySession(){
    document.addEventListener('click', function(e){
      const id = e.target && e.target.id;
      if(!['homeNewSurvey','newSurveyTop','newSurveySaved','saveAndNew'].includes(id)) return;
      const fresh = 'session_' + Date.now() + '_' + Math.random().toString(16).slice(2);
      try{ localStorage.setItem(SESSION_KEY, fresh); }catch(err){}
      loadedItems = [];
      syncSelectedFiles();
      renderGallery();
    }, true);
  }

  function patchGetData(){
    try{
      if(typeof getData === 'function' && !getData.v55MediaWrapped){
        const old = getData;
        getData = function(){
          const d = old();
          d.mediaSessionId = ensureSessionId();
          d.mediaFiles = loadedItems.map((i,idx) => ({
            file: safeFileFromItem(i, idx).name,
            originalName: i.name,
            category: i.category,
            type: i.type,
            size: i.size,
            capturedAt: i.capturedAt
          }));
          return d;
        };
        getData.v55MediaWrapped = true;
      }
    }catch(e){}
  }

  function patchLoadSavedSurvey(){
    try{
      if(typeof loadSavedSurvey === 'function' && !loadSavedSurvey.v55MediaWrapped){
        const old = loadSavedSurvey;
        loadSavedSurvey = function(id){
          const surveys = typeof getSavedSurveys === 'function' ? getSavedSurveys() : [];
          const rec = surveys.find(x => x.id === id);
          old(id);
          if(rec && rec.mediaSessionId){
            try{ localStorage.setItem(SESSION_KEY, rec.mediaSessionId); }catch(e){}
          }
          setTimeout(loadGallery, 150);
        };
        loadSavedSurvey.v55MediaWrapped = true;
      }
    }catch(e){}
  }

  function patchExportBeforeDownload(){
    // Keep selectedFiles fresh before any export button or acceptance-generated ZIP runs.
    document.addEventListener('click', function(e){
      const btn = e.target && e.target.closest ? e.target.closest('#exportSurveyPackZip,#toolsExportSurveyPackZip,#stampAccept,#markSurveyComplete') : null;
      if(!btn) return;
      syncSelectedFiles();
    }, true);
  }

  function bind(){
    setVersion();
    ensureSessionId();
    bindButtons();
    patchNewSurveySession();
    patchGetData();
    patchLoadSavedSurvey();
    patchExportBeforeDownload();
    loadGallery();

    // Bind again after all earlier version patchers have finished.
    setTimeout(() => {
      setVersion();
      bindButtons();
      loadGallery();
      if(activePanelId() === 'site') activateSite(0);
    }, 850);
  }

  window.LGSurveyMediaGallery = {
    load: loadGallery,
    files: () => {
      syncSelectedFiles();
      try{ return Array.from(selectedFiles || []); }catch(e){ return []; }
    },
    items: () => loadedItems.slice(),
    session: ensureSessionId,
    clear: clearGallery,
    addFiles
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();



/* v56: full debug stabilisation for signature state, saved survey switching and export safety */
(function(){
  const VERSION = 'v58';
  const KEY_NAME = 'tlgec_current_draft_v1';
  const SURVEYS_NAME = 'tlgec_surveys_saved_v1';
  const ACTIVE_TAB_KEY = 'lg_survey_active_tab_v1';
  const $ = id => document.getElementById(id);

  function setVersion(){
    const home = $('homeVersionSmall');
    if(home) home.textContent = VERSION;
    const badge = $('appVersionBadge');
    if(badge) badge.textContent = 'App version: ' + VERSION;
  }

  function blankSignatureMessage(){
    return 'No survey acceptance recorded yet.';
  }

  function canvas(){
    return $('signatureCanvas');
  }

  function clearCanvas(){
    const c = canvas();
    if(!c) return;
    try{
      const ctx = c.getContext('2d');
      ctx.clearRect(0,0,c.width,c.height);
    }catch(e){}
  }

  function canvasHasInk(){
    const c = canvas();
    if(!c) return false;
    try{
      const ctx = c.getContext('2d', {willReadFrequently:true});
      const data = ctx.getImageData(0,0,c.width,c.height).data;
      for(let i=3;i<data.length;i+=4){
        if(data[i] > 10) return true;
      }
    }catch(e){
      return !!(signatureData && signatureData.length > 1000) || !!(window.signatureData && window.signatureData.length > 1000);
    }
    return false;
  }

  function currentCanvasSignature(){
    const c = canvas();
    if(!c || !canvasHasInk()) return '';
    try{ return c.toDataURL('image/png'); }catch(e){ return signatureData || window.signatureData || ''; }
  }

  function applySignature(data, opts={}){
    const value = data || '';
    try{ signatureData = value; }catch(e){}
    try{ window.signatureData = value; }catch(e){}
    try{ signaturePadDirty = !!value; }catch(e){}

    clearCanvas();

    if(value){
      const c = canvas();
      if(c){
        try{
          const ctx = c.getContext('2d');
          const img = new Image();
          img.onload = function(){
            try{
              ctx.clearRect(0,0,c.width,c.height);
              ctx.drawImage(img,0,0,c.width,c.height);
            }catch(e){}
          };
          img.src = value;
        }catch(e){}
      }
    }

    if(opts.save){
      try{ if(typeof save === 'function') save(); }catch(e){}
    }
  }

  function clearSignatureAndAcceptance(opts={}){
    applySignature('', {save:false});
    const stamp = $('acceptanceStamp');
    if(stamp) stamp.textContent = blankSignatureMessage();
    const note = $('acceptanceNote');
    if(note && opts.clearFields) note.value = '';
    const likelihood = $('customerLikelihood');
    if(likelihood && opts.clearFields) likelihood.value = '';
    const blocker = $('blockerReason');
    if(blocker && opts.clearFields) blocker.value = '';
    document.querySelectorAll('#likelihoodButtons button').forEach(btn => btn.classList.remove('selected'));
    const blockerPrompt = $('blockerPrompt');
    if(blockerPrompt && opts.clearFields) blockerPrompt.textContent = 'Choose the closest option above.';
    if(opts.save){
      try{ if(typeof save === 'function') save(); }catch(e){}
    }
  }

  function syncSignatureBeforeSave(){
    const data = currentCanvasSignature();
    try{ signatureData = data; }catch(e){}
    try{ window.signatureData = data; }catch(e){}
    return data;
  }

  function savedSurveyById(id){
    try{
      const list = typeof getSavedSurveys === 'function'
        ? getSavedSurveys()
        : JSON.parse(localStorage.getItem(SURVEYS_NAME) || '[]');
      return (list || []).find(x => x && x.id === id) || null;
    }catch(e){ return null; }
  }

  function patchSignatureHelpers(){
    try{
      window.LGSurveySignature = {
        clear: () => clearSignatureAndAcceptance({save:true, clearFields:false}),
        resetBlank: () => clearSignatureAndAcceptance({save:false, clearFields:true}),
        apply: data => applySignature(data, {save:false}),
        hasInk: canvasHasInk,
        get: currentCanvasSignature
      };
    }catch(e){}

    try{
      hasSignature = function(){
        return !!currentCanvasSignature();
      };
    }catch(e){}
  }

  function patchGetData(){
    try{
      if(typeof getData === 'function' && !getData.v56SignatureWrapped){
        const old = getData;
        getData = function(){
          const data = syncSignatureBeforeSave();
          const d = old.apply(this, arguments);
          d.signatureData = data;
          const stamp = $('acceptanceStamp');
          d.acceptance = stamp ? (stamp.innerText || stamp.textContent || '') : '';
          return d;
        };
        getData.v56SignatureWrapped = true;
      }
    }catch(e){}
  }

  function patchSaveCurrentSurvey(){
    try{
      if(typeof saveCurrentSurvey === 'function' && !saveCurrentSurvey.v56SignatureWrapped){
        const old = saveCurrentSurvey;
        saveCurrentSurvey = function(){
          syncSignatureBeforeSave();
          return old.apply(this, arguments);
        };
        saveCurrentSurvey.v56SignatureWrapped = true;
      }
    }catch(e){}
  }

  function patchLoadSavedSurvey(){
    try{
      if(typeof loadSavedSurvey === 'function' && !loadSavedSurvey.v56SignatureWrapped){
        const old = loadSavedSurvey;
        loadSavedSurvey = function(id){
          const recBefore = savedSurveyById(id);
          const result = old.apply(this, arguments);
          const rec = savedSurveyById(id) || recBefore;
          const sig = rec && rec.signatureData ? rec.signatureData : '';
          const acceptance = rec && rec.acceptance ? rec.acceptance : blankSignatureMessage();

          // Existing legacy loaders update fields but did not redraw or clear the canvas.
          // Run a few times to beat older delayed render/bind code on slower phones.
          [0,80,250,700].forEach(delay => {
            setTimeout(() => {
              applySignature(sig, {save:false});
              const stamp = $('acceptanceStamp');
              if(stamp) stamp.textContent = acceptance || blankSignatureMessage();
              setVersion();
            }, delay);
          });

          return result;
        };
        loadSavedSurvey.v56SignatureWrapped = true;
      }
    }catch(e){}
  }

  function patchBlankSurveyStarts(){
    // Do not clear the visible signature before a user has confirmed a new survey.
    // Blank-survey actions reload the app with ?newSurvey and are cleared in bind() after the new page loads.
    // Save-and-new saves the current signature first, then starts a clean draft.
    try{
      if(typeof saveAndStartNew === 'function' && !saveAndStartNew.v56SignatureWrapped){
        const old = saveAndStartNew;
        saveAndStartNew = function(){
          syncSignatureBeforeSave();
          const result = old.apply(this, arguments);
          setTimeout(() => clearSignatureAndAcceptance({save:false, clearFields:true}), 0);
          return result;
        };
        saveAndStartNew.v56SignatureWrapped = true;
      }
    }catch(e){}
  }

  function patchClearSignatureButton(){
    const btn = $('clearSignature');
    if(!btn) return;
    btn.onclick = function(e){
      if(e) e.preventDefault();
      applySignature('', {save:true});
    };
  }

  function bind(){
    setVersion();
    patchSignatureHelpers();
    patchGetData();
    patchSaveCurrentSurvey();
    patchLoadSavedSurvey();
    patchBlankSurveyStarts();
    patchClearSignatureButton();

    if(location.search.includes('newSurvey=')){
      clearSignatureAndAcceptance({save:false, clearFields:true});
    }else{
      // On first load, redraw the current draft signature or clear the box if none exists.
      let draftSig = '';
      let draftAcceptance = '';
      try{
        const draft = JSON.parse(localStorage.getItem(KEY_NAME) || 'null');
        draftSig = draft && draft.signatureData ? draft.signatureData : '';
        draftAcceptance = draft && draft.acceptance ? draft.acceptance : '';
      }catch(e){}
      setTimeout(() => {
        applySignature(draftSig, {save:false});
        const stamp = $('acceptanceStamp');
        if(stamp && !draftAcceptance) stamp.textContent = blankSignatureMessage();
        else if(stamp && draftAcceptance) stamp.textContent = draftAcceptance;
      }, 120);
    }

    // Some older patchers reassign button handlers late. Re-apply final signature patch after they finish.
    setTimeout(() => {
      setVersion();
      patchSignatureHelpers();
      patchGetData();
      patchSaveCurrentSurvey();
      patchLoadSavedSurvey();
      patchClearSignatureButton();
    }, 1100);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v57: surveyor panel override, flexible Sigenergy stack and cleaner CSV/tools flow */
(function(){
  const VERSION='v58';
  const $ = id => document.getElementById(id);
  const n = v => Number(v || 0) || 0;
  const moneyLocal = v => {
    try{ if(typeof money === 'function') return money(v); }catch(e){}
    return '£' + Math.round(Number(v)||0).toLocaleString('en-GB');
  };

  function setVersion(){
    const hv=$('homeVersionSmall'); if(hv) hv.textContent=VERSION;
    const av=$('appVersionBadge'); if(av) av.textContent='App version: '+VERSION;
  }

  function sig10(){ return Math.max(0, Math.min(6, Math.round(n($('sig10Qty')?.value)))); }
  function sig6(){ return Math.max(0, Math.min(6, Math.round(n($('sig6Qty')?.value)))); }
  function sigTotalModules(){ return sig10()+sig6(); }
  function sigTotalEnergy(){ return (sig10()*9.04) + (sig6()*6.02); }
  function sigUsableEnergy(){ return (sig10()*8.76) + (sig6()*5.84); }
  function sigModuleText(){
    const parts=[];
    if(sig10()) parts.push(`${sig10()} x SigenStor BAT 10.0`);
    if(sig6()) parts.push(`${sig6()} x SigenStor BAT 6.0`);
    return parts.length ? parts.join(' + ') : 'No Sigenergy battery modules selected';
  }
  function isSigManualController(){
    const brand=$('batteryBrand')?.value||'None';
    const hasSolar=!!$('solar')?.checked && n($('panelCount')?.value)>0;
    const mode=$('sigControllerMode')?.value||'auto';
    return brand==='Sigenergy' && (!hasSolar || mode==='manual');
  }
  function sigSelectedControllerText(){
    const raw=$('sigBatteryOnlyController')?.value || '0|None';
    const parts=raw.split('|');
    return parts[1] || 'None';
  }
  function sigSelectedControllerCost(){
    const raw=$('sigBatteryOnlyController')?.value || '0|None';
    return n(raw.split('|')[0]);
  }
  function sigBatteryInternalCost(){
    const c6=n($('sig6Price')?.value || 1575);
    const c10=n($('sig10Price')?.value || 2050);
    const gateway=($('sigGateway')?.checked && sigTotalModules()>0) ? n($('sigGatewayPrice')?.value || 785) : 0;
    return (sig6()*c6) + (sig10()*c10) + gateway;
  }
  function sigControllerCostV57(){
    const hasSolar=!!$('solar')?.checked && n($('panelCount')?.value)>0;
    if(hasSolar && ($('sigControllerMode')?.value||'auto') !== 'manual'){
      try{ return sigPvInverterCost(kWp()); }catch(e){ return 0; }
    }
    return sigSelectedControllerCost();
  }
  function sigControllerTextV57(){
    const hasSolar=!!$('solar')?.checked && n($('panelCount')?.value)>0;
    if(hasSolar && ($('sigControllerMode')?.value||'auto') !== 'manual'){
      try{ return `Controller auto-sized to ${sigPvInverterBand(kWp())} kW from solar size`; }catch(e){ return 'Controller auto-sized from solar size'; }
    }
    return `Controller selected: ${sigSelectedControllerText()}`;
  }
  function syncSigConfig(){
    const tenField=$('sig10Qty'), sixField=$('sig6Qty');
    if(tenField && n(tenField.value)>6) tenField.value='6';
    if(sixField && n(sixField.value)>6) sixField.value='6';
    if(tenField && n(tenField.value)<0) tenField.value='0';
    if(sixField && n(sixField.value)<0) sixField.value='0';
    const total=sigTotalModules();
    // enforce 1-6 modules per controller where a Sig stack is being selected
    if(total>6){
      const over=total-6;
      const sixEl=$('sig6Qty'), tenEl=$('sig10Qty');
      if(sixEl && sig6()>=over) sixEl.value=Math.max(0, sig6()-over);
      else if(tenEl) tenEl.value=Math.max(0, sig10()-over);
    }
    const total2=sigTotalModules();
    const model=$('sigBatteryModel'), qty=$('sigModuleQty');
    // Backwards compatibility for older handover/proposal functions.
    if(model) model.value = sig10() ? '10' : '6';
    if(qty) qty.value = String(total2);

    const hasSolar=!!$('solar')?.checked && n($('panelCount')?.value)>0;
    const controllerMode=$('sigControllerMode');
    if(controllerMode && !hasSolar && controllerMode.value==='auto') controllerMode.value='manual';

    const preview=$('sigPreviewBox');
    if(preview){
      const gateway=$('sigGateway')?.checked ? 'Gateway included where required' : 'No Sigenergy Gateway selected';
      const route=($('sigInstallType')?.selectedOptions?.[0]?.textContent || 'Sigenergy route').trim();
      const controller=sigControllerTextV57();
      preview.innerHTML=`<div class="sigPreviewMain">${sigModuleText()}</div>
      <div class="sigPreviewSub">${route} • ${total2} module${total2===1?'':'s'} • ${sigTotalEnergy().toFixed(2)} kWh total / ${sigUsableEnergy().toFixed(2)} kWh usable • ${gateway}<br>${controller}</div>`;
    }
    const warn=$('sigConfigWarning');
    if(warn){
      let msg='';
      if(total2>6) msg='Sigenergy datasheet limit is 1 to 6 battery modules per controller.';
      else if(total2===0 && ($('batteryBrand')?.value==='Sigenergy')) msg='Select at least one Sigenergy battery module.';
      else if(isSigManualController() && sigSelectedControllerText()==='None') msg='Manual/battery-only Sigenergy route needs a controller selection.';
      warn.textContent=msg;
      warn.classList.toggle('on', !!msg);
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
  }

  // Reassign Sigenergy helpers used by quote, recommendation, payback and handover.
  try{
    sigStorage = function(){ return sigTotalEnergy(); };
    sigUsable = function(){ return sigUsableEnergy(); };
    sigBatteryOnlyControllerCost = function(){ return sigControllerCostV57(); };
    sigBatteryDescription = function(){
      const total=sigTotalModules();
      if(total<=0) return 'No Sigenergy battery selected';
      const gateway=$('sigGateway')?.checked?'Gateway included':'No Gateway';
      return `${sigModuleText()} | ${sigTotalEnergy().toFixed(2)} kWh total / ${sigUsableEnergy().toFixed(2)} kWh usable | ${gateway}`;
    };
    updateSigPreview = syncSigConfig;
  }catch(e){}

  try{
    const oldBatteryCost = batteryCostInternal;
    batteryCostInternal = function(){
      const brand=$('batteryBrand')?.value||'None';
      if(brand!=='Sigenergy') return oldBatteryCost.apply(this, arguments);
      syncSigConfig();
      const hasSolar=!!$('solar')?.checked && n($('panelCount')?.value)>0;
      return {
        cost: sigBatteryInternalCost(),
        text: sigBatteryDescription(),
        inverterCost: sigControllerCostV57(),
        controllerText: sigControllerTextV57()
      };
    };
  }catch(e){}

  function roofSuggestedTotal(){
    return Array.from(document.querySelectorAll('.roofPanels')).reduce((sum,el)=>sum+n(el.value),0);
  }
  function currentRoofSuggestionKwp(){
    const count=roofSuggestedTotal();
    let watt=0;
    try{ watt=Number((($('panelModel')?.value||'').split('|')[1]))||0; }catch(e){}
    return (count*watt/1000);
  }
  function updatePanelSuggestionBox(){
    const box=$('panelSuggestionBox'); if(!box) return;
    const suggested=roofSuggestedTotal();
    const countEl=$('panelCount');
    const current=n(countEl?.value);
    const manual=countEl?.dataset.manual==='yes';
    let panel='selected panel';
    try{ panel=(($('panelModel')?.value||'').split('|')[0]) || panel; }catch(e){}
    if(suggested){
      box.classList.toggle('suggestionManual', manual && current !== suggested);
      box.classList.toggle('suggestionReady', !manual || current === suggested);
      const kwp=currentRoofSuggestionKwp();
      box.querySelector('span').textContent = manual && current !== suggested
        ? `Roof auto-fit suggests ${suggested} x ${panel} (${kwp.toFixed(2)} kWp), but surveyor override is ${current} panel${current===1?'':'s'}.`
        : `Roof auto-fit suggests ${suggested} x ${panel} (${kwp.toFixed(2)} kWp).`;
    }else{
      box.classList.remove('suggestionManual','suggestionReady');
      box.querySelector('span').textContent='Run auto-fit from the Survey page to show suggested panel count here.';
    }
  }

  function patchAutoFit(){
    try{
      if(typeof autoFitRoofPanels === 'function' && !autoFitRoofPanels.v57Wrapped){
        const old=autoFitRoofPanels;
        const wrapped=function(force=false){
          const countEl=$('panelCount');
          const manualBefore=countEl?.dataset.manual==='yes';
          const valBefore=countEl?.value;
          const out=old.apply(this, arguments);
          if(countEl && manualBefore && !force){
            countEl.value=valBefore;
            countEl.dataset.manual='yes';
          }
          if(countEl && force){
            countEl.dataset.manual='';
          }
          updatePanelSuggestionBox();
          return out;
        };
        wrapped.v57Wrapped=true;
        autoFitRoofPanels=wrapped;
        window.autoFitRoofPanels=wrapped;
      }
    }catch(e){}
  }

  function importHomeCsvText(){
    const text=($('homeCsvPaste')?.value||'').trim();
    if(!text){ alert('Paste the monday CSV text first, or start blank.'); return; }
    const crm=$('crmPaste');
    if(crm) crm.value=text;
    try{
      readPastedCRMAndSave();
      if($('homeCsvStatus')) $('homeCsvStatus').textContent='CSV imported and survey opened.';
    }catch(e){
      alert('Could not import the CSV text. Use Tools > Import from monday as a fallback.');
    }
  }

  function bind(){
    setVersion();
    patchAutoFit();
    syncSigConfig();
    updatePanelSuggestionBox();

    ['sig6Qty','sig10Qty','sigGateway','sigControllerMode','sigBatteryOnlyController','sigInstallType','sig6Price','sig10Price','sigGatewayPrice','batteryBrand','solar','panelCount'].forEach(id=>{
      const el=$(id);
      if(el && !el.dataset.v57Sig){
        el.dataset.v57Sig='yes';
        el.addEventListener('input', syncSigConfig);
        el.addEventListener('change', syncSigConfig);
      }
    });

    const pc=$('panelCount');
    if(pc && !pc.dataset.v57Panel){
      pc.dataset.v57Panel='yes';
      pc.addEventListener('input', () => { pc.dataset.manual='yes'; updatePanelSuggestionBox(); });
      pc.addEventListener('change', () => { pc.dataset.manual='yes'; updatePanelSuggestionBox(); });
    }
    const use=$('useRoofSuggestion');
    if(use && !use.dataset.v57Panel){
      use.dataset.v57Panel='yes';
      use.onclick=e=>{
        e.preventDefault();
        const suggested=roofSuggestedTotal();
        if(!suggested){ alert('Run auto-fit on the Survey page first.'); return; }
        if(pc){ pc.value=suggested; pc.dataset.manual=''; }
        updatePanelSuggestionBox();
        try{ if(typeof renderPanelSenseCheck==='function') renderPanelSenseCheck(); }catch(err){}
        try{ if(typeof save==='function') save(); }catch(err){}
      };
    }

    document.addEventListener('input', e=>{
      if(e.target && (e.target.closest('#roofPlanes') || e.target.id==='panelModel' || e.target.id==='autoPanelChoice' || e.target.id==='autoPanelMargin')){
        setTimeout(updatePanelSuggestionBox, 40);
      }
    }, true);
    document.addEventListener('change', e=>{
      if(e.target && (e.target.closest('#roofPlanes') || e.target.id==='panelModel' || e.target.id==='autoPanelChoice' || e.target.id==='autoPanelMargin')){
        setTimeout(updatePanelSuggestionBox, 40);
      }
    }, true);

    const importBtn=$('homeImportCustomer');
    if(importBtn && !importBtn.dataset.v57Csv){
      importBtn.dataset.v57Csv='yes';
      importBtn.onclick=e=>{ e.preventDefault(); importHomeCsvText(); };
    }
    const skip=$('homeSkipCsv');
    if(skip && !skip.dataset.v57Csv){
      skip.dataset.v57Csv='yes';
      skip.onclick=e=>{ e.preventDefault(); try{ startNewSurveyNow(); }catch(err){ location.href=location.pathname + '?newSurvey=' + Date.now() + '#customer'; } };
    }
    const file=$('homeCsvFile');
    if(file && !file.dataset.v57Csv){
      file.dataset.v57Csv='yes';
      file.onchange=e=>{
        const f=(e.target.files||[])[0];
        if(!f) return;
        try{
          readCSVFileAndSave(f);
          if($('homeCsvStatus')) $('homeCsvStatus').textContent='CSV file imported and survey opened.';
        }catch(err){ alert('Could not import this CSV file. Use Tools > Import from monday as a fallback.'); }
      };
    }

    const autoBtn=$('autoFitRoofs');
    if(autoBtn && !autoBtn.dataset.v57AutoText){
      autoBtn.dataset.v57AutoText='yes';
      autoBtn.addEventListener('click', ()=>setTimeout(updatePanelSuggestionBox, 80));
    }

    // Refresh after older patchers finish binding.
    setTimeout(()=>{ setVersion(); patchAutoFit(); syncSigConfig(); updatePanelSuggestionBox(); }, 900);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v58 stability patch: prevent Tigo optimiser quantity typing from triggering full roof/proposal redraws. */
(function(){
  const VERSION = 'v58';
  const $ = id => document.getElementById(id);
  function debounce(fn, wait){
    let t=null;
    return function(){
      const args=arguments, ctx=this;
      clearTimeout(t);
      t=setTimeout(()=>fn.apply(ctx,args), wait);
    };
  }
  const refreshAfterTigo = debounce(function(){
    try{ if(typeof quote === 'function') quote(); }catch(e){}
    try{ if(typeof renderPanelSenseCheck === 'function') renderPanelSenseCheck(); }catch(e){}
    try{ if(typeof refreshPresent === 'function' && ['present','agreement'].some(id => document.getElementById(id)?.classList.contains('on'))) refreshPresent(); }catch(e){}
    try{ if(typeof updateConsultationProof === 'function') updateConsultationProof(); }catch(e){}
    try{ if(typeof updateAgreementSummary === 'function') updateAgreementSummary(); }catch(e){}
    try{ if(typeof renderReadiness === 'function') renderReadiness(); }catch(e){}
    try{ if(typeof save === 'function') save(); }catch(e){}
  }, 450);

  function bindTigoStability(){
    const qty = $('tigoQty');
    const tigo = $('tigo');
    if(qty && !qty.dataset.v58Stable){
      qty.dataset.v58Stable='yes';
      qty.addEventListener('input', function(){
        qty.dataset.manual='yes';
        qty.dataset.auto='';
        if(tigo) tigo.checked = (Number(qty.value || 0) > 0);
        refreshAfterTigo();
      }, true);
      qty.addEventListener('change', function(){
        qty.dataset.manual='yes';
        qty.dataset.auto='';
        if(tigo) tigo.checked = (Number(qty.value || 0) > 0);
        refreshAfterTigo();
      }, true);
    }
    if(tigo && !tigo.dataset.v58Stable){
      tigo.dataset.v58Stable='yes';
      tigo.addEventListener('change', function(){
        if(qty && tigo.checked && qty.value === '') qty.value = '0';
        refreshAfterTigo();
      }, true);
    }
    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindTigoStability);
  else bindTigoStability();
})();
