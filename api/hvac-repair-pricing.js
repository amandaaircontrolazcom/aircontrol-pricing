// /api/hvac-repair-pricing - reads Globals, refrigerant per-pound costs and
// standard repair times from Airtable for the HVAC repair calculator.

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GLOBALS_TABLE = 'Repair - HVAC Globals';
const REFRIGERANT_TABLE = 'Repair - HVAC Refrigerant';
const REPAIR_TIMES_TABLE = 'Repair - HVAC Repair Times';

// Airtable field name -> calculator field id
const GLOBALS_MAP = {
  'Break-Even': 'break-even',
  'Desired Margin %': 'margin-pct',
  'Comfort Club Discount %': 'cc-discount-pct',
  'Comfort Club Cap': 'cc-cap',
  'Tech Commission %': 'commission-pct',
  'Labor Loading %': 'labor-loading-pct',
  'Fudge Factor %': 'fudge-pct',
  'Min Margin Floor %': 'floor-pct',
};

async function airtableFetch(path) {
  const [table, query] = path.split('?');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}${query ? '?' + query : ''}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Airtable ${res.status}: ${errBody}`);
  }
  return res.json();
}

// Reads every page of a table (Airtable returns 100 rows at a time).
async function airtableFetchAll(path) {
  const records = [];
  let offset;
  do {
    const data = await airtableFetch(offset ? `${path}?offset=${encodeURIComponent(offset)}` : path);
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);
  return records;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      res.status(500).json({ ok: false, error: 'Server not configured (missing env vars)' });
      return;
    }

    // Fetch Globals
    const globalsMap = {};
    try {
      const data = await airtableFetch(GLOBALS_TABLE);
      if (data.records && data.records.length > 0) {
        const g = data.records[0];
        Object.entries(GLOBALS_MAP).forEach(([airtableField, calcField]) => {
          const val = g.fields[airtableField];
          if (val != null) globalsMap[calcField] = val;
        });
      }
    } catch (e) {
      console.warn('Could not load HVAC Globals:', e.message);
    }

    // Fetch Refrigerant per-pound costs
    // Expected table schema: rows like { Type: 'R-22', 'Cost per Pound': 75 }
    const refrigerants = {};
    try {
      const data = await airtableFetch(REFRIGERANT_TABLE);
      if (data.records && data.records.length > 0) {
        data.records.forEach(rec => {
          const type = rec.fields['Type'];
          const cost = rec.fields['Cost per Pound'];
          if (type && cost != null) refrigerants[type] = cost;
        });
      }
    } catch (e) {
      console.warn('Could not load HVAC Refrigerant:', e.message);
    }

    // Fetch standard repair times
    // Expected table schema: rows like
    //   { Repair: 'Capacitor', Category: 'Electrical & Controls', Hours: 0.5, Sort: 10, Hidden: false }
    // Empty or missing table -> the calculator uses its built-in list.
    const repairs = [];
    try {
      const records = await airtableFetchAll(REPAIR_TIMES_TABLE);
      records.forEach(rec => {
        const f = rec.fields;
        const name = (f['Repair'] || f['Name'] || '').toString().trim();
        const hours = Number(f['Hours']);
        if (!name || !(hours > 0) || f['Hidden']) return;
        repairs.push({
          name,
          category: (f['Category'] || '').toString().trim() || 'Other Repairs',
          hours,
          sort: f['Sort'] != null ? Number(f['Sort']) : Infinity,
        });
      });
      // Sort field first; rows without one keep their Airtable order
      repairs.sort((a, b) => (a.sort === b.sort ? 0 : a.sort - b.sort));
      repairs.forEach(r => { delete r.sort; });
    } catch (e) {
      console.warn('Could not load HVAC Repair Times:', e.message);
    }

    res.status(200).json({ ok: true, globals: globalsMap, refrigerants, repairs });
  } catch (err) {
    console.error('HVAC repair pricing error:', err);
    res.status(200).json({ ok: true, globals: {}, refrigerants: {}, repairs: [], warning: 'Could not load pricing from Airtable' });
  }
};
