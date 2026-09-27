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

## HVAC Repair calculator (`/hvac-repair`)

Labor comes from a list of standard repair times instead of typed-in hours.
Anything beyond the standard time goes under **Additional Time** and needs a
reason. Repairs that aren't on the list use **Other**, which needs a
description and hours, and is flagged for review on the quote.

Airtable tables it reads (via `/api/hvac-repair-pricing`):

- `Repair - HVAC Globals` — break-even, margin, Comfort Club markup, etc. (one row)
- `Repair - HVAC Refrigerant` — `Type`, `Cost per Pound`
- `Repair - HVAC Repair Times` — the standard repair list:

| Field | Type | Notes |
|---|---|---|
| `Repair` | Single line text | Name shown in the dropdown (primary field) |
| `Category` | Single line text | Groups the dropdown, e.g. `Motors` |
| `Hours` | Number (decimal) | Standard labor time for the whole repair |
| `Sort` | Number | Optional — order in the dropdown |
| `Hidden` | Checkbox | Hide a repair without deleting it |

Until `Repair - HVAC Repair Times` has rows, the calculator uses the built-in
list in `hvac-repair.html` (`DEFAULT_REPAIRS`). Once it has rows, Airtable
replaces the built-in list entirely.
