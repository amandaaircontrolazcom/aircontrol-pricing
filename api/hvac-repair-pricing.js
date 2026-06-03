// /api/hvac-repair-pricing - reads Globals + refrigerant per-pound costs
// from Airtable for the HVAC repair calculator.

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GLOBALS_TABLE = 'Repair - HVAC Globals';
const REFRIGERANT_TABLE = 'Repair - HVAC Refrigerant';

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
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Airtable ${res.status}: ${errBody}`);
  }
  return res.json();
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

    res.status(200).json({ ok: true, globals: globalsMap, refrigerants });
  } catch (err) {
    console.error('HVAC repair pricing error:', err);
    res.status(200).json({ ok: true, globals: {}, refrigerants: {}, warning: 'Could not load pricing from Airtable' });
  }
};
