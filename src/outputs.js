import { customerName, folderName, publicSurvey } from './schema.js';
import { formatMoney } from './pricing.js';

export function downloadJsonBackup(survey, media) {
  const payload = { exportedAt:new Date().toISOString(), survey, media:media.map(({ blob, ...item }) => item) };
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`${folderName(survey)}_field_backup.json`);
}

export function openCustomerEmail(survey, primary, secondary) {
  const name=customerName(survey), first=survey.customer.firstName||name;
  const lines=[
    `Hi ${first},`, '',
    'Thank you for your time today.', '',
    `The proposed system is ${systemLabel(survey,primary)}.`,
    primary.available?`Overall indicative installed price: ${formatMoney(primary.price)}.`:'The overall price will be confirmed after the remaining product details are checked.',
    primary.assumptions?.annualSaving?`Illustrative annual saving: around ${formatMoney(primary.assumptions.annualSaving)}.`:'',
    secondary?`The summary also includes ${survey.solution.secondary.name||'a second option'}${secondary.available?` at ${formatMoney(secondary.price)}`:' with its price to be confirmed'} for comparison.`:'', '',
    'Your Indicative Solution Summary is attached.', '',
    'The summary is not a formal quotation. Detailed design and the formal quotation will follow separately.', '',
    'Kind regards,', 'The Little Green Energy Company'
  ].filter(line=>line!==null);
  const subject=`Your home energy proposal - ${name}`;
  const mailto=`mailto:${encodeURIComponent(survey.customer.email||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  window.__lastMailto=mailto;
  location.href=mailto;
}

export async function downloadCustomerPdf(survey, primary, secondary, media) {
  if (!window.PDFLib) throw new Error('The PDF engine has not loaded. Reload the app and try again.');
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark=rgb(25/255,57/255,28/255), lime=rgb(172/255,203/255,88/255), yellow=rgb(250/255,227/255,6/255), pale=rgb(247/255,247/255,247/255), stone=rgb(243/255,241/255,231/255), grey=rgb(93/255,104/255,93/255), charcoal=rgb(55/255,50/255,45/255), white=rgb(1,1,1);
  const selected=media.filter(item=>item.customerSelected&&item.type?.startsWith('image/')).slice(0,4);
  const page=pdf.addPage([595,842]);
  page.drawRectangle({x:0,y:0,width:595,height:842,color:white});
  try { const logo=await embedBrowserImage(pdf,await (await fetch('tlgec-logo.png')).blob()); page.drawImage(logo,{x:40,y:775,width:82,height:60}); } catch { page.drawText('THE LITTLE GREEN ENERGY COMPANY',{x:42,y:804,size:9,font:bold,color:dark}); }
  page.drawText('INDICATIVE SOLUTION SUMMARY',{x:369,y:810,size:8,font:bold,color:dark});
  page.drawText('Renewable energy installations since 2010',{x:365,y:792,size:7,font:regular,color:grey});
  page.drawRectangle({x:0,y:505,width:595,height:263,color:lime});
  page.drawText('PREPARED FOR',{x:42,y:733,size:8,font:bold,color:dark});
  wrapText(page,bold,'Your home energy proposal',42,695,27,dark,305,30);
  page.drawText(pdfSafe(customerName(survey)),{x:42,y:588,size:15,font:bold,color:dark});
  wrapText(page,regular,systemLabel(survey,primary),42,566,9,charcoal,305,13);
  page.drawText(pdfSafe(survey.customer.address||'Property address to be confirmed'),{x:42,y:524,size:8,font:regular,color:dark});
  try {
    const heroBlob=selected[0]?.blob||await (await fetch('tlgec-home-hero.webp')).blob();
    const hero=await embedBrowserImage(pdf,heroBlob);
    page.drawImage(hero,{x:382,y:505,width:213,height:263});
  } catch {}
  drawSection(page,bold,'Proposed system',42,472,dark);
  wrapText(page,regular,systemLabel(survey,primary),42,450,9,grey,348,13);
  const productPath=survey.solution.batteryBrand==='Tesla'?'tesla-powerwall.webp':'sigenergy-battery.webp';
  if(survey.solution.systemType!=='solar-only'){
    page.drawRectangle({x:420,y:399,width:133,height:76,color:stone});
    try { const image=await embedBrowserImage(pdf,await (await fetch(productPath)).blob()); page.drawImage(image,{x:436,y:412,width:101,height:49}); } catch {}
    page.drawText(`${pdfSafe(survey.solution.batteryBrand)} STORAGE`,{x:441,y:404,size:6,font:bold,color:dark});
  }
  const metrics=[['System size',primary.sizeKw?`${primary.sizeKw.toFixed(2)} kWp`:'Battery only'],['Storage',primary.capacityKwh?`${primary.capacityKwh.toFixed(1)} kWh`:'Not included'],['Indicative price',primary.available?formatMoney(primary.price):'To be confirmed'],['Illustrative saving',primary.assumptions?.annualSaving?`${formatMoney(primary.assumptions.annualSaving)} / year`:'To be confirmed']];
  page.drawRectangle({x:0,y:328,width:595,height:68,color:pale});
  metrics.forEach(([label,value],index)=>{const x=42+index*131; if(index)page.drawLine({start:{x:x-13,y:340},end:{x:x-13,y:384},thickness:.7,color:rgb(.82,.85,.8)});page.drawText(label.toUpperCase(),{x,y:374,size:6.5,font:bold,color:grey});page.drawText(value,{x,y:348,size:11.5,font:bold,color:dark});});
  drawSection(page,bold,'Your priorities',42,292,dark);
  const goals=survey.discovery.goals.length?survey.discovery.goals.join(', '):'Your priorities will be confirmed during detailed design.';
  wrapText(page,regular,goals,42,270,9,charcoal,238,13);
  drawSection(page,bold,'Your home',315,292,dark);
  const mount=survey.site.framingOverride?.enabled?survey.site.framingOverride.description:survey.site.framingKey;
  const observations=[survey.solution.systemType!=='battery-only'&&`${survey.solution.panelCount||0} panels proposed${survey.site.panelAreas?` on ${survey.site.panelAreas}`:''}.`,`${survey.site.roofCovering||'Roof covering to be confirmed'}${mount?` with ${mount} mounting`:''}.`,survey.site.roofNotes||'Property details to be confirmed during detailed design.',locationSentence(survey)].filter(Boolean).join(' ');
  wrapText(page,regular,observations,315,270,9,charcoal,238,13);
  page.drawRectangle({x:0,y:116,width:595,height:92,color:yellow});
  page.drawText('OVERALL INDICATIVE INSTALLED PRICE',{x:42,y:178,size:8,font:bold,color:dark});
  page.drawText(primary.available?formatMoney(primary.price):'TO BE CONFIRMED',{x:primary.available?390:332,y:153,size:primary.available?28:18,font:bold,color:dark});
  page.drawText('Subject to detailed design',{x:42,y:158,size:8,font:regular,color:dark});
  page.drawText('Indicative only and subject to detailed design. This is not a formal quotation.',{x:42,y:133,size:7,font:regular,color:charcoal});
  page.drawRectangle({x:0,y:0,width:595,height:116,color:dark});
  page.drawText('NEXT STEP',{x:42,y:79,size:8,font:bold,color:yellow});
  wrapText(page,regular,'Detailed design will confirm the final system before a formal quotation is prepared.',42,58,9,white,430,13);
  page.drawText('The Little Green Energy Company',{x:438,y:29,size:7,font:bold,color:white});

  if (selected.length||secondary) {
    const detail=pdf.addPage([595,842]);
    detail.drawRectangle({x:0,y:0,width:595,height:842,color:white});
    try { const logo=await embedBrowserImage(pdf,await (await fetch('tlgec-logo.png')).blob()); detail.drawImage(logo,{x:40,y:775,width:82,height:60}); } catch {}
    detail.drawText('YOUR HOME ENERGY PROPOSAL',{x:312,y:808,size:8,font:bold,color:dark});
    detail.drawLine({start:{x:42,y:765},end:{x:553,y:765},thickness:1,color:lime});
    detail.drawText('System and property details',{x:42,y:720,size:24,font:bold,color:dark});
    let y=677;
    if(secondary){drawSection(detail,bold,'Options',42,y,dark);y-=26;wrapText(detail,bold,pdfSafe(survey.solution.secondary.name||'Alternative system'),42,y,12,dark,510,16);y-=24;wrapText(detail,regular,`${survey.solution.secondary.note||'Alternative system configuration'} - ${secondary.available?`${formatMoney(secondary.price)} indicative installed price`:'price to be confirmed'}.`,42,y,10,dark,510,14);y-=54;}
    if(selected.length){drawSection(detail,bold,'Your property',42,y,dark);y-=176;for(let index=0;index<selected.length;index+=1){try{const image=await embedBrowserImage(pdf,selected[index].blob);const x=42+(index%2)*258,iy=y-Math.floor(index/2)*185;detail.drawRectangle({x,y:iy,width:240,height:150,color:stone});detail.drawImage(image,{x,y:iy,width:240,height:150});detail.drawText((selected[index].category||'Site photo').toUpperCase(),{x,y:iy-14,size:7,font:bold,color:dark});}catch{}}}
    detail.drawRectangle({x:0,y:0,width:595,height:70,color:dark});
    detail.drawText('Property images are included for reference and remain subject to detailed technical design.',{x:42,y:34,size:7,font:regular,color:white});
  }
  const bytes=await pdf.save();
  const name=`${folderName(survey)}_Indicative_Solution_Summary.pdf`;
  downloadBlob(new Blob([bytes],{type:'application/pdf'}),name);
  return name;
}

export async function downloadTechnicalBrief(survey, pricing, media) {
  const mediaRows=await Promise.all(media.map(async item=>{
    let preview='';
    if(item.type?.startsWith('image/')){try{preview=await blobDataUrl(item.blob,1200,.72);}catch{}}
    return `<article class="media"><h3>${escapeHtml(item.category||'Site media')}</h3>${preview?`<img src="${preview}" alt="">`:`<p>${escapeHtml(item.name||item.type)}</p>`}<p>${escapeHtml(item.caption||'')}</p></article>`;
  }));
  const selectedPanel=panelDescription(survey,pricing);
  const mounting=survey.site.framingOverride?.enabled?survey.site.framingOverride.description:survey.site.framingKey;
  const review=pricing.available?'No pricing review outstanding':pricing.errors.join(' ');
  const html=`<!doctype html><meta charset="utf-8"><title>${escapeHtml(customerName(survey))} technical brief</title><style>body{font:15px Arial;color:#183428;max-width:980px;margin:auto;padding:36px}header{background:#073b2a;color:white;padding:28px;border-radius:20px}section{margin:22px 0;padding:20px;border:1px solid #dce6de;border-radius:16px}dl{display:grid;grid-template-columns:220px 1fr;gap:8px}dt{font-weight:bold}.mediaGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.media img{width:100%;max-height:360px;object-fit:contain;background:#eee}.warning{background:#fff5d6}</style><header><h1>Installation handover</h1><p>${escapeHtml(customerName(survey))} - ${escapeHtml(survey.customer.address)}</p></header><section><h2>System</h2><dl><dt>Route</dt><dd>${escapeHtml(systemLabel(survey,pricing))}</dd><dt>Electrical supply</dt><dd>${e(survey.site.supplyPhase)}</dd><dt>Panel specification</dt><dd>${escapeHtml(selectedPanel)}</dd><dt>Panel pricing baseline</dt><dd>${e(pricing.panelPriceBaseline||'Needs product review')}</dd><dt>Controller</dt><dd>${e(pricing.controllerName||survey.solution.sigController)}</dd><dt>Overall indicative price</dt><dd>${pricing.available?formatMoney(pricing.price):'Needs pricing review'}</dd><dt>Pricing review</dt><dd>${escapeHtml(review)}</dd><dt>Pricing authority</dt><dd>Residential Pricing V8.7</dd></dl></section><section><h2>Structured site brief</h2><dl><dt>Panel areas</dt><dd>${e(survey.site.panelAreas)}</dd><dt>Roof covering</dt><dd>${e(survey.site.roofCovering)}</dd><dt>Mounting / framing</dt><dd>${e(mounting)}</dd><dt>Roof observations</dt><dd>${e(survey.site.roofNotes)}</dd><dt>Battery location</dt><dd>${e(survey.site.locations.battery)}</dd><dt>Inverter location</dt><dd>${e(survey.site.locations.inverter)}</dd><dt>Gateway location</dt><dd>${e(survey.site.locations.gateway)}</dd><dt>Meter box</dt><dd>${e(survey.site.locations.meterBox)}</dd><dt>AC cable</dt><dd>${e(survey.site.cables.acMeters)}m - ${e(survey.site.cables.acRoute)}</dd><dt>DC cable</dt><dd>${e(survey.site.cables.dcMeters)}m - ${e(survey.site.cables.dcRoute)}</dd><dt>Scaffolding</dt><dd>${e(survey.site.scaffold.required)}, ${e(survey.site.scaffold.lifts)} lift(s)</dd><dt>Constraints / notes</dt><dd>${e(survey.site.technicalNotes)}</dd></dl>${longCable(survey)?'<p class="warning"><strong>Review:</strong> cable route exceeds 10m. Confirm whether the configured allowance is sufficient.</p>':''}</section><section><h2>Configured internal extras</h2><p>${extrasText(survey)}</p></section><section><h2>Supporting media</h2><div class="mediaGrid">${mediaRows.join('')}</div></section>`;
  downloadBlob(new Blob([html],{type:'text/html'}),`${folderName(survey)}_technical_handover.html`);
}

export function downloadCrmCsv(survey, primary) {
  const row={customer:customerName(survey),email:survey.customer.email,phone:survey.customer.phone,address:survey.customer.address,monday_id:survey.source.mondayId,bill_status:survey.readiness.billStatus,priorities:survey.discovery.goals.join('; '),opening_position:survey.discovery.openingCommitment,system:systemLabel(survey,primary),electrical_supply:survey.site.supplyPhase,roof_covering:survey.site.roofCovering,mounting:survey.site.framingOverride?.enabled?survey.site.framingOverride.description:survey.site.framingKey,panel:panelDescription(survey,primary),controller:primary.controllerName||survey.solution.sigController,ac_cable_m:survey.site.cables.acMeters,dc_cable_m:survey.site.cables.dcMeters,scaffold_lifts:survey.site.scaffold.lifts,indicative_price:primary.available?primary.price:'needs review',pricing_review:primary.available?'':primary.errors.join('; '),close_position:survey.close.position,concerns:survey.close.concerns,next_step:nextStep(survey)};
  const headers=Object.keys(row), csv=[headers.map(csvCell).join(','),headers.map(key=>csvCell(row[key])).join(',')].join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv'}),`${folderName(survey)}_CRM_summary.csv`);
}

export function publicOutputForTest(survey){return publicSurvey(survey);}
function systemLabel(survey,price){const type={'solar-battery':'solar and battery storage','solar-only':'solar generation','battery-only':'battery storage'}[survey.solution.systemType]||'home energy system';const panel=price.panelName&&survey.solution.systemType!=='battery-only'?`${survey.solution.panelCount} x ${price.panelName}`:'';const battery=price.capacityKwh?`${survey.solution.batteryBrand} ${price.capacityKwh.toFixed(1)} kWh storage`:'';return [type,panel,battery].filter(Boolean).join(' with ')}
function panelDescription(survey,price){if(survey.solution.systemType==='battery-only')return 'Not included';if(survey.solution.panelOverride?.enabled){const p=survey.solution.panelOverride;return `${p.manufacturer||'Manual'} ${p.model||'panel'} ${p.watts||'?'}W, ${p.heightMm||'?'} x ${p.widthMm||'?'} x ${p.depthMm||'?'} mm (review required)`}const d=price.panelDimensions;return `${price.panelName||'Panel to confirm'}${d?`, ${d.heightMm} x ${d.widthMm} x ${d.depthMm} mm`:''}`}
function locationSentence(s){const bits=[s.site.locations.battery&&`Battery: ${s.site.locations.battery}`,s.site.locations.inverter&&`Inverter: ${s.site.locations.inverter}`].filter(Boolean);return bits.length?bits.join('. ')+'.':'Equipment locations will be confirmed during detailed design.'}
function extrasText(s){const items=[s.solution.extras.birdProtection&&'Bird protection',s.solution.extras.evCharger&&'EV charger',s.solution.extras.cableApproved&&`Extra cable allowance (${s.solution.extras.cableCost||0})`,s.solution.extras.unusualCost&&`${s.solution.extras.unusualLabel||'Unusual works'} (${s.solution.extras.unusualCost})`].filter(Boolean);return items.join(', ')||'No configured extras.'}
function nextStep(s){return s.close.position.startsWith('Yes')?'Prepare detailed OpenSolar design and PandaDoc formal quote':'Follow up on the recorded concern'}
function longCable(s){return Number(s.site.cables.acMeters)>10||Number(s.site.cables.dcMeters)>10}
function e(value){return escapeHtml(value===undefined||value===null||value===''?'Not recorded':value)}
function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function drawSection(page,font,text,x,y,color){page.drawText(text,{x,y,size:15,font,color})}
function wrapText(page,font,text,x,y,size,color,maxWidth,lineHeight){const words=pdfSafe(text).split(/\s+/);let line='',cursor=y;for(const word of words){const test=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(test,size)>maxWidth&&line){page.drawText(line,{x,y:cursor,size,font,color});cursor-=lineHeight;line=word}else line=test}if(line)page.drawText(line,{x,y:cursor,size,font,color});return cursor-lineHeight}
function pdfSafe(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\xA3]/g,' ')}
async function embedBrowserImage(pdf,blob){const data=await blobJpegBytes(blob,1400,.8);return pdf.embedJpg(data)}
async function blobJpegBytes(blob,maxSize,quality){const bitmap=await createImageBitmap(blob);const scale=Math.min(1,maxSize/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const out=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));return new Uint8Array(await out.arrayBuffer())}
async function blobDataUrl(blob,maxSize,quality){const bytes=await blobJpegBytes(blob,maxSize,quality);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return `data:image/jpeg;base64,${btoa(binary)}`}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
