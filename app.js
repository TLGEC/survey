const APP_VERSION = 'v2.0.0';
const DB_NAME = 'lg-survey-pro-v2';
const DB_VERSION = 1;
const ACTIVE_SURVEY_KEY = 'lg-v2-active-survey-id';

const CATALOG = {
  pricingVersion: 'Residential Pricing V8.6 - v2 simplified',
  margin: { markup: 0.3793, salesCommission: 0.03, marketing: 0.02 },
  panels: {
    aiko540: { name: 'AIKO 540W', watts: 540, widthMm: 1134, heightMm: 1954, weight: '27.1 kg', cost: 84 },
    aiko495: { name: 'AIKO 495W', watts: 495, widthMm: 1134, heightMm: 1762, weight: '20.6 kg', cost: 84 },
    sunpowerP7_500: { name: 'SunPower P7 500W', watts: 500, widthMm: 1134, heightMm: 1900, weight: 'Confirm datasheet', cost: 84 },
    sunpowerP7_450: { name: 'SunPower P7 450W', watts: 450, widthMm: 1134, heightMm: 1762, weight: 'Confirm datasheet', cost: 82.5 },
    sunpowerP6_405: { name: 'SunPower P6 405W warehouse deal', watts: 405, widthMm: 1134, heightMm: 1722, weight: 'Confirm datasheet', cost: 84, deal: true }
  },
  mounting: {
    'Plain Tile': 73,
    Pantile: 30,
    Trapezoidal: 22.5,
    Slate: 57,
    'Standing Seam': 31,
    'Flat Roof': 80,
    'In-Roof': 135,
    'Fibre Cement': 50,
    Quattro: 97.5,
    'Ground Screws': 97.5
  },
  framingDays: {
    default: [0,0.5,0.5,0.5,0.5,0.5,1,1,1,1,1,1.5,1.5,1.5,1.5,1.5,2,2,2,2,2,2.5,2.5,2.5,2.5,2.5,3,3,3,3,3,3.5,3.5,3.5,3.5,3.5],
    Slate: [0,1,1,1,1,1,2.25,2.25,2.25,2.25,2.25,3.25,3.25,3.25,3.25,3.25,4.5,4.5,4.5,4.5,4.5,5.5,5.5,5.5,5.5,5.5,6.75,6.75,6.75,6.75,6.75,8,8,8,8,8]
  },
  sigenergy: {
    bat6: { name: 'SigenStor BAT 6.0', nominal: 6.02, usable: 5.84, cost: 1575 },
    bat10: { name: 'SigenStor BAT 10.0', nominal: 9.04, usable: 8.76, cost: 2050 },
    gatewayCost: 785,
    controllers: [
      { id: 'none', name: 'None', cost: 0 },
      { id: 'sig-ec-3', name: 'Sigen Energy Controller 3kW', cost: 780 },
      { id: 'sig-ec-5', name: 'Sigen Energy Controller 5kW', cost: 835 },
      { id: 'sig-ec-8', name: 'Sigen Energy Controller 8kW', cost: 1287 },
      { id: 'sig-ec-12', name: 'Sigen Energy Controller 12kW', cost: 1520 }
    ],
    pvInverters: { 3:780, 4:850, 5:835, 6:866, 8:1287, 10:1402.5, 12:1520, 14:1662, 16:1862, 18:1976, 20:2081 }
  },
  tesla: { pw3Cost: 4075, gatewayCost: 680, dcExpansionCost: 3275, pw3Storage: 13.5, dcStorage: 13.5 },
  extras: {
    tigo: 30,
    scaffoldFirstLift: 500,
    scaffoldExtraFactor: 0.85,
    spdSingle: 75,
    birdPerPanel: 17.5,
    zappi: 900,
    eddi: 0,
    carriage: 55,
    otherCosts: 105,
    labour: { pvInstaller:150, electrician:180, pvLabourer:130, pm:200, designer:200, admin:150 }
  }
};

const MEDIA_CATEGORIES = [
  'Roof',
  'Meter / fuse',
  'Distribution board / CU',
  'Battery / inverter location',
  'Cable route',
  'Access / scaffold',
  'Customer document',
  'Video walkthrough',
  'Other'
];

let db;
let state = { survey: null, media: [], pendingCategory: 'Other', dirtyTimer: null, online: navigator.onLine };
let signaturePad = null;
let markup = { item: null, img: null, actions: [], tool: 'label', label: 'Battery location', start: null };

const $ = id => document.getElementById(id);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const money = value => '\u00a3' + Math.round(Number(value || 0)).toLocaleString('en-GB');
const number = value => Number(value || 0) || 0;
const clean = value => String(value == null ? '' : value).trim();
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;

function defaultSurvey() {
  const id = uid('survey');
  const now = new Date().toISOString();
  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    customer: { name:'', address:'', phone:'', email:'', mondayId:'', leadSource:'', appointmentTime:'', crmStatus:'', notes:'' },
    priorities: { wants:'', whyNow:'', financePlan:'', financeNote:'', timing:'', decisionMakers:'', competitors:'', promises:'', blockers:'' },
    energy: { annualKwh:'', dailyKwh:'', annualSpend:'', importRate:28, peak:'', offpeak:'', exportRate:15, selfUsePct:75, heatPump:false, highEvening:false, backup:false, ev:false },
    site: {
      roof:'', dimensions:'', shade:'', batteryLocation:'', inverterLocation:'', meter:'', cableRoute:'', access:'', riskNotes:'', routeAgreed:false,
      roofPlanes: [{ id: uid('roof'), name:'Main roof', width:'', slope:'', pitch:'', azimuth:'', suggestedPanels:0, manualPanels:'' }]
    },
    design: {
      solar:true, battery:true, ev:false, eddi:false, otherExtra:false,
      panelKey:'aiko540', panelCount:0, panelCountMode:'manual', panelOverrideReason:'', panelCostOverride:'',
      mounting:'Plain Tile', tigo:false, tigoQty:0, tigoPrice:30, bird:true, spds:true, scaffoldLifts:0,
      batteryBrand:'Sigenergy',
      sig6Qty:0, sig10Qty:1, sigGateway:true, sigControllerMode:'auto', sigController:'none', sig6Cost:1575, sig10Cost:2050, sigGatewayCost:785,
      teslaPw3Qty:1, teslaDcQty:0, teslaGateway:true, teslaPw3Cost:4075, teslaDcCost:3275, teslaGatewayCost:680, teslaDiscount:0,
      zappiPrice:900, eddiPrice:0, otherExtraName:'', otherExtraPrice:0,
      manualDiscount:0, finalPriceOverride:0, commercialNote:''
    },
    acceptance: { customerView:'Interested', status:'Open', blocker:'', nextAction:'Send formal quote', followUp:'', note:'', signatureData:'', acceptedAt:'' }
  };
}

function openDb() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const database = req.result;
      if (!database.objectStoreNames.contains('surveys')) database.createObjectStore('surveys', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('media')) {
        const media = database.createObjectStore('media', { keyPath: 'id' });
        media.createIndex('surveyId', 'surveyId', { unique:false });
        media.createIndex('createdAt', 'createdAt', { unique:false });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error || new Error('Could not open local database'));
  });
}

function tx(store, mode = 'readonly') {
  return openDb().then(database => database.transaction(store, mode).objectStore(store));
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Database request failed'));
  });
}

async function saveSurvey(survey = state.survey) {
  if (!survey) return null;
  survey.updatedAt = new Date().toISOString();
  const store = await tx('surveys', 'readwrite');
  await request(store.put(survey));
  localStorage.setItem(ACTIVE_SURVEY_KEY, survey.id);
  setSaveStatus(`Saved locally ${new Date(survey.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`);
  renderSavedSurveys();
  return survey;
}

async function loadSurvey(id) {
  const store = await tx('surveys');
  const survey = await request(store.get(id));
  if (!survey) return null;
  state.survey = survey;
  localStorage.setItem(ACTIVE_SURVEY_KEY, survey.id);
  state.media = await mediaForSurvey(survey.id);
  renderAll();
  setSaveStatus('Survey loaded');
  return survey;
}

async function listSurveys() {
  const store = await tx('surveys');
  const surveys = await request(store.getAll());
  return surveys.sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

async function deleteSurvey(id) {
  const media = await mediaForSurvey(id);
  const mediaStore = await tx('media', 'readwrite');
  await Promise.all(media.map(item => request(mediaStore.delete(item.id))));
  const surveyStore = await tx('surveys', 'readwrite');
  await request(surveyStore.delete(id));
  if (state.survey?.id === id) {
    state.survey = null;
    state.media = [];
    renderAll();
  }
  if (localStorage.getItem(ACTIVE_SURVEY_KEY) === id) localStorage.removeItem(ACTIVE_SURVEY_KEY);
  renderSavedSurveys();
}

async function startSurvey(seed = {}) {
  state.survey = mergeSurvey(defaultSurvey(), seed);
  await saveSurvey(state.survey);
  state.media = [];
  renderAll();
  go('customer');
}

function mergeSurvey(base, patch) {
  const out = structuredClone(base);
  const merge = (target, source) => {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Blob)) {
        target[key] = target[key] || {};
        merge(target[key], value);
      } else if (value !== undefined) {
        target[key] = value;
      }
    });
  };
  merge(out, patch);
  return out;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0,-1).forEach(key => { cur[key] = cur[key] || {}; cur = cur[key]; });
  cur[keys[keys.length - 1]] = value;
}

function getPath(obj, path, fallback = '') {
  return path.split('.').reduce((cur, key) => cur && cur[key] !== undefined ? cur[key] : undefined, obj) ?? fallback;
}

function bindForm() {
  document.addEventListener('input', event => {
    if (!state.survey) return;
    const bind = event.target?.dataset?.bind;
    if (!bind) return;
    setPath(state.survey, bind, fieldValue(event.target));
    afterFieldChange(event.target);
  }, true);
  document.addEventListener('change', event => {
    if (!state.survey) return;
    const check = event.target?.dataset?.check;
    const bind = event.target?.dataset?.bind;
    if (check) setPath(state.survey, check, !!event.target.checked);
    if (bind) setPath(state.survey, bind, fieldValue(event.target));
    afterFieldChange(event.target);
  }, true);
}

function fieldValue(el) {
  if (el.type === 'checkbox') return !!el.checked;
  if (el.type === 'number') return number(el.value);
  return el.value;
}

function afterFieldChange(target) {
  if (!state.survey) return;
  if (target?.dataset?.productCost) updateProductOverride(target);
  if (target?.id === 'annualKwh') syncUsage('annual');
  if (target?.id === 'dailyKwh') syncUsage('daily');
  if (target?.closest?.('#roofPlaneList')) updateRoofSuggestions();
  if (target?.dataset?.bind?.startsWith('design.')) renderDesign();
  renderHeader();
  renderRecommendation();
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(state.dirtyTimer);
  state.dirtyTimer = setTimeout(() => saveSurvey(), 180);
}

function flushSave() {
  clearTimeout(state.dirtyTimer);
  return saveSurvey();
}

function fillForm() {
  if (!state.survey) return;
  $$('[data-bind]').forEach(el => {
    const value = getPath(state.survey, el.dataset.bind, '');
    if (el.type === 'checkbox') el.checked = !!value;
    else if (el.type === 'radio') el.checked = String(el.value) === String(value);
    else el.value = value ?? '';
  });
  $$('[data-check]').forEach(el => { el.checked = !!getPath(state.survey, el.dataset.check, false); });
}

function renderAll() {
  fillForm();
  renderHeader();
  renderRoofPlanes();
  renderMedia();
  renderDesign();
  renderRecommendation();
  renderEmailDraft();
  drawSignature();
}

function renderHeader() {
  const s = state.survey;
  $('appVersion').textContent = APP_VERSION;
  $('connectionStatus').textContent = state.online ? 'Online' : 'Offline ready';
  $('connectionStatus').className = state.online ? 'pill online' : 'pill offline';
  $('surveyTitle').textContent = s?.customer?.name ? `Survey - ${s.customer.name}` : 'Solar Survey Pro v2';
  $('surveyMeta').textContent = s ? `${s.customer.address || 'Address not set'} | ${mediaCountText()} | ${quoteSummary().totalText}` : 'No survey loaded';
  $('activeSurveyId').textContent = s ? `Survey ID ${s.id}` : 'No active survey';
}

function setSaveStatus(text) {
  $('saveState').textContent = text;
  $('saveState').className = 'pill saved';
}

function go(panel) {
  $$('.navBtn').forEach(btn => btn.classList.toggle('active', btn.dataset.panel === panel));
  $$('.screen').forEach(section => section.classList.toggle('active', section.id === panel));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (panel === 'recommend') renderRecommendation();
  if (panel === 'finish') renderEmailDraft();
}

function renderSavedSurveys() {
  listSurveys().then(surveys => {
    const box = $('savedSurveys');
    if (!surveys.length) {
      box.innerHTML = '<div class="empty">No saved v2 surveys yet.</div>';
      return;
    }
    box.innerHTML = surveys.map(s => `
      <article class="savedCard">
        <div><b>${esc(s.customer?.name || 'Untitled survey')}</b><span>${esc(s.customer?.address || 'No address')}<br>Updated ${new Date(s.updatedAt || s.createdAt).toLocaleString()}</span></div>
        <div class="rowActions">
          <button data-open-survey="${esc(s.id)}">Open</button>
          <button class="ghost danger" data-delete-survey="${esc(s.id)}">Delete</button>
        </div>
      </article>
    `).join('');
  });
}

function panel() {
  const key = state.survey?.design?.panelKey || 'aiko540';
  const p = CATALOG.panels[key] || CATALOG.panels.aiko540;
  const override = number(state.survey?.design?.panelCostOverride);
  return { ...p, key, cost: override > 0 ? override : p.cost };
}

function kwp() {
  return (number(state.survey?.design?.panelCount) * panel().watts) / 1000;
}

function roofSuggestionTotal() {
  return (state.survey?.site?.roofPlanes || []).reduce((sum, roof) => sum + number(roof.manualPanels || roof.suggestedPanels), 0);
}

function updateRoofSuggestions() {
  computeRoofSuggestions();
  updateRoofResultText();
  renderDesign();
  scheduleSave();
}

function computeRoofSuggestions() {
  const p = panel();
  const margin = 0.08;
  (state.survey.site.roofPlanes || []).forEach(roof => {
    const width = number(roof.width);
    const slope = number(roof.slope);
    if (!width || !slope || roof.manualPanels) return;
    const across = Math.floor(width / ((p.widthMm / 1000) + margin));
    const up = Math.floor(slope / ((p.heightMm / 1000) + margin));
    roof.suggestedPanels = Math.max(0, across * up);
  });
}

function updateRoofResultText() {
  $$('#roofPlaneList .roofCard').forEach(card => {
    const roof = state.survey.site.roofPlanes[number(card.dataset.roofIndex)];
    const result = card.querySelector('.roofResult');
    const manual = number(roof?.manualPanels);
    if (result) result.textContent = `Suggestion: ${roof?.suggestedPanels || 0} panels. ${manual ? `Using manual value: ${manual}.` : 'Manual value always wins.'}`;
    const overrideInput = card.querySelector('[data-roof-field="manualPanels"]');
    if (overrideInput) overrideInput.placeholder = String(roof?.suggestedPanels || 0);
  });
}

function renderRoofPlanes() {
  const list = $('roofPlaneList');
  const roofs = state.survey?.site?.roofPlanes || [];
  if (state.survey) computeRoofSuggestions();
  list.innerHTML = roofs.map((roof, index) => `
    <div class="roofCard" data-roof-index="${index}">
      <div class="roofHead"><b>Roof ${index + 1}</b><button class="ghost" data-remove-roof="${index}">Remove</button></div>
      <label>Name<input data-roof-field="name" value="${esc(roof.name || '')}" placeholder="Rear roof"></label>
      <label>Width m<input data-roof-field="width" type="number" step="0.1" value="${esc(roof.width || '')}"></label>
      <label>Slope m<input data-roof-field="slope" type="number" step="0.1" value="${esc(roof.slope || '')}"></label>
      <label>Pitch degrees<input data-roof-field="pitch" type="number" value="${esc(roof.pitch || '')}"></label>
      <label>Azimuth<input data-roof-field="azimuth" type="number" value="${esc(roof.azimuth || '')}"></label>
      <label>Panels here override<input data-roof-field="manualPanels" type="number" value="${esc(roof.manualPanels || '')}" placeholder="${roof.suggestedPanels || 0}"></label>
      <div class="roofResult">Suggestion: ${roof.suggestedPanels || 0} panels. Manual value always wins.</div>
    </div>
  `).join('');
}

function renderDesign() {
  const s = state.survey;
  if (!s) return;
  const p = panel();
  const suggestion = roofSuggestionTotal();
  $('roofSuggestion').textContent = `${suggestion} panel suggestion from roof measurements`;
  $('panelCountMode').textContent = s.design.panelCountMode === 'auto' ? 'Using roof suggestion' : 'Manual panel count';
  $('selectedPanelMeta').textContent = `${p.name} | ${p.watts}W | ${p.heightMm} x ${p.widthMm} mm | internal ${money(p.cost)}`;
  $('p6DealBox').hidden = p.key !== 'sunpowerP6_405';
  $$('[data-battery-card]').forEach(card => {
    const selected = card.dataset.batteryCard === s.design.batteryBrand;
    card.classList.toggle('selected', selected);
  });
  $('sigConfig').hidden = s.design.batteryBrand !== 'Sigenergy';
  $('teslaConfig').hidden = s.design.batteryBrand !== 'Tesla';
  const q = calculateQuote();
  $('quoteLive').innerHTML = quoteCardHtml(q);
}

function quoteSummary() {
  if (!state.survey) return { totalText:'No quote', total:0 };
  const q = calculateQuote();
  return { totalText: money(q.total), total:q.total };
}

function calculateQuote() {
  const s = state.survey || defaultSurvey();
  const d = s.design;
  const p = panel();
  const hasSolar = !!d.solar && number(d.panelCount) > 0;
  const hasBattery = !!d.battery && d.batteryBrand !== 'None';
  const panelCount = number(d.panelCount);
  const kWpValue = (panelCount * p.watts) / 1000;
  const panelCost = hasSolar ? panelCount * p.cost : 0;
  const tigoQty = hasSolar && d.tigo ? Math.min(panelCount, number(d.tigoQty)) : 0;
  const optimiserCost = tigoQty * (number(d.tigoPrice) || CATALOG.extras.tigo);
  const framingCost = hasSolar ? panelCount * (CATALOG.mounting[d.mounting] || CATALOG.mounting['Plain Tile']) : 0;
  const battery = batteryCost(kWpValue);
  const inverterCost = hasBattery ? battery.inverterCost : 0;
  const batteryHardware = hasBattery ? battery.cost : 0;
  const keyMaterials = panelCost + optimiserCost + framingCost + inverterCost + batteryHardware;
  const installDays = hasSolar ? framingDays(d.mounting, panelCount) : 0;
  const labour = (installDays * CATALOG.extras.labour.pvInstaller) +
    (installDays * CATALOG.extras.labour.pvLabourer) +
    (((hasSolar ? 1 : 0) + (hasBattery ? 2 : 0) + (d.ev ? 1 : 0)) * CATALOG.extras.labour.electrician) +
    ((hasSolar && hasBattery ? 0.5 : 0.25) * CATALOG.extras.labour.pm) +
    (0.25 * CATALOG.extras.labour.designer) +
    (0.25 * CATALOG.extras.labour.admin);
  const carriage = (kWpValue > 8 || sigModuleCount() > 1 || number(d.teslaDcQty) > 0) ? CATALOG.extras.carriage * 2 : CATALOG.extras.carriage;
  const scaffold = scaffoldCost(number(d.scaffoldLifts), hasSolar);
  const spds = d.spds ? CATALOG.extras.spdSingle : 0;
  const bird = hasSolar && d.bird ? panelCount * CATALOG.extras.birdPerPanel : 0;
  const ev = d.ev ? number(d.zappiPrice || CATALOG.extras.zappi) : 0;
  const eddi = d.eddi ? number(d.eddiPrice || CATALOG.extras.eddi) : 0;
  const otherExtra = d.otherExtra ? number(d.otherExtraPrice) : 0;
  const other = CATALOG.extras.otherCosts;
  const totalCost = keyMaterials + labour + carriage + scaffold + spds + bird + ev + eddi + otherExtra + other;
  const calculatedTotal = (totalCost * (1 + CATALOG.margin.markup + CATALOG.margin.salesCommission + CATALOG.margin.marketing)) - number(d.manualDiscount);
  const total = number(d.finalPriceOverride) > 0 ? number(d.finalPriceOverride) : calculatedTotal;
  return {
    panel:p, panelCount, kWp:kWpValue, hasSolar, hasBattery, panelCost, optimiserCost, framingCost, inverterCost,
    batteryHardware, batteryText:battery.text, batteryStorage:battery.storage, controllerText:battery.controllerText,
    keyMaterials, labour, carriage, scaffold, spds, bird, ev, eddi, otherExtra, other, totalCost, calculatedTotal, total,
    override:number(d.finalPriceOverride), discount:number(d.manualDiscount), tigoQty
  };
}

function sigModuleCount() {
  const d = state.survey?.design || {};
  return number(d.sig6Qty) + number(d.sig10Qty);
}

function batteryCost(kWpValue) {
  const d = state.survey?.design || {};
  if (d.batteryBrand === 'Tesla') {
    const pw3 = Math.min(4, number(d.teslaPw3Qty));
    const dc = Math.min(3, number(d.teslaDcQty));
    const gateway = d.teslaGateway ? 1 : 0;
    const cost = (pw3 * number(d.teslaPw3Cost || CATALOG.tesla.pw3Cost)) +
      (dc * number(d.teslaDcCost || CATALOG.tesla.dcExpansionCost)) +
      (gateway * number(d.teslaGatewayCost || CATALOG.tesla.gatewayCost)) -
      number(d.teslaDiscount);
    const storage = (pw3 * CATALOG.tesla.pw3Storage) + (dc * CATALOG.tesla.dcStorage);
    const parts = [];
    if (pw3) parts.push(`${pw3} x Powerwall 3`);
    if (dc) parts.push(`${dc} x DC Expansion`);
    if (gateway) parts.push('Backup Gateway');
    return { cost:Math.max(0,cost), text:parts.join(' + ') || 'Tesla route selected', storage, inverterCost:0, controllerText:`${storage.toFixed(1)} kWh nominal Tesla storage` };
  }
  if (d.batteryBrand === 'Sigenergy') {
    const six = Math.min(6, number(d.sig6Qty));
    const ten = Math.min(6, number(d.sig10Qty));
    const moduleCount = six + ten;
    const sixCost = number(d.sig6Cost || CATALOG.sigenergy.bat6.cost);
    const tenCost = number(d.sig10Cost || CATALOG.sigenergy.bat10.cost);
    const gateway = d.sigGateway && moduleCount ? number(d.sigGatewayCost || CATALOG.sigenergy.gatewayCost) : 0;
    const storage = (six * CATALOG.sigenergy.bat6.nominal) + (ten * CATALOG.sigenergy.bat10.nominal);
    const usable = (six * CATALOG.sigenergy.bat6.usable) + (ten * CATALOG.sigenergy.bat10.usable);
    const controller = sigControllerCost(kWpValue);
    const parts = [];
    if (ten) parts.push(`${ten} x BAT 10.0`);
    if (six) parts.push(`${six} x BAT 6.0`);
    return {
      cost:(six * sixCost) + (ten * tenCost) + gateway,
      text:parts.join(' + ') || 'Sigenergy selected',
      storage,
      usable,
      inverterCost:controller.cost,
      controllerText:controller.text
    };
  }
  return { cost:0, text:'No battery selected', storage:0, inverterCost:0, controllerText:'' };
}

function sigControllerCost(kWpValue) {
  const d = state.survey?.design || {};
  if (d.sigControllerMode === 'manual') {
    const selected = CATALOG.sigenergy.controllers.find(c => c.id === d.sigController) || CATALOG.sigenergy.controllers[0];
    return { cost:selected.cost, text:`Controller selected manually: ${selected.name}` };
  }
  const size = sigPvBand(kWpValue);
  return { cost:CATALOG.sigenergy.pvInverters[size] || 0, text:`PV inverter auto-sized to ${size} kW` };
}

function sigPvBand(kWpValue) {
  const s = number(kWpValue);
  if (s < 2) return 0;
  if (s < 3) return 3;
  if (s < 4) return 4;
  if (s < 6) return 5;
  if (s < 8) return 8;
  if (s < 10) return 10;
  if (s < 12) return 12;
  if (s < 14) return 14;
  if (s < 16) return 16;
  if (s < 18) return 18;
  return 20;
}

function framingDays(type, count) {
  const arr = CATALOG.framingDays[type] || CATALOG.framingDays.default;
  return arr[Math.max(0, Math.min(Math.round(number(count)), arr.length - 1))] || 0;
}

function scaffoldCost(lifts, hasSolar) {
  if (!hasSolar || lifts <= 0) return 0;
  if (lifts === 1) return CATALOG.extras.scaffoldFirstLift;
  return CATALOG.extras.scaffoldFirstLift + ((lifts - 1) * CATALOG.extras.scaffoldExtraFactor * CATALOG.extras.scaffoldFirstLift);
}

function quoteCardHtml(q) {
  return `
    <div class="quoteBig">${money(q.total)}</div>
    <div class="muted">${q.override ? 'Manual final price override active' : `Calculated from ${CATALOG.pricingVersion}`}</div>
    <div class="quoteGrid">
      <span>${q.panelCount} x ${esc(q.panel.name)}</span><b>${q.kWp.toFixed(2)} kWp</b>
      <span>Battery</span><b>${esc(q.batteryText)}</b>
      <span>Mounting</span><b>${esc(state.survey.design.mounting)}</b>
      <span>Labour</span><b>${money(q.labour)}</b>
      <span>Scaffold/access</span><b>${money(q.scaffold)}</b>
      <span>Extras</span><b>${money(q.ev + q.eddi + q.otherExtra + q.bird)}</b>
    </div>`;
}

function renderRecommendation() {
  if (!state.survey) return;
  const s = state.survey;
  const q = calculateQuote();
  const perf = estimatePerformance(q);
  $('recommendationCard').innerHTML = `
    <section class="customerDoc">
      <div class="docHero">
        <span>The Little Green Energy Company</span>
        <h2>${esc(s.customer.name || 'Your solar recommendation')}</h2>
        <p>${esc(s.customer.address || 'Prepared from the home survey')}</p>
      </div>
      <div class="docGrid">
        <div><small>Recommended system</small><b>${q.panelCount} x ${esc(q.panel.name)}</b><span>${q.kWp.toFixed(2)} kWp solar PV</span></div>
        <div><small>Storage</small><b>${esc(q.batteryText)}</b><span>${q.controllerText ? esc(q.controllerText) : 'Battery route can be adjusted'}</span></div>
        <div><small>Proposal position</small><b>${money(q.total)}</b><span>${q.override ? 'Manual price agreed by surveyor' : 'Subject to final checks'}</span></div>
      </div>
      <div class="docBenefits">
        <div><small>Estimated generation</small><b>${perf.generation.toLocaleString('en-GB')} kWh/year</b></div>
        <div><small>Estimated benefit</small><b>${money(perf.annualBenefit)} / year</b></div>
        <div><small>Simple payback guide</small><b>${perf.payback ? `${perf.payback.toFixed(1)} years` : 'Needs usage data'}</b></div>
      </div>
      <h3>Why this fits</h3>
      <p>${esc(s.priorities.wants || 'The recommendation is based on the goals and site details captured during the survey.')}</p>
      <ul>
        <li>${esc(customerFitLine(s, q))}</li>
        <li>Photos and videos are saved to this survey for the handover pack.</li>
        <li>Final design remains subject to technical checks, access and DNO where required.</li>
      </ul>
    </section>`;
  $('internalBreakdown').innerHTML = quoteCardHtml(q);
  renderEmailDraft();
}

function estimatePerformance(q = calculateQuote()) {
  const annualUsage = number(state.survey?.energy?.annualKwh);
  const importRate = number(state.survey?.energy?.importRate) || 28;
  const exportRate = number(state.survey?.energy?.exportRate) || 15;
  const selfUsePct = Math.min(100, Math.max(0, number(state.survey?.energy?.selfUsePct) || 75));
  const generation = Math.round(q.kWp * 850);
  const selfUse = Math.min(annualUsage || generation, Math.round(generation * selfUsePct / 100));
  const exportKwh = Math.max(0, generation - selfUse);
  const annualBenefit = Math.round((selfUse * importRate / 100) + (exportKwh * exportRate / 100));
  return { generation, selfUse, exportKwh, annualBenefit, payback: annualBenefit ? q.total / annualBenefit : 0 };
}

function customerFitLine(s, q) {
  const bits = [];
  if (q.hasSolar) bits.push(`${q.kWp.toFixed(2)} kWp solar PV`);
  if (q.hasBattery) bits.push(q.batteryText);
  if (s.energy?.backup) bits.push('backup requirement considered');
  if (s.energy?.ev || s.design?.ev) bits.push('EV usage considered');
  return bits.length ? `Recommended route: ${bits.join(', ')}.` : 'The final route can be adjusted from the survey data.';
}

function syncUsage(changed) {
  const e = state.survey.energy;
  if (changed === 'annual' && number(e.annualKwh)) {
    e.dailyKwh = (number(e.annualKwh) / 365).toFixed(1);
    if ($('dailyKwh')) $('dailyKwh').value = e.dailyKwh;
  }
  if (changed === 'daily' && number(e.dailyKwh)) {
    e.annualKwh = Math.round(number(e.dailyKwh) * 365);
    if ($('annualKwh')) $('annualKwh').value = e.annualKwh;
  }
}

function updateProductOverride(target) {
  const key = target.dataset.productCost;
  if (key && CATALOG.panels[key]) CATALOG.panels[key].cost = number(target.value) || CATALOG.panels[key].cost;
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quote = false;
  const input = String(text || '').replace(/\r\n/g, '\n');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i], next = input[i + 1];
    if (ch === '"' && quote && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { quote = !quote; continue; }
    if (ch === ',' && !quote) { row.push(cell); cell = ''; continue; }
    if (ch === '\n' && !quote) { row.push(cell); if (row.some(v => clean(v))) rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  row.push(cell);
  if (row.some(v => clean(v))) rows.push(row);
  return rows.map(r => r.map(c => clean(c)));
}

function extractCSV(text) {
  const raw = String(text || '');
  const block = raw.match(/(?:```|''')\s*(?:csv)?\s*([\s\S]*?)(?:```|''')/i);
  if (block) return block[1].trim();
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex(line => /(^|\b)(field\s*,\s*value|name\s*,|customer|contact|address)/i.test(line));
  return (start >= 0 ? lines.slice(start).join('\n') : raw).trim();
}

function objectFromMonday(text) {
  const rows = parseCSV(extractCSV(text));
  if (!rows.length) return {};
  const h0 = (rows[0][0] || '').toLowerCase();
  const h1 = (rows[0][1] || '').toLowerCase();
  if (h0 === 'field' && h1 === 'value') {
    const obj = {};
    rows.slice(1).forEach(r => { if (r[0]) obj[r[0]] = r.slice(1).join(', '); });
    return obj;
  }
  const headers = rows[0];
  const data = rows.slice(1).find(r => r.some(Boolean)) || [];
  const obj = {};
  headers.forEach((h, i) => obj[h] = data[i] || '');
  return obj;
}

function findField(obj, names) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const keys = Object.keys(obj || {});
  for (const name of names) {
    const wanted = norm(name);
    const key = keys.find(k => norm(k) === wanted || norm(k).includes(wanted) || wanted.includes(norm(k)));
    if (key && clean(obj[key])) return clean(obj[key]);
  }
  return '';
}

async function importMonday() {
  const obj = objectFromMonday($('mondayPaste').value);
  const name = findField(obj, ['Name','Customer Name','Contact Name','Client','Item Name']);
  const address = [findField(obj, ['Site Address','Address','Property Address','Location']), findField(obj, ['Post Code','Postcode','Site Post Code'])].filter(Boolean).join(', ');
  const seed = {
    customer: {
      name,
      address,
      phone: findField(obj, ['Contact Number','Phone','Telephone','Mobile']),
      email: findField(obj, ['Contact Email','Email','Email Address']),
      mondayId: findField(obj, ['Item ID','Pulse ID','ID','monday item ID']),
      leadSource: findField(obj, ['Lead Source','Source','Channel']),
      appointmentTime: findField(obj, ['Survey Scheduled','Appointment Time','Appointment']),
      crmStatus: findField(obj, ['Lead Status','Status','CRM status','Stage']),
      notes: findField(obj, ['Qualification Notes','Notes','CRM notes','Lead Notes'])
    },
    priorities: {
      wants: findField(obj, ['Reason for Install','Why now','Motivation','Interest']),
      timing: findField(obj, ['Timescale','Timing']),
      competitors: findField(obj, ['Other quotes','Competitors'])
    },
    energy: { annualKwh: findField(obj, ['Energy Usage','Annual kWh','Usage']) }
  };
  await startSurvey(seed);
  $('mondayStatus').textContent = name ? `Imported ${name}` : 'Imported Monday details. Check the customer page.';
}

async function addMedia(files, category = state.pendingCategory) {
  if (!state.survey) await startSurvey();
  const store = await tx('media', 'readwrite');
  for (const file of Array.from(files || [])) {
    const item = {
      id: uid('media'),
      surveyId: state.survey.id,
      name: safeFileName(file.name || `${category}_${Date.now()}`),
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
      category,
      note: '',
      createdAt: new Date().toISOString(),
      blob: file
    };
    await request(store.put(item));
  }
  state.media = await mediaForSurvey(state.survey.id);
  renderMedia();
  await saveSurvey();
}

async function mediaForSurvey(surveyId) {
  const store = await tx('media');
  const items = await request(store.index('surveyId').getAll(surveyId));
  return items.sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function safeFileName(name) {
  return String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 90) || 'file';
}

function mediaCountText() {
  const count = state.media.length;
  return `${count} file${count === 1 ? '' : 's'} saved`;
}

function renderMedia() {
  $('mediaCount').textContent = mediaCountText();
  const box = $('mediaGrid');
  if (!state.media.length) {
    box.innerHTML = '<div class="empty">No photos or videos saved yet.</div>';
    return;
  }
  box.innerHTML = state.media.map((item, index) => {
    const url = URL.createObjectURL(item.blob);
    const preview = item.type.startsWith('image/')
      ? `<img src="${url}" alt="${esc(item.name)}">`
      : item.type.startsWith('video/')
        ? `<video src="${url}" controls playsinline muted></video>`
        : `<div class="fileIcon">${esc(item.type || 'file')}</div>`;
    return `<article class="mediaItem" data-media-id="${esc(item.id)}">
      <div class="thumb">${preview}</div>
      <b>${String(index + 1).padStart(2,'0')} ${esc(item.category)}</b>
      <span>${esc(item.name)} | ${Math.round((item.size || 0) / 1024)} KB</span>
      <div class="rowActions">
        ${item.type.startsWith('image/') ? `<button data-markup="${esc(item.id)}">Mark up</button>` : ''}
        <button class="ghost danger" data-remove-media="${esc(item.id)}">Remove</button>
      </div>
    </article>`;
  }).join('');
}

async function removeMedia(id) {
  const store = await tx('media', 'readwrite');
  await request(store.delete(id));
  state.media = await mediaForSurvey(state.survey.id);
  renderMedia();
  await saveSurvey();
}

function renderEmailDraft() {
  if (!state.survey) return;
  const s = state.survey;
  const q = calculateQuote();
  $('emailDraft').value = [
    `Hi ${firstName(s.customer.name) || 'there'},`,
    '',
    'Thank you for going through the survey.',
    '',
    `I have attached the survey recommendation pack for ${s.customer.address || 'your property'}. The current proposal position is ${money(q.total)}, subject to final technical checks.`,
    '',
    s.acceptance.nextAction || 'I will send the formal quote and next steps.',
    '',
    'Kind regards,',
    'James Cooling',
    'The Little Green Energy Company'
  ].join('\n');
}

function firstName(name) {
  return clean(name).split(/\s+/)[0] || '';
}

function customerStem() {
  const parts = clean(state.survey?.customer?.name || 'survey').split(/\s+/);
  if (parts.length > 1) return `${parts[parts.length - 1]}_${parts.slice(0, -1).join('_')}`.toLowerCase();
  return parts[0].toLowerCase() || 'survey';
}

function customerRecommendationHtml() {
  renderRecommendation();
  return `<!doctype html><html><head><meta charset="utf-8"><title>Survey recommendation</title><style>${documentCssForExport()}</style></head><body>${$('recommendationCard').innerHTML}</body></html>`;
}

async function copyDesignedEmail() {
  if (!state.survey) return;
  const html = customerRecommendationHtml();
  const plain = $('emailDraft').value;
  try {
    if (window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type:'text/html' }),
          'text/plain': new Blob([plain], { type:'text/plain' })
        })
      ]);
      $('finishNotice').innerHTML = '<b>Designed email copied.</b> Paste into Outlook to keep the styled recommendation.';
      return;
    }
  } catch (error) {
    console.warn('HTML clipboard failed, falling back to plain text', error);
  }
  await navigator.clipboard?.writeText(plain);
  $('finishNotice').innerHTML = '<b>Email text copied.</b> Styled HTML copy was not available in this browser.';
}

function internalSummaryText() {
  const s = state.survey;
  const q = calculateQuote();
  return [
    `Customer: ${s.customer.name}`,
    `Address: ${s.customer.address}`,
    `Phone: ${s.customer.phone}`,
    `Email: ${s.customer.email}`,
    '',
    `Goal: ${s.priorities.wants}`,
    `Finance: ${s.priorities.financePlan} ${s.priorities.financeNote}`,
    `Decision makers: ${s.priorities.decisionMakers}`,
    '',
    `Roof: ${s.site.roof}`,
    `Shading: ${s.site.shade}`,
    `Battery location: ${s.site.batteryLocation}`,
    `Meter/CU: ${s.site.meter}`,
    `Cable route: ${s.site.cableRoute}`,
    `Access: ${s.site.access}`,
    '',
    `Design: ${q.panelCount} x ${q.panel.name} (${q.kWp.toFixed(2)} kWp)`,
    `Battery: ${q.batteryText}`,
    `Price: ${money(q.total)}`,
    `Manual override: ${q.override ? 'Yes' : 'No'}`,
    '',
    `Media files: ${state.media.length}`
  ].join('\n');
}

async function exportPack() {
  if (!state.survey) return;
  await flushSave();
  const stem = customerStem();
  const root = `${stem}_survey_pack_${new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')}`;
  const files = [];
  files.push(textEntry(`${root}/00_customer_recommendation.html`, customerRecommendationHtml(), 'text/html'));
  files.push(textEntry(`${root}/01_internal_summary.txt`, internalSummaryText(), 'text/plain'));
  files.push(textEntry(`${root}/02_email_draft.txt`, $('emailDraft').value, 'text/plain'));
  files.push(textEntry(`${root}/03_survey_data.json`, JSON.stringify(state.survey, null, 2), 'application/json'));
  if (state.survey.acceptance.signatureData) files.push(dataUrlEntry(`${root}/04_signature.png`, state.survey.acceptance.signatureData));
  for (let i = 0; i < state.media.length; i++) {
    const item = state.media[i];
    const ext = extension(item);
    const name = `${root}/05_site_files/${String(i + 1).padStart(2,'0')}_${slug(item.category)}_${safeFileName(item.name || `file.${ext}`)}`;
    files.push(await blobEntry(name, item.blob, item.type));
  }
  const zip = buildZip(files);
  downloadBlob(zip, `${root}.zip`);
  $('finishNotice').innerHTML = `<b>Pack created.</b> ${state.media.length} site file${state.media.length === 1 ? '' : 's'} included.`;
}

function textEntry(name, text, type) {
  return { name, type, data:new TextEncoder().encode(text), date:new Date() };
}

function dataUrlEntry(name, dataUrl) {
  const [, data] = dataUrl.split(',');
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { name, type:'image/png', data:bytes, date:new Date() };
}

async function blobEntry(name, blob, type) {
  return { name, type:type || blob.type || 'application/octet-stream', data:new Uint8Array(await blob.arrayBuffer()), date:new Date() };
}

function extension(item) {
  if (item.name && item.name.includes('.')) return item.name.split('.').pop().toLowerCase();
  if (item.type.includes('jpeg')) return 'jpg';
  if (item.type.includes('png')) return 'png';
  if (item.type.includes('mp4')) return 'mp4';
  if (item.type.includes('quicktime')) return 'mov';
  if (item.type.includes('pdf')) return 'pdf';
  return 'bin';
}

function slug(value) {
  return String(value || 'file').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'file';
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const chunks = [], central = [];
  const enc = new TextEncoder();
  let offset = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255];
  const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const dos = date => {
    const d = date || new Date();
    return {
      time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | (Math.floor(d.getSeconds() / 2) & 31),
      date: (((Math.max(1980, d.getFullYear()) - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
    };
  };
  entries.forEach(entry => {
    const name = enc.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data || []);
    const crc = crc32(data), dt = dos(entry.date), flags = 0x0800;
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(flags), ...u16(0), ...u16(dt.time), ...u16(dt.date), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    chunks.push(local, name, data);
    const header = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(flags), ...u16(0), ...u16(dt.time), ...u16(dt.date), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]);
    central.push(header, name);
    offset += local.length + name.length + data.length;
  });
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const eocd = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  return new Blob([...chunks, ...central, eocd], { type:'application/zip' });
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function documentCssForExport() {
  return 'body{font-family:Arial,Helvetica,sans-serif;background:#eef6ef;color:#08261a;margin:0;padding:24px}.customerDoc{max-width:960px;margin:0 auto;background:white;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(6,40,25,.16)}.docHero{background:linear-gradient(135deg,#062819,#0b7a46 65%,#9bd927);color:white;padding:34px}.docHero span{text-transform:uppercase;letter-spacing:.12em;color:#dfffbc;font-weight:900}.docHero h2{font-size:44px;margin:10px 0}.docHero p{color:#ecfff4}.docGrid,.docBenefits{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:22px}.docGrid div,.docBenefits div{border:1px solid #dbe8dc;border-radius:18px;padding:16px;background:#fbfffb}.docBenefits{padding-top:0}.docGrid small,.docBenefits small{display:block;text-transform:uppercase;color:#0b7a46;font-weight:900}.docGrid b,.docBenefits b{display:block;font-size:22px;margin:8px 0}.customerDoc h3,.customerDoc p,.customerDoc ul{margin-left:24px;margin-right:24px}.customerDoc li{margin:8px 0}@media(max-width:760px){.docGrid,.docBenefits{grid-template-columns:1fr}.docHero h2{font-size:34px}}';
}

function setupSignature() {
  const canvas = $('signatureCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(500, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.floor(180 * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    drawSignature();
  };
  window.addEventListener('resize', resize);
  resize();
  let drawing = false, last = null;
  const pos = event => {
    const rect = canvas.getBoundingClientRect();
    const t = event.touches ? event.touches[0] : event;
    return { x:t.clientX - rect.left, y:t.clientY - rect.top };
  };
  const start = event => { drawing = true; last = pos(event); event.preventDefault(); };
  const move = event => {
    if (!drawing) return;
    const p = pos(event);
    ctx.strokeStyle = '#08261a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    state.survey.acceptance.signatureData = canvas.toDataURL('image/png');
    scheduleSave();
    event.preventDefault();
  };
  const end = () => { drawing = false; if (state.survey) state.survey.acceptance.signatureData = canvas.toDataURL('image/png'); scheduleSave(); };
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive:false });
  canvas.addEventListener('touchmove', move, { passive:false });
  canvas.addEventListener('touchend', end);
}

function drawSignature() {
  const canvas = $('signatureCanvas');
  if (!canvas || !state.survey?.acceptance?.signatureData) return;
  const img = new Image();
  img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
  img.src = state.survey.acceptance.signatureData;
}

function clearSignature() {
  const canvas = $('signatureCanvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  state.survey.acceptance.signatureData = '';
  scheduleSave();
}

function markAccepted() {
  if (!state.survey) return;
  state.survey.acceptance.acceptedAt = new Date().toISOString();
  state.survey.acceptance.status = 'Accepted survey recommendation';
  saveSurvey();
  renderEmailDraft();
  $('finishNotice').innerHTML = '<b>Acceptance saved.</b> Download the pack when ready.';
}

function openMarkup(id) {
  const item = state.media.find(m => m.id === id);
  if (!item || !item.type.startsWith('image/')) return;
  markup.item = item;
  markup.actions = [];
  const img = new Image();
  img.onload = () => {
    markup.img = img;
    const canvas = $('markupCanvas');
    const maxWidth = Math.min(1100, img.naturalWidth);
    const scale = maxWidth / img.naturalWidth;
    canvas.width = maxWidth;
    canvas.height = Math.round(img.naturalHeight * scale);
    drawMarkup();
    $('markupModal').hidden = false;
  };
  img.src = URL.createObjectURL(item.blob);
}

function drawMarkup() {
  const canvas = $('markupCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(markup.img, 0, 0, canvas.width, canvas.height);
  markup.actions.forEach(action => {
    ctx.strokeStyle = action.color || '#e53935';
    ctx.fillStyle = action.color || '#e53935';
    ctx.lineWidth = 4;
    if (action.type === 'box') ctx.strokeRect(action.x, action.y, action.w, action.h);
    if (action.type === 'line') { ctx.beginPath(); ctx.moveTo(action.x, action.y); ctx.lineTo(action.x2, action.y2); ctx.stroke(); }
    if (action.type === 'label') {
      ctx.font = 'bold 24px Arial';
      const width = ctx.measureText(action.label).width + 24;
      ctx.fillStyle = 'white';
      ctx.fillRect(action.x, action.y - 30, width, 38);
      ctx.strokeStyle = action.color || '#e53935';
      ctx.strokeRect(action.x, action.y - 30, width, 38);
      ctx.fillStyle = action.color || '#e53935';
      ctx.fillText(action.label, action.x + 12, action.y - 4);
    }
  });
}

async function saveMarkupCopy() {
  const canvas = $('markupCanvas');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  const file = new File([blob], `marked_${markup.item.name.replace(/\.[^.]+$/, '')}.jpg`, { type:'image/jpeg' });
  await addMedia([file], markup.item.category || 'Other');
  $('markupModal').hidden = true;
}

function setupMarkup() {
  const canvas = $('markupCanvas');
  const pos = event => {
    const rect = canvas.getBoundingClientRect();
    const t = event.touches ? event.touches[0] : event;
    return { x:(t.clientX - rect.left) * (canvas.width / rect.width), y:(t.clientY - rect.top) * (canvas.height / rect.height) };
  };
  canvas.addEventListener('pointerdown', event => {
    if (!markup.item) return;
    const p = pos(event);
    if (markup.tool === 'label') {
      markup.actions.push({ type:'label', x:p.x, y:p.y, label:markup.label, color:markup.label.includes('Cable') ? '#f59f00' : '#e53935' });
      drawMarkup();
    } else {
      markup.start = p;
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (!markup.start) return;
    const p = pos(event);
    if (markup.tool === 'box') markup.actions.push({ type:'box', x:markup.start.x, y:markup.start.y, w:p.x - markup.start.x, h:p.y - markup.start.y, color:'#e53935' });
    if (markup.tool === 'line') markup.actions.push({ type:'line', x:markup.start.x, y:markup.start.y, x2:p.x, y2:p.y, color:'#f59f00' });
    markup.start = null;
    drawMarkup();
  });
}

async function exportBackup() {
  const surveys = await listSurveys();
  const media = await tx('media').then(store => request(store.getAll()));
  const data = { version:APP_VERSION, exportedAt:new Date().toISOString(), surveys, media:media.map(m => ({...m, blob:null})) };
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type:'application/json' }), `lg-survey-v2-backup-${Date.now()}.json`);
}

function setupEvents() {
  $$('.navBtn').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.panel)));
  $('startBlank').addEventListener('click', () => startSurvey());
  $('continueLast').addEventListener('click', async () => {
    const id = localStorage.getItem(ACTIVE_SURVEY_KEY);
    if (id && await loadSurvey(id)) go('customer');
  });
  $('importMonday').addEventListener('click', importMonday);
  $('savedSurveys').addEventListener('click', event => {
    const open = event.target.closest('[data-open-survey]');
    const del = event.target.closest('[data-delete-survey]');
    if (open) loadSurvey(open.dataset.openSurvey).then(() => go('customer'));
    if (del && confirm('Delete this v2 survey and its files from this device?')) deleteSurvey(del.dataset.deleteSurvey);
  });
  $('addRoof').addEventListener('click', () => {
    state.survey.site.roofPlanes.push({ id:uid('roof'), name:'Additional roof', width:'', slope:'', pitch:'', azimuth:'', suggestedPanels:0, manualPanels:'' });
    renderRoofPlanes();
    scheduleSave();
  });
  $('roofPlaneList').addEventListener('input', event => {
    const card = event.target.closest('[data-roof-index]');
    if (!card) return;
    const roof = state.survey.site.roofPlanes[number(card.dataset.roofIndex)];
    roof[event.target.dataset.roofField] = event.target.value;
    updateRoofSuggestions();
  });
  $('roofPlaneList').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-roof]');
    if (!remove) return;
    state.survey.site.roofPlanes.splice(number(remove.dataset.removeRoof), 1);
    renderRoofPlanes();
    scheduleSave();
  });
  $('useRoofSuggestion').addEventListener('click', () => {
    state.survey.design.panelCount = roofSuggestionTotal();
    state.survey.design.panelCountMode = 'auto';
    renderAll();
    saveSurvey();
  });
  $('panelCount').addEventListener('input', () => { state.survey.design.panelCountMode = 'manual'; $('panelCountMode').textContent = 'Manual panel count'; });
  $$('[data-battery-select]').forEach(btn => btn.addEventListener('click', () => {
    state.survey.design.batteryBrand = btn.dataset.batterySelect;
    renderDesign();
    saveSurvey();
  }));
  $('mediaCategories').addEventListener('click', event => {
    const btn = event.target.closest('.mediaCat');
    if (!btn) return;
    state.pendingCategory = btn.dataset.cat;
    $('mediaInput').click();
  });
  $('mediaInput').addEventListener('change', event => {
    addMedia(event.target.files, state.pendingCategory);
    event.target.value = '';
  });
  $('mediaGrid').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-media]');
    const mark = event.target.closest('[data-markup]');
    if (remove) removeMedia(remove.dataset.removeMedia);
    if (mark) openMarkup(mark.dataset.markup);
  });
  $('calculateQuote').addEventListener('click', () => { renderDesign(); renderRecommendation(); saveSurvey(); });
  $('clearSignature').addEventListener('click', clearSignature);
  $('acceptSurvey').addEventListener('click', markAccepted);
  $('downloadPack').addEventListener('click', exportPack);
  $('downloadFieldPack')?.addEventListener('click', exportPack);
  $('downloadBackup').addEventListener('click', exportBackup);
  $('copyEmail').addEventListener('click', () => navigator.clipboard?.writeText($('emailDraft').value));
  $('copyHtmlEmail')?.addEventListener('click', copyDesignedEmail);
  $('closeMarkup').addEventListener('click', () => $('markupModal').hidden = true);
  $('saveMarkup').addEventListener('click', saveMarkupCopy);
  $('undoMarkup').addEventListener('click', () => { markup.actions.pop(); drawMarkup(); });
  $$('[data-markup-tool]').forEach(btn => btn.addEventListener('click', () => markup.tool = btn.dataset.markupTool));
  $$('[data-markup-label]').forEach(btn => btn.addEventListener('click', () => { markup.tool = 'label'; markup.label = btn.dataset.markupLabel; }));
  window.addEventListener('online', () => { state.online = true; renderHeader(); });
  window.addEventListener('offline', () => { state.online = false; renderHeader(); });
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
}

async function init() {
  await openDb();
  bindForm();
  populateCatalogControls();
  setupEvents();
  setupSignature();
  setupMarkup();
  renderHeader();
  renderSavedSurveys();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
  const id = localStorage.getItem(ACTIVE_SURVEY_KEY);
  if (id) await loadSurvey(id);
  else setSaveStatus('Ready - start or import a survey');
}

function populateCatalogControls() {
  $('panelModel').innerHTML = Object.entries(CATALOG.panels).map(([key, p]) => `<option value="${key}">${p.name}</option>`).join('');
  $('mounting').innerHTML = Object.keys(CATALOG.mounting).map(name => `<option>${name}</option>`).join('');
  $('sigController').innerHTML = CATALOG.sigenergy.controllers.map(c => `<option value="${c.id}">${c.name} - ${money(c.cost)}</option>`).join('');
  $('mediaCategories').innerHTML = MEDIA_CATEGORIES.map(c => `<button class="mediaCat" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
}

document.addEventListener('DOMContentLoaded', init);
window.LGV2 = { calculateQuote, estimatePerformance, exportPack, loadSurvey, listSurveys, startSurvey, addMedia, mediaForSurvey, objectFromMonday, CATALOG };
