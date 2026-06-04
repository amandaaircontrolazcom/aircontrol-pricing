// /api/maintenance-pricing - reads Globals + Filter Tier table from Airtable
// for the Commercial & VRF Maintenance calculator.

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GLOBALS_TABLE = 'Maintenance - Globals';
const TIERS_TABLE = 'Maintenance - Filter Tiers';

// Airtable field name -> calculator field id
const GLOBALS_MAP = {
  'Commercial Small Rate': 'rate-comm-small',
  'Commercial Medium Rate': 'rate-comm-medium',
  'Commercial Large Rate': 'rate-comm-large',
  'Commercial Filter Labor (Included)': 'rate-comm-filter-labor-included',
  'Commercial Filter Labor (Standalone)': 'rate-comm-filter-labor-standalone',
  'VRF Standard Rate': 'rate-vrf-standard',
  'VRF Air Handler Rate': 'rate-vrf-handler',
  'VRF ERV Rate': 'rate-vrf-erv',
  'VRF Filter Labor': 'rate-vrf-filter-labor',
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
      console.warn('Could not load Maintenance Globals:', e.message);
    }

    // Fetch Filter Tiers
    // Expected schema: rows like { Min Cost: 0, Multiplier: 8 }, sorted naturally
    const filterTiers = [];
    try {
      const data = await airtableFetch(TIERS_TABLE);
      if (data.records && data.records.length > 0) {
        data.records.forEach(rec => {
          const min = rec.fields['Min Cost'];
          const multiplier = rec.fields['Multiplier'];
          if (min != null && multiplier != null) {
            filterTiers.push({ min, multiplier });
          }
        });
        // Sort ascending by min cost so VLOOKUP-style works
        filterTiers.sort((a, b) => a.min - b.min);
      }
    } catch (e) {
      console.warn('Could not load Filter Tiers:', e.message);
    }

    res.status(200).json({ ok: true, globals: globalsMap, filterTiers });
  } catch (err) {
    console.error('Maintenance pricing error:', err);
    res.status(200).json({ ok: true, globals: {}, filterTiers: [], warning: 'Could not load pricing from Airtable' });
  }
};
