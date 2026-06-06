const KEY='tlgec_current_draft_v1'; const SURVEYS_KEY='tlgec_surveys_saved_v1';
let selectedFiles=[]; let currentSavedId=null; let signatureData=''; let signaturePadDirty=false;
const ids=['customerName','surveyDate','address','phone','email','decisionMakers','competitors','mondayId','leadSource','appointmentTime','crmStatus','crmNotes','preInterest','preUsage','promisesMade','crmPaste','wants','whyNow','roof','roof1Name','roof1Width','roof1Slope','roof1Pitch','roof1Azimuth','roof2Name','roof2Width','roof2Slope','roof2Pitch','roof2Azimuth','dims','shade','batteryLoc','invLoc','meter','cable','access','photoNotes','siteRiskNotes','annualKwh','dailyKwh','tariff','peak','offpeak','annualSpend','paybackNightRate','miles','exportRate','solarSelfUsePct','panelModel','panelCount','systemOverride','framingSelection','tigoPrice','batteryBrand','sigBatteryModel','sigModuleQty','sigBatteryOnlyController','teslaSaleType','pw3Qty','dcExpQty','pw3Price','gatewayPrice','dcPrice','teslaDiscounts','sigController','sigControllerOverride','sigGatewayPrice','sig6Qty','sig10Qty','sig6Price','sig10Price','scaffoldLifts','zappiPrice','eddiPrice','otherExtraName','otherExtraPrice','extrasNote','manualDiscount','commercialNote','acceptanceNote','nextAction','followUp','confidence','gut','salesStatus','mainBlocker','customerLikelihood','blockerReason'];
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
      <label>Panels here<input class="roofPanels" type="number" inputmode="numeric" value="${data.panels||''}"></label>
    </div>`;
  box.appendChild(div);
  div.querySelectorAll('input').forEach(el=>el.addEventListener('input',save));
  div.querySelector('.removeRoof').onclick=()=>{div.remove();renumberRoofPlanes();save()};
}
function renumberRoofPlanes(){document.querySelectorAll('.roofPlaneRow').forEach((r,i)=>{let b=r.querySelector('.roofRowHead b'); if(b)b.textContent=`Roof/elevation ${i+1}`})}
function roofLines(){
  const planes=getRoofPlanes();
  if(!planes.length)return 'None captured';
  return planes.map((r,i)=>`${i+1}. ${r.name||'Roof'}: width ${r.width||'?'} m, slope ${r.slope||'?'} m, pitch ${r.pitch||'?'}°, azimuth ${r.azimuth||'?'}°, panels ${r.panels||'not allocated'}`).join('\n');
}

function getData(){let d={};ids.forEach(i=>d[i]=$(i)?.value||'');checks.forEach(i=>d[i]=$(i)?.checked||false);d.scope=scope();d.flags=flags();d.files=selectedFiles.map(f=>f.name);d.roofPlanes=getRoofPlanes();d.batteryGuide=$('batteryGuide').textContent;d.quote=quote();d.present=$('presentSummary').innerText||'';d.acceptance=$('acceptanceStamp').innerText||'';d.signatureData=signatureData;d.currentSavedId=currentSavedId;return d}
function save(){localStorage.setItem(KEY,JSON.stringify(getData()));render();renderSavedList();renderHomeSavedList()}
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
  if(!$('sigBatteryOnlyController')) return 0;
  let ctrl=$('sigBatteryOnlyController').value.split('|');
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
      controllerText=($('sigBatteryOnlyController')?.value||'0|None').split('|')[1]||'None';
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
  let optimisers = hasSolar && $('tigo').checked ? panelCount*(num($('tigoPrice').value)||30) : 0;
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

  return {panels,optimisers,framing,inverter,battery,batteryText:batteryObj.text,controllerText:batteryObj.controllerText,scaff:access,ev,eddi,otherExtra,extras,extrasText,discount,total,totalCost,calculatedTotal,override,spds,bird,keyMaterials,labour,logistics,access,other,sundries,optional,kWp:kWp(),panel:panelParts(),sigNominal:sigStorage().toFixed(2),sigUsable:sigUsable().toFixed(2),framingSelection:frame};
}
function calculate(){let q=quote();let overrideText=q.override>0?'Approved override used. Included items are listed without cost breakdown.':'Calculated from Residential Pricing V8.6 logic.';if($('quoteTotal'))$('quoteTotal').innerHTML=`<b>Total: ${money(q.total)}</b><br>${overrideText}<br>${$('panelCount').value||0} x ${q.panel.name}, ${q.kWp} kWp<br>Battery: ${q.batteryText}<br>${q.controllerText?('Controller: '+q.controllerText+'<br>'):''}Bird protection: ${$('bird').checked&&$('solar').checked?'Included':'Not included'} | SPDs: ${$('spds').checked?'Included':'Not included'} | Scaffold: ${$('scaffoldLifts').value||0} lift(s) included<br>Extras: ${q.extrasText||'No manual extras selected'}`;try{renderPanelSenseCheck()}catch(e){}refreshPresent();save()}






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
  const invLoc=($('invLoc')?.value||'Inverter/controller location to be confirmed.');
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
Inverter/controller location: ${d.invLoc}
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
Tigo: ${d.tigo?'Yes at £'+d.tigoPrice+' per panel':'No'}
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
Tigo: ${d.tigo?'Yes':'No'}
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
    if($('tigo')?.checked) items.push('Tigo optimisation');
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

document.addEventListener('DOMContentLoaded',()=>{bindCriticalButtons();migrateOldStorageKeys();if($('appVersionBadge'))$('appVersionBadge').innerText='App version: v48';load();initSignaturePad();
document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{if(el.id==='annualKwh')syncUsage('annual');if(el.id==='dailyKwh')syncUsage('daily');if(el.id==='customerName'&&$('saveName')&&!$('saveName').value)$('saveName').value=el.value;if(el.id==='solar'&&el.checked){if($('bird'))$('bird').checked=true;if($('spds'))$('spds').checked=true;}if(['annualKwh','dailyKwh','heatPump','highEvening','backupNeeded','ev','wants','preInterest'].includes(el.id))recommendBattery(false);if(['teslaSaleType','pw3Qty','dcExpQty','gateway','pw3Price','gatewayPrice','dcPrice','teslaDiscounts','batteryBrand'].includes(el.id))syncTeslaOptions();if(['ev','wants','preInterest'].includes(el.id))toggleConditionalFields();save()}));
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
  const VERSION = 'v48';
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
  const VERSION = 'v48';
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
    ['invLoc','Inverter/controller location'],
    ['cable','Cable route'],
    ['access','Access / scaffold notes'],
    ['photoRoofFront','Roof front/access photo ticked', () => checked('photoRoofFront')],
    ['photoRoofRear','Roof rear/main plane photo ticked', () => checked('photoRoofRear')],
    ['photoMeter','Meter photo ticked', () => checked('photoMeter')],
    ['photoCU','Consumer unit photo ticked', () => checked('photoCU')],
    ['photoFuse','Incoming supply/fuse photo ticked', () => checked('photoFuse')],
    ['photoBatteryLoc','Battery location photo ticked', () => checked('photoBatteryLoc')],
    ['photoInverterLoc','Inverter/controller location photo ticked', () => checked('photoInverterLoc')],
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
    const inverter = val('invLoc') || 'Inverter/controller location not yet captured';
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
        ['Inverter/controller location', checked('photoInverterLoc')],
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
      if(e.target && (e.target.matches('input, textarea, select') || e.target.closest('#roofPlanes'))){
        renderReadiness();
        updateAgreementSummary();
      }
    }, true);
    document.addEventListener('change', e => {
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


/* v41 panel-first roof sense check and manual extras */
(function(){
  const VERSION = 'v48';
  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').toString().trim();
  const num = v => Number(v || 0) || 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  function panelDimsM(){
    let dim = '';
    try{ dim = (typeof panelParts === 'function' ? panelParts().dim : '') || ''; }catch(e){}
    const found = dim.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if(!found) return {long:1.762, short:1.134, text:'1762 x 1134 mm assumed'};
    const a = Number(found[1]) / 1000;
    const b = Number(found[2]) / 1000;
    return {long:Math.max(a,b), short:Math.min(a,b), text:dim};
  }

  function bestLayoutFor(n, roofW, roofS, across, up, margin){
    const gap = 0.02;
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

  function capacity(roofW, roofS, across, up, margin){
    const gap = 0.02;
    const availW = Math.max(0, roofW - (margin * 2));
    const availS = Math.max(0, roofS - (margin * 2));
    const cols = Math.max(0, Math.floor((availW + gap) / (across + gap)));
    const rows = Math.max(0, Math.floor((availS + gap) / (up + gap)));
    return {cols, rows, count:cols*rows};
  }

  function checkPlane(plane, panels, dims){
    const roofW = num(plane.width);
    const roofS = num(plane.slope);
    const name = plane.name || 'Roof';
    if(!roofW || !roofS){
      return {level:'warn', html:`<div class="senseItem senseWarn"><b>${esc(name)}</b><p>Add roof width and slope length to sense check this elevation.</p></div>`};
    }

    const orientations = [
      {name:'portrait', across:dims.short, up:dims.long},
      {name:'landscape', across:dims.long, up:dims.short}
    ];

    if(!panels){
      const cap = orientations.map(o => {
        const c400 = capacity(roofW, roofS, o.across, o.up, 0.4);
        const c150 = capacity(roofW, roofS, o.across, o.up, 0.15);
        return `${o.name}: ${c400.count} panels with preferred 400 mm margins, ${c150.count} panels with tight 150 mm margins`;
      }).join('<br>');
      return {level:'warn', html:`<div class="senseItem senseWarn"><b>${esc(name)}</b><p>No panel allocation entered for this roof. Capacity guide only:</p><p>${cap}</p></div>`};
    }

    const results = orientations.map(o => ({
      ...o,
      preferred: bestLayoutFor(panels, roofW, roofS, o.across, o.up, 0.4),
      tight: bestLayoutFor(panels, roofW, roofS, o.across, o.up, 0.15),
      raw: bestLayoutFor(panels, roofW, roofS, o.across, o.up, 0)
    }));

    let chosen = results.find(r => r.preferred.fits) || results.find(r => r.tight.fits) || results.find(r => r.raw.fits) || results[0];
    let status = 'Does not look to fit from the entered dims';
    let cls = 'senseBad';
    let note = 'Review roof dimensions, margins, split across elevations or reduce panel count.';
    let layout = chosen.preferred;
    if(chosen.preferred.fits){
      status = 'Looks sensible with preferred 400 mm margins';
      cls = 'senseGood';
      note = 'Still subject to measured survey, fixing positions and obstruction clearance.';
      layout = chosen.preferred;
    }else if(chosen.tight.fits){
      status = 'Likely tight. Reduced margins may be needed';
      cls = 'senseWarn';
      note = 'Treat as a survey target only. Flag reduced edge margins and check rail/fixing positions.';
      layout = chosen.tight;
    }else if(chosen.raw.fits){
      status = 'Borderline. Fits only before proper margins';
      cls = 'senseWarn';
      note = 'Do not rely on this without a measured layout. Consider fewer panels or another roof plane.';
      layout = chosen.raw;
    }

    const rowsCols = `${layout.cols} col x ${layout.rows} row`;
    return {level:cls.includes('Bad')?'bad':cls.includes('Warn')?'warn':'good', html:`<div class="senseItem ${cls}">
      <b>${esc(name)}: ${panels} panel${panels===1?'':'s'} ${esc(chosen.name)}</b>
      <p>${status}</p>
      <p>Roof ${roofW.toFixed(2)} m wide x ${roofS.toFixed(2)} m slope. Indicative array ${layout.arrW.toFixed(2)} m x ${layout.arrS.toFixed(2)} m, ${rowsCols}.</p>
      <p>${note}</p>
    </div>`};
  }

  function renderPanelSenseCheck(){
    const box = $('panelSenseCheck');
    if(!box) return null;
    let planes = [];
    try{ planes = typeof getRoofPlanes === 'function' ? getRoofPlanes() : []; }catch(e){}
    const totalPanels = num(val('panelCount'));
    const dims = panelDimsM();

    if(!planes.length){
      box.innerHTML = '<div class="senseItem senseWarn"><b>No roof dimensions yet</b><p>Add roof width and slope length in Site, then run the sense check. This will not block the survey.</p></div>';
      return null;
    }

    const allocated = planes.reduce((sum,r)=>sum+num(r.panels),0);
    let checkPlanes = planes.map((r,i) => {
      let p = num(r.panels);
      if(!allocated && planes.length === 1) p = totalPanels;
      return checkPlane(r, p, dims);
    });

    const issues = checkPlanes.filter(x => x.level !== 'good').length;
    const summary = `<div class="senseSummary ${issues?'senseWarn':'senseGood'}">
      <b>Panel-first sense check</b>
      <p>Using ${esc((typeof panelParts === 'function' ? panelParts().name : 'selected panel') || 'selected panel')} dimensions: ${esc(dims.text)}. Preferred margin check is 400 mm. Tight check is 150 mm. This is advisory only and does not block the survey.</p>
      ${allocated ? `<p>${allocated} panel${allocated===1?'':'s'} allocated across roof elevations. Build panel count is ${totalPanels || 0}.</p>` : `<p>${totalPanels || 0} panel${totalPanels===1?'':'s'} in build. Add “panels here” on each roof for a better split check.</p>`}
    </div>`;

    box.innerHTML = summary + checkPlanes.map(x=>x.html).join('');
    return {issues, allocated, totalPanels, text:box.innerText};
  }

  function syncPanelSenseEvents(){
    const ids = ['panelModel','panelCount','solar'];
    ids.forEach(id => {
      const el = $(id);
      if(el && !el.dataset.v41Sense){
        el.dataset.v41Sense='yes';
        el.addEventListener('input', renderPanelSenseCheck);
        el.addEventListener('change', renderPanelSenseCheck);
      }
    });

    document.querySelectorAll('.roofPlaneRow input').forEach(el => {
      if(el.dataset.v41Sense) return;
      el.dataset.v41Sense='yes';
      el.addEventListener('input', () => {
        try{
          const total = Array.from(document.querySelectorAll('.roofPanels')).reduce((sum,input)=>sum + num(input.value),0);
          if(total > 0 && $('panelCount')) $('panelCount').value = total;
        }catch(e){}
        renderPanelSenseCheck();
      });
      el.addEventListener('change', renderPanelSenseCheck);
    });
  }

  function customerExtrasListV40(){
    const items=[];
    if($('ev')?.checked) items.push('Zappi EV charger');
    if($('eddi')?.checked) items.push('Eddi / hot water diverter');
    if($('otherExtra')?.checked) items.push((val('otherExtraName') || 'Other extra'));
    return items;
  }

  // Keep extras wording available even if earlier functions loaded before v41.
  window.customerExtrasList = customerExtrasListV40;
  window.customerExtrasTitle = function(){
    const items = customerExtrasListV40();
    return items.length ? items.join(' + ') : 'No extras included';
  };
  window.renderPanelSenseCheck = renderPanelSenseCheck;

  function patchCalculateQuote(){
    const old = window.calculateQuote;
    window.calculateQuote = function(){
      const result = typeof old === 'function' ? old.apply(this, arguments) : true;
      renderPanelSenseCheck();
      const q = typeof quote === 'function' ? quote() : {};
      const box = $('quoteCheck');
      if(box && q.extrasText && !box.innerHTML.includes('Manual extras')){
        box.innerHTML += `<div class="quoteExtraLine"><b>Manual extras:</b> ${esc(q.extrasText)}</div>`;
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

Manual extras:
${q.extrasText || window.customerExtrasTitle()}
Extras notes: ${val('extrasNote')}`;
    };
  }

  function bind(){
    syncPanelSenseEvents();
    const run = $('runPanelSenseCheck');
    if(run && !run.dataset.v41Ready){
      run.dataset.v41Ready='yes';
      run.onclick = e => { e.preventDefault(); syncPanelSenseEvents(); renderPanelSenseCheck(); };
    }
    document.addEventListener('input', e => {
      if(e.target && (e.target.closest('#roofPlanes') || ['panelModel','panelCount','ev','eddi','otherExtra','eddiPrice','otherExtraName','otherExtraPrice','extrasNote'].includes(e.target.id))){
        syncPanelSenseEvents();
        renderPanelSenseCheck();
      }
    }, true);
    document.addEventListener('change', e => {
      if(e.target && (e.target.closest('#roofPlanes') || ['panelModel','panelCount','ev','eddi','otherExtra','eddiPrice','otherExtraName','otherExtraPrice','extrasNote'].includes(e.target.id))){
        syncPanelSenseEvents();
        renderPanelSenseCheck();
        try{ if(typeof refreshPresent === 'function') refreshPresent(); }catch(err){}
      }
    }, true);
    document.addEventListener('input', e => { if(e.target && ['teslaSaleType','pw3Qty','dcExpQty','gateway','pw3Price','gatewayPrice','dcPrice','teslaDiscounts'].includes(e.target.id)){ syncTeslaOptions(); try{ if(typeof save==='function') save(); }catch(err){} } }, true);

    if($('homeVersionSmall')) $('homeVersionSmall').textContent = VERSION;
    if($('appVersionBadge')) $('appVersionBadge').textContent = 'App version: ' + VERSION;
    ['calculateQuote','refreshPresent','calcQuote'].forEach(id => {
      const btn = $(id);
      if(btn && !btn.dataset.v41Extras){
        btn.dataset.v41Extras = 'yes';
        btn.addEventListener('click', () => {
          setTimeout(() => {
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
    renderPanelSenseCheck();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();


/* v43/v48: repair Continue buttons and keep bottom buttons non-sticky */
(function(){
  const VERSION = 'v48';
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


/* v48 premium guided consultation layer */
(function(){
  const VERSION = 'v48';
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


/* v48: open the Customer stage after Start new consultation reset */
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


/* v48 acceptance flow, dynamic proof cards and email draft */
(function(){
  const VERSION = 'v48';
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
    if(window.__v48RefreshPatched) return;
    window.__v48RefreshPatched = true;
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
      if(e.target && (e.target.matches('input,textarea,select') || e.target.closest('#roofPlanes'))){
        updateConsultationProof();
        syncLikelihoodButtons();
      }
    }, true);
    document.addEventListener('change', e => {
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


/* v48: polished Little Green Energy recommendation email */
(function(){
  const VERSION = 'v48';
  const LOGO_DATA_URI = "data:image/png;base64,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";
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
      'Here is your Little Green Energy survey recommendation. This is based on today’s survey guidance and remains subject to final roof, electrical, DNO and design checks before the formal paperwork is issued.',
      '',
      'UNDERSTOOD',
      `Priorities: ${d.priorities}`,
      d.reason ? `Reason for looking: ${d.reason}` : '',
      '',
      'CHECKED',
      `Roof/access: ${d.roof}`,
      `Meter/CU: ${d.meter}`,
      `Cable route: ${d.route}`,
      `Access/scaffold: ${d.access}`,
      '',
      'RIGHT-SIZED RECOMMENDATION',
      `Solar PV: ${d.solar}`,
      `Battery: ${d.battery}`,
      d.storage ? `Storage: ${d.storage}` : '',
      `Extras: ${d.extras}`,
      `Proposal position: ${d.price}`,
      d.payback,
      '',
      'PROTECTED NEXT STEP',
      d.next,
      d.concern ? `Question/change to note: ${d.concern}` : '',
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

  function buildRecommendationEmailHTML(){
    const d=recommendationData();
    const line = (label,value) => value ? `<p style="margin:7px 0;"><strong>${esc(label)}:</strong> ${esc(value)}</p>` : '';
    const understood = `${line('Priorities', d.priorities)}${line('Reason for looking', d.reason)}`;
    const checkedHtml = `${line('Roof/access', d.roof)}${line('Meter/CU', d.meter)}${line('Cable route', d.route)}${line('Access/scaffold', d.access)}`;
    const designHtml = `${line('Solar PV', d.solar)}${line('Battery', d.battery)}${line('Storage', d.storage)}${line('Extras', d.extras)}${line('Proposal position', d.price)}${line('Indicative benefit', d.payback)}`;
    const protectHtml = `<p style="margin:7px 0;">${esc(d.next)}</p>${d.concern ? line('Question/change to note', d.concern) : ''}`;
    return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f7f1;font-family:Arial,Helvetica,sans-serif;color:#0b1f18;">
  <div style="max-width:680px;margin:0 auto;padding:22px;">
    <div style="background:#ffffff;border:1px solid #dbe6de;border-radius:24px;overflow:hidden;box-shadow:0 8px 28px rgba(6,40,25,.10);">
      <div style="padding:22px 24px;background:linear-gradient(135deg,#ffffff 0%,#eef7ee 100%);border-bottom:1px solid #dbe6de;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width:76px;vertical-align:middle;">
              <img src="${LOGO_DATA_URI}" alt="The Little Green Energy Company" width="64" height="64" style="display:block;border-radius:18px;background:#ffffff;border:1px solid #e4ece5;padding:6px;">
            </td>
            <td style="vertical-align:middle;padding-left:14px;">
              <div style="font-size:13px;color:#637268;font-weight:700;">The Little Green Energy Company</div>
              <div style="font-size:28px;line-height:1.05;font-weight:900;color:#062819;">Survey recommendation</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding:26px 24px;background:linear-gradient(135deg,#06391f 0%,#0b7a46 62%,#79ac20 100%);color:#ffffff;">
        <div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#e6f4d7;">Your Little Green Energy survey recommendation</div>
        <h1 style="margin:8px 0 10px;font-size:30px;line-height:1.1;color:#ffffff;">Hi ${esc(d.first)}, here is the recommendation from today’s survey.</h1>
        <p style="margin:0;font-size:16px;line-height:1.55;color:#efffed;">Built around the home, the usage and what matters most. Subject to final roof, electrical, DNO and design checks.</p>
      </div>

      <div style="padding:22px 24px;">
        ${card('1. Understood', understood)}
        ${card('2. Checked', checkedHtml)}
        ${card('3. Right-sized', designHtml)}
        ${card('4. Protected next step', protectHtml)}

        <div style="margin-top:18px;padding:18px;border-radius:18px;background:#f0f7f0;border-left:5px solid #79ac20;">
          <strong style="display:block;font-size:17px;color:#062819;margin-bottom:6px;">What happens next</strong>
          <p style="margin:0;color:#34463c;line-height:1.55;">James will prepare the detailed proposal and paperwork for review. Nothing is treated as final installation design until the checks above are complete.</p>
        </div>

        <div style="margin-top:24px;color:#0b1f18;font-size:15px;line-height:1.5;">
          <p style="margin:0 0 4px;">Kind regards,</p>
          <p style="margin:0;font-weight:800;">James Cooling</p>
          <p style="margin:0;">The Little Green Energy Company</p>
          <p style="margin:8px 0 0;">01622 832834<br>07714292169</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  async function copyStyledRecommendationEmail(showToast){
    const html=buildRecommendationEmailHTML();
    const text=buildRecommendationEmailText();
    try{
      if(navigator.clipboard && window.ClipboardItem){
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], {type:'text/html'}),
          'text/plain': new Blob([text], {type:'text/plain'})
        })]);
      }else if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }
      if(showToast) showEmailToast('Styled recommendation copied. Paste into the email draft to keep the logo and colours.');
      return true;
    }catch(e){
      try{ if(navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text); }catch(err){}
      if(showToast) showEmailToast('Recommendation copied as plain text. The email draft is ready.');
      return false;
    }
  }

  function openRecommendationDraft(){
    const email=val('email');
    const body=buildRecommendationEmailText();
    const href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
    window.location.href=href;
  }

  function emailPreviewHTML(){
    const d=recommendationData();
    return `<div class="emailPreviewCard">
      <div class="emailPreviewHead">
        <img src="tlgec-logo.png" alt="The Little Green Energy Company logo">
        <div><span>The Little Green Energy Company</span><b>${esc(EMAIL_SUBJECT)}</b></div>
      </div>
      <div class="emailPreviewHero">
        <span>Your survey recommendation</span>
        <b>Ready for ${esc(d.first)}</b>
        <p>Styled email copied. Outlook draft opened with the address and subject ready.</p>
      </div>
      <div class="emailPreviewGrid">
        <div><b>Understood</b><small>${esc(clip(d.priorities,90))}</small></div>
        <div><b>Checked</b><small>${esc(clip(d.roof,90))}</small></div>
        <div><b>Right-sized</b><small>${esc(clip(d.solar + ' · ' + d.battery,90))}</small></div>
        <div><b>Protected</b><small>Final roof, electrical, DNO and design checks apply.</small></div>
      </div>
      <div class="emailPreviewActions">
        <button type="button" class="secondary" id="copyStyledEmailAgain">Copy styled email again</button>
        <button type="button" class="secondary" id="openRecommendationDraftAgain">Open email draft again</button>
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
        <b>👍 Thank you.</b>
        <p>Your recommendation email is prepared. A styled version with The Little Green Energy Company branding has been copied, and the email draft is opening with the address and subject ready.</p>
        <small>${esc(name)} accepted the survey guidance on ${esc(now)}. Final design checks still apply.</small>
        <div id="emailCopyNotice" class="emailCopyNotice">Preparing styled email…</div>
      </div>` + emailPreviewHTML();
    }
    try{ if(typeof save === 'function') save(); }catch(e){}
    copyStyledRecommendationEmail(false).then(ok => {
      showEmailToast(ok ? 'Styled recommendation copied. Paste into Outlook if the draft opens as plain text.' : 'Recommendation copied as plain text. The draft is ready.');
    });
    setTimeout(openRecommendationDraft, 250);
    setTimeout(bindEmailPreviewButtons, 350);
  }

  function bindEmailPreviewButtons(){
    const copy=$('copyStyledEmailAgain');
    if(copy) copy.onclick = e => { e.preventDefault(); copyStyledRecommendationEmail(true); };
    const open=$('openRecommendationDraftAgain');
    if(open) open.onclick = e => { e.preventDefault(); openRecommendationDraft(); };
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
