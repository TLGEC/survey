export const SCHEMA_VERSION = 4;

export function uid(prefix = 'survey') {
  return `${prefix}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}

export function createSurvey(seed = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastCheckpointAt: now,
    source: { type: 'manual', importedAt: '', mondayId: '', raw: '' },
    customer: { firstName: '', lastName: '', email: '', phone: '', address: '', appointment: '', crmStatus: '' },
    readiness: { billStatus: 'requested' },
    energy: { annualKwh: '', annualSpend: '', importRate: 28, exportRate: 15, offPeakRate: 8 },
    discovery: {
      decisionMakers: '', goals: [], financeRoute: '', futureLoads: [], backupNeed: '', timeline: '',
      openingCommitment: '', notes: ''
    },
    site: {
      panelCount: 0, mounting: 'Pantile', roofCovering: 'Concrete pantile', framingKey: 'Pantile',
      framingOverride: { enabled: false, description: '' }, supplyPhase: 'Single Phase', panelAreas: '', roofNotes: '',
      distanceMiles: 25,
      locations: { battery: '', inverter: '', gateway: '', meterBox: '' },
      cables: { acMeters: '', acRoute: '', dcMeters: '', dcRoute: '' },
      scaffold: { required: 'unknown', lifts: 0 },
      technicalNotes: ''
    },
    solution: {
      systemType: 'solar-battery', panelKey: 'sunpower-p7-500',
      panelOverride: { enabled: false, manufacturer: '', model: '', watts: '', widthMm: '', heightMm: '', depthMm: '' },
      panelCount: 0, inverterBrand: 'SigEnergy',
      batteryBrand: 'Sigenergy', sigModule: '10', batteryQty: 1, expansionQty: 0, sigController: 'auto', gateway: 'yes',
      extras: { birdProtection: false, evCharger: false, cableApproved: false, cableCost: 0, unusualCost: 0, unusualLabel: '' },
      adjustment: { enabled: false, amount: 0, reason: '', authorisedBy: '' },
      secondary: { enabled: false, name: 'More storage', panelCount: 0, batteryBrand: 'Sigenergy', batteryQty: 2, expansionQty: 0, note: 'More stored energy for evenings and backup.' }
    },
    finance: { enabled: false, totalPrice: '', annualRate: '', termYears: 10 },
    close: { position: '', concerns: '' },
    output: { lastPdfName: '', lastPdfAt: '' },
    ...seed
  };
}

export function getPath(object, path) {
  return path.split('.').reduce((value, key) => value == null ? undefined : value[key], object);
}

export function setPath(object, path, value) {
  const keys = path.split('.');
  const final = keys.pop();
  const target = keys.reduce((cursor, key) => cursor[key] ??= {}, object);
  target[final] = value;
}

export function customerName(survey) {
  const joined = [survey.customer.firstName, survey.customer.lastName].filter(Boolean).join(' ').trim();
  return joined || 'Unnamed customer';
}

export function folderName(survey) {
  const clean = value => String(value || '').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
  const last = clean(survey.customer.lastName || 'customer');
  const first = clean(survey.customer.firstName || 'visit');
  return `${last}_${first}`;
}

export function normaliseSurvey(input) {
  if (!input || Number(input.schemaVersion) !== SCHEMA_VERSION) return null;
  const base = createSurvey({ id: input.id, createdAt: input.createdAt });
  const survey = deepMerge(base, input);
  if (!input.site?.framingKey) survey.site.framingKey = input.site?.mounting || base.site.framingKey;
  if (!input.site?.roofCovering) survey.site.roofCovering = roofCoveringFromLegacy(survey.site.framingKey);
  if (!input.solution?.panelKey || !['sunpower-p7-500','aiko-495','trina-440','sunpower-m-475'].includes(input.solution.panelKey)) {
    const legacy = input.solution?.panelKey;
    survey.solution.panelKey = legacy === 'trina-440' ? 'trina-440' : legacy === 'sunpower-m-475' ? 'sunpower-m-475' : 'sunpower-p7-500';
  }
  return survey;
}

function roofCoveringFromLegacy(value) {
  return ({ Pantile:'Concrete pantile', 'Plain Tile':'Plain tile', Slate:'Slate', Trapezoidal:'Metal sheet', 'Standing Seam':'Standing seam', 'Flat Roof':'Flat roof', 'In-Roof':'In-roof', 'Ground Screws':'Ground mount' })[value] || 'Other';
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
  const output = { ...target };
  for (const [key, value] of Object.entries(source)) {
    output[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(target?.[key] || {}, value)
      : value;
  }
  return output;
}

export function publicSurvey(survey) {
  return {
    customer: { ...survey.customer },
    readiness: { ...survey.readiness },
    energy: { ...survey.energy },
    priorities: {
      goals: [...survey.discovery.goals],
      backupNeed: survey.discovery.backupNeed,
      timeline: survey.discovery.timeline
    },
    home: {
      panelCount: survey.solution.panelCount,
      roofCovering: survey.site.roofCovering,
      mounting: survey.site.framingOverride.enabled ? survey.site.framingOverride.description : survey.site.framingKey,
      panelAreas: survey.site.panelAreas,
      roofObservations: survey.site.roofNotes
    },
    close: { ...survey.close }
  };
}
