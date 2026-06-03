// /api/plumbing-repair-pricing - reads Globals from Airtable for the
// plumbing repair calculator. Currently just reads a single-row config table.

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GLOBALS_TABLE = 'Repair - Plumbing Globals';

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

    const data = await airtableFetch(GLOBALS_TABLE);
    const globalsMap = {};
    if (data.records && data.records.length > 0) {
      const g = data.records[0];
      Object.entries(GLOBALS_MAP).forEach(([airtableField, calcField]) => {
        const val = g.fields[airtableField];
        if (val != null) globalsMap[calcField] = val;
      });
    }

    res.status(200).json({ ok: true, globals: globalsMap });
  } catch (err) {
    console.error('Plumbing repair pricing error:', err);
    // Return empty globals so the calculator falls back to hardcoded defaults
    res.status(200).json({ ok: true, globals: {}, warning: 'Could not load pricing from Airtable' });
  }
};
