const fields = [
  "customerName","address","phone","email","surveyDate","wants","why","decisionMakers","competitors","budget","timing",
  "systemType","priority","recommendation","agreed","roofNotes","dimensions","obstructions","batteryLocation","inverterLocation",
  "meterNotes","cableRoute","access","usage","objections","nextAction","followUpDate","confidence","internalNotes",
  "checkRoofPhotos","checkMeter","checkCU","checkBattery","checkCable","checkDims","checkTariff","checkDecision","checkNext","checkTranscript"
];

const KEY = "tlgec-survey-sync-v2";
const ATTACH_KEY = "tlgec-survey-attachments-v2";

function el(id){ return document.getElementById(id); }

function today(){
  return new Date().toISOString().slice(0,10);
}

function getData(){
  const data = {};
  for (const id of fields) {
    const node = el(id);
    if (!node) continue;
    data[id] = node.type === "checkbox" ? node.checked : node.value;
  }
  data.exportedAt = new Date().toISOString();
  return data;
}

function setData(data){
  for (const id of fields) {
    const node = el(id);
    if (!node || data[id] === undefined) continue;
    if (node.type === "checkbox") node.checked = !!data[id];
    else node.value = data[id] || "";
  }
}

function save(){
  localStorage.setItem(KEY, JSON.stringify(getData()));
  const status = el("saveStatus");
  if (status) status.textContent = "Saved locally " + new Date().toLocaleTimeString();
  updateOutputs();
}

function load(){
  const saved = localStorage.getItem(KEY);
  if (saved) {
    try { setData(JSON.parse(saved)); } catch(e){}
  } else {
    if (el("surveyDate")) el("surveyDate").value = today();
  }
}

function cleanName(name){
  return (name || "survey").replace(/[^a-z0-9]+/gi,"_").replace(/^_+|_+$/g,"");
}

function alignmentScript(data){
  const name = data.customerName || "[customer]";
  const wants = data.wants || "[main objective]";
  const rec = data.recommendation || "[recommended solution]";
  const priority = data.priority || "[main priority]";
  return `Just so I am clear, the main thing you want from this is ${wants}.

Based on what I have seen today, my initial recommendation is likely to be ${rec}.

The decision is whether we design this around ${priority}, or whether there is another priority you want me to focus on.

When I send the proposal, I will show the recommendation clearly. If the layout, battery size and numbers make sense, is this something you would be looking to move forward with?`;
}

function promptText(){
  const d = getData();
  const attachments = loadAttachments();
  return `Survey pack for ${d.customerName || "[Customer]"}.

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

What they want: ${d.wants}
Why now: ${d.why}
Decision makers: ${d.decisionMakers}
Competitors: ${d.competitors}
System direction: ${d.systemType}
Customer priority: ${d.priority}
Likely recommendation: ${d.recommendation}
Budget / price sensitivity: ${d.budget}
Timing: ${d.timing}
Objections / concerns: ${d.objections}
Agreed before leaving: ${d.agreed}

Roof notes: ${d.roofNotes}
Dimensions / references: ${d.dimensions}
Obstructions / shading: ${d.obstructions}
Battery location: ${d.batteryLocation}
Inverter/controller location: ${d.inverterLocation}
Meter/CU/incoming supply: ${d.meterNotes}
Cable route: ${d.cableRoute}
Access/scaffold: ${d.access}
Usage/tariff/bill notes: ${d.usage}

Next action: ${d.nextAction}
Follow-up date: ${d.followUpDate}
Confidence: ${d.confidence}
Internal gut feel: ${d.internalNotes}

Attachments in this device export: ${attachments.map(a => a.name).join(", ") || "None"}`;
}

function updateOutputs(){
  const d = getData();
  const box = el("alignmentText");
  if (box) box.textContent = alignmentScript(d);
  const prev = el("promptPreview");
  if (prev) prev.textContent = promptText();
}

function download(filename, content, type="text/plain"){
  const blob = content instanceof Blob ? content : new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadAttachments(){
  try { return JSON.parse(localStorage.getItem(ATTACH_KEY) || "[]"); } catch(e){ return []; }
}

function saveAttachments(list){
  localStorage.setItem(ATTACH_KEY, JSON.stringify(list));
  renderAttachments();
  updateOutputs();
}

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function imageToCompressedDataURL(file, maxSide=1600, quality=0.78){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let {width, height} = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img,0,0,width,height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function addFiles(files, kind){
  const existing = loadAttachments();
  for (const file of files) {
    if (kind === "photo" && file.type.startsWith("image/")) {
      const dataUrl = await imageToCompressedDataURL(file);
      existing.push({id: crypto.randomUUID(), name:file.name, type:"image/jpeg", kind:"photo", dataUrl, addedAt:new Date().toISOString()});
    } else {
      const dataUrl = await fileToDataURL(file);
      existing.push({id: crypto.randomUUID(), name:file.name, type:file.type || "application/octet-stream", kind:"doc", dataUrl, addedAt:new Date().toISOString()});
    }
  }
  saveAttachments(existing);
}

function removeAttachment(id){
  saveAttachments(loadAttachments().filter(a => a.id !== id));
}

function renderAttachments(){
  const wrap = el("attachments");
  if (!wrap) return;
  const list = loadAttachments();
  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = `<p class="hint">No local files added yet.</p>`;
    return;
  }
  for (const item of list) {
    const div = document.createElement("div");
    div.className = "attachment";
    if (item.kind === "photo") div.innerHTML = `<img src="${item.dataUrl}" alt=""><div class="meta">${item.name}</div>`;
    else div.innerHTML = `<div class="meta"><strong>${item.name}</strong><br>${item.type}</div>`;
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => removeAttachment(item.id);
    div.appendChild(btn);
    wrap.appendChild(div);
  }
}

function htmlPack(){
  const d = getData();
  const list = loadAttachments();
  const esc = s => String(s || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const rows = Object.entries(d).map(([k,v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  const imgs = list.map(a => a.kind === "photo" ? `<figure><img src="${a.dataUrl}"><figcaption>${esc(a.name)}</figcaption></figure>` : `<p><strong>Attachment:</strong> ${esc(a.name)} (${esc(a.type)})</p>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.customerName)} survey pack</title><style>body{font-family:Arial;margin:24px;line-height:1.45}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{width:240px;background:#f4f4f4}img{max-width:100%;border:1px solid #ddd;border-radius:8px}figure{break-inside:avoid;margin:18px 0}pre{white-space:pre-wrap;background:#111;color:#eee;padding:16px;border-radius:8px}</style></head><body><h1>TLGEC Survey Pack: ${esc(d.customerName)}</h1><table>${rows}</table><h2>ChatGPT prompt</h2><pre>${esc(promptText())}</pre><h2>Photos / attachments</h2>${imgs}</body></html>`;
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  renderAttachments();
  updateOutputs();

  for (const id of fields) {
    const node = el(id);
    if (node) node.addEventListener("input", save);
    if (node && node.type === "checkbox") node.addEventListener("change", save);
  }

  document.querySelectorAll("[data-jump]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = el(btn.dataset.jump);
      if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });

  document.querySelectorAll(".chips").forEach(group => {
    group.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const target = el(group.dataset.target);
        if (!target) return;
        const val = btn.textContent.trim();
        target.value = target.value ? `${target.value}, ${val}` : val;
        save();
      });
    });
  });

  document.querySelectorAll("[data-copy='alignment']").forEach(btn => {
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(alignmentScript(getData()));
      alert("Alignment script copied");
    });
  });

  el("photoInput")?.addEventListener("change", e => addFiles([...e.target.files], "photo"));
  el("docInput")?.addEventListener("change", e => addFiles([...e.target.files], "doc"));

  el("copyPromptBtn")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(promptText());
    alert("ChatGPT prompt copied");
  });
  el("copyPromptBtn2")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(promptText());
    alert("ChatGPT prompt copied");
  });

  el("downloadTxtBtn")?.addEventListener("click", () => {
    download(`${cleanName(getData().customerName)}_survey_notes.txt`, promptText());
  });
  el("downloadJsonBtn")?.addEventListener("click", () => {
    download(`${cleanName(getData().customerName)}_survey_data.json`, JSON.stringify({data:getData(),attachments:loadAttachments().map(a => ({name:a.name,type:a.type,kind:a.kind,addedAt:a.addedAt}))}, null, 2), "application/json");
  });
  el("downloadHtmlBtn")?.addEventListener("click", () => {
    download(`${cleanName(getData().customerName)}_survey_pack.html`, htmlPack(), "text/html");
  });

  el("resetBtn")?.addEventListener("click", () => {
    if (!confirm("Clear this survey from this device?")) return;
    localStorage.removeItem(KEY);
    localStorage.removeItem(ATTACH_KEY);
    location.reload();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
});
