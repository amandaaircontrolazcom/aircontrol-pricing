# Air Control Pricing Tools — Home Page

Landing page and per-user authentication for Air Control's calculator suite.

## Files

- `index.html` — Login screen + tile picker for the calculators a user has access to
- `api/auth.js` — Validates passcode against the Airtable `Users` table

## Environment Variables (set in Vercel)

- `AIRTABLE_API_KEY` — Personal access token with read access to the base
- `AIRTABLE_BASE_ID` — Same base ID as the panel calculator

## Airtable `Users` table schema

| Field | Type | Notes |
|---|---|---|
| `Name` | Single line text | Display name (primary field) |
| `Login Code` | Single line text | 4-6 digit personal passcode |
| `Role` | Single select | `Admin` or `Estimator` |
| `Calculators` | Multi-select | `Panel`, `Electrical Repair`, `Plumbing Repair`, `HVAC Install`, `Service Repair` |
| `Active` | Checkbox | Disable a user without deleting |

## Notes

- Sessions persist in localStorage on the user's device — they stay signed in across visits
- The panel calculator still lives at its existing URL (`panel-calculator-five.vercel.app`). Tiles link out to it for now.
- New calculators get built into this project under `/electrical-repair`, `/plumbing-repair`, etc.
