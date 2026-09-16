# Sales Dashboard

A React dashboard that aggregates sales from Etsy, Square, Shopify, and a
local business's own sales program (via CSV import) into one view.

## Structure

- `server/` — Node/Express + TypeScript API. Handles OAuth with Etsy/Square/
  Shopify, stores tokens encrypted in a local SQLite database, normalizes
  each platform's sales into a common shape, and aggregates them.
- `client/` — React + TypeScript (Vite) dashboard: connect your accounts,
  filter by date range, and see combined KPIs, charts, and a transaction
  table.

## How each source is integrated

| Source | Integration | Notes |
|---|---|---|
| Etsy | OAuth2 (PKCE), Open API v3 | Reads shop receipts. Etsy doesn't expose per-order fees via this endpoint, so `fees` is reported as 0 for Etsy sales. |
| Square | OAuth2, Payments API | Reads payments including Square's own processing fees, so net amounts are exact. |
| Shopify | Per-store OAuth2 (offline token), Admin REST API | You enter your `*.myshopify.com` domain to connect. Fees from Shopify Payments require a separate Payouts API integration and are reported as 0 here. |
| Local POS | CSV import | Most local/in-store POS software only offers a CSV/Excel export rather than an API, so `server/src/adapters/localPosAdapter.ts` reads from sales imported via `POST /api/local-pos/import`. It implements the same `SalesAdapter` interface as the other three, so it can be swapped for a real API or direct database adapter later without touching the rest of the app — see "Swapping in a real Local POS integration" below. |

## Setup

### 1. Register developer apps

- **Etsy**: create an app at https://www.etsy.com/developers/your-apps. Set
  the redirect URI to `http://localhost:4000/api/auth/etsy/callback` (or
  your deployed server URL). You'll get a "Keystring" (API key) and shared
  secret.
- **Square**: create an app at https://developer.squareup.com/apps. Add
  `http://localhost:4000/api/auth/square/callback` as a redirect URL. Use
  the **sandbox** application credentials while developing.
- **Shopify**: create a custom or public app via
  https://partners.shopify.com (or your store's admin for a custom app).
  Add `http://localhost:4000/api/auth/shopify/callback` as an allowed
  redirect URL, and request the `read_orders` (and optionally
  `read_products`) scopes.

### 2. Configure the server

```bash
cd server
cp .env.example .env
# generate a token-encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste it into TOKEN_ENCRYPTION_KEY in .env, then fill in the Etsy/Square/Shopify
# credentials from step 1
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default and stores its SQLite
database in `server/data/app.db` (gitignored).

### 3. Configure the client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`, go to **Connections**, and connect each
platform. For Shopify, enter your `your-store.myshopify.com` domain first.

### 4. Import local POS sales

On the **Connections** page, use **Upload CSV** under "Local POS". By
default the importer expects these column headers:

| Column | Meaning |
|---|---|
| `Date` | Sale date/time (anything `Date.parse` understands) |
| `Order` | Order/receipt number |
| `Total` | Gross sale amount (e.g. `125.50`) |
| `Fees` | Processing/platform fees, if known |
| `Items` | Item count |
| `Customer` | Customer name |
| `Currency` | ISO currency code (defaults to `USD` if omitted) |

If your program's export uses different column names, POST to
`/api/local-pos/import` with a `mapping` form field (JSON) instead of
relying on the defaults, e.g.:

```json
{ "date": "Sale Date", "grossAmount": "Amount", "orderNumber": "Receipt #" }
```

### Swapping in a real Local POS integration

`server/src/adapters/localPosAdapter.ts` implements `SalesAdapter`
(`server/src/adapters/types.ts`). Once you know how your local program can
be reached (an API, direct database access, a scheduled file drop, etc.),
write a new adapter implementing the same interface and swap it into
`server/src/adapters/index.ts` — nothing else in the app needs to change.

## Deploying

- Set `CLIENT_ORIGIN` (server) and `VITE_API_BASE_URL` (client, at build
  time) to your deployed URLs.
- Update each platform's redirect URI in its developer dashboard to point
  at your deployed server's `/api/auth/<platform>/callback`, and update the
  matching `*_REDIRECT_URI` env var to match.
- Use a strong, unique `TOKEN_ENCRYPTION_KEY` and `SESSION_SECRET` in
  production, and keep `server/.env` out of version control.
- The included SQLite database is fine for a single-instance deployment;
  move to Postgres/MySQL if you need multiple server instances.
