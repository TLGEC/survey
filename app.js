const KEY='tlgec_survey_v5';
let selectedFiles=[];
const ids=['customerName','surveyDate','address','phone','email','decisionMakers','competitors','wants','whyNow','roof','dims','shade','batteryLoc','invLoc','meter','cable','access','annualKwh','dailyKwh','tariff','peak','offpeak','annualSpend','miles','panelModel','panelCount','solarPrice','solarPerPanel','tigoPrice','birdPrice','batteryBrand','pw3Price','gatewayPrice','dcPrice','teslaDiscounts','sigController','sigControllerOverride','sigGatewayPrice','sig6Qty','sig10Qty','sig6Price','sig10Price','scaffoldLifts','scaffoldPrice','zappiPrice','manualDiscount','commercialNote','acceptedName','acceptanceNote','nextAction','followUp','confidence','gut'];
const checks=['heatPump','highEvening','backupNeeded','solar','battery','ev','tigo','bird','pw3','gateway','dcExp','sigGateway'];
function $(x){return document.getElementById(x)}
function today(){return new Date().toISOString().slice(0,10)}
function money(n){return '£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0})}
function panelParts(){let [name,watt,dim,weight]=($('panelModel').value||'AIKO 540W|540||').split('|');return {name,watt:+watt,dim,weight}}
function kWp(){let p=panelParts();return ((+($('panelCount').value||0)*p.watt)/1000).toFixed(2)}
function scope(){return [ $('solar').checked?'Solar':null,$('battery').checked?'Battery':null,$('ev').checked?'EV':null].filter(Boolean).join(', ')}
function flags(){return [ $('heatPump').checked?'Heat pump':null,$('highEvening').checked?'High evening use':null,$('backupNeeded').checked?'Backup wanted':null].filter(Boolean).join(', ')}
function sigStorage(){return (+$('sig6Qty').value||0)*6.02+(+$('sig10Qty').value||0)*9.04}
function sigUsable(){return (+$('sig6Qty').value||0)*5.84+(+$('sig10Qty').value||0)*8.76}
function getData(){let d={};ids.forEach(i=>d[i]=$(i)?.value||'');checks.forEach(i=>d[i]=$(i)?.checked||false);d.scope=scope();d.flags=flags();d.files=selectedFiles.map(f=>f.name);d.batteryGuide=$('batteryGuide').textContent;d.quote=quote();d.present=$('presentSummary').innerText||'';d.acceptance=$('acceptanceStamp').innerText||'';return d}
function save(){localStorage.setItem(KEY,JSON.stringify(getData()));render()}
function load(){let raw=localStorage.getItem(KEY);if(raw){try{let d=JSON.parse(raw);ids.forEach(i=>{if($(i))$(i).value=d[i]||''});checks.forEach(i=>{if($(i))$(i).checked=!!d[i]}); if(d.acceptance)$('acceptanceStamp').innerText=d.acceptance;}catch(e){}}if(!$('surveyDate').value)$('surveyDate').value=today();if(!$('nextAction').value)$('nextAction').value='Send formal quote';render();refreshPresent()}
function syncUsage(changed){let a=parseFloat($('annualKwh').value||0), d=parseFloat($('dailyKwh').value||0);if(changed==='annual' && a>0)$('dailyKwh').value=(a/365).toFixed(1);if(changed==='daily' && d>0)$('annualKwh').value=Math.round(d*365)}
function recommendBattery(){let k=parseFloat($('annualKwh').value||0), daily=parseFloat($('dailyKwh').value||0), hp=$('heatPump').checked, ev=$('ev').checked, backup=$('backupNeeded').checked;let txt='Enter annual or daily usage to guide battery sizing.';if(k||daily){if(!daily)daily=k/365;if(!k)k=daily*365;let rec='';if(daily<10)rec='Sigenergy 6.0 or Sigenergy 10.0.';else if(daily<18)rec='Sigenergy 10.0 as the clean default, or Powerwall 3 if Tesla/backup route is preferred.';else if(daily<28)rec='Powerwall 3 or 2 x Sigenergy 10.0.';else rec='Powerwall 3 + DC Expansion, or a larger Sigenergy stack.';if(ev||hp)rec+=' EV/heat pump usage may justify stepping up storage once the load profile is reviewed.';if(backup)rec+=' Backup requirement pushes the design toward a Gateway/backup-capable route.';txt=`Guide: ${rec} Average use is about ${daily.toFixed(1)} kWh/day (${Math.round(k)} kWh/year).`;}$('batteryGuide').textContent=txt;save()}
function quote(){let solarManual=+$('solarPrice').value||0;let solarAuto=(+$('panelCount').value||0)*(+$('solarPerPanel').value||125);let solar=solarManual||solarAuto;let tigo=$('tigo').checked?(+$('panelCount').value||0)*(+$('tigoPrice').value||30):0;let bird=$('bird').checked?(+$('birdPrice').value||0):0;let battery=0, batteryText='None';if($('batteryBrand').value==='Tesla'){batteryText='Tesla'; if($('pw3').checked)battery+=+$('pw3Price').value||0; if($('gateway').checked)battery+=+$('gatewayPrice').value||0; if($('dcExp').checked)battery+=+$('dcPrice').value||0; battery-=+$('teslaDiscounts').value||0;}if($('batteryBrand').value==='Sigenergy'){let ctrl=$('sigController').value.split('|');let ctrlPrice=+$('sigControllerOverride').value||(+ctrl[0]||0);batteryText=`Sigenergy ${ctrl[1]||''}`;battery+=ctrlPrice; if($('sigGateway').checked)battery+=+$('sigGatewayPrice').value||0; battery+=(+$('sig6Qty').value||0)*(+$('sig6Price').value||0); battery+=(+$('sig10Qty').value||0)*(+$('sig10Price').value||0);}let scaff=(+$('scaffoldLifts').value||0)*(+$('scaffoldPrice').value||975);let ev=$('ev').checked?(+$('zappiPrice').value||0):0;let discount=+$('manualDiscount').value||0;let total=solar+tigo+bird+battery+scaff+ev-discount;return {solar,tigo,bird,battery,batteryText,scaff,ev,discount,total,kWp:kWp(),panel:panelParts(),sigNominal:sigStorage().toFixed(2),sigUsable:sigUsable().toFixed(2)}}
function calculate(){let q=quote();$('quoteTotal').innerHTML=`<b>Total: ${money(q.total)}</b><br>Solar ${money(q.solar)} | Tigo ${money(q.tigo)} | Battery ${money(q.battery)} | Scaffold ${money(q.scaff)} | EV ${money(q.ev)} | Discount -${money(q.discount)}<br>${$('panelCount').value||0} x ${q.panel.name}, ${q.kWp} kWp`;refreshPresent();save()}
function refreshPresent(){let q=quote(), p=panelParts();let batteryLine='No battery selected';if($('batteryBrand').value==='Tesla')batteryLine=`Tesla: ${$('pw3').checked?'Powerwall 3 ':''}${$('gateway').checked?'+ Gateway ':''}${$('dcExp').checked?'+ DC Expansion ':''}`.trim();if($('batteryBrand').value==='Sigenergy')batteryLine=`Sigenergy: ${$('sig6Qty').value||0} x BAT 6.0, ${$('sig10Qty').value||0} x BAT 10.0, ${q.sigNominal} kWh nominal (${q.sigUsable} kWh usable), controller ${$('sigController').value.split('|')[1]}`;$('presentSummary').innerHTML=`<b>Recommended route for ${$('customerName').value||'customer'}</b><br><br>
Solar: ${$('solar').checked?`${$('panelCount').value||0} x ${p.name}, ${q.kWp} kWp`:'No'}<br>
Panel details: ${p.dim}, ${p.weight}<br>
Tigo optimisation: ${$('tigo').checked?'Included at £'+($('tigoPrice').value||30)+' per panel':'Not included'}<br>
Bird protection: ${$('bird').checked?'Included':'Not included'}<br>
Battery: ${batteryLine}<br>
EV charger: ${$('ev').checked?'Zappi included':'No'}<br>
Scaffold: ${$('scaffoldLifts').value||0} lift(s)<br><br>
<b>Proposal position: ${money(q.total)}</b><br><br>
Next step: proceed to formal quote for review and e-signing.`;render()}
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

System scope: ${d.scope}
What they want: ${d.wants}
Why now: ${d.whyNow}
Decision makers: ${d.decisionMakers}
Competitors: ${d.competitors}

Roof notes: ${d.roof}
Dimensions: ${d.dims}
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
Solar £/panel: ${d.solarPerPanel}
Solar price used: ${money(q.solar)}
System size: ${q.kWp} kWp
Tigo: ${d.tigo?'Yes at £'+d.tigoPrice+' per panel':'No'}
Battery: ${q.batteryText}
Sig storage: ${q.sigNominal} kWh nominal / ${q.sigUsable} kWh usable
Scaffold: ${d.scaffoldLifts} lift(s)
EV: ${d.ev?'Zappi':'No'}
Commercial note: ${d.commercialNote}
Calculated proposal position: ${money(q.total)}

Customer proposal summary:
${d.present}

Acceptance:
${d.acceptance}

Next action: ${d.nextAction}
Follow-up date: ${d.followUp}
Confidence: ${d.confidence}
Internal gut feel: ${d.gut}
Attachments: ${d.files.length?d.files.join(', '):'None'}`}
function render(){$('out').textContent=prompt()}
function download(name,text,type='text/plain'){let b=new Blob([text],{type});let u=URL.createObjectURL(b);let a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
function safeName(){return ($('customerName').value||'survey').replace(/[^a-z0-9]+/gi,'_')}
document.addEventListener('DOMContentLoaded',()=>{load();
document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{if(el.id==='annualKwh')syncUsage('annual');if(el.id==='dailyKwh')syncUsage('daily');save()}));
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('on'));b.classList.add('on');$(b.dataset.tab).classList.add('on')});
document.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{let target=$(b.parentElement.dataset.target);target.value=target.value?target.value+', '+b.textContent:b.textContent;save()});
$('batteryGuideBtn').onclick=recommendBattery;$('calcQuote').onclick=calculate;$('refreshPresent').onclick=refreshPresent;
$('stampAccept').onclick=()=>{let stamp=`${$('acceptedName').value||'Customer'} agreed to proceed to formal quote on ${new Date().toLocaleString()}. ${$('acceptanceNote').value||''}`;$('acceptanceStamp').innerText=stamp;save()};
$('copy').onclick=async()=>{await navigator.clipboard.writeText(prompt());alert('Prompt copied')};
$('txt').onclick=()=>download(safeName()+'_survey_notes.txt',prompt());
$('json').onclick=()=>download(safeName()+'_survey_data.json',JSON.stringify(getData(),null,2),'application/json');
$('reset').onclick=()=>{if(confirm('Clear local survey?')){localStorage.removeItem(KEY);location.reload()}};
$('filesInput').onchange=e=>{selectedFiles=Array.from(e.target.files||[]);$('preview').innerHTML='';selectedFiles.forEach(f=>{if(f.type.startsWith('image/')){let img=document.createElement('img');img.src=URL.createObjectURL(f);$('preview').appendChild(img)}});$('fileNames').textContent=selectedFiles.map(f=>f.name).join('\n');save()};
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js');
});
