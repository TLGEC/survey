const fields = [
  "customerName","address","phone","email","surveyDate","wants","why","decisionMakers","competitors","budget","timing",
  "systemType","recommendation","agreed","roofNotes","dimensions","obstructions","batteryLocation","inverterLocation",
  "meterNotes","cableRoute","access","usage","objections","nextAction","followUpDate","confidence","internalNotes",
  "checkRoofPhotos","checkMeter","checkCU","checkBattery","checkCable","checkDims","checkTariff","checkDecision","checkNext","checkTranscript"
];

const KEY = "tlgec-survey-sync-v1";

function el(id){ return document.getElementById(id); }

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

function buildPrompt(data){
  return `Survey pack for ${data.customerName || "[Customer]"}. Use the notes, photos, videos, dimensions and SRT transcripts to create:

1. Survey summary
2. monday CRM note
3. OpenSolar/PandaDoc proposal brief
4. Customer follow-up email
5. Sales strategy
6. Next action list

Customer: ${data.customerName || ""}
Address: ${data.address || ""}
Phone: ${data.phone || ""}
Email: ${data.email || ""}
Survey date: ${data.surveyDate || ""}

What they want:
${data.wants || ""}

Why now:
${data.why || ""}

System discussed:
${data.systemType || ""}

Likely recommendation:
${data.recommendation || ""}

Budget / timing:
${data.budget || ""} / ${data.timing || ""}

Decision makers:
${data.decisionMakers || ""}

Competitors:
${data.competitors || ""}

Roof notes:
${data.roofNotes || ""}

Dimensions:
${data.dimensions || ""}

Obstructions / shading:
${data.obstructions || ""}

Battery location:
${data.batteryLocation || ""}

Inverter/controller location:
${data.inverterLocation || ""}

Meter/CU/incoming supply:
${data.meterNotes || ""}

Cable route:
${data.cableRoute || ""}

Access/scaffolding:
${data.access || ""}

Tariff/usage/bill notes:
${data.usage || ""}

Objections/concerns:
${data.objections || ""}

What was agreed:
${data.agreed || ""}

Next action:
${data.nextAction || ""}

Follow-up date:
${data.followUpDate || ""}

Confidence:
${data.confidence || ""}

Internal notes:
${data.internalNotes || ""}`;
}

function save(){
  const data = getData();
  localStorage.setItem(KEY, JSON.stringify(data));
  const prompt = buildPrompt(data);
  el("promptPreview").value = prompt;
  el("saveStatus").textContent = "Saved locally at " + new Date().toLocaleTimeString();
}

function download(filename, text, type="text/plain"){
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(name){
  return (name || "survey").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().slice(0,10);
  el("surveyDate").value = today;

  const saved = localStorage.getItem(KEY);
  if (saved) {
    try { setData(JSON.parse(saved)); } catch(e) {}
  }

  for (const id of fields) {
    const node = el(id);
    if (!node) continue;
    node.addEventListener("input", save);
    node.addEventListener("change", save);
  }

  el("copyPromptBtn").addEventListener("click", async () => {
    const prompt = buildPrompt(getData());
    try {
      await navigator.clipboard.writeText(prompt);
      alert("Prompt copied. Paste it into ChatGPT with the customer files.");
    } catch {
      el("promptPreview").select();
      alert("Copy blocked. Select the prompt text and copy manually.");
    }
  });

  el("downloadTxtBtn").addEventListener("click", () => {
    const data = getData();
    download(`${safeName(data.customerName)}_survey_notes.txt`, buildPrompt(data));
  });

  el("downloadJsonBtn").addEventListener("click", () => {
    const data = getData();
    download(`${safeName(data.customerName)}_survey_data.json`, JSON.stringify(data, null, 2), "application/json");
  });

  el("resetBtn").addEventListener("click", () => {
    if (confirm("Clear the current survey notes from this phone?")) {
      localStorage.removeItem(KEY);
      location.reload();
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.warn);
  }

  save();
});