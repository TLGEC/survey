(function () {
  'use strict';

  const APP_VERSION = 'v3.0.0';
  const Catalog = window.LGV3Catalog;
  const Store = window.LGV3Store;
  const PRIORITIES = [
    'Reduce electricity bills',
    'Gain more control over energy costs',
    'Store more solar energy',
    'Prepare for an electric vehicle',
    'Improve backup or energy resilience',
    'Reduce environmental impact',
    'Make a long-term home investment',
    'Replace or expand an existing system',
    'Another reason'
  ];
  const FUNDING = ['Own savings / cash', 'Bank loan arranged', 'Exploring lending', 'Optional Hometree Finance route', 'Still considering'];
  const CONCERNS = ['Total price', 'Expected savings or payback', 'Roof or appearance', 'Battery size', 'Product choice', 'Installation disruption', 'Warranty or aftercare', 'Funding', 'Need to involve someone else', 'Comparing quotations', 'Timing', 'Another concern'];
  const MEDIA_CATEGORIES = ['Roof', 'Meter / fuse', 'Distribution board / CU', 'Battery / inverter location', 'Cable route', 'Access / scaffold', 'Customer document', 'Video walkthrough', 'Other'];
  const CUSTOMER_STAGES = ['welcome', 'priorities', 'energy', 'home', 'recap', 'recommendation', 'decision', 'confirmation'];
  const IMPORT_FIELDS = [
    ['ignore', 'Do not import'],
    ['customer.name', 'Customer name'],
    ['customer.address', 'Address'],
    ['customer.postcode', 'Postcode'],
    ['customer.email', 'Email'],
    ['customer.phone', 'Phone'],
    ['customer.appointmentTime', 'Appointment'],
    ['customer.mondayId', 'Monday item ID'],
    ['customer.crmStatus', 'Opportunity stage'],
    ['customer.notes', 'Customer / appointment notes'],
    ['customer.leadSource', 'Lead source'],
    ['energy.annualKwh', 'Annual electricity use'],
    ['energy.tariff', 'Current tariff'],
    ['priorities.ownWords', 'Known products or interests'],
    ['priorities.financeNote', 'Funding notes'],
    ['priorities.mainConcern', 'Previous concern or objection'],
    ['priorities.timing', 'Timescale']
  ];

  const $ = id => document.getElementById(id);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const clean = value => String(value == null ? '' : value).trim();
  const num = value => Number(value || 0) || 0;
  const money = value => `\u00a3${Math.round(num(value)).toLocaleString('en-GB')}`;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[ch]);
  const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  const clone = value => structuredClone(value);

  const state = {
    survey: null,
    media: [],
    mediaPreviewUrls: [],
    pendingCategory: 'Roof',
    importDraft: null,
    dirtyTimer: null,
    saving: false,
    pendingSave: false,
    online: navigator.onLine,
    currentView: 'surveyor',
    stageEnteredAt: Date.now(),
    markup: { item: null, img: null, actions: [], tool: 'label', label: 'Battery location', start: null }
  };

  function defaultSurvey() {
    const now = new Date().toISOString();
    return {
      id: uid('survey'),
      schemaVersion: 3,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      meta: {
        surveyorPanel: 'discover',
        customerStage: 'welcome',
        importedAt: '',
        importedValues: {},
        originalImport: null,
        information: {},
        recoveredCount: 0,
        visitStartedAt: now,
        visitCompletedAt: '',
        analyticsFlags: {}
      },
      customer: { name: '', address: '', postcode: '', phone: '', email: '', mondayId: '', leadSource: '', appointmentTime: '', crmStatus: '', notes: '' },
      priorities: {
        selected: [], primary: '', secondary: [], ownWords: '', goodResult: '', whyNow: '', mainConcern: '', concernStatus: 'Not raised',
        financePlan: '', financeNote: '', timing: '', decisionMakers: '', competitors: '', promises: '', blockers: ''
      },
      energy: {
        annualKwh: '', dailyKwh: '', annualSpend: '', tariff: '', importRate: 28, exportRate: 15, selfUsePct: 75,
        daytimeUse: '', overnightUse: '', exportStrategy: '', futureChanges: '', existingEquipment: '', existingSolar: false,
        existingBattery: false, heatPump: false, backup: false, ev: false
      },
      site: {
        generalNotes: '', supplyPhase: 'Estimated single phase', roofCovering: '', cableDistance: '', batteryLocation: '', cableRoute: '',
        access: '', scaffoldRequirement: 'Auto from roof width', outstandingChecks: '', routeAgreed: false,
        validation: { status: 'not-checked', checkedAt: '', capacity: 0, selectedCount: 0, warnings: [], method: '' },
        roofPlanes: [defaultRoof('Main roof')]
      },
      design: {
        systemType: 'solar-battery', solar: true, battery: true, panelKey: 'aiko495', panelCount: 0, panelCountMode: 'suggested',
        panelOverrideReason: '', orientation: 'Best fit', mounting: 'Plain Tile', bird: true, tigo: false, tigoQty: 0,
        batteryBrand: 'Sigenergy', sig6Qty: 0, sig10Qty: 1, sigGateway: true, sigController: 'Auto-size from design',
        teslaPw3Qty: 1, teslaDcQty: 0, teslaGateway: true, batteryReason: '',
        reasonForRecommendation: '', limitations: '', warrantyInfo: '', alternativeConsidered: '', customerRequestedChanges: '',
        inclusions: 'System design, installation and commissioning, bird protection where solar is included, relevant electrical protection and DNO process.',
        scaffoldLifts: 0, finalPriceOverride: 0, priceAuthorised: false, priceAuthorityNote: '', manualDiscount: 0, discountAuthorisation: ''
      },
      decision: {
        status: 'Not discussed', concernCategory: '', concernDetail: '', concernStatus: 'Not raised', nextAction: 'Prepare the formal quote for review and e-signing',
        owner: 'James', expectedTiming: '', recommendationChangedAfterPresentation: false
      },
      confirmation: {
        recapConfirmed: false, prioritiesUnderstood: false, layoutConfirmed: false, batteryConfirmed: false,
        recommendationConfirmed: false, recordedAt: '', formalQuoteStatus: 'Not prepared'
      },
      outputs: { customerSummaryAt: '', internalPackAt: '', crmCopiedAt: '', emailOpenedAt: '' },
      pendingActions: []
    };
  }

  function defaultRoof(name = 'Roof area') {
    return {
      id: uid('roof'), name, width: '', slope: '', pitch: '', azimuth: '', shading: '', obstructions: '',
      suggestedPanels: 0, portraitPanels: 0, landscapePanels: 0, bestOrientation: '', manualPanels: '',
      reducedMarginConfirmed: false, fitState: 'estimated'
    };
  }

  function deepMerge(base, patch) {
    const out = clone(base);
    const merge = (target, source) => {
      Object.entries(source || {}).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Blob)) {
          if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
          merge(target[key], value);
        } else if (value !== undefined) target[key] = value;
      });
    };
    merge(out, patch);
    return out;
  }

  function migrateSurvey(raw) {
    if (!raw) return null;
    const migrated = deepMerge(defaultSurvey(), raw);
    migrated.id = raw.id;
    migrated.createdAt = raw.createdAt || migrated.createdAt;
    migrated.updatedAt = raw.updatedAt || migrated.updatedAt;
    migrated.schemaVersion = 3;
    migrated.site.roofPlanes = (raw.site?.roofPlanes || migrated.site.roofPlanes).map((roof, index) => deepMerge(defaultRoof(roof.name || `Roof ${index + 1}`), roof));
    if (!migrated.priorities.ownWords && clean(raw.priorities?.wants)) migrated.priorities.ownWords = clean(raw.priorities.wants);
    if (!migrated.priorities.mainConcern && clean(raw.priorities?.blockers)) migrated.priorities.mainConcern = clean(raw.priorities.blockers);
    if (raw.acceptance) {
      if (migrated.decision.status === 'Not discussed' && clean(raw.acceptance.customerView)) migrated.decision.status = clean(raw.acceptance.customerView);
      if (!migrated.decision.concernDetail) migrated.decision.concernDetail = clean(raw.acceptance.blocker || raw.acceptance.note);
      if (!migrated.decision.nextAction) migrated.decision.nextAction = clean(raw.acceptance.nextAction);
    }
    if (raw.design?.panelKey === 'aiko540' && !raw.design?.panelCount) migrated.design.panelKey = 'aiko495';
    if (raw.design?.batteryBrand === 'None') migrated.design.systemType = migrated.design.solar ? 'solar-only' : 'battery-only';
    migrated.legacy = raw.schemaVersion === 3 ? raw.legacy : { migratedFrom: raw.schemaVersion || 2, acceptance: raw.acceptance || null };
    return migrated;
  }

  function setPath(object, path, value) {
    const keys = path.split('.');
    let cursor = object;
    keys.slice(0, -1).forEach(key => { cursor[key] = cursor[key] || {}; cursor = cursor[key]; });
    cursor[keys[keys.length - 1]] = value;
  }

  function getPath(object, path, fallback = '') {
    const result = path.split('.').reduce((cursor, key) => cursor && cursor[key] !== undefined ? cursor[key] : undefined, object);
    return result === undefined || result === null ? fallback : result;
  }

  function fieldValue(element) {
    if (element.type === 'checkbox') return !!element.checked;
    if (element.type === 'number') return element.value === '' ? '' : num(element.value);
    if (element.dataset.bind === 'design.sigGateway') return element.value === 'true';
    return element.value;
  }

  async function saveSurvey(reason = 'change') {
    clearTimeout(state.dirtyTimer);
    if (!state.survey) return null;
    if (state.saving) { state.pendingSave = true; return state.survey; }
    state.saving = true;
    setSaveStatus('Saving locally…', 'saving');
    try {
      state.survey.updatedAt = new Date().toISOString();
      await Store.putSurvey(clone(state.survey));
      setSaveStatus(`Saved locally ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 'saved');
      if (reason !== 'silent') renderSavedSurveys();
      return state.survey;
    } catch (error) {
      console.error(error);
      setSaveStatus('Save failed. Keep this page open.', 'error');
      await track('save_failure', { message: error.message }, false);
      throw error;
    } finally {
      state.saving = false;
      if (state.pendingSave) { state.pendingSave = false; scheduleSave(); }
    }
  }

  function scheduleSave() {
    clearTimeout(state.dirtyTimer);
    setSaveStatus('Saving…', 'saving');
    state.dirtyTimer = setTimeout(() => saveSurvey().catch(() => {}), 140);
  }

  async function loadSurvey(id, recovered = false) {
    const raw = await Store.getSurvey(id);
    if (!raw) return null;
    state.survey = migrateSurvey(raw);
    state.media = await Store.getMedia(id);
    if (recovered) {
      state.survey.meta.recoveredCount = num(state.survey.meta.recoveredCount) + 1;
      await track('survey_recovered', {}, false);
    }
    await saveSurvey('silent');
    renderAll();
    go(state.survey.meta.surveyorPanel || 'discover', { trackStage: false });
    setSaveStatus(recovered ? 'Recovered and saved locally' : 'Visit loaded', 'saved');
    return state.survey;
  }

  async function startSurvey(seed = {}, source = 'blank') {
    const survey = deepMerge(defaultSurvey(), seed);
    survey.meta.startSource = source;
    state.survey = survey;
    state.media = [];
    await saveSurvey('silent');
    await track('visit_started', { source });
    renderAll();
    go('discover');
    return survey;
  }

  async function track(type, data = {}, save = true) {
    const event = { id: uid('event'), surveyId: state.survey?.id || '', type, data, createdAt: new Date().toISOString() };
    try { await Store.putEvent(event); } catch (error) { if (save) console.warn('Local metrics could not be saved', error); }
    return event;
  }

  function setSaveStatus(text, kind = 'saved') {
    const node = $('saveState');
    if (!node) return;
    node.textContent = text;
    node.className = `pill ${kind}`;
  }

  function fillForm() {
    if (!state.survey) return;
    $$('[data-bind]').forEach(element => {
      const value = getPath(state.survey, element.dataset.bind, '');
      if (element.type === 'checkbox') element.checked = !!value;
      else element.value = value === undefined || value === null ? '' : value;
    });
    $$('[data-check]').forEach(element => { element.checked = !!getPath(state.survey, element.dataset.check, false); });
  }

  function bindForms() {
    document.addEventListener('input', event => {
      if (!state.survey) return;
      const path = event.target?.dataset?.bind;
      if (!path) return;
      setPath(state.survey, path, fieldValue(event.target));
      markInformation(path, 'Confirmed today', 'confirmed');
      afterFieldChange(path);
    }, true);
    document.addEventListener('change', event => {
      if (!state.survey) return;
      const path = event.target?.dataset?.bind || event.target?.dataset?.check;
      if (!path) return;
      setPath(state.survey, path, event.target.dataset.check ? !!event.target.checked : fieldValue(event.target));
      markInformation(path, 'Confirmed today', 'confirmed');
      afterFieldChange(path);
    }, true);
  }

  function markInformation(path, source, confidence) {
    if (!state.survey) return;
    state.survey.meta.information[path] = { source, confidence, updatedAt: new Date().toISOString() };
  }

  function afterFieldChange(path) {
    if (path === 'energy.annualKwh') syncUsage('annual');
    if (path === 'energy.dailyKwh') syncUsage('daily');
    if (path === 'priorities.primary') state.survey.priorities.secondary = state.survey.priorities.selected.filter(item => item !== state.survey.priorities.primary);
    if (path === 'confirmation.formalQuoteStatus' && state.survey.confirmation.formalQuoteStatus === 'Signed' && !state.survey.meta.analyticsFlags.quoteSigned) {
      state.survey.meta.analyticsFlags.quoteSigned = true;
      track('quote_signed');
    }
    if (path.startsWith('design.') || path.startsWith('site.')) {
      if (['design.panelKey', 'design.panelCount', 'design.orientation'].includes(path)) invalidateRoofValidation();
      if (state.survey.meta.analyticsFlags.recommendationPresented && path.startsWith('design.')) {
        state.survey.decision.recommendationChangedAfterPresentation = true;
        if (!state.survey.meta.analyticsFlags.changedAfterPresentation) {
          state.survey.meta.analyticsFlags.changedAfterPresentation = true;
          track('recommendation_changed_after_presentation');
        }
      }
      renderDesign();
    }
    if (path.startsWith('decision.') || path.startsWith('confirmation.')) renderCompletion();
    renderHeader();
    renderPrevisit();
    renderPriorityControls();
    renderEmailDraft();
    if (state.currentView === 'customer') renderCustomerStage();
    scheduleSave();
  }

  function syncUsage(changed) {
    const energy = state.survey.energy;
    if (changed === 'annual' && num(energy.annualKwh)) {
      energy.dailyKwh = Number(num(energy.annualKwh) / 365).toFixed(1);
      if ($('dailyKwh')) $('dailyKwh').value = energy.dailyKwh;
    }
    if (changed === 'daily' && num(energy.dailyKwh)) {
      energy.annualKwh = Math.round(num(energy.dailyKwh) * 365);
      if ($('annualKwh')) $('annualKwh').value = energy.annualKwh;
    }
  }

  function renderAll() {
    fillForm();
    renderHeader();
    renderPrevisit();
    renderPriorityControls();
    renderRoofPlanes();
    renderMedia();
    renderDesign();
    renderCompletion();
    renderEmailDraft();
    renderSavedSurveys();
    renderDiagnostics();
    renderQueue();
  }

  function renderHeader() {
    const survey = state.survey;
    $('connectionStatus').textContent = state.online ? 'Online' : 'Offline ready';
    $('connectionStatus').className = `pill ${state.online ? 'online' : 'offline'}`;
    $('surveyTitle').textContent = survey?.customer?.name ? survey.customer.name : 'LG Survey Pro';
    $('surveyMeta').textContent = survey ? `${survey.customer.address || 'Address to confirm'} · ${state.media.length} saved file${state.media.length === 1 ? '' : 's'} · ${decisionLabel()}` : 'Start or continue a customer visit';
    $('activeSurveyId').textContent = survey ? `Visit ID ${survey.id}` : 'No active visit';
  }

  function decisionLabel() {
    return state.survey?.decision?.status || 'Visit active';
  }

  function go(panel, options = {}) {
    if (!document.getElementById(panel)) return;
    if (state.survey && options.trackStage !== false) recordStageExit();
    $$('.navBtn').forEach(button => button.classList.toggle('active', button.dataset.panel === panel));
    $$('.screen').forEach(section => section.classList.toggle('active', section.id === panel));
    if (state.survey) fillForm();
    if (state.survey) {
      state.survey.meta.surveyorPanel = panel;
      scheduleSave();
      if (options.trackStage !== false) track('stage_entered', { view: 'surveyor', stage: panel });
    }
    state.stageEnteredAt = Date.now();
    if (panel === 'tools') { renderDiagnostics(); renderAnalytics(); renderQueue(); }
    if (panel === 'complete') { renderCompletion(); renderEmailDraft(); }
    if (panel === 'design') renderDesign();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function recordStageExit() {
    const stage = state.currentView === 'customer' ? state.survey?.meta?.customerStage : state.survey?.meta?.surveyorPanel;
    if (!stage) return;
    const seconds = Math.max(0, Math.round((Date.now() - state.stageEnteredAt) / 1000));
    track('stage_time', { view: state.currentView, stage, seconds });
  }

  async function renderSavedSurveys() {
    const surveys = (await Store.getSurveys()).map(migrateSurvey);
    $('savedCount').textContent = surveys.length;
    const box = $('savedSurveys');
    if (!surveys.length) { box.innerHTML = '<div class="empty">No visits saved on this tablet yet.</div>'; return; }
    box.innerHTML = surveys.map(survey => `
      <article class="savedCard">
        <div><b>${esc(survey.customer.name || 'Unnamed customer')}</b><span>${esc(survey.customer.address || 'Address not entered')}<br>Saved ${new Date(survey.updatedAt).toLocaleString('en-GB')}</span></div>
        <div class="rowActions"><button data-open-survey="${esc(survey.id)}">Open</button><button class="ghost danger" data-delete-survey="${esc(survey.id)}">Delete</button></div>
      </article>`).join('');
  }

  function renderPrevisit() {
    const s = state.survey;
    if (!s) {
      $('previsitName').textContent = 'No customer selected';
      $('previsitSource').textContent = 'Not imported';
      $('previsitSummary').innerHTML = '';
      return;
    }
    $('previsitName').textContent = s.customer.name || 'Customer name to confirm';
    $('previsitSource').textContent = s.meta.importedAt ? 'Imported and editable' : 'Entered on this tablet';
    $('previsitSource').className = `sourceBadge ${s.meta.importedAt ? 'imported' : 'confirmed'}`;
    const items = [
      ['Address', s.customer.address], ['Appointment', s.customer.appointmentTime], ['Opportunity', s.customer.crmStatus],
      ['Known usage', s.energy.annualKwh ? `${s.energy.annualKwh} kWh/year` : 'Not known'], ['Known interest', s.priorities.ownWords],
      ['Funding', s.priorities.financePlan || s.priorities.financeNote], ['Previous concern', s.priorities.mainConcern], ['Notes', s.customer.notes]
    ];
    $('previsitSummary').innerHTML = items.map(([label, value]) => `<div class="summaryItem"><small>${esc(label)}</small><b>${esc(value || 'To collect')}</b></div>`).join('');
    const missing = [];
    if (!clean(s.customer.name)) missing.push('customer name');
    if (!clean(s.customer.address)) missing.push('address');
    if (!clean(s.customer.email)) missing.push('email');
    if (!num(s.energy.annualKwh)) missing.push('electricity use');
    if (!clean(s.priorities.primary)) missing.push('main priority');
    $('missingInfo').innerHTML = missing.length ? `<b>Still to collect:</b> ${esc(missing.join(', '))}.` : '<b>Pre-visit essentials are complete.</b> Continue the conversation and property survey.';
    $('missingInfo').className = `notice ${missing.length ? 'soft' : 'success'}`;
  }

  function renderPriorityControls() {
    const s = state.survey;
    const selected = s?.priorities?.selected || [];
    $('priorityChoices').innerHTML = PRIORITIES.map(item => `<button class="tileChoice ${selected.includes(item) ? 'selected' : ''}" data-priority="${esc(item)}" aria-pressed="${selected.includes(item)}">${esc(item)}</button>`).join('');
    $('primaryPriorityChoices').innerHTML = selected.map(item => `<button class="primaryChoice ${s?.priorities?.primary === item ? 'selected' : ''}" data-primary-priority="${esc(item)}">${esc(item)}</button>`).join('');
    $('fundingChoices').innerHTML = FUNDING.map(item => `<button class="stackChoice ${s?.priorities?.financePlan === item ? 'selected' : ''}" data-funding="${esc(item)}">${esc(item)}</button>`).join('');
  }

  function togglePriority(value) {
    if (!state.survey) return;
    const list = state.survey.priorities.selected;
    const index = list.indexOf(value);
    if (index >= 0) list.splice(index, 1); else list.push(value);
    if (!list.includes(state.survey.priorities.primary)) state.survey.priorities.primary = list[0] || '';
    state.survey.priorities.secondary = list.filter(item => item !== state.survey.priorities.primary);
    markInformation('priorities.selected', 'Confirmed today', 'confirmed');
    renderPriorityControls();
    scheduleSave();
  }

  function choosePrimaryPriority(value) {
    state.survey.priorities.primary = value;
    state.survey.priorities.secondary = state.survey.priorities.selected.filter(item => item !== value);
    markInformation('priorities.primary', 'Confirmed today', 'confirmed');
    renderPriorityControls();
    scheduleSave();
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    const input = String(text || '').replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
    for (let index = 0; index < input.length; index++) {
      const char = input[index], next = input[index + 1];
      if (char === '"' && quoted && next === '"') { cell += '"'; index++; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === ',' && !quoted) { row.push(clean(cell)); cell = ''; continue; }
      if (char === '\n' && !quoted) {
        row.push(clean(cell));
        if (row.some(Boolean)) rows.push(row);
        row = []; cell = ''; continue;
      }
      cell += char;
    }
    row.push(clean(cell));
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function extractCSV(text) {
    const raw = String(text || '').trim();
    const fenced = raw.match(/(?:```|''')\s*(?:csv)?\s*([\s\S]*?)(?:```|''')/i);
    if (fenced) return fenced[1].trim();
    const lines = raw.split(/\r?\n/);
    let bestStart = -1;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if ((line.match(/,/g) || []).length >= 1 && /name|customer|address|email|phone|field|item|contact/i.test(line)) { bestStart = index; break; }
    }
    return (bestStart >= 0 ? lines.slice(bestStart).join('\n') : raw).replace(/(?:```|''')\s*$/, '').trim();
  }

  function normalizeHeader(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function guessImportField(header) {
    const value = normalizeHeader(header);
    const candidates = [
      ['customer.name', ['customername', 'contactname', 'clientname', 'itemname', 'name']],
      ['customer.address', ['siteaddress', 'propertyaddress', 'installationaddress', 'address', 'location']],
      ['customer.postcode', ['postcode', 'postalcode', 'sitepostcode']],
      ['customer.email', ['contactemail', 'emailaddress', 'email']],
      ['customer.phone', ['contactnumber', 'phonenumber', 'telephone', 'mobile', 'phone']],
      ['customer.appointmentTime', ['surveyscheduled', 'appointmenttime', 'appointmentdate', 'appointment']],
      ['customer.mondayId', ['mondayitemid', 'pulseid', 'itemid']],
      ['customer.crmStatus', ['opportunitystage', 'leadstatus', 'crmstatus', 'stage', 'status']],
      ['customer.notes', ['qualificationnotes', 'appointmentnotes', 'leadnotes', 'crmnotes', 'notes']],
      ['customer.leadSource', ['leadsource', 'source', 'channel']],
      ['energy.annualKwh', ['annualkwh', 'energyusage', 'annualusage', 'electricityusage', 'usage']],
      ['energy.tariff', ['currenttariff', 'electricitytariff', 'tariff']],
      ['priorities.ownWords', ['productsinterest', 'knownproducts', 'interest', 'reasonforinstall', 'motivation']],
      ['priorities.financeNote', ['fundingnotes', 'financenotes', 'funding', 'finance']],
      ['priorities.mainConcern', ['previousconcerns', 'objections', 'mainconcern', 'concern']],
      ['priorities.timing', ['preferredtimescale', 'timescale', 'timing']]
    ];
    for (const [path, aliases] of candidates) if (aliases.some(alias => value === alias || value.includes(alias) || alias.includes(value))) return path;
    return 'ignore';
  }

  function normalizeImportRows(rows) {
    if (!rows.length) return { headers: [], records: [] };
    if (normalizeHeader(rows[0][0]) === 'field' && normalizeHeader(rows[0][1]) === 'value') {
      const headers = rows.slice(1).map(row => row[0]).filter(Boolean);
      const record = rows.slice(1).map(row => row.slice(1).join(', '));
      return { headers, records: [record] };
    }
    const width = Math.max(...rows.map(row => row.length));
    const headers = Array.from({ length: width }, (_, index) => rows[0][index] || `Column ${index + 1}`);
    const records = rows.slice(1).filter(row => row.some(Boolean)).map(row => Array.from({ length: width }, (_, index) => row[index] || ''));
    return { headers, records };
  }

  async function previewMonday() {
    const text = $('mondayPaste').value;
    try {
      const parsed = normalizeImportRows(parseCSV(extractCSV(text)));
      if (!parsed.headers.length || !parsed.records.length) throw new Error('No customer rows were found');
      const mappings = parsed.headers.map(guessImportField);
      const existing = (await Store.getSurveys()).map(migrateSurvey);
      state.importDraft = { ...parsed, mappings, raw: text, duplicates: parsed.records.map(record => findDuplicate(record, parsed.headers, mappings, existing)) };
      renderImportPreview();
      $('mondayStatus').textContent = `${parsed.records.length} appointment${parsed.records.length === 1 ? '' : 's'} found.`;
    } catch (error) {
      $('mondayStatus').textContent = `Could not read appointment details: ${error.message}.`;
      $('importPreview').hidden = true;
      track('import_failure', { message: error.message });
    }
  }

  function findDuplicate(record, headers, mappings, existing) {
    const values = {};
    mappings.forEach((path, index) => { if (path !== 'ignore') values[path] = clean(record[index]); });
    return existing.find(survey =>
      (values['customer.mondayId'] && clean(survey.customer.mondayId) === values['customer.mondayId']) ||
      (values['customer.email'] && clean(survey.customer.email).toLowerCase() === values['customer.email'].toLowerCase()) ||
      (values['customer.name'] && values['customer.address'] && clean(survey.customer.name).toLowerCase() === values['customer.name'].toLowerCase() && clean(survey.customer.address).toLowerCase() === values['customer.address'].toLowerCase())
    ) || null;
  }

  function renderImportPreview() {
    const draft = state.importDraft;
    if (!draft) { $('importPreview').hidden = true; return; }
    $('importPreview').hidden = false;
    $('importSummary').textContent = `${draft.headers.length} columns and ${draft.records.length} appointment${draft.records.length === 1 ? '' : 's'} detected. Imported details remain editable.`;
    $('columnMapping').innerHTML = draft.headers.map((header, index) => `
      <label class="mappingItem"><span>${esc(header)}</span><select data-map-column="${index}">${IMPORT_FIELDS.map(([value, label]) => `<option value="${value}" ${draft.mappings[index] === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`).join('');
    $('importRecords').innerHTML = draft.records.map((record, index) => {
      const values = mappedRecord(record, draft.mappings);
      const duplicate = draft.duplicates[index];
      return `<article class="recordCard ${duplicate ? 'duplicate' : ''}"><b>${esc(values['customer.name'] || `Appointment ${index + 1}`)}</b><span>${esc(joinAddress(values) || 'Address not detected')}</span><span>${esc(values['customer.appointmentTime'] || 'Appointment time not detected')}</span>${duplicate ? `<span><b>Possible existing visit:</b> ${esc(duplicate.customer.name || 'Unnamed')}</span>` : ''}<button class="primary" data-import-record="${index}">${duplicate ? 'Update and open existing visit' : 'Start this visit'}</button></article>`;
    }).join('');
  }

  function mappedRecord(record, mappings) {
    const values = {};
    mappings.forEach((path, index) => { if (path !== 'ignore' && clean(record[index])) values[path] = clean(record[index]); });
    return values;
  }

  function joinAddress(values) {
    return [values['customer.address'], values['customer.postcode']].filter(Boolean).join(', ');
  }

  async function importRecord(index) {
    const draft = state.importDraft;
    if (!draft || !draft.records[index]) return;
    const values = mappedRecord(draft.records[index], draft.mappings);
    if (values['customer.postcode']) values['customer.address'] = joinAddress(values);
    const duplicate = draft.duplicates[index];
    if (duplicate) await loadSurvey(duplicate.id);
    else await startSurvey({}, 'monday-csv');
    const previousImported = state.survey.meta.importedValues || {};
    Object.entries(values).forEach(([path, value]) => {
      if (path === 'customer.postcode') return;
      const current = clean(getPath(state.survey, path, ''));
      if (!current || current === clean(previousImported[path])) setPath(state.survey, path, value);
      markInformation(path, 'Imported from appointment notes', 'imported');
    });
    state.survey.meta.importedValues = values;
    state.survey.meta.importedAt = new Date().toISOString();
    state.survey.meta.originalImport = { headers: draft.headers, record: draft.records[index], mappings: clone(draft.mappings), raw: draft.raw };
    await saveSurvey();
    await track('import_success', { columns: draft.headers.length, updatedExisting: !!duplicate });
    renderAll();
    go('discover');
  }

  function selectedPanel() {
    const key = state.survey?.design?.panelKey || 'aiko495';
    return { ...(Catalog.panels[key] || Catalog.panels.aiko495), key };
  }

  function calculateRoofPlane(roof) {
    const panel = selectedPanel();
    const widthMm = num(roof.width) * 1000;
    const slopeMm = num(roof.slope) * 1000;
    const margin = Catalog.roof.preferredEdgeMarginMm;
    const gap = Catalog.roof.installationGapMm;
    if (!widthMm || !slopeMm) return { portrait: 0, landscape: 0, best: 0, orientation: '', warning: 'Measurements still required' };
    const usableWidth = Math.max(0, widthMm - (margin * 2));
    const usableSlope = Math.max(0, slopeMm - (margin * 2));
    const fit = (areaWidth, areaHeight, panelWidth, panelHeight) => {
      const across = Math.max(0, Math.floor((areaWidth + gap) / (panelWidth + gap)));
      const up = Math.max(0, Math.floor((areaHeight + gap) / (panelHeight + gap)));
      return across * up;
    };
    const portrait = fit(usableWidth, usableSlope, panel.widthMm, panel.heightMm);
    const landscape = fit(usableWidth, usableSlope, panel.heightMm, panel.widthMm);
    const best = Math.max(portrait, landscape);
    const orientation = portrait === landscape ? 'portrait or landscape' : portrait > landscape ? 'portrait' : 'landscape';
    const manual = num(roof.manualPanels);
    let warning = '';
    if (manual > best) warning = roof.reducedMarginConfirmed ? 'Surveyor-confirmed reduced-margin layout' : 'Manual count exceeds preferred-margin fit';
    if (clean(roof.shading) || clean(roof.obstructions)) warning = [warning, 'Shading or obstructions require review'].filter(Boolean).join('. ');
    return { portrait, landscape, best, orientation, warning };
  }

  function updateRoofCalculations() {
    if (!state.survey) return;
    state.survey.site.roofPlanes.forEach(roof => {
      const result = calculateRoofPlane(roof);
      roof.portraitPanels = result.portrait;
      roof.landscapePanels = result.landscape;
      roof.suggestedPanels = result.best;
      roof.bestOrientation = result.orientation;
    });
  }

  function effectiveRoofCount(roof) {
    return roof.manualPanels === '' || roof.manualPanels === null ? num(roof.suggestedPanels) : num(roof.manualPanels);
  }

  function roofSuggestionTotal() {
    return (state.survey?.site?.roofPlanes || []).reduce((total, roof) => total + effectiveRoofCount(roof), 0);
  }

  function renderRoofPlanes() {
    const list = $('roofPlaneList');
    if (!state.survey) { list.innerHTML = '<div class="empty">Start a visit to add roof areas.</div>'; return; }
    updateRoofCalculations();
    list.innerHTML = state.survey.site.roofPlanes.map((roof, index) => {
      const result = calculateRoofPlane(roof);
      return `<article class="roofCard" data-roof-index="${index}">
        <div class="roofHead"><div><b>Roof area ${index + 1}</b><span class="sourceBadge ${roof.fitState === 'confirmed' ? 'confirmed' : 'estimated'}">${roof.fitState === 'confirmed' ? 'Confirmed today' : 'Estimated'}</span></div><button class="ghost danger small" data-remove-roof="${index}">Remove</button></div>
        <div class="roofCardFields">
          <label>Name<input data-roof-field="name" value="${esc(roof.name)}"></label>
          <label>Width (m)<input data-roof-field="width" value="${esc(roof.width)}" type="number" step="0.1" inputmode="decimal"></label>
          <label>Slope (m)<input data-roof-field="slope" value="${esc(roof.slope)}" type="number" step="0.1" inputmode="decimal"></label>
          <label>Pitch (°)<input data-roof-field="pitch" value="${esc(roof.pitch)}" type="number" inputmode="decimal"></label>
          <label>Orientation / azimuth<input data-roof-field="azimuth" value="${esc(roof.azimuth)}" placeholder="South or 180°"></label>
          <label>Panels on this area<input data-roof-field="manualPanels" value="${esc(roof.manualPanels)}" type="number" min="0" inputmode="numeric" placeholder="${result.best}"></label>
        </div>
        <div class="formGrid compactFields">
          <label>Shading<input data-roof-field="shading" value="${esc(roof.shading)}" placeholder="None, light, seasonal..."></label>
          <label>Obstructions<input data-roof-field="obstructions" value="${esc(roof.obstructions)}" placeholder="Chimney, vent, tree constraint..."></label>
        </div>
        <label class="checkLine"><input type="checkbox" data-roof-field="reducedMarginConfirmed" ${roof.reducedMarginConfirmed ? 'checked' : ''}>Use a surveyor-confirmed reduced-margin or measured layout when the manual count exceeds the starting fit</label>
        <div class="roofResult ${result.warning ? 'warning' : ''}">Preferred-margin fit: ${result.portrait} portrait or ${result.landscape} landscape. ${result.best ? `Best starting point: ${result.best} panels in ${result.orientation}.` : 'Enter measurements to calculate a fit.'}${result.warning ? ` ${esc(result.warning)}.` : ''}</div>
      </article>`;
    }).join('');
  }

  function updateRoofField(element) {
    const card = element.closest('[data-roof-index]');
    if (!card || !state.survey) return;
    const roof = state.survey.site.roofPlanes[num(card.dataset.roofIndex)];
    if (!roof) return;
    const field = element.dataset.roofField;
    roof[field] = element.type === 'checkbox' ? !!element.checked : element.type === 'number' ? (element.value === '' ? '' : num(element.value)) : element.value;
    roof.fitState = 'confirmed';
    invalidateRoofValidation();
    updateRoofCalculations();
    updateRoofCardResult(card, roof);
    renderDesign();
    scheduleSave();
  }

  function updateRoofCardResult(card, roof) {
    const result = calculateRoofPlane(roof);
    const node = card.querySelector('.roofResult');
    if (!node) return;
    node.classList.toggle('warning', !!result.warning);
    node.textContent = `Preferred-margin fit: ${result.portrait} portrait or ${result.landscape} landscape. ${result.best ? `Best starting point: ${result.best} panels in ${result.orientation}.` : 'Enter measurements to calculate a fit.'}${result.warning ? ` ${result.warning}.` : ''}`;
  }

  function invalidateRoofValidation() {
    if (!state.survey) return;
    state.survey.site.validation.status = 'not-checked';
    state.survey.site.validation.checkedAt = '';
    state.survey.site.validation.warnings = [];
    renderRoofValidation();
  }

  async function validateRoof() {
    if (!state.survey) return;
    updateRoofCalculations();
    const solar = state.survey.design.systemType !== 'battery-only';
    const roofs = state.survey.site.roofPlanes;
    const warnings = [];
    let hardFailure = false;
    if (solar && !roofs.some(roof => num(roof.width) && num(roof.slope))) { warnings.push('Roof width and slope are required'); hardFailure = true; }
    roofs.forEach(roof => {
      const result = calculateRoofPlane(roof);
      const manual = num(roof.manualPanels);
      if (manual > result.best && !roof.reducedMarginConfirmed) { warnings.push(`${roof.name}: manual count exceeds the preferred-margin fit`); hardFailure = true; }
      if (manual > result.best && roof.reducedMarginConfirmed) warnings.push(`${roof.name}: reduced-margin layout confirmed by surveyor`);
      if (clean(roof.shading)) warnings.push(`${roof.name}: shading noted (${roof.shading})`);
      if (clean(roof.obstructions)) warnings.push(`${roof.name}: obstruction noted (${roof.obstructions})`);
    });
    const capacity = roofSuggestionTotal();
    const selected = num(state.survey.design.panelCount);
    if (solar && !capacity) { warnings.push('No usable panel capacity is recorded'); hardFailure = true; }
    if (solar && selected > capacity && !clean(state.survey.design.panelOverrideReason)) { warnings.push('Selected panel count exceeds the roof total and needs an override reason'); hardFailure = true; }
    if (solar && !selected && capacity) {
      state.survey.design.panelCount = capacity;
      state.survey.design.panelCountMode = 'suggested';
      if ($('panelCount')) $('panelCount').value = capacity;
    }
    const status = !solar ? 'not-required' : hardFailure ? 'failed' : warnings.length ? 'validated-with-warnings' : 'validated';
    state.survey.site.validation = { status, checkedAt: new Date().toISOString(), capacity, selectedCount: num(state.survey.design.panelCount), warnings, method: 'Panel dimensions, portrait/landscape fit and 400 mm preferred edge margins' };
    if (solar) autoScaffold();
    await saveSurvey();
    await track('roof_validation', { status, capacity, warnings: warnings.length });
    renderRoofPlanes();
    renderDesign();
  }

  function autoScaffold() {
    if (state.survey.site.scaffoldRequirement !== 'Auto from roof width') return;
    const maxWidth = Math.max(0, ...state.survey.site.roofPlanes.map(roof => num(roof.width)));
    let lifts = 0;
    if (maxWidth > 0 && maxWidth <= Catalog.scaffold.oneLiftMaxWidthM) lifts = 1;
    else if (maxWidth <= Catalog.scaffold.twoLiftMaxWidthM) lifts = 2;
    state.survey.design.scaffoldLifts = lifts;
    if (maxWidth > Catalog.scaffold.twoLiftMaxWidthM) state.survey.site.scaffoldRequirement = 'Survey dependent';
  }

  function renderRoofValidation() {
    const validation = state.survey?.site?.validation;
    const banner = $('roofValidationBanner');
    if (!validation) return;
    const labels = {
      'not-checked': ['Roof fit not checked', 'Add or confirm roof measurements before presenting a solar price.'],
      failed: ['Roof fit needs attention', validation.warnings.join('. ') || 'Review the measurements and selected panel count.'],
      validated: ['Roof fit validated', `${validation.capacity} panels fit using the preferred-margin calculation.`],
      'validated-with-warnings': ['Roof fit validated with notes', validation.warnings.join('. ')],
      'not-required': ['Roof fit not required', 'This is a battery-only recommendation.']
    };
    const [title, detail] = labels[validation.status] || labels['not-checked'];
    banner.className = `validationBanner ${validation.status === 'failed' ? 'invalid' : validation.status === 'not-checked' ? '' : 'valid'}`;
    banner.querySelector('b').textContent = title;
    banner.querySelector('p').textContent = detail;
    $('validateRoof').textContent = validation.status === 'not-checked' || validation.status === 'failed' ? 'Validate roof fit' : 'Check roof fit again';
  }

  function setSystemType(type) {
    const design = state.survey.design;
    design.systemType = type;
    design.solar = type !== 'battery-only';
    design.battery = type !== 'solar-only';
    if (!design.battery) design.batteryBrand = 'None';
    if (design.battery && design.batteryBrand === 'None') design.batteryBrand = 'Sigenergy';
    invalidateRoofValidation();
    if (type === 'battery-only') validateRoof();
    renderDesign();
    scheduleSave();
  }

  function setBatteryBrand(brand) {
    state.survey.design.batteryBrand = brand;
    state.survey.design.battery = brand !== 'None';
    if (brand === 'None' && state.survey.design.systemType === 'solar-battery') state.survey.design.systemType = 'solar-only';
    if (brand !== 'None' && state.survey.design.systemType === 'solar-only') state.survey.design.systemType = 'solar-battery';
    renderDesign();
    scheduleSave();
  }

  function batterySummary() {
    const d = state.survey?.design || {};
    if (!d.battery || d.batteryBrand === 'None') return { text: 'No battery', usableKwh: 0, referencePrice: 0 };
    if (d.batteryBrand === 'Tesla') {
      const powerwalls = Math.min(4, num(d.teslaPw3Qty));
      const expansions = Math.min(3, num(d.teslaDcQty));
      const storage = (powerwalls * Catalog.batteries.tesla.powerwall3.usableKwh) + (expansions * Catalog.batteries.tesla.dcExpansion.usableKwh);
      const price = (powerwalls * Catalog.batteries.tesla.powerwall3.customerPrice) + (expansions * Catalog.batteries.tesla.dcExpansion.customerPrice) + (d.teslaGateway ? Catalog.batteries.tesla.gateway.customerPrice : 0);
      const parts = [];
      if (powerwalls) parts.push(`${powerwalls} × Powerwall 3`);
      if (expansions) parts.push(`${expansions} × DC Expansion`);
      if (d.teslaGateway) parts.push('Gateway');
      return { text: parts.join(' + ') || 'Tesla storage to confirm', usableKwh: storage, referencePrice: price };
    }
    const six = num(d.sig6Qty), ten = num(d.sig10Qty);
    const storage = (six * Catalog.batteries.sigenergy.bat6.usableKwh) + (ten * Catalog.batteries.sigenergy.bat10.usableKwh);
    const parts = [];
    if (ten) parts.push(`${ten} × SigenStor BAT 10.0`);
    if (six) parts.push(`${six} × SigenStor BAT 6.0`);
    return { text: parts.join(' + ') || 'Sigenergy storage to confirm', usableKwh: storage, referencePrice: 0 };
  }

  function priceState() {
    if (!state.survey) return { ready: false, reason: 'No visit is open', total: 0 };
    const s = state.survey, d = s.design;
    const solar = d.systemType !== 'battery-only';
    const validated = ['validated', 'validated-with-warnings', 'not-required'].includes(s.site.validation.status);
    if (solar && !validated) return { ready: false, reason: 'Validate the roof fit before showing a solar price.', total: 0 };
    if (num(d.manualDiscount) > 0 && !clean(d.discountAuthorisation)) return { ready: false, reason: 'The discount needs explicit authorisation for this quote.', total: 0 };
    if (!Catalog.pricingAuthority.available) {
      if (!num(d.finalPriceOverride)) return { ready: false, reason: `${Catalog.pricingAuthority.name} is unavailable. Enter an authorised customer total.`, total: 0 };
      if (!d.priceAuthorised || !clean(d.priceAuthorityNote)) return { ready: false, reason: 'Confirm who authorised the customer total before presenting it.', total: 0 };
      return { ready: true, reason: `Authorised customer total. ${Catalog.pricingAuthority.name} remains required for automatic pricing.`, total: num(d.finalPriceOverride), source: 'authorised-manual' };
    }
    return { ready: false, reason: 'The V8.6 pricing adapter has not yet been configured.', total: 0 };
  }

  function recommendationSummary() {
    const s = state.survey;
    const panel = selectedPanel();
    const battery = batterySummary();
    const count = s.design.systemType === 'battery-only' ? 0 : num(s.design.panelCount);
    const kwp = (count * panel.watts) / 1000;
    return { panel, count, kwp, battery, price: priceState(), solar: count > 0 && s.design.systemType !== 'battery-only', storage: s.design.battery && s.design.batteryBrand !== 'None' };
  }

  function performanceEstimate() {
    const summary = recommendationSummary();
    const usage = num(state.survey.energy.annualKwh);
    const generation = summary.solar ? Math.round(summary.kwp * 850) : 0;
    if (!generation || !usage) return { available: false, generation, annualBenefit: 0, payback: 0 };
    const selfUsePercent = Math.min(100, Math.max(0, num(state.survey.energy.selfUsePct) || 75));
    const selfUse = Math.min(usage, generation * selfUsePercent / 100);
    const exportKwh = Math.max(0, generation - selfUse);
    const benefit = Math.round((selfUse * num(state.survey.energy.importRate) / 100) + (exportKwh * num(state.survey.energy.exportRate) / 100));
    return { available: true, generation, annualBenefit: benefit, payback: summary.price.ready && benefit ? summary.price.total / benefit : 0 };
  }

  function renderDesign() {
    if (!state.survey) return;
    const d = state.survey.design;
    updateRoofCalculations();
    renderRoofValidation();
    $$('[data-system-type]').forEach(button => button.classList.toggle('selected', button.dataset.systemType === d.systemType));
    $('solarDesignCard').hidden = d.systemType === 'battery-only';
    const panel = selectedPanel();
    $('selectedPanelMeta').textContent = `${panel.model} · ${panel.watts}W · ${panel.heightMm} × ${panel.widthMm} mm`;
    $('panelOffer').hidden = !panel.offer;
    $('roofSuggestion').textContent = `${roofSuggestionTotal()} panel${roofSuggestionTotal() === 1 ? '' : 's'} from the recorded roof areas`;
    $$('[data-battery-select]').forEach(button => button.classList.toggle('selected', button.dataset.batterySelect === d.batteryBrand));
    $('sigConfig').hidden = d.batteryBrand !== 'Sigenergy';
    $('teslaConfig').hidden = d.batteryBrand !== 'Tesla';
    const battery = batterySummary();
    $('batteryCapacity').textContent = battery.usableKwh ? `${battery.usableKwh.toFixed(1)} kWh usable` : 'No storage';
    const validation = state.survey.site.validation;
    $('roofFitPill').textContent = validation.status === 'validated' ? 'Validated' : validation.status === 'validated-with-warnings' ? 'Validated with notes' : validation.status === 'not-required' ? 'Not required' : 'Not validated';
    $('roofFitPill').className = `sourceBadge ${['validated', 'validated-with-warnings', 'not-required'].includes(validation.status) ? 'confirmed' : 'warning'}`;
    const pricing = priceState();
    $('designGate').textContent = pricing.ready ? 'The recommendation has a validated layout and an authorised customer total.' : pricing.reason;
    $('designGate').className = `notice ${pricing.ready ? 'success' : 'warning'}`;
    $('pricingAuthorityNotice').className = `notice ${pricing.ready ? 'soft' : 'warning'}`;
    $('pricingAuthorityNotice').innerHTML = pricing.ready
      ? `<b>Authorised total in use.</b><br>Automatic pricing remains unavailable until ${esc(Catalog.pricingAuthority.name)} is supplied.`
      : `<b>${esc(Catalog.pricingAuthority.name)}</b><br>${esc(Catalog.pricingAuthority.message)}`;
    $('pricingStatus').textContent = pricing.ready ? 'Authorised total' : 'Source required';
    $('pricingStatus').className = `sourceBadge ${pricing.ready ? 'confirmed' : 'warning'}`;
    const summary = recommendationSummary();
    $('quoteLive').className = `quoteBox ${pricing.ready ? '' : 'locked'}`;
    $('quoteLive').innerHTML = pricing.ready
      ? `<div class="quoteBig">${money(pricing.total)}</div><p>${summary.solar ? `${summary.count} × ${esc(summary.panel.name)} (${summary.kwp.toFixed(2)} kWp)` : 'Battery-only recommendation'}${summary.storage ? ` with ${esc(summary.battery.text)}` : ''}. Subject to the recorded assumptions and final technical checks.</p>`
      : `<b>Customer price hidden</b><p>${esc(pricing.reason)}</p>`;
  }

  function switchView(view, stage) {
    if (view === 'customer' && !state.survey) return;
    if (state.survey) recordStageExit();
    state.currentView = view;
    document.body.classList.toggle('customerMode', view === 'customer');
    $('surveyorApp').hidden = view !== 'surveyor';
    $('customerApp').hidden = view !== 'customer';
    $$('.viewBtn').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (view === 'customer') {
      if (stage && CUSTOMER_STAGES.includes(stage)) state.survey.meta.customerStage = stage;
      renderCustomerStage();
      track('stage_entered', { view: 'customer', stage: state.survey.meta.customerStage });
    } else {
      fillForm();
      renderAll();
      track('stage_entered', { view: 'surveyor', stage: state.survey.meta.surveyorPanel });
    }
    state.stageEnteredAt = Date.now();
    scheduleSave();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function customerStageIndex() {
    const stage = state.survey?.meta?.customerStage || 'welcome';
    return Math.max(0, CUSTOMER_STAGES.indexOf(stage));
  }

  function customerStageGroup(index) {
    if (index <= 2) return 0;
    if (index === 3) return 1;
    if (index <= 5) return 2;
    return 3;
  }

  function customerStageTemplate(stage) {
    const s = state.survey;
    const summary = recommendationSummary();
    if (stage === 'welcome') return `
      <span class="eyebrow">Welcome${s.customer.name ? `, ${esc(firstName(s.customer.name))}` : ''}</span>
      <h2>A clear plan for your home.</h2>
      <p class="lead">Today we’ll understand what you want to achieve, check the property, design the right system and finish with a clear recommendation and price.</p>
      <div class="customerRecap"><div class="recapCard"><small>First</small><b>Your priorities</b><span>What matters and what a good result looks like.</span></div><div class="recapCard"><small>Then</small><b>Your home</b><span>Energy use and the practical installation.</span></div><div class="recapCard"><small>Next</small><b>Your recommendation</b><span>One suitable system, clearly explained.</span></div><div class="recapCard"><small>Finally</small><b>Your decision</b><span>Confirm what feels right or what should change.</span></div></div>`;
    if (stage === 'priorities') return `
      <span class="eyebrow">Your priorities</span>
      <h2>What prompted you to explore solar or battery storage now?</h2>
      <p class="lead">Choose everything that matters. We will use your main priority to shape the recommendation.</p>
      <div class="customerChoices">${PRIORITIES.map(item => `<button class="customerChoice ${s.priorities.selected.includes(item) ? 'selected' : ''}" data-priority="${esc(item)}">${esc(item)}</button>`).join('')}</div>
      ${s.priorities.selected.length ? `<div class="customerInput"><label>Which one matters most?<select data-bind="priorities.primary"><option value="">Choose the main priority</option>${s.priorities.selected.map(item => `<option ${s.priorities.primary === item ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select></label></div>` : ''}
      <div class="customerInput"><label>In your own words, what would a good result look like?<textarea data-bind="priorities.goodResult" placeholder="A short note is enough.">${esc(s.priorities.goodResult)}</textarea></label></div>`;
    if (stage === 'energy') return `
      <span class="eyebrow">Your home energy</span>
      <h2>How does your home use electricity?</h2>
      <p class="lead">Confirmed figures help us tailor the system. An estimate is fine when a bill is not available.</p>
      <div class="customerRecap">
        <label class="recapCard">Annual electricity use (kWh)<input data-bind="energy.annualKwh" type="number" inputmode="decimal" value="${esc(s.energy.annualKwh)}" placeholder="From a recent bill if known"></label>
        <label class="recapCard">Current tariff<input data-bind="energy.tariff" value="${esc(s.energy.tariff)}" placeholder="Optional"></label>
      </div>
      <div class="customerChoices">
        <button class="customerChoice ${s.energy.ev ? 'selected' : ''}" data-toggle-check="energy.ev">Electric vehicle now or planned</button>
        <button class="customerChoice ${s.energy.heatPump ? 'selected' : ''}" data-toggle-check="energy.heatPump">Heat pump or another major load</button>
        <button class="customerChoice ${s.energy.backup ? 'selected' : ''}" data-toggle-check="energy.backup">Backup or resilience matters</button>
        <button class="customerChoice ${s.energy.existingSolar ? 'selected' : ''}" data-toggle-check="energy.existingSolar">There is an existing solar system</button>
      </div>
      <div class="customerInput"><label>Anything likely to change in future?<textarea data-bind="energy.futureChanges" placeholder="For example, an EV, heat pump, extension or different working pattern.">${esc(s.energy.futureChanges)}</textarea></label></div>`;
    if (stage === 'home') {
      const validation = s.site.validation;
      return `<span class="eyebrow">Your home</span><h2>We are checking the practical details.</h2><p class="lead">The technical survey stays in the background. Here is the progress that matters to your recommendation.</p>
        <div class="customerRecap">
          <div class="recapCard"><small>Roof layout</small><b>${validation.status === 'validated' || validation.status === 'validated-with-warnings' ? 'Checked today' : 'Still being checked'}</b><span>${validation.capacity ? `${validation.capacity} panel starting capacity` : 'Measurements in progress'}</span></div>
          <div class="recapCard"><small>Equipment location</small><b>${clean(s.site.batteryLocation) ? 'Discussed' : 'Still to discuss'}</b><span>${esc(s.site.batteryLocation || 'Location will be agreed during the walkthrough')}</span></div>
          <div class="recapCard"><small>Installation route</small><b>${s.site.routeAgreed ? 'Discussed today' : 'Still being checked'}</b><span>Cable route and access remain subject to final checks.</span></div>
          <div class="recapCard"><small>Evidence</small><b>${state.media.length} saved file${state.media.length === 1 ? '' : 's'}</b><span>Photos and videos are kept with this visit.</span></div>
        </div>`;
    }
    if (stage === 'recap') return `
      <span class="eyebrow">You told us</span><h2>Let’s make sure we have understood.</h2><p class="lead">These points will shape the recommendation and the customer summary.</p>
      <div class="customerRecap">
        ${recapItem('Main goal', s.priorities.primary || 'Still to confirm')}
        ${recapItem('Other priorities', s.priorities.secondary.join(', ') || 'None selected')}
        ${recapItem('A good result', s.priorities.goodResult || s.priorities.ownWords || 'Still to confirm')}
        ${recapItem('Energy use', energyUseLine())}
        ${recapItem('Funding', s.priorities.financePlan || 'Still considering')}
        ${recapItem('Main concern', s.priorities.mainConcern || 'No concern raised')}
        ${recapItem('Other people involved', s.priorities.decisionMakers || 'No one else recorded')}
        ${recapItem('Timescale', s.priorities.timing || 'No preferred timescale recorded')}
      </div>
      <label class="checkLine"><input type="checkbox" data-check="confirmation.recapConfirmed" ${s.confirmation.recapConfirmed ? 'checked' : ''}>This recap reflects what we have discussed</label>`;
    if (stage === 'recommendation') return `
      <span class="eyebrow">Our recommendation</span><h2>${summary.price.ready ? 'A system designed around your priorities.' : 'The recommendation is still being finalised.'}</h2>
      ${customerRecommendationMarkup()}`;
    if (stage === 'decision') return `
      <span class="eyebrow">Your decision</span><h2>Does this recommendation feel right for your home?</h2><p class="lead">Choose the closest answer. We can clarify a concern or change the recommendation before moving on.</p>
      <div class="customerChoices decisionChoices">
        <button class="customerChoice ${s.decision.status === 'Feels right' ? 'selected' : ''}" data-decision="Feels right">Yes, this feels right</button>
        <button class="customerChoice ${s.decision.status === 'Concern raised' ? 'selected' : ''}" data-decision="Concern raised">I have one concern</button>
        <button class="customerChoice ${s.decision.status === 'Changes requested' ? 'selected' : ''}" data-decision="Changes requested">Something needs changing</button>
      </div>
      ${s.decision.status === 'Concern raised' ? `<h3>What is the main concern?</h3><div class="customerChoices">${CONCERNS.map(item => `<button class="customerChoice ${s.decision.concernCategory === item ? 'selected' : ''}" data-concern="${esc(item)}">${esc(item)}</button>`).join('')}</div><div class="customerInput"><label>Anything to add?<textarea data-bind="decision.concernDetail">${esc(s.decision.concernDetail)}</textarea></label></div>` : ''}
      ${s.decision.status === 'Changes requested' ? `<div class="customerInput"><label>What should we change?<textarea data-bind="design.customerRequestedChanges">${esc(s.design.customerRequestedChanges)}</textarea></label></div>` : ''}`;
    if (stage === 'confirmation') return `
      <span class="eyebrow">Recommendation confirmation</span><h2>Confirm the recommendation can move to a formal quote.</h2>
      <p class="lead">This confirms the discussion and proposed design. It is not a contract or binding acceptance.</p>
      <div class="stackChoices">
        ${confirmationChoice('confirmation.prioritiesUnderstood', 'Your priorities have been understood')}
        ${confirmationChoice('confirmation.layoutConfirmed', 'The proposed panel layout is acceptable')}
        ${confirmationChoice('confirmation.batteryConfirmed', summary.storage ? 'The proposed battery size is acceptable' : 'No battery is included in this recommendation')}
        ${confirmationChoice('confirmation.recommendationConfirmed', 'The recommendation can be used to prepare the formal quote')}
      </div>
      <div class="notice soft"><b>Next step</b><br>${esc(Catalog.formalQuoteParagraph)}</div>
      <p class="hint">Formal review and e-signing happen separately. No screen tap here creates a contract.</p>`;
    return '';
  }

  function recapItem(label, value) {
    return `<div class="recapCard"><small>${esc(label)}</small><b>${esc(value)}</b></div>`;
  }

  function confirmationChoice(path, label) {
    const selected = !!getPath(state.survey, path, false);
    return `<button class="stackChoice ${selected ? 'selected' : ''}" data-toggle-check="${path}">${esc(label)}</button>`;
  }

  function energyUseLine() {
    const e = state.survey.energy;
    const parts = [];
    if (num(e.annualKwh)) parts.push(`${num(e.annualKwh).toLocaleString('en-GB')} kWh/year`);
    if (e.ev) parts.push('EV considered');
    if (e.heatPump) parts.push('heat pump / major load considered');
    if (e.existingSolar) parts.push('existing solar');
    return parts.join(', ') || 'Still to confirm';
  }

  function customerRecommendationMarkup() {
    const s = state.survey;
    const summary = recommendationSummary();
    const performance = performanceEstimate();
    if (!summary.price.ready) return `<div class="notice warning"><b>Price not ready to present.</b><br>${esc(summary.price.reason)} The surveyor can return to the design before continuing.</div>`;
    const system = summary.solar ? `${summary.count} × ${summary.panel.name} (${summary.kwp.toFixed(2)} kWp)` : 'Battery-only system';
    const reason = clean(s.design.reasonForRecommendation) || defaultRecommendationReason();
    const assumptions = clean(s.design.limitations) || 'Final technical checks, access and the DNO process remain to be confirmed.';
    return `<article class="customerRecommendation">
      <div class="recommendHero"><span class="eyebrow">Our recommendation</span><h3>${esc(system)}</h3><p>${summary.storage ? esc(summary.battery.text) : 'No battery included'}</p></div>
      <div class="recommendDetails">
        <div><small>Customer total</small><b>${money(summary.price.total)}</b></div>
        <div><small>Designed around</small><b>${esc(s.priorities.primary || 'the priorities discussed')}</b></div>
        <div><small>Roof fit</small><b>${esc(roofValidationCustomerLabel())}</b></div>
      </div>
      <div class="recommendBody">
        <h3>Why this suits your home</h3><p>${esc(reason)}</p>
        <h3>What is included</h3><p>${esc(customerInclusions())}</p>
        ${performance.available ? `<h3>Illustrative performance</h3><p>Estimated generation: ${performance.generation.toLocaleString('en-GB')} kWh a year. Estimated annual benefit: ${money(performance.annualBenefit)}. These figures use the recorded consumption, ${num(s.energy.importRate)}p import, ${num(s.energy.exportRate)}p export and ${num(s.energy.selfUsePct)}% self-use assumptions.</p>` : ''}
        <h3>Important assumptions</h3><p>${esc(assumptions)}</p>
        ${clean(s.design.warrantyInfo) ? `<h3>Warranty and support</h3><p>${esc(s.design.warrantyInfo)}</p>` : ''}
      </div>
    </article>`;
  }

  function defaultRecommendationReason() {
    const s = state.survey;
    const summary = recommendationSummary();
    const parts = [];
    if (s.priorities.primary) parts.push(`It supports your main priority: ${s.priorities.primary.toLowerCase()}`);
    if (summary.solar) parts.push(`the ${summary.kwp.toFixed(2)} kWp array fits the validated roof plan`);
    if (summary.storage && num(s.energy.annualKwh)) parts.push(`${summary.battery.usableKwh.toFixed(1)} kWh of usable storage has been considered against the recorded ${num(s.energy.annualKwh).toLocaleString('en-GB')} kWh annual use`);
    if (s.energy.ev || s.energy.heatPump) parts.push('future electrical demand has been considered');
    return parts.length ? `${parts.join('; ')}.` : 'It reflects the customer priorities, energy use and property details recorded during the visit.';
  }

  function roofValidationCustomerLabel() {
    const status = state.survey.site.validation.status;
    if (status === 'validated') return 'Validated today';
    if (status === 'validated-with-warnings') return 'Validated with recorded notes';
    if (status === 'not-required') return 'Not required for battery-only';
    return 'Still to be checked';
  }

  function customerInclusions() {
    const s = state.survey, summary = recommendationSummary();
    const included = [];
    if (summary.solar) included.push(`${summary.count} solar panels and the proposed mounting system`);
    if (summary.storage) included.push(summary.battery.text);
    if (summary.solar && s.design.bird) included.push('bird protection');
    if (summary.solar) {
      const lifts = num(s.design.scaffoldLifts);
      included.push(lifts ? `${lifts} scaffold lift${lifts === 1 ? '' : 's'}` : 'scaffolding subject to the recorded survey requirement');
    }
    included.push('installation and commissioning', 'relevant electrical protection', 'DNO process');
    return included.join(', ');
  }

  function renderCustomerStage() {
    if (!state.survey) return;
    const index = customerStageIndex();
    const stage = CUSTOMER_STAGES[index];
    $('customerStage').innerHTML = customerStageTemplate(stage);
    const progress = ((index + 1) / CUSTOMER_STAGES.length) * 100;
    $('customerProgressBar').style.width = `${progress}%`;
    const activeGroup = customerStageGroup(index);
    $$('#customerJourneySteps li').forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === activeGroup));
    $('customerBack').disabled = index === 0;
    $('customerContinue').textContent = stage === 'confirmation' ? 'Record and finish' : stage === 'decision' && state.survey.decision.status === 'Changes requested' ? 'Return to design' : 'Continue';
    fillForm();
  }

  async function customerContinue() {
    const index = customerStageIndex();
    const stage = CUSTOMER_STAGES[index];
    if (stage === 'priorities' && !state.survey.priorities.primary) {
      $('customerStage').insertAdjacentHTML('beforeend', '<div class="notice warning">Choose the most important priority before continuing.</div>');
      return;
    }
    if (stage === 'recap') state.survey.confirmation.recapConfirmed = true;
    if (stage === 'recommendation') {
      state.survey.meta.analyticsFlags.recommendationPresented = true;
      await track('recommendation_presented', { priceReady: priceState().ready });
    }
    if (stage === 'decision' && state.survey.decision.status === 'Not discussed') {
      $('customerStage').insertAdjacentHTML('beforeend', '<div class="notice warning">Choose the answer that best reflects how the recommendation feels before continuing.</div>');
      return;
    }
    if (stage === 'decision' && state.survey.decision.status === 'Concern raised' && !state.survey.decision.concernCategory) {
      $('customerStage').insertAdjacentHTML('beforeend', '<div class="notice warning">Choose the main concern so it can be recorded and addressed.</div>');
      return;
    }
    if (stage === 'decision' && state.survey.decision.status === 'Changes requested') {
      switchView('surveyor');
      go('design');
      return;
    }
    if (stage === 'confirmation') {
      const recorded = await recordConfirmation();
      if (!recorded) return;
      switchView('surveyor');
      go('complete');
      return;
    }
    state.survey.meta.customerStage = CUSTOMER_STAGES[Math.min(CUSTOMER_STAGES.length - 1, index + 1)];
    scheduleSave();
    renderCustomerStage();
    state.stageEnteredAt = Date.now();
  }

  function customerBack() {
    const index = customerStageIndex();
    state.survey.meta.customerStage = CUSTOMER_STAGES[Math.max(0, index - 1)];
    scheduleSave();
    renderCustomerStage();
    state.stageEnteredAt = Date.now();
  }

  function chooseDecision(value) {
    state.survey.decision.status = value;
    if (value === 'Feels right') {
      state.survey.decision.concernStatus = 'Not raised';
      state.survey.decision.concernCategory = '';
    } else if (value === 'Concern raised') state.survey.decision.concernStatus = 'Open';
    renderCustomerStage();
    renderCompletion();
    scheduleSave();
  }

  function chooseConcern(value) {
    state.survey.decision.concernCategory = value;
    state.survey.decision.concernStatus = 'Open';
    state.survey.priorities.mainConcern = value;
    track('concern_selected', { category: value });
    renderCustomerStage();
    renderCompletion();
    scheduleSave();
  }

  function toggleBooleanPath(path) {
    setPath(state.survey, path, !getPath(state.survey, path, false));
    markInformation(path, 'Confirmed today', 'confirmed');
    renderCustomerStage();
    renderCompletion();
    scheduleSave();
  }

  function renderCompletion() {
    if (!state.survey) return;
    $('formalQuoteParagraph').textContent = Catalog.formalQuoteParagraph;
    $('concernCategory').innerHTML = `<option value="">No category selected</option>${CONCERNS.map(item => `<option ${state.survey.decision.concernCategory === item ? 'selected' : ''}>${esc(item)}</option>`).join('')}`;
    $('confirmationStatus').textContent = state.survey.confirmation.recordedAt ? `Recorded ${new Date(state.survey.confirmation.recordedAt).toLocaleString('en-GB')}. This is not contract acceptance.` : 'Not yet recorded.';
    $('quoteOnlineStatus').textContent = state.online ? 'Online. The handoff can be prepared, but no e-signing provider is configured in this repository.' : 'Offline. The handoff will be queued safely on this tablet.';
  }

  async function recordConfirmation() {
    const c = state.survey.confirmation;
    const summary = recommendationSummary();
    if (!c.prioritiesUnderstood || !c.recommendationConfirmed || (summary.solar && !c.layoutConfirmed) || (summary.storage && !c.batteryConfirmed)) {
      $('confirmationStatus').textContent = 'Complete the relevant confirmations before recording.';
      return false;
    }
    const firstConfirmation = !c.recordedAt;
    c.recordedAt = new Date().toISOString();
    state.survey.status = 'recommendation-confirmed';
    await saveSurvey();
    if (firstConfirmation) await track('recommendation_confirmed');
    renderCompletion();
    return true;
  }

  async function prepareFormalQuote() {
    if (!state.survey) return;
    if (!state.survey.confirmation.recommendationConfirmed) {
      $('finishNotice').innerHTML = '<b>Recommendation confirmation is still required.</b> Record the customer discussion before preparing the formal quote handoff.';
      return;
    }
    if (!priceState().ready) {
      $('finishNotice').innerHTML = `<b>Formal quote not ready.</b> ${esc(priceState().reason)}`;
      return;
    }
    if (!state.online) {
      const queued = (await Store.getQueueItems()).find(item => item.surveyId === state.survey.id && item.type === 'formal-quote-handoff');
      const item = queued || { id: uid('queue'), surveyId: state.survey.id, type: 'formal-quote-handoff', status: 'waiting-for-connection', createdAt: new Date().toISOString() };
      if (!queued) await Store.putQueueItem(item);
      if (!state.survey.pendingActions.includes(item.id)) state.survey.pendingActions.push(item.id);
      state.survey.confirmation.formalQuoteStatus = 'Ready to prepare';
      await saveSurvey();
      $('finishNotice').innerHTML = '<b>Saved for later.</b> The formal quote handoff is queued until a connection is available.';
      renderQueue();
      return;
    }
    state.survey.confirmation.formalQuoteStatus = 'Ready to prepare';
    await saveSurvey();
    await track('formal_quote_prepared', { providerConfigured: false });
    downloadText(`${customerStem()}_formal_quote_handoff.txt`, formalQuoteHandoffText(), 'text/plain');
    $('finishNotice').innerHTML = '<b>Formal quote handoff prepared.</b> The repository does not contain a configured e-signing provider, so no document has been sent or presented as signed.';
  }

  function formalQuoteHandoffText() {
    const summary = recommendationSummary();
    return [
      'FORMAL QUOTE HANDOFF', '',
      `Customer: ${state.survey.customer.name}`, `Address: ${state.survey.customer.address}`, `Email: ${state.survey.customer.email}`, '',
      `Recommendation: ${systemLine(summary)}`, `Customer total: ${summary.price.ready ? money(summary.price.total) : 'NOT READY'}`, '',
      Catalog.formalQuoteParagraph, '',
      'Status: Prepared for formal review and e-signing. This handoff is not a signed contract.'
    ].join('\n');
  }

  function systemLine(summary = recommendationSummary()) {
    const solar = summary.solar ? `${summary.count} × ${summary.panel.name} (${summary.kwp.toFixed(2)} kWp)` : 'No solar PV';
    return summary.storage ? `${solar}; ${summary.battery.text}` : solar;
  }

  function customerSummaryHtml() {
    const s = state.survey;
    const summary = recommendationSummary();
    const performance = performanceEstimate();
    const concerns = s.decision.concernCategory ? `${s.decision.concernCategory}: ${s.decision.concernStatus}${s.decision.concernDetail ? `. ${s.decision.concernDetail}` : ''}` : 'No concern recorded';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solar recommendation for ${esc(s.customer.name || 'customer')}</title><style>${documentCss()}</style></head><body><main class="doc">
      <header><small>The Little Green Energy Company</small><h1>${esc(s.customer.name || 'Your home energy recommendation')}</h1><p>${esc(s.customer.address || 'Prepared following the home survey')}</p></header>
      <section class="intro"><h2>Your priorities</h2><p><b>Main priority:</b> ${esc(s.priorities.primary || 'To be confirmed')}</p><p>${esc(s.priorities.goodResult || s.priorities.ownWords || 'The recommendation reflects the discussion during the visit.')}</p></section>
      <section class="recommend"><span>Our recommendation</span><h2>${esc(systemLine(summary))}</h2>${summary.price.ready ? `<div class="price">${money(summary.price.total)}</div>` : '<div class="warning">Customer price is still to be confirmed.</div>'}<p>${esc(clean(s.design.reasonForRecommendation) || defaultRecommendationReason())}</p></section>
      <section class="grid"><div><small>Roof and property</small><b>${esc(roofValidationCustomerLabel())}</b><p>${esc(propertyFindingLine())}</p></div><div><small>Included</small><b>Complete proposed system</b><p>${esc(customerInclusions())}</p></div><div><small>Important assumptions</small><b>Subject to final checks</b><p>${esc(clean(s.design.limitations) || 'Final technical checks, access and the DNO process remain to be confirmed.')}</p></div>${performance.available ? `<div><small>Illustrative performance</small><b>${performance.generation.toLocaleString('en-GB')} kWh/year</b><p>Estimated annual benefit ${money(performance.annualBenefit)}, using the recorded tariff and self-use assumptions.</p></div>` : ''}</section>
      ${clean(s.design.warrantyInfo) ? `<section><h2>Warranty and support</h2><p>${esc(s.design.warrantyInfo)}</p></section>` : ''}
      <section><h2>Questions and changes</h2><p>${esc(concerns)}</p>${clean(s.design.customerRequestedChanges) ? `<p><b>Requested change:</b> ${esc(s.design.customerRequestedChanges)}</p>` : ''}</section>
      <section><h2>What happens next</h2><p>${esc(Catalog.formalQuoteParagraph)}</p><p><b>Formal quote status:</b> ${esc(s.confirmation.formalQuoteStatus)}</p></section>
      <footer>Prepared ${new Date().toLocaleDateString('en-GB')} · Recommendation confirmation is separate from formal contract acceptance.</footer>
    </main></body></html>`;
  }

  function propertyFindingLine() {
    const s = state.survey;
    const bits = [];
    if (s.site.roofCovering) bits.push(`${s.site.roofCovering} roof covering`);
    if (s.site.validation.capacity) bits.push(`${s.site.validation.capacity} panel validated starting capacity`);
    if (s.site.supplyPhase) bits.push(s.site.supplyPhase.toLowerCase());
    if (s.site.routeAgreed) bits.push('proposed route discussed');
    return bits.join(', ') || 'Property findings remain subject to the recorded technical checks.';
  }

  function documentCss() {
    return 'body{margin:0;padding:24px;background:#eef5ef;color:#10281d;font:16px/1.55 Arial,sans-serif}.doc{max-width:960px;margin:auto;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(8,44,28,.14)}header{padding:38px;background:linear-gradient(135deg,#082c1c,#137a49);color:#fff}header small,.recommend>span,.grid small{text-transform:uppercase;letter-spacing:.12em;font-weight:800}header small,.recommend>span{color:#dff897}h1{font-size:46px;line-height:1;margin:10px 0}header p{color:#e5f5ea}.doc>section{padding:24px 30px;border-bottom:1px solid #d8e4db}.recommend{background:#f4faef}.recommend h2{font-size:32px}.price{font-size:55px;font-weight:900;color:#082c1c}.warning{padding:14px;border-radius:14px;background:#fff5de;color:#8a5a00}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.grid div{padding:16px;border:1px solid #d8e4db;border-radius:18px}.grid small{color:#137a49}.grid b{display:block;margin:7px 0;font-size:20px}footer{padding:22px 30px;color:#6b7e76;font-size:13px}@media(max-width:700px){body{padding:0}.doc{border-radius:0}.grid{grid-template-columns:1fr}h1{font-size:36px}}';
  }

  function internalSummaryText() {
    const s = state.survey, summary = recommendationSummary();
    const validation = s.site.validation;
    return [
      'LG SURVEY PRO V3 - INTERNAL SURVEY SUMMARY', '',
      `Customer: ${s.customer.name}`, `Address: ${s.customer.address}`, `Phone: ${s.customer.phone}`, `Email: ${s.customer.email}`, `Monday item: ${s.customer.mondayId}`, '',
      `Primary priority: ${s.priorities.primary}`, `Secondary priorities: ${s.priorities.secondary.join(', ')}`, `Customer wording: ${s.priorities.ownWords}`, `Good result: ${s.priorities.goodResult}`, `Main concern: ${s.priorities.mainConcern}`, `Decision makers: ${s.priorities.decisionMakers}`, `Funding: ${s.priorities.financePlan} ${s.priorities.financeNote}`, '',
      `Annual use: ${s.energy.annualKwh} kWh`, `Tariff: ${s.energy.tariff}`, `Daytime use: ${s.energy.daytimeUse}`, `Overnight use: ${s.energy.overnightUse}`, `Future changes: ${s.energy.futureChanges}`, '',
      `Recommendation: ${systemLine(summary)}`, `Reason: ${s.design.reasonForRecommendation || defaultRecommendationReason()}`, `Customer price: ${summary.price.ready ? money(summary.price.total) : 'NOT READY'}`, `Price state: ${summary.price.reason}`, `Pricing authority: ${Catalog.pricingAuthority.name}`, '',
      `Roof validation: ${validation.status}`, `Roof capacity: ${validation.capacity}`, `Validation method: ${validation.method}`, `Warnings: ${(validation.warnings || []).join(' | ') || 'None'}`, `Supply: ${s.site.supplyPhase}`, `Battery/inverter location: ${s.site.batteryLocation}`, `Cable route: ${s.site.cableRoute}`, `Access: ${s.site.access}`, `Outstanding checks: ${s.site.outstandingChecks}`, `Survey notes: ${s.site.generalNotes}`, '',
      `Decision: ${s.decision.status}`, `Concern: ${s.decision.concernCategory} ${s.decision.concernDetail}`, `Concern status: ${s.decision.concernStatus}`, `Next action: ${s.decision.nextAction}`, `Owner: ${s.decision.owner}`, `Expected timing: ${s.decision.expectedTiming}`, `Formal quote: ${s.confirmation.formalQuoteStatus}`, '',
      `Media files: ${state.media.length}`, `Last saved: ${s.updatedAt}`
    ].join('\n');
  }

  function crmSummaryText() {
    const s = state.survey, summary = recommendationSummary();
    const missing = missingInformation();
    return [
      `Customer: ${s.customer.name || 'Not recorded'}`,
      `Total Job Value: ${summary.price.ready ? money(summary.price.total) : 'Not ready'}`,
      `Recommendation: ${systemLine(summary)}`,
      `Decision status: ${s.decision.status}`,
      `Main concern or blocker: ${s.decision.concernCategory || s.priorities.mainConcern || 'None recorded'}${s.decision.concernDetail ? ` - ${s.decision.concernDetail}` : ''}`,
      `People involved in decision: ${s.priorities.decisionMakers || 'Not recorded'}`,
      `Next action: ${s.decision.nextAction || 'Not recorded'}`,
      `Owner: ${s.decision.owner || 'Not recorded'}`,
      `Expected timing: ${s.decision.expectedTiming || s.priorities.timing || 'Not recorded'}`,
      `Missing information: ${missing.length ? missing.join(', ') : 'None identified'}`,
      `Quote status: ${s.confirmation.formalQuoteStatus}`
    ].join('\n');
  }

  function sidekickPromptText() {
    return `Sidekick AI Prompt\n\nUpdate the matching Monday.com customer item using the following visit summary. Keep existing information that is not explicitly replaced. Do not invent missing details.\n\n${crmSummaryText()}`;
  }

  function missingInformation() {
    if (!state.survey) return ['No active visit'];
    const s = state.survey;
    const fields = [
      [s.customer.name, 'customer name'], [s.customer.address, 'address'], [s.customer.email, 'email'],
      [s.priorities.primary, 'primary priority'], [s.energy.annualKwh, 'annual electricity use'],
      [s.site.validation.status !== 'not-checked' && s.site.validation.status !== 'failed', 'roof validation'],
      [s.design.reasonForRecommendation, 'recommendation reason'], [priceState().ready, 'authorised customer price']
    ];
    return fields.filter(([value]) => !value).map(([, label]) => label);
  }

  function recommendationEmailPlainText() {
    const s = state.survey, summary = recommendationSummary(), performance = performanceEstimate();
    const lines = [
      `Hi ${firstName(s.customer.name) || 'there'},`, '',
      'Thank you for taking the time to go through the home energy survey today.', '',
      `You said your main priority is ${s.priorities.primary ? s.priorities.primary.toLowerCase() : 'finding the right system for your home'}.`,
      s.priorities.goodResult ? `A good result for you would be: ${s.priorities.goodResult}` : '', '',
      'Our recommendation',
      systemLine(summary),
      summary.price.ready ? `Total customer price: ${money(summary.price.total)}` : 'The customer price is still to be confirmed.',
      `Why it fits: ${clean(s.design.reasonForRecommendation) || defaultRecommendationReason()}`,
      `Included: ${customerInclusions()}`,
      performance.available ? `Illustrative generation: ${performance.generation.toLocaleString('en-GB')} kWh a year. Illustrative annual benefit: ${money(performance.annualBenefit)}, using the assumptions discussed.` : '',
      `Important assumptions: ${clean(s.design.limitations) || 'Final technical checks, access and the DNO process remain to be confirmed.'}`, '',
      summary.price.ready ? `Please confirm that you are happy with the proposed panel layout${summary.storage ? ' and battery size' : ''} so the formal quote can be prepared for review and e-signing.` : 'The next step is to complete the remaining checks and confirm the customer price.', '',
      `Agreed next action: ${s.decision.nextAction || 'Prepare the formal quote for review and e-signing.'}`, '',
      'Kind regards,', 'James Cooling', 'The Little Green Energy Company'
    ];
    return lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n').trim();
  }

  function firstName(name) { return clean(name).split(/\s+/)[0] || ''; }
  function emailSubject() { return `Your solar recommendation for ${state.survey.customer.address || state.survey.customer.name || 'your home'}`; }
  function recommendationMailto() { return `mailto:${encodeURIComponent(clean(state.survey.customer.email))}?subject=${encodeURIComponent(emailSubject())}&body=${encodeURIComponent(recommendationEmailPlainText())}`; }

  function renderEmailDraft() {
    if (state.survey && $('emailDraft')) $('emailDraft').value = recommendationEmailPlainText();
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      $('finishNotice').innerHTML = `<b>${esc(successMessage)}</b>`;
      return true;
    } catch (error) {
      console.warn(error);
      $('finishNotice').innerHTML = '<b>Copy was blocked by this browser.</b> The text remains visible to select manually.';
      return false;
    }
  }

  async function sendRecommendationEmail() {
    if (!state.survey) return;
    await saveSurvey();
    state.survey.outputs.emailOpenedAt = new Date().toISOString();
    await saveSurvey();
    window.location.href = recommendationMailto();
    $('finishNotice').innerHTML = '<b>Email opened.</b> The customer address, subject and plain-text recommendation have been prepared in the default email app.';
  }

  async function downloadCustomerSummary() {
    if (!state.survey) return;
    downloadText(`${customerStem()}_customer_summary.html`, customerSummaryHtml(), 'text/html');
    state.survey.outputs.customerSummaryAt = new Date().toISOString();
    await saveSurvey();
  }

  function customerStem() {
    const parts = clean(state.survey?.customer?.name || 'survey').split(/\s+/).filter(Boolean);
    if (parts.length > 1) return safeSlug(`${parts.at(-1)}_${parts.slice(0, -1).join('_')}`);
    return safeSlug(parts[0] || 'survey');
  }

  function safeSlug(value) { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'survey'; }
  function safeFileName(value) { return clean(value || 'file').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').slice(0, 90) || 'file'; }

  async function exportPack() {
    if (!state.survey) return;
    await saveSurvey();
    const root = `${customerStem()}_survey_pack_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`;
    const entries = [
      textEntry(`${root}/customer_summary.html`, customerSummaryHtml()),
      textEntry(`${root}/internal_survey_summary.txt`, internalSummaryText()),
      textEntry(`${root}/crm_summary.txt`, crmSummaryText()),
      textEntry(`${root}/customer_email.txt`, recommendationEmailPlainText()),
      textEntry(`${root}/survey_data.json`, JSON.stringify(state.survey, null, 2))
    ];
    for (let index = 0; index < state.media.length; index++) {
      const item = state.media[index];
      const category = safeSlug(item.category || 'other');
      entries.push(await blobEntry(`${root}/media/${String(index + 1).padStart(2, '0')}_${category}_${safeFileName(item.name)}`, item.blob));
    }
    try {
      downloadBlob(buildZip(entries), `${root}.zip`);
      state.survey.outputs.internalPackAt = new Date().toISOString();
      await saveSurvey();
      if (!state.survey.meta.visitCompletedAt) await track('visit_completed', { mediaCount: state.media.length });
      state.survey.meta.visitCompletedAt = new Date().toISOString();
      state.survey.status = 'completed';
      await saveSurvey();
      $('finishNotice').innerHTML = `<b>Technical survey pack created.</b> ${state.media.length} customer-specific media file${state.media.length === 1 ? '' : 's'} included.`;
    } catch (error) {
      await track('export_failure', { type: 'pack', message: error.message });
      $('finishNotice').innerHTML = `<b>Pack export failed.</b> ${esc(error.message)}`;
    }
  }

  function textEntry(name, text) { return { name, data: new TextEncoder().encode(text) }; }
  async function blobEntry(name, blob) { return { name, data: new Uint8Array(await blob.arrayBuffer()) }; }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let value = n;
      for (let k = 0; k < 8; k++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      table[n] = value >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let value = 0xffffffff;
    for (let index = 0; index < data.length; index++) value = crcTable[(value ^ data[index]) & 0xff] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }

  function buildZip(entries) {
    const chunks = [], central = [];
    const encoder = new TextEncoder();
    let offset = 0;
    const u16 = value => [value & 255, (value >>> 8) & 255];
    const u32 = value => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
    const date = new Date();
    const dosTime = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | (Math.floor(date.getSeconds() / 2) & 31);
    const dosDate = (((Math.max(1980, date.getFullYear()) - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    entries.forEach(entry => {
      const name = encoder.encode(entry.name), data = entry.data, crc = crc32(data), flags = 0x0800;
      const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(flags), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
      chunks.push(local, name, data);
      const header = new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(flags), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]);
      central.push(header, name);
      offset += local.length + name.length + data.length;
    });
    const centralSize = central.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url; link.download = filename; document.body.appendChild(link); link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 1500);
  }

  function downloadText(filename, text, type = 'text/plain') { downloadBlob(new Blob([text], { type }), filename); }

  async function addMedia(files, category = state.pendingCategory) {
    if (!state.survey) await startSurvey({}, 'media-capture');
    const surveyId = state.survey.id;
    const selected = Array.from(files || []);
    if (!selected.length) return;
    setSaveStatus('Saving media locally…', 'saving');
    let saved = 0;
    for (const file of selected) {
      try {
        const item = {
          id: uid('media'), surveyId, name: safeFileName(file.name || `${category}_${Date.now()}`), type: file.type || 'application/octet-stream',
          size: file.size || 0, category, note: '', createdAt: new Date().toISOString(), blob: file
        };
        await Store.putMedia(item);
        saved++;
      } catch (error) {
        console.error(error);
        await track('media_save_failure', { name: file.name, size: file.size, message: error.message });
      }
    }
    if (state.survey?.id === surveyId) {
      state.media = await Store.getMedia(surveyId);
      renderMedia();
      await saveSurvey();
    }
    setSaveStatus(saved === selected.length ? `${saved} file${saved === 1 ? '' : 's'} saved locally` : `${saved} of ${selected.length} files saved`, saved ? 'saved' : 'error');
  }

  function renderMedia() {
    const box = $('mediaGrid');
    state.mediaPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    state.mediaPreviewUrls = [];
    $('mediaCount').textContent = state.media.length;
    $$('#mediaCategories button').forEach(button => button.classList.toggle('active', button.dataset.mediaCategory === state.pendingCategory));
    if (!state.media.length) { box.innerHTML = '<div class="empty">No site files saved for this customer yet.</div>'; return; }
    box.innerHTML = state.media.map((item, index) => {
      const url = URL.createObjectURL(item.blob);
      state.mediaPreviewUrls.push(url);
      const preview = item.type.startsWith('image/') ? `<img src="${url}" alt="${esc(item.category)}">` : item.type.startsWith('video/') ? `<video src="${url}" controls playsinline preload="metadata"></video>` : `<div class="fileIcon">${esc(item.type || 'File')}</div>`;
      return `<article class="mediaItem"><div>${preview}</div><div class="mediaBody"><b>${String(index + 1).padStart(2, '0')} ${esc(item.category)}</b><span>${esc(item.name)} · ${formatBytes(item.size)}</span><div class="rowActions">${item.type.startsWith('image/') ? `<button data-markup="${esc(item.id)}">Mark up</button>` : ''}<button class="ghost danger" data-remove-media="${esc(item.id)}">Remove</button></div></div></article>`;
    }).join('');
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function removeMedia(id) {
    const item = state.media.find(media => media.id === id);
    if (!item || !confirm(`Remove ${item.name} from this visit?`)) return;
    await Store.deleteMedia(id);
    state.media = await Store.getMedia(state.survey.id);
    renderMedia();
    await saveSurvey();
  }

  function openMarkup(id) {
    const item = state.media.find(media => media.id === id);
    if (!item || !item.type.startsWith('image/')) return;
    state.markup.item = item;
    state.markup.actions = [];
    const image = new Image();
    const url = URL.createObjectURL(item.blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      state.markup.img = image;
      const canvas = $('markupCanvas');
      const scale = Math.min(1, 1200 / image.naturalWidth);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      drawMarkup();
      $('markupModal').hidden = false;
    };
    image.src = url;
  }

  function drawMarkup() {
    const canvas = $('markupCanvas'), context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(state.markup.img, 0, 0, canvas.width, canvas.height);
    state.markup.actions.forEach(action => {
      const colour = action.tool === 'line' ? '#e43131' : '#ffffff';
      context.lineWidth = Math.max(3, canvas.width / 360);
      context.strokeStyle = colour;
      context.fillStyle = 'rgba(255,255,255,.92)';
      if (action.tool === 'box') context.strokeRect(action.x, action.y, action.w, action.h);
      if (action.tool === 'line') {
        context.beginPath(); context.moveTo(action.x, action.y); context.lineTo(action.x2, action.y2); context.stroke();
      }
      if (action.tool === 'label') {
        const fontSize = Math.max(18, canvas.width / 30);
        context.font = `700 ${fontSize}px Arial`;
        const width = context.measureText(action.text).width + 24;
        context.fillRect(action.x, action.y - fontSize, width, fontSize + 16);
        context.fillStyle = '#10281d';
        context.fillText(action.text, action.x + 12, action.y + 2);
      }
    });
  }

  function markupPoint(event) {
    const canvas = $('markupCanvas'), rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  }

  async function saveMarkupCopy() {
    const canvas = $('markupCanvas');
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob || !state.markup.item) return;
    const item = state.markup.item;
    await Store.putMedia({
      id: uid('media'), surveyId: item.surveyId, name: `${safeSlug(item.category)}_marked_up.jpg`, type: 'image/jpeg', size: blob.size,
      category: item.category, note: 'Marked-up copy', createdAt: new Date().toISOString(), blob
    });
    state.media = await Store.getMedia(state.survey.id);
    $('markupModal').hidden = true;
    renderMedia();
    await saveSurvey();
  }

  async function renderDiagnostics() {
    if (!$('appDiagnostics')) return;
    let storageText = 'Storage estimate unavailable';
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      storageText = `${formatBytes(estimate.usage || 0)} used of approximately ${formatBytes(estimate.quota || 0)}`;
    }
    const rows = [
      ['App version', APP_VERSION], ['Offline shell', 'Enabled after first successful load'],
      ['Residential pricing', Catalog.pricingAuthority.available ? Catalog.pricingAuthority.name : 'V8.6 workbook required'],
      ['Powerwall pricing', 'Current figures configured, no rebate'], ['Local storage', storageText],
      ['Active customer', state.survey?.customer?.name || 'None']
    ];
    $('appDiagnostics').innerHTML = rows.map(([label, value]) => `<div class="diagnosticItem"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
  }

  async function renderAnalytics() {
    if (!$('analyticsSummary')) return;
    const events = await Store.getEvents();
    const count = type => events.filter(event => event.type === type).length;
    const stageSeconds = events.filter(event => event.type === 'stage_time').reduce((total, event) => total + num(event.data?.seconds), 0);
    const metrics = [
      ['Visits started', count('visit_started')], ['Visits completed', count('visit_completed')],
      ['Recommendations presented', count('recommendation_presented')], ['Concerns selected', count('concern_selected')],
      ['Recommendations confirmed', count('recommendation_confirmed')], ['Formal quotes prepared', count('formal_quote_prepared')],
      ['Recovered surveys', count('survey_recovered')], ['Recorded journey time', `${Math.round(stageSeconds / 60)} min`],
      ['Import failures', count('import_failure')], ['Export failures', count('export_failure')]
    ];
    $('analyticsSummary').innerHTML = metrics.map(([label, value]) => `<div class="metric"><b>${esc(value)}</b><span>${esc(label)}</span></div>`).join('');
  }

  async function renderQueue() {
    if (!$('queueList')) return;
    const items = await Store.getQueueItems();
    if (!items.length) { $('queueList').innerHTML = '<div class="empty">No online actions are waiting.</div>'; return; }
    $('queueList').innerHTML = items.map(item => `<article class="savedCard"><div><b>Formal quote handoff</b><span>${esc(item.status)} · ${new Date(item.createdAt).toLocaleString('en-GB')}</span></div><button data-open-queued-survey="${esc(item.surveyId)}">Open visit</button></article>`).join('');
  }

  async function exportBackup() {
    const surveys = await Store.getSurveys();
    const events = await Store.getEvents();
    const queue = await Store.getQueueItems();
    const media = [];
    for (const survey of surveys) {
      const items = await Store.getMedia(survey.id);
      media.push(...items.map(({ blob, ...metadata }) => metadata));
    }
    downloadText(`lg_survey_v3_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: APP_VERSION, exportedAt: new Date().toISOString(), note: 'Media metadata is listed here. Full media files are contained in each customer survey pack.', surveys, media, events, queue }, null, 2), 'application/json');
  }

  async function downloadAnalytics() {
    const events = await Store.getEvents();
    downloadText(`lg_survey_v3_local_metrics_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: APP_VERSION, exportedAt: new Date().toISOString(), events }, null, 2), 'application/json');
  }

  function populateControls() {
    $('panelModel').innerHTML = Object.entries(Catalog.panels).map(([key, panel]) => `<option value="${key}">${esc(panel.name)}${panel.default ? ' (default)' : ''}</option>`).join('');
    $('mounting').innerHTML = ['Plain Tile', 'Pantile', 'Slate', 'Trapezoidal', 'Standing Seam', 'Flat Roof', 'In-Roof', 'Fibre Cement', 'Ground Mount'].map(item => `<option>${item}</option>`).join('');
    $('mediaCategories').innerHTML = MEDIA_CATEGORIES.map(category => `<button data-media-category="${esc(category)}" class="${category === state.pendingCategory ? 'active' : ''}">${esc(category)}</button>`).join('');
    $('formalQuoteParagraph').textContent = Catalog.formalQuoteParagraph;
  }

  function setupEvents() {
    bindForms();
    $$('.navBtn').forEach(button => button.addEventListener('click', () => go(button.dataset.panel)));
    $$('.viewBtn').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
    $$('[data-next-panel]').forEach(button => button.addEventListener('click', () => go(button.dataset.nextPanel)));
    $$('[data-open-customer-stage]').forEach(button => button.addEventListener('click', () => switchView('customer', button.dataset.openCustomerStage)));
    $('returnSurveyor').addEventListener('click', () => switchView('surveyor'));
    $('customerContinue').addEventListener('click', customerContinue);
    $('customerBack').addEventListener('click', customerBack);

    $('startBlank').addEventListener('click', () => startSurvey({}, 'blank'));
    $('continueLast').addEventListener('click', async () => {
      const id = localStorage.getItem(Store.ACTIVE_SURVEY_KEY);
      if (id && await loadSurvey(id, true)) return;
      const surveys = await Store.getSurveys();
      if (surveys[0]) await loadSurvey(surveys[0].id, true); else await startSurvey({}, 'blank');
    });
    $('savedSurveys').addEventListener('click', async event => {
      const open = event.target.closest('[data-open-survey]');
      const remove = event.target.closest('[data-delete-survey]');
      if (open) await loadSurvey(open.dataset.openSurvey);
      if (remove && confirm('Delete this saved visit and its customer-specific media from this tablet?')) {
        await Store.deleteSurvey(remove.dataset.deleteSurvey);
        if (state.survey?.id === remove.dataset.deleteSurvey) { state.survey = null; state.media = []; renderAll(); go('prepare'); }
        renderSavedSurveys();
      }
    });

    $('mondayFile').addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      $('mondayPaste').value = await file.text();
      $('mondayStatus').textContent = `${file.name} loaded. Check the appointment details.`;
      previewMonday();
    });
    $('previewMonday').addEventListener('click', previewMonday);
    $('cancelImport').addEventListener('click', () => { state.importDraft = null; $('importPreview').hidden = true; $('mondayStatus').textContent = 'Preview cleared.'; });
    $('columnMapping').addEventListener('change', event => {
      const select = event.target.closest('[data-map-column]');
      if (!select || !state.importDraft) return;
      state.importDraft.mappings[num(select.dataset.mapColumn)] = select.value;
      Store.getSurveys().then(existing => {
        state.importDraft.duplicates = state.importDraft.records.map(record => findDuplicate(record, state.importDraft.headers, state.importDraft.mappings, existing.map(migrateSurvey)));
        renderImportPreview();
      });
    });
    $('importRecords').addEventListener('click', event => {
      const button = event.target.closest('[data-import-record]');
      if (button) importRecord(num(button.dataset.importRecord));
    });

    document.addEventListener('click', event => {
      const priority = event.target.closest('[data-priority]');
      const primary = event.target.closest('[data-primary-priority]');
      const funding = event.target.closest('[data-funding]');
      const toggle = event.target.closest('[data-toggle-check]');
      const decision = event.target.closest('[data-decision]');
      const concern = event.target.closest('[data-concern]');
      if (priority) togglePriority(priority.dataset.priority);
      if (primary) choosePrimaryPriority(primary.dataset.primaryPriority);
      if (funding && state.survey) { state.survey.priorities.financePlan = funding.dataset.funding; renderPriorityControls(); scheduleSave(); }
      if (toggle && state.survey) toggleBooleanPath(toggle.dataset.toggleCheck);
      if (decision && state.survey) chooseDecision(decision.dataset.decision);
      if (concern && state.survey) chooseConcern(concern.dataset.concern);
    });

    $('addRoof').addEventListener('click', () => {
      if (!state.survey) return;
      state.survey.site.roofPlanes.push(defaultRoof(`Roof ${state.survey.site.roofPlanes.length + 1}`));
      invalidateRoofValidation(); renderRoofPlanes(); scheduleSave();
    });
    $('roofPlaneList').addEventListener('input', event => { if (event.target.dataset.roofField) updateRoofField(event.target); });
    $('roofPlaneList').addEventListener('change', event => { if (event.target.dataset.roofField) updateRoofField(event.target); });
    $('roofPlaneList').addEventListener('click', event => {
      const button = event.target.closest('[data-remove-roof]');
      if (!button || !state.survey) return;
      state.survey.site.roofPlanes.splice(num(button.dataset.removeRoof), 1);
      if (!state.survey.site.roofPlanes.length) state.survey.site.roofPlanes.push(defaultRoof('Main roof'));
      invalidateRoofValidation(); renderRoofPlanes(); renderDesign(); scheduleSave();
    });
    $('validateRoof').addEventListener('click', validateRoof);

    $('mediaCategories').addEventListener('click', event => {
      const button = event.target.closest('[data-media-category]');
      if (!button) return;
      state.pendingCategory = button.dataset.mediaCategory;
      $$('#mediaCategories button').forEach(item => item.classList.toggle('active', item === button));
      $('mediaInput').click();
    });
    $('mediaInput').addEventListener('change', event => { addMedia(event.target.files).finally(() => { event.target.value = ''; }); });
    $('mediaGrid').addEventListener('click', event => {
      const remove = event.target.closest('[data-remove-media]');
      const markup = event.target.closest('[data-markup]');
      if (remove) removeMedia(remove.dataset.removeMedia);
      if (markup) openMarkup(markup.dataset.markup);
    });

    $$('[data-system-type]').forEach(button => button.addEventListener('click', () => setSystemType(button.dataset.systemType)));
    $$('[data-battery-select]').forEach(button => button.addEventListener('click', () => setBatteryBrand(button.dataset.batterySelect)));
    $$('[data-step-panel]').forEach(button => button.addEventListener('click', () => {
      if (!state.survey) return;
      state.survey.design.panelCount = Math.max(0, num(state.survey.design.panelCount) + num(button.dataset.stepPanel));
      state.survey.design.panelCountMode = 'manual';
      $('panelCount').value = state.survey.design.panelCount;
      invalidateRoofValidation(); renderDesign(); scheduleSave();
    }));
    $('panelCount').addEventListener('input', () => { if (state.survey) state.survey.design.panelCountMode = 'manual'; });
    $('useRoofSuggestion').addEventListener('click', async () => {
      if (!state.survey) return;
      updateRoofCalculations(); state.survey.design.panelCount = roofSuggestionTotal(); state.survey.design.panelCountMode = 'suggested';
      $('panelCount').value = state.survey.design.panelCount; await validateRoof();
    });
    $('presentRecommendation').addEventListener('click', () => switchView('customer', 'recap'));

    $('recordConfirmation').addEventListener('click', recordConfirmation);
    $('prepareFormalQuote').addEventListener('click', prepareFormalQuote);
    $('downloadCustomer').addEventListener('click', downloadCustomerSummary);
    $('downloadPack').addEventListener('click', exportPack);
    $('downloadFieldPack').addEventListener('click', exportPack);
    $('copyCrm').addEventListener('click', async () => {
      if (await copyText(crmSummaryText(), 'CRM summary copied.')) { state.survey.outputs.crmCopiedAt = new Date().toISOString(); await saveSurvey(); }
    });
    $('copySidekick').addEventListener('click', () => copyText(sidekickPromptText(), 'Sidekick AI Prompt copied.'));
    $('copyEmail').addEventListener('click', () => copyText(recommendationEmailPlainText(), 'Customer email copied.'));
    $('sendRecommendationEmail').addEventListener('click', sendRecommendationEmail);
    $('downloadBackup').addEventListener('click', exportBackup);
    $('downloadAnalytics').addEventListener('click', downloadAnalytics);
    $('queueList').addEventListener('click', event => {
      const button = event.target.closest('[data-open-queued-survey]');
      if (button) loadSurvey(button.dataset.openQueuedSurvey).then(() => go('complete'));
    });

    setupMarkup();
    window.addEventListener('online', () => { state.online = true; renderHeader(); renderCompletion(); renderQueue(); });
    window.addEventListener('offline', () => { state.online = false; renderHeader(); renderCompletion(); });
    window.addEventListener('pagehide', () => { if (state.survey) Store.putSurvey(clone(state.survey)).catch(() => {}); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && state.survey) saveSurvey('silent').catch(() => {}); });
  }

  function setupMarkup() {
    $('closeMarkup').addEventListener('click', () => { $('markupModal').hidden = true; });
    $$('[data-markup-label]').forEach(button => button.addEventListener('click', () => { state.markup.tool = 'label'; state.markup.label = button.dataset.markupLabel; }));
    $$('[data-markup-tool]').forEach(button => button.addEventListener('click', () => { state.markup.tool = button.dataset.markupTool; }));
    $('undoMarkup').addEventListener('click', () => { state.markup.actions.pop(); drawMarkup(); });
    $('saveMarkup').addEventListener('click', saveMarkupCopy);
    const canvas = $('markupCanvas');
    canvas.addEventListener('pointerdown', event => {
      if (!state.markup.img) return;
      const point = markupPoint(event);
      if (state.markup.tool === 'label') { state.markup.actions.push({ tool: 'label', text: state.markup.label, ...point }); drawMarkup(); }
      else state.markup.start = point;
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointerup', event => {
      if (!state.markup.start || !state.markup.img) return;
      const end = markupPoint(event), start = state.markup.start;
      if (state.markup.tool === 'box') state.markup.actions.push({ tool: 'box', x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y });
      if (state.markup.tool === 'line') state.markup.actions.push({ tool: 'line', x: start.x, y: start.y, x2: end.x, y2: end.y });
      state.markup.start = null; drawMarkup();
    });
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    try { await navigator.serviceWorker.register('./service-worker.js'); } catch (error) { console.warn('Offline shell registration failed', error); }
  }

  async function init() {
    populateControls();
    setupEvents();
    try {
      await Store.open();
      const activeId = localStorage.getItem(Store.ACTIVE_SURVEY_KEY);
      if (activeId) await loadSurvey(activeId, true);
      else { renderAll(); go('prepare', { trackStage: false }); }
      await renderAnalytics();
      registerServiceWorker();
    } catch (error) {
      console.error(error);
      setSaveStatus('Local storage could not open', 'error');
      $('finishNotice').textContent = `Local storage error: ${error.message}`;
    }
  }

  window.LGV3 = {
    APP_VERSION, Catalog, defaultSurvey, migrateSurvey, parseCSV, extractCSV, normalizeImportRows, guessImportField,
    calculateRoofPlane, validateRoof, priceState, recommendationSummary, recommendationEmailPlainText, recommendationMailto,
    customerSummaryHtml, crmSummaryText, sidekickPromptText, exportPack, startSurvey, loadSurvey, Store
  };

  init();
})();
