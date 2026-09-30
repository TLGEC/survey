const COLUMN_ALIASES = {
  firstName: ['first name', 'firstname', 'customer first name'],
  lastName: ['last name', 'lastname', 'surname', 'customer surname'],
  name: ['customer name', 'name', 'contact'],
  email: ['email', 'email address', 'customer email'],
  phone: ['phone', 'mobile', 'telephone', 'contact number'],
  address: ['address', 'site address', 'property address'],
  appointment: ['appointment', 'appointment time', 'date', 'survey date'],
  mondayId: ['item id', 'monday id', 'pulse id'],
  crmStatus: ['status', 'stage', 'opportunity stage'],
  annualKwh: ['annual kwh', 'annual usage', 'usage kwh', 'annual electricity consumption'],
  annualSpend: ['annual spend', 'electricity spend', 'annual electricity cost'],
  billStatus: ['bill status', 'bill received', 'energy bill']
};

export function parseMondayText(raw) {
  const csv = extractCsv(raw);
  if (!csv) throw new Error('No usable CSV table was found in that text.');
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one appointment.');
  const headers = rows[0].map(value => String(value || '').trim());
  const mapping = detectColumns(headers);
  const records = rows.slice(1).filter(row => row.some(Boolean)).map(row => mapRecord(headers, row, mapping));
  if (!records.length) throw new Error('No appointment rows were found.');
  return { headers, mapping, records, csv };
}

export function extractCsv(raw) {
  let text = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (!text) return '';
  const fenced = [...text.matchAll(/```(?:csv)?\s*([\s\S]*?)```/gi)].map(match => match[1].trim());
  const candidates = [...fenced, text];
  let best = '';
  let score = -1;
  for (const candidate of candidates) {
    const lines = candidate.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (let start = 0; start < lines.length; start += 1) {
      const delimiter = guessDelimiter(lines[start]);
      if (!delimiter) continue;
      const block = [];
      for (let index = start; index < lines.length; index += 1) {
        if (index > start && !lines[index].includes(delimiter)) break;
        block.push(lines[index]);
      }
      const header = block[0].toLowerCase();
      const aliasHits = Object.values(COLUMN_ALIASES).flat().filter(alias => header.includes(alias)).length;
      const candidateScore = block.length * 5 + aliasHits * 20;
      if (block.length >= 2 && candidateScore > score) {
        score = candidateScore;
        best = block.join('\n');
      }
    }
  }
  return best;
}

function guessDelimiter(line) {
  const counts = [[',', countOutsideQuotes(line, ',')], ['\t', countOutsideQuotes(line, '\t')], [';', countOutsideQuotes(line, ';')]];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : '';
}

function countOutsideQuotes(line, delimiter) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
}

export function parseCsv(text) {
  const delimiter = guessDelimiter(text.split(/\r?\n/)[0]) || ',';
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
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function detectColumns(headers) {
  const normalised = headers.map(header => header.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  const result = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const index = normalised.findIndex(header => aliases.includes(header) || aliases.some(alias => header.includes(alias)));
    if (index >= 0) result[field] = index;
  }
  return result;
}

function mapRecord(headers, row, mapping) {
  const value = key => mapping[key] == null ? '' : String(row[mapping[key]] || '').trim();
  let firstName = value('firstName');
  let lastName = value('lastName');
  if ((!firstName || !lastName) && value('name')) {
    const parts = value('name').split(/\s+/);
    firstName ||= parts.shift() || '';
    lastName ||= parts.join(' ');
  }
  const annualKwh = numeric(value('annualKwh'));
  const annualSpend = numeric(value('annualSpend'));
  const billRaw = value('billStatus').toLowerCase();
  const billStatus = billRaw.includes('yes') || billRaw.includes('receive') || annualKwh ? 'received' : billRaw.includes('unavailable') ? 'unavailable' : 'requested';
  return {
    customer: { firstName, lastName, email: value('email'), phone: value('phone'), address: value('address'), appointment: value('appointment'), crmStatus: value('crmStatus') },
    source: { type: 'monday-csv', mondayId: value('mondayId') },
    readiness: { billStatus }, energy: { annualKwh, annualSpend }, raw: Object.fromEntries(headers.map((header, index) => [header, row[index] || '']))
  };
}

function numeric(value) {
  const number = Number(String(value || '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(number) && number !== 0 ? number : '';
}
