const KEY='tlgec_survey_v24_draft'; const SURVEYS_KEY='tlgec_survey_v24_saved';
let selectedFiles=[]; let currentSavedId=null; let signatureData=''; let signaturePadDirty=false;
const ids=['customerName','surveyDate','address','phone','email','decisionMakers','competitors','mondayId','leadSource','appointmentTime','crmStatus','crmNotes','preInterest','preUsage','promisesMade','crmPaste','wants','whyNow','roof','roof1Name','roof1Width','roof1Slope','roof1Pitch','roof1Azimuth','roof2Name','roof2Width','roof2Slope','roof2Pitch','roof2Azimuth','dims','shade','batteryLoc','invLoc','meter','cable','access','annualKwh','dailyKwh','tariff','peak','offpeak','annualSpend','paybackNightRate','miles','exportRate','solarSelfUsePct','panelModel','panelCount','systemOverride','framingSelection','tigoPrice','batteryBrand','sigBatteryModel','sigModuleQty','sigBatteryOnlyController','pw3Price','gatewayPrice','dcPrice','teslaDiscounts','sigController','sigControllerOverride','sigGatewayPrice','sig6Qty','sig10Qty','sig6Price','sig10Price','scaffoldLifts','zappiPrice','manualDiscount','commercialNote','acceptanceNote','nextAction','followUp','confidence','gut'];
const checks=['heatPump','highEvening','backupNeeded','askBill','askDecisionMaker','askCompetitors','askTiming','askBackup','askBudget','solar','battery','ev','tigo','bird','spds','pw3','gateway','dcExp','sigGateway'];
function $(x){return document.getElementById(x)}
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

function money(n){return '£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0})}
function panelParts(){let [name,watt,dim,weight]=($('panelModel').value||'AIKO 540W|540||').split('|');return {name,watt:+watt,dim,weight}}
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
function load(){let raw=localStorage.getItem(KEY);if(raw){try{let d=JSON.parse(raw);ids.forEach(i=>{if($(i))$(i).value=d[i]||''});checks.forEach(i=>{if($(i))$(i).checked=!!d[i]}); if(d.acceptance)$('acceptanceStamp').innerText=d.acceptance; currentSavedId=d.currentSavedId||null; signatureData=d.signatureData||''; setRoofPlanes(d.roofPlanes||[]);}catch(e){}}if(!document.querySelector('.roofPlaneRow')) setRoofPlanes([]);if(!$('surveyDate').value)$('surveyDate').value=today();if(!$('nextAction').value)$('nextAction').value='Send formal quote';if($('customerName').value && $('saveName')) $('saveName').value=$('customerName').value;render();updateSigPreview();refreshPresent();renderSavedList();renderHomeSavedList();updateSaveStatus()}
function syncUsage(changed){let a=parseFloat($('annualKwh').value||0), d=parseFloat($('dailyKwh').value||0);if(changed==='annual' && a>0)$('dailyKwh').value=(a/365).toFixed(1);if(changed==='daily' && d>0)$('annualKwh').value=Math.round(d*365)}
function recommendBattery(){let k=parseFloat($('annualKwh').value||0), daily=parseFloat($('dailyKwh').value||0), hp=$('heatPump').checked, ev=$('ev').checked, backup=$('backupNeeded').checked;let txt='Enter annual or daily usage to guide battery sizing.';if(k||daily){if(!daily)daily=k/365;if(!k)k=daily*365;let rec='';if(daily<10)rec='Sigenergy 6.0 or Sigenergy 10.0.';else if(daily<18)rec='Sigenergy 10.0 as the clean default, or Powerwall 3 if Tesla/backup route is preferred.';else if(daily<28)rec='Powerwall 3 or 2 x Sigenergy 10.0.';else rec='Powerwall 3 + DC Expansion, or a larger Sigenergy stack.';if(ev||hp)rec+=' EV/heat pump usage may justify stepping up storage once the load profile is reviewed.';if(backup)rec+=' Backup requirement pushes the design toward a Gateway/backup-capable route.';txt=`Guide: ${rec} Average use is about ${daily.toFixed(1)} kWh/day (${Math.round(k)} kWh/year).`;}$('batteryGuide').textContent=txt;save()}
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
    let hasPW3=$('pw3').checked, hasGateway=$('gateway').checked, hasExpansion=$('dcExp').checked;
    if(hasPW3){cost+=4075;text='Tesla Powerwall 3';}
    if(hasGateway){cost+=680;text += ' + Gateway';}
    if(hasExpansion){cost+=3275;text += ' + DC Expansion';}
    cost-=num($('teslaDiscounts').value);
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

  let carriage = (kWp()>8 || ((num($('sigModuleQty')?.value||0)>1)||(num($('sig6Qty')?.value||0)+num($('sig10Qty')?.value||0)>1)) || $('dcExp').checked) ? PRICE_GUIDE.carriage*2 : PRICE_GUIDE.carriage;
  let logistics = carriage;
  let access = scaffoldCost($('scaffoldLifts').value,hasSolar);
  let other = PRICE_GUIDE.otherCosts;

  let spds = $('spds').checked ? PRICE_GUIDE.spdSingle : 0;
  let sundries = spds;
  let bird = (hasSolar && $('bird').checked) ? panelCount*PRICE_GUIDE.birdPerPanel : 0;
  let ev = $('ev').checked ? (num($('zappiPrice').value)||PRICE_GUIDE.evCharger) : 0;
  let optional = bird+ev;

  let totalCost = keyMaterials+labour+logistics+access+other+sundries+optional;
  let discount=num($('manualDiscount').value);
  let calculatedTotal = totalCost*(1+PRICE_GUIDE.markup+PRICE_GUIDE.salesCommission+PRICE_GUIDE.marketing)-discount;
  let override=num($('systemOverride').value);
  let total = override>0 ? override : calculatedTotal;

  return {panels,optimisers,framing,inverter,battery,batteryText:batteryObj.text,controllerText:batteryObj.controllerText,scaff:access,ev,discount,total,totalCost,calculatedTotal,override,spds,bird,keyMaterials,labour,logistics,access,other,sundries,optional,kWp:kWp(),panel:panelParts(),sigNominal:sigStorage().toFixed(2),sigUsable:sigUsable().toFixed(2),framingSelection:frame};
}
function calculate(){let q=quote();let overrideText=q.override>0?'Approved override used. Included items are listed without cost breakdown.':'Calculated from Residential Pricing V8.6 logic.';$('quoteTotal').innerHTML=`<b>Total: ${money(q.total)}</b><br>${overrideText}<br>${$('panelCount').value||0} x ${q.panel.name}, ${q.kWp} kWp<br>Battery: ${q.batteryText}<br>${q.controllerText?('Controller: '+q.controllerText+'<br>'):''}Bird protection: ${$('bird').checked&&$('solar').checked?'Included':'Not included'} | SPDs: ${$('spds').checked?'Included':'Not included'} | Scaffold: ${$('scaffoldLifts').value||0} lift(s) included`;refreshPresent();save()}






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
    let total=0;
    if($('pw3')?.checked) total+=13.5;
    if($('dcExp')?.checked) total+=13.5;
    return total;
  }
  if(brand==='Sigenergy'){
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

function refreshPresent(){
  const q=quote(), p=panelParts();
  if($('presentVisuals')) $('presentVisuals').innerHTML=customerVisuals();
  if($('batteryImagePanel')) $('batteryImagePanel').innerHTML=customerBatteryImageHTML();
  const included=cleanIncludedList();
  const customer=$('customerName')?.value||'Customer';
  const aim=$('wants')?.value||'Lower bills and better energy control';
  $('presentSummary').innerHTML=`<div class="customerIntro"><span>Recommended for</span><b>${customer}</b><p>${aim}</p></div>
  <div class="summaryGrid">
    <div class="summaryItem"><b>Solar PV</b><span>${$('solar')?.checked?`${$('panelCount')?.value||0} x ${p.name}, ${q.kWp} kWp`:'Not included'}</span></div>
    <div class="summaryItem"><b>Battery</b><span>${customerBatteryTitle()}</span></div>
    <div class="summaryItem"><b>Storage</b><span>${customerBatteryStorageText()}</span></div>
    <div class="summaryItem"><b>EV charger</b><span>${$('ev')?.checked?'Included':'Not included'}</span></div>
  </div>
  <div class="includedBox"><b>Included in this recommendation</b><ul>${included.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  ${cleanCommercialLine()}
  <p class="nextStepClean">Next step: prepare the formal quote for review and e-signing.</p>`;
  if(typeof renderPaybackSummary==='function') renderPaybackSummary();
  render();
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
Sig storage: ${q.sigNominal} kWh nominal / ${q.sigUsable} kWh usable
Sigenergy controller/PV inverter: ${q.controllerText||''}
Scaffold: ${d.scaffoldLifts} lift(s) included
EV: ${d.ev?'Zappi':'No'}
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
  $('appTitle').textContent = name ? `Survey Sync - ${name}` : 'Survey Sync';
  let bits=[];
  if(address) bits.push(`<span>${address}</span>`);
  if(phone) bits.push(`<a href="tel:${cleanTel(phone)}">${phone}</a>`);
  if(email) bits.push(`<a href="mailto:${email}">${email}</a>`);
  $('headerContact').innerHTML = bits.length ? bits.join('<span class="dotSep">•</span>') : 'No customer loaded';
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
function importMondayCSV(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    const rows=parseCSV(reader.result);
    if(rows.length<2){$('importStatus').innerText='No rows found in the CSV.';return}
    let obj={};
    const h0=(rows[0][0]||'').trim().toLowerCase(), h1=(rows[0][1]||'').trim().toLowerCase();
    if(h0==='field' && h1==='value'){
      rows.slice(1).forEach(r=>{if(r[0]) obj[r[0].trim()]=r.slice(1).join(',').trim();});
    } else {
      const headers=rows[0].map(h=>h.trim());
      const dataRows=rows.slice(1).filter(r=>r.some(x=>(x||'').trim()));
      let chosen=dataRows[0];
      const current=($('customerName').value||'').toLowerCase();
      if(current){ const match=dataRows.find(r=>r.join(' ').toLowerCase().includes(current)); if(match) chosen=match; }
      headers.forEach((h,i)=>obj[h]=chosen[i]||'');
    }
    applyCRMObject(obj,file.name);
  };
  reader.readAsText(file);
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
  $('importStatus').innerText=`Imported pre-survey data from ${sourceLabel}. Check the fields before the survey.`;
  save();
}
function importPastedCRM(){
  const text=$('crmPaste')?.value||'';
  if(!text.trim()){alert('Paste the monday CSV text first.');return;}
  const rows=parseCSV(text.trim());
  if(!rows.length){$('importStatus').innerText='Could not read the pasted CSV text.';return;}
  let obj={};
  const h0=(rows[0][0]||'').trim().toLowerCase(), h1=(rows[0][1]||'').trim().toLowerCase();
  if(h0==='field' && h1==='value'){
    rows.slice(1).forEach(r=>{if(r[0]) obj[r[0].trim()]=r.slice(1).join(',').trim();});
  } else {
    const headers=rows[0].map(h=>h.trim());
    const chosen=rows.slice(1).find(r=>r.some(x=>(x||'').trim()))||[];
    headers.forEach((h,i)=>obj[h]=chosen[i]||'');
  }
  applyCRMObject(obj,'pasted monday text');
}


async function updateApp(){
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs){await r.unregister();}
    }
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    alert('App cache cleared. The latest version will now reload.');
    location.reload(true);
  }catch(e){alert('Could not fully clear cache. Try closing and reopening the browser.');}
}
function panelVisualHTML(count){
  const n=Math.max(0,Math.min(parseInt(count||0),24));
  let cells='';
  for(let i=0;i<n;i++) cells+='<div class="miniPanel"></div>';
  return cells || '<div class="hint">No solar panels selected</div>';
}
function customerVisuals(){
  const q=quote(), p=panelParts(), brand=$('batteryBrand').value;
  let batteryBadge=brand==='Tesla'?'<span class="brandBadge brandTesla">TESLA</span>':brand==='Sigenergy'?'<span class="brandBadge brandSig">Sigenergy</span>':'<span class="brandBadge brandAiko">Battery storage</span>';
  let storage=brand==='Sigenergy'?q.sigUsable:brand==='Tesla'?'13.5':'0';
  let storageLabel=brand==='Sigenergy'?'usable SigenStor storage':brand==='Tesla'?'Powerwall storage per unit':'battery storage';
  return `<div class="visualCard"><h3>Solar array</h3><span class="brandBadge brandAiko">${p.name||'Solar PV'}</span><div class="panelStack">${panelVisualHTML($('panelCount').value)}</div><div class="summaryGrid"><div class="summaryItem"><b>${$('panelCount').value||0} panels</b><span>${p.name}</span></div><div class="summaryItem"><b>${q.kWp} kWp</b><span>Proposed array size</span></div></div></div>
  <div class="visualCard"><h3>Storage and control</h3>${batteryBadge}<div class="bigMetric">${storage} kWh</div><div class="metricLabel">${storageLabel}</div><div class="summaryGrid"><div class="summaryItem"><b>${$('ev').checked?'EV included':'EV not included'}</b><span>Zappi option</span></div><div class="summaryItem"><b>${$('scaffoldLifts').value||0} lift(s)</b><span>Scaffold allowance</span></div></div></div>`;
}


function customerBatteryTitle(){
  const brand=$('batteryBrand')?.value||'None';
  if(brand==='Tesla'){
    const parts=[];
    if($('pw3')?.checked) parts.push('Powerwall 3');
    if($('gateway')?.checked) parts.push('Backup Gateway');
    if($('dcExp')?.checked) parts.push('DC Expansion');
    return parts.length ? parts.join(' + ') : 'Tesla Powerwall 3';
  }
  if(brand==='Sigenergy'){
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
    let units=0;
    if($('pw3')?.checked) units+=1;
    if($('dcExp')?.checked) units+=1;
    const kwh=units*13.5;
    return kwh ? `${kwh.toFixed(1)} kWh storage` : '13.5 kWh storage';
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
  return `<div class="visualCard solarVisual"><h3>Your solar array</h3><span class="brandBadge brandAiko">${p.name||'Solar PV'}</span><div class="panelStack">${panelVisualHTML($('panelCount')?.value)}</div><div class="summaryGrid"><div class="summaryItem"><b>${$('panelCount')?.value||0} panels</b><span>${p.name}</span></div><div class="summaryItem"><b>${q.kWp} kWp</b><span>Proposed system size</span></div></div></div>
  <div class="visualCard"><h3>Battery storage</h3><span class="brandBadge ${brand==='Tesla'?'brandTesla':brand==='Sigenergy'?'brandSig':'brandAiko'}">${brand==='None'?'Storage':brand}</span><div class="bigMetric">${customerBatteryStorageText().split(' ')[0]}</div><div class="metricLabel">${customerBatteryStorageText()}</div><div class="summaryGrid"><div class="summaryItem"><b>${$('ev')?.checked?'EV charger included':'EV charger not included'}</b><span>Zappi option</span></div><div class="summaryItem"><b>${$('solar')?.checked?'Bird protection included':'No solar roof works'}</b><span>Solar protection</span></div></div></div>`;
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
  if($('ev')?.checked) items.push('Zappi EV charger');
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
    $('homeSavedList').innerHTML='<div class="emptyState"><b>No saved surveys yet</b><p>Tap New survey, complete the customer details, then save it from Internal.</p></div>';
    return;
  }
  $('homeSavedList').innerHTML=list.map(s=>`<div class="savedCard homeCard"><b>${s.customerName||s.name||'Untitled survey'}</b><div class="savedMeta">${s.address||''}<br>${s.phone?`<a href="tel:${cleanTel(s.phone)}">${s.phone}</a>`:''}${s.email?` • <a href="mailto:${s.email}">${s.email}</a>`:''}<br>Updated ${new Date(s.updatedAt).toLocaleString()}${s.quote&&s.quote.total?` • ${money(s.quote.total)}`:''}</div><div class="savedActions"><button class="primaryMini" data-home-load="${s.id}">Open survey</button><button data-home-duplicate="${s.id}">Duplicate</button><button data-home-delete="${s.id}">Delete</button></div></div>`).join('');
  document.querySelectorAll('[data-home-load]').forEach(b=>b.onclick=()=>{loadSavedSurvey(b.dataset.homeLoad); switchTab('customer');});
  document.querySelectorAll('[data-home-duplicate]').forEach(b=>b.onclick=()=>duplicateSavedSurvey(b.dataset.homeDuplicate));
  document.querySelectorAll('[data-home-delete]').forEach(b=>b.onclick=()=>deleteSavedSurvey(b.dataset.homeDelete));
}

document.addEventListener('DOMContentLoaded',()=>{load();initSignaturePad();
document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{if(el.id==='annualKwh')syncUsage('annual');if(el.id==='dailyKwh')syncUsage('daily');if(el.id==='customerName'&&$('saveName')&&!$('saveName').value)$('saveName').value=el.value;if(el.id==='solar'&&el.checked){if($('bird'))$('bird').checked=true;if($('spds'))$('spds').checked=true;}save()}));
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));b.classList.add('on');$(b.dataset.tab).classList.add('on')});
document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{let target=$(b.parentElement.dataset.target);target.value=target.value?target.value+', '+b.textContent:b.textContent;save()});
$('batteryGuideBtn').onclick=recommendBattery;$('calcQuote').onclick=calculate;$('refreshPresent').onclick=refreshPresent;
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
if($('mondayImport'))$('mondayImport').onchange=e=>importMondayCSV((e.target.files||[])[0]);
if($('importPastedCRM'))$('importPastedCRM').onclick=importPastedCRM;
if($('newSurveyTop'))$('newSurveyTop').onclick=clearCurrentSurvey;
if($('newSurveySaved'))$('newSurveySaved').onclick=clearCurrentSurvey;
if($('updateApp'))$('updateApp').onclick=updateApp;
if($('homeUpdateApp'))$('homeUpdateApp').onclick=updateApp;
if($('homeNewSurvey'))$('homeNewSurvey').onclick=clearCurrentSurvey;
if($('homeContinueDraft'))$('homeContinueDraft').onclick=()=>switchTab('customer');
if($('homeSaveCurrent'))$('homeSaveCurrent').onclick=()=>{saveCurrentSurvey();renderHomeSavedList();};
if($('addRoofPlane'))$('addRoofPlane').onclick=()=>{addRoofPlane({});save()};
if($('saveAndNew'))$('saveAndNew').onclick=saveAndStartNew;
$('reset').onclick=()=>{if(confirm('Clear local survey?')){localStorage.removeItem(KEY);location.reload()}};
$('filesInput').onchange=e=>{selectedFiles=Array.from(e.target.files||[]);$('preview').innerHTML='';selectedFiles.forEach(f=>{if(f.type.startsWith('image/')){let img=document.createElement('img');img.src=URL.createObjectURL(f);$('preview').appendChild(img)}});$('fileNames').textContent=selectedFiles.map(f=>f.name).join('\n');save()};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
});
