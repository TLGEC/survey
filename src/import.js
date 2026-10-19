const COLUMN_ALIASES = {
  firstName: ['first name', 'firstname', 'customer first name', 'contact first name'],
  lastName: ['last name', 'lastname', 'surname', 'customer surname', 'contact surname'],
  name: ['contact name', 'customer name', 'full name', 'name', 'contact'],
  email: ['email', 'email address', 'customer email', 'contact email'],
  phone: ['phone', 'mobile', 'telephone', 'contact number', 'phone number'],
  address: ['address', 'site address', 'property address', 'installation address'],
  postcode: ['site post code', 'site postcode', 'post code', 'postcode'],
  appointment: ['appointment', 'appointment time', 'date', 'survey date', 'appointment date'],
  mondayId: ['item id', 'monday id', 'pulse id', 'lead id'],
  crmStatus: ['status', 'stage', 'opportunity stage', 'lead status'],
  annualKwh: ['annual kwh', 'annual usage', 'usage kwh', 'annual electricity consumption', 'electricity usage'],
  annualSpend: ['annual spend', 'electricity spend', 'annual electricity cost', 'annual bill'],
  billStatus: ['bill status', 'bill received', 'energy bill', 'bill readiness'],
  importRate: ['import rate', 'electricity rate', 'day rate', 'peak rate'],
  exportRate: ['export rate', 'seg rate'],
  offPeakRate: ['off peak rate', 'offpeak rate', 'night rate', 'cheap rate'],
  offPeakHours: ['off peak hours', 'offpeak hours', 'cheap rate hours'],
  offPeakChargeKw: ['charge power', 'battery charge power', 'off peak charge power'],
  eligiblePeakKwhPerDay: ['shiftable peak use', 'peak use per day', 'eligible peak kwh per day']
};

const VERTICAL_KEYS = new Set(['field', 'column', 'key', 'label']);
const VERTICAL_VALUES = new Set(['value', 'answer', 'data']);

export function parseMondayText(raw) {
  const csv = extractCsv(raw);
  if (!csv) throw new Error('No usable CSV table was found. Paste a CSV headed Field,Value or a normal Monday export.');
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('The CSV needs headings and at least one appointment.');
  const parsed = isVerticalTable(rows) ? parseVertical(rows) : parseHorizontal(rows);
  const { records, duplicateCount } = dedupeRecords(parsed.records);
  if (!records.length) throw new Error('No appointment was found. Include a name, email, phone number or property address.');
  const warnings = [...parsed.warnings];
  if (duplicateCount) warnings.push(`${duplicateCount} duplicate appointment${duplicateCount === 1 ? ' was' : 's were'} ignored.`);
  return { headers: parsed.headers, mapping: parsed.mapping, records, warnings, csv, orientation: parsed.orientation };
}

export function extractCsv(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (!text) return '';
  const fenced = [...text.matchAll(/```(?:csv|text)?\s*([\s\S]*?)```/gi)].map(match => match[1].trim());
  const lines = text.split(/\r?\n/);
  const starts = [];
  let schemaCandidate = '';
  for (let index = 0; index < lines.length; index += 1) {
    let cells=[];
    try { cells=parseCsv(lines[index]).at(0)||[]; } catch { continue; }
    const first = normalise(cells[0]);
    const second = normalise(cells[1]);
    const looksVertical = VERTICAL_KEYS.has(first) && VERTICAL_VALUES.has(second);
    if (looksVertical || Object.keys(detectColumns(cells)).length >= 2) {
      const candidate=lines.slice(index).join('\n').replace(/```[\s\S]*$/, '').trim();
      starts.push(candidate);schemaCandidate ||= candidate;
    }
  }
  const candidates = [...fenced, ...starts, text];
  let best = '';
  let bestScore = -1;
  for (const candidate of candidates) {
    let rows;
    try { rows=parseCsv(candidate); } catch { continue; }
    if (rows.length < 2 || rows[0].length < 2) continue;
    const vertical = isVerticalTable(rows);
    const mappingHits = vertical ? Math.min(rows.length - 1, 12) : Object.keys(detectColumns(rows[0])).length;
    const widthConsistency = rows.slice(0, 20).filter(row => row.length >= 2).length;
    const score = mappingHits * 30 + widthConsistency * 3 + (vertical ? 50 : 0);
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best || schemaCandidate;
}

export function parseCsv(text) {
  const firstMeaningful = String(text || '').split(/\r?\n/).find(line => line.trim()) || '';
  const delimiter = guessDelimiter(firstMeaningful) || ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) { row.push(field.trim()); field = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; field = '';
    } else field += character;
  }
  row.push(field.trim());
  if (quoted) throw new Error('The CSV contains an unclosed quoted value. Check the final address or notes field and paste it again.');
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseHorizontal(rows) {
  const headers = rows[0].map(value => String(value || '').trim());
  const mapping = detectColumns(headers);
  if (!hasIdentityMapping(mapping)) throw new Error('The CSV headings were not recognised. Include Name, Email, Phone or Address.');
  const records = rows.slice(1).filter(row => row.some(Boolean)).map(row => mapRecord(headers, row, mapping)).filter(hasIdentity);
  return { headers, mapping, records, warnings: [], orientation: 'horizontal' };
}

function parseVertical(rows) {
  const blocks = [];
  let block = new Map();
  const flush = () => { if (block.size) blocks.push(block); block = new Map(); };
  for (const row of rows.slice(1)) {
    if (isVerticalHeader(row)) { flush(); continue; }
    const key = String(row[0] || '').trim();
    if (!key) continue;
    const value = row.slice(1).join(',').trim();
    const normal = normalise(key);
    if (block.has(normal)) flush();
    block.set(normal, { heading: key, value });
  }
  flush();
  const records = [];
  let unsupported = 0;
  for (const values of blocks) {
    const entries = [...values.values()];
    const headers = entries.map(entry => entry.heading);
    const row = entries.map(entry => entry.value);
    const mapping = detectColumns(headers);
    if (!hasIdentityMapping(mapping)) { unsupported += 1; continue; }
    const record = mapRecord(headers, row, mapping);
    if (hasIdentity(record)) records.push(record); else unsupported += 1;
  }
  const headers = blocks[0] ? [...blocks[0].values()].map(entry => entry.heading) : [];
  const mapping = detectColumns(headers);
  const warnings = unsupported ? [`${unsupported} block${unsupported === 1 ? '' : 's'} did not contain an identifiable appointment.`] : [];
  return { headers, mapping, records, warnings, orientation: 'vertical' };
}

function isVerticalTable(rows) { return isVerticalHeader(rows[0] || []); }
function isVerticalHeader(row) { return VERTICAL_KEYS.has(normalise(row[0])) && VERTICAL_VALUES.has(normalise(row[1])); }

function guessDelimiter(line) {
  const counts = [[',', countOutsideQuotes(line, ',')], ['\t', countOutsideQuotes(line, '\t')], [';', countOutsideQuotes(line, ';')]];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : '';
}

function countOutsideQuotes(line, delimiter) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"' && line[index + 1] === '"') index += 1;
    else if (line[index] === '"') quoted = !quoted;
    else if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
}

function detectColumns(headers) {
  const normalised = headers.map(header=>normalise(header).replace(/ p kwh$/, ''));
  const result = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    let index = -1;
    for (const alias of aliases) { index=normalised.indexOf(alias); if(index>=0)break; }
    if (index < 0 && !['importRate','exportRate','offPeakRate'].includes(field)) index = normalised.findIndex(header => aliases.some(alias => alias.length >= 6 && header.includes(alias)));
    if (index >= 0) result[field] = index;
  }
  return result;
}

function mapRecord(headers, row, mapping) {
  const value = key => mapping[key] == null ? '' : String(row[mapping[key]] || '').trim();
  let firstName = value('firstName');
  let lastName = value('lastName');
  if ((!firstName || !lastName) && value('name')) {
    const parts = value('name').split(/\s+/).filter(Boolean);
    firstName ||= parts.shift() || '';
    lastName ||= parts.join(' ');
  }
  const annualKwh = numeric(value('annualKwh'));
  const annualSpend = numeric(value('annualSpend'));
  const billRaw = value('billStatus').toLowerCase();
  const billStatus = billRaw.includes('yes') || billRaw.includes('receive') || annualKwh ? 'received' : billRaw.includes('unavailable') ? 'unavailable' : 'requested';
  const energy = compact({ annualKwh, annualSpend, importRate:numeric(value('importRate')), exportRate:numeric(value('exportRate')), offPeakRate:numeric(value('offPeakRate')), offPeakHours:numeric(value('offPeakHours')), offPeakChargeKw:numeric(value('offPeakChargeKw')), eligiblePeakKwhPerDay:numeric(value('eligiblePeakKwhPerDay')) });
  const address=[value('address'),value('postcode')].filter((part,index,items)=>part&&items.indexOf(part)===index).join(', ');
  return {
    customer: { firstName, lastName, email:value('email'), phone:value('phone'), address, appointment:value('appointment'), crmStatus:value('crmStatus') },
    source: { type:'monday-csv', mondayId:value('mondayId') }, readiness: { billStatus }, energy,
    raw: Object.fromEntries(headers.map((header, index) => [header, row[index] || '']))
  };
}

function dedupeRecords(records) {
  const seen = new Set();
  const unique = [];
  let duplicateCount = 0;
  for (const record of records) {
    const identityName=normalise(`${record.customer.firstName} ${record.customer.lastName}`);
    const key = record.source.mondayId ? `id:${normalise(record.source.mondayId)}`
      : record.customer.email ? `email:${normalise(record.customer.email)}`
      : record.customer.phone ? `phone:${normalise(record.customer.phone)}`
      : identityName&&record.customer.address ? `place:${identityName}|${normalise(record.customer.address)}|${normalise(record.customer.appointment)}` : '';
    const canDedupe = Boolean(key);
    if (canDedupe && seen.has(key)) { duplicateCount += 1; continue; }
    if (canDedupe) seen.add(key);
    unique.push(record);
  }
  return { records:unique, duplicateCount };
}

function hasIdentityMapping(mapping) { return ['firstName', 'lastName', 'name', 'email', 'phone', 'address', 'mondayId'].some(key => mapping[key] != null); }
function hasIdentity(record) { return Boolean(record.source.mondayId || record.customer.firstName || record.customer.lastName || record.customer.email || record.customer.phone || record.customer.address); }
function compact(object) { return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== '')); }
function normalise(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function numeric(value) {
  if (String(value || '').trim() === '') return '';
  const parsed = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(parsed) ? parsed : '';
}
