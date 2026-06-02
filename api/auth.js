// /api/auth - validates a passcode against the Airtable Users table
// and returns the user record (name, role, calculators) if active.

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const USERS_TABLE = 'Users';

async function airtableFetch(path, opts = {}) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Airtable ${res.status}: ${errBody}`);
  }
  return res.json();
}

async function listUsers() {
  const data = await airtableFetch(USERS_TABLE);
  return data.records || [];
}

module.exports = async (req, res) => {
  // CORS — only needed if the home page is hosted on a different domain
  // than the API, but harmless to include.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      res.status(500).json({ ok: false, error: 'Server not configured (missing env vars)' });
      return;
    }

    // Parse body (Vercel auto-parses JSON, but defensive)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const passcode = (body && body.passcode || '').toString().trim();

    if (!passcode) {
      res.status(400).json({ ok: false, error: 'Passcode required' });
      return;
    }

    // Look up the user by login code
    const records = await listUsers();
    const match = records.find(r => {
      const code = (r.fields['Login Code'] || '').toString().trim();
      const active = r.fields['Active'] !== false; // default true if field missing
      return code === passcode && active;
    });

    if (!match) {
      res.status(401).json({ ok: false, error: 'Invalid passcode' });
      return;
    }

    const user = {
      name: match.fields['Name'] || 'User',
      role: match.fields['Role'] || 'Estimator',
      calculators: match.fields['Calculators'] || [],
    };

    res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ ok: false, error: 'Sign-in failed' });
  }
};
