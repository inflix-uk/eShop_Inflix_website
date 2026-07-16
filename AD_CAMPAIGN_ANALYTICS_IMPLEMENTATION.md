# Ad Performance Report + Campaign Analytics — Full Implementation Guide

> **Purpose:** This file is a same-to-same porting guide for another project with the same tech stack and almost the same folder structure.  
> **Scope:** Only these two admin reports + the storefront tracking that feeds them + cookie consent.  
> **UI note:** Copy layout, components, table columns, colors, and behavior. Swap brand strings (`Zextons` → target brand), theme tokens (`primary`, emerald accents), and env IDs (GTM, pixels). Keep data behavior identical.

---

## 0. System overview

```
Storefront (Next.js)                    Backend (Express + MongoDB)              Admin (Vite/React)
─────────────────────                   ──────────────────────────              ──────────────────
ConsentManager                          POST /analytics/campaign/click          /admin/analytics/ad-performance
  └─ cookie banners/modal               POST /analytics/session                 /admin/analytics/campaign-analytics
AnalyticsTracker                        Order.marketingAttribution              /admin/analytics/campaign-orders
  ├─ initAttribution (UTM + click IDs)  Order.conversionConsent                   (drill-down)
  ├─ trackCampaignClick  ─────────────► CampaignEvent
  ├─ trackPageView       ─────────────► VisitorSession
  └─ checkout attaches attribution ───► Order
                                        GET /analytics/ad-performance  ───────► AdPerformanceReport
                                        GET /analytics/ad-performance/orders ─► modal drill-down
                                        GET /analytics/campaigns       ───────► CampaignAnalyticsReport
                                        GET /analytics/campaigns/orders ─────► CampaignOrdersReport
```

**Two reports, different jobs:**

| Report | Question it answers | Primary data |
|--------|---------------------|--------------|
| **Ad performance report** | Which ad platform / campaign drove revenue, spend, ROAS, CPA? Consent-aware. | `Order` + `VisitorSession` + ad spend |
| **Campaign analytics** | Email/UTM journey: click → visitor → conversion → revenue | `CampaignEvent` + `VisitorSession` + `Order` |

---

## 1. Repo map (source of truth in this codebase)

### 1.1 Admin panel (`ZextonsAdminPannel`)

| File | Role |
|------|------|
| `src/App.jsx` | Lazy routes for both reports + campaign-orders |
| `src/pages/adminpages/nav/analyticsSidebarLinks.jsx` | Sidebar links |
| `src/pages/adminpages/analytics/AdPerformanceReport.jsx` | Ad performance UI |
| `src/pages/adminpages/analytics/CampaignAnalyticsReport.jsx` | Campaign analytics UI |
| `src/pages/adminpages/analytics/CampaignOrdersReport.jsx` | Campaign order drill-down page |
| `src/pages/adminpages/analytics/components/AnalyticsAdminLayout.jsx` | Side + Top shell |
| `src/pages/adminpages/analytics/components/AnalyticsReportLoadState.jsx` | Loading / error / retry wrapper |
| `src/pages/adminpages/analytics/components/AdPerformanceOrdersModal.jsx` | Order drill-down modal |
| `src/pages/adminpages/analytics/components/AdSpendManagementPanel.jsx` | Google Ads live metrics strip (embedded in Ad Performance) |
| `src/pages/adminpages/analytics/services/analyticsService.js` | API client |
| `src/pages/adminpages/analytics/utils/adPerformanceOrderDisplay.js` | Formatters (currency helpers used by both) |
| `src/config/routePermissions.js` | Route permission entries |

### 1.2 Backend (`zexton-backend`)

| File | Role |
|------|------|
| `routes/index.js` | Route registration |
| `controller/analyticsController.js` | Ad performance + session ingest |
| `controller/campaignController.js` | Campaign click ingest + campaign analytics |
| `services/analyticsService/adPerformanceReport.js` | Ad performance aggregation |
| `services/analyticsService/adPerformanceOrders.js` | Ad performance order drill-down (consent-safe) |
| `services/analyticsService/campaignTracking.js` | Click log + campaign analytics + campaign orders |
| `services/analyticsService/attributionPlatform.js` | Platform resolution (Google/Meta/TikTok/…) |
| `services/analyticsService/trackSession.js` | Upsert `VisitorSession` |
| `services/analyticsService/adSpendService.js` | Spend join for ROAS/CPA |
| `models/campaignEvent.js` | Click event schema |
| `models/visitorSession.js` | Session schema |
| `models/marketingAttribution.js` | Shared attribution subdoc |
| `models/order.js` | `marketingAttribution` + `conversionConsent` fields |

### 1.3 Storefront (`zextonsFrontend`)

| File | Role |
|------|------|
| `src/app/layout.tsx` | Mounts `ConsentManager` + `AnalyticsTracker` |
| `src/app/components/consent/ConsentManager.tsx` | Shows modal/banner; loads scripts |
| `src/app/components/common/ConsentCookieModal.tsx` | Primary consent UI |
| `src/app/components/common/ConsentCookieBanner.tsx` | Legacy banner (switchable) |
| `src/app/lib/consent/consentStorage.ts` | Cookies + events |
| `src/app/lib/consent/consentMode.ts` | Google Consent Mode v2 |
| `src/app/lib/consent/trackingScripts.ts` | GTM / Clarity / Meta / TikTok / OpenAI loaders |
| `src/app/components/analytics/AnalyticsTracker.tsx` | Route-change tracking orchestrator |
| `src/app/lib/analytics/attribution.ts` | UTM + click ID capture/storage |
| `src/app/lib/analytics/identity.ts` | visitorId / sessionId |
| `src/app/lib/analytics/sessionTracker.ts` | bootstrap, campaign click, page view, order payload |
| `src/app/lib/analytics/conversions.ts` | `getConversionConsent()` for checkout |
| Checkout / express checkout | Attach `marketingAttribution` + `conversionConsent` on order create |

---

## 2. Admin routes & navigation (same UI wiring)

### 2.1 Routes (`App.jsx`)

```text
/admin/analytics/ad-performance      → AdPerformanceReport
/admin/analytics/campaign-analytics  → CampaignAnalyticsReport
/admin/analytics/campaign-orders     → CampaignOrdersReport   (opened from campaign table links)
```

Wrap each with:
- `ErrorBoundary`
- `Suspense` (lazy import)
- `PermissionRoute` with `permission="zextons.view_dashboard"` (rename permission key per brand)

### 2.2 Sidebar (`analyticsSidebarLinks.jsx`)

```js
{
  label: 'Ad performance report',
  to: '/admin/analytics/ad-performance',
  selectedKey: 'ad-performance-report',
  permissionCheck: dashboardPermission,
},
{
  label: 'Campaign analytics',
  to: '/admin/analytics/campaign-analytics',
  selectedKey: 'campaign-analytics',
  permissionCheck: dashboardPermission,
},
```

Also add page keys to `ANALYTICS_PAGE_KEYS` so the Analytics section icon highlights correctly.

### 2.3 Shared layout

Use `AnalyticsAdminLayout` with `selectedPage`:
- `'ad-performance-report'`
- `'campaign-analytics'`

Shell: fixed left sidebar (`Side`), top bar (`Top`), main `max-w-7xl` content on `bg-gray-50`.

---

## 3. Module A — Ad performance report

### 3.1 What the UI shows (copy this layout)

**Page shell**
- Title: `Ad performance report`
- Subtitle: `Consent-aware revenue, spend, ROAS, and CPA by campaign.`
- Link: `Back to analytics dashboard` → `/admin/analytics` (emerald text link)

**Date filter card** (white, `rounded-xl border shadow-sm`)
- `From` / `To` date inputs
- Preset buttons: Today, Yesterday, Last 7 days, Last 30 days
- Active preset = blue (`bg-blue-600 text-white`); inactive = gray border
- Default range = last 30 days through today (local calendar dates, `YYYY-MM-DD`)

**Loading / error**
- `AnalyticsReportLoadState` with retry

**Optional warning**
- Amber banner if `summary.currencyWarning` (multi-currency spend; ROAS uses GBP-only spend)

**Revenue summary cards** (emerald tint: `border-emerald-100 bg-emerald-50`)

| Card key | Label |
|----------|-------|
| totalRevenue | Total revenue (+ order count under it) |
| consentedRevenue | Consented revenue |
| unattributedRevenue | Unattributed revenue |
| googleRevenue | Google revenue |
| metaRevenue | Meta revenue |
| tiktokRevenue | TikTok revenue |
| organicDirectRevenue | Organic / direct revenue |
| averageOrderValue | AOV |

Grid: `sm:grid-cols-2 lg:grid-cols-4`

**Spend summary cards** (orange tint: `border-orange-100 bg-orange-50`)

| Card key | Label |
|----------|-------|
| totalSpend | Total spend |
| blendedRoas | Blended ROAS |
| blendedCpa | Blended CPA |

Grid: `sm:grid-cols-3`

**Embedded panel**
- `AdSpendManagementPanel` — “Google Ads Performance” strip (live API metrics for same date range). Port if Google Ads API already exists; otherwise stub or omit but keep the rest identical.

**Table 1 — Revenue by source**
Columns: Source | Orders | Revenue | Spend

**Table 2 — Campaign performance**
Columns:
Source | Campaign | Orders | Revenue | Spend | ROAS | CPA | AOV | Conv. rate | Consented rev. | First order | Last order

Behavior:
- Entire row is clickable (`cursor-pointer hover:bg-emerald-50/60`, keyboard Enter/Space)
- Opens `AdPerformanceOrdersModal` with orders for that `source` + `campaign`
- Empty states: “No orders…” / “No campaign data…”

### 3.2 Admin API client

```js
// GET {BACKEND_URL}analytics/ad-performance?from=&to=
// headers: { 'x-user-role': 'admin' }
getAdPerformanceReport({ from, to }) → { success, report }

// GET {BACKEND_URL}analytics/ad-performance/orders?from=&to=&source=&campaign=
getAdPerformanceOrders({ from, to, source, campaign }) → { success, summary, orders, filter, ... }
```

Currency display: `en-GB` + `GBP` via `Intl.NumberFormat` (change locale/currency for target brand if needed, but keep same helper shape).

### 3.3 Backend API

```text
GET /analytics/ad-performance            requireAdmin → analyticsController.getAdPerformance
GET /analytics/ad-performance/orders     requireAdmin → analyticsController.getAdPerformanceOrders
```

Query: `from` / `to` (also accepts `startDate` / `endDate`).

### 3.4 Backend aggregation logic (`adPerformanceReport.js`)

**Order match (shared across analytics):**
```js
{
  isdeleted: { $ne: true },
  status: { $nin: ['Failed', 'deleted'] },
  createdAt: { $gte: start, $lte: end },
}
```

**Pipeline (parallel):**
1. **Campaign rows from Orders** — group by:
   - `resolvedPlatform` = `resolvePlatformExpression(ORDER_PLATFORM_FIELDS)`
   - `resolvedCampaign` = `marketingAttribution.utmCampaign` or `'(unassigned)'`
   - Metrics: orders, revenue, consentedOrders/Revenue (`conversionConsent.analytics || marketing`), first/last order dates
2. **Summary orders** — lean find for `summarizeOrdersForAdReport`
3. **Sessions** — `VisitorSession` grouped by resolved platform + `attribution.utmCampaign` → sessions + unique visitors
4. **Spend** — `aggregateSpendByCampaign({ from, to })`

**Merge:**
- Join spend onto campaign rows via `buildSpendJoinKey(source, campaign)`
- Attach ROAS, CPA, CTR, conversion rate (prefer click conversion when clicks > 0, else sessions/visitors)
- Include spend-only campaigns with 0 orders
- Sort by revenue then spend

**Summary fields** (`summarizeOrdersForAdReport`):
- totalOrders, totalRevenue
- consentedRevenue (orders with consented tracking)
- unattributedRevenue (no meaningful attribution)
- googleRevenue / metaRevenue / tiktokRevenue / organicDirectRevenue (via `resolvePlatformInJs`)
- averageOrderValue
- Plus spend: totalSpend, blendedRoas, blendedCpa, currencyWarning

**Platform resolution priority** (`attributionPlatform.js`):
1. `gclid` → Google Ads  
2. `ttclid` → TikTok Ads  
3. `msclkid` → Microsoft Ads  
4. `fbclid` / `fbc` / `fbp` → Meta Ads  
5. else `utmSource` as-is  
6. else referrer heuristics → Organic Search / Social Referral / Referral  
7. else Direct  

### 3.5 Orders drill-down modal (consent-safe)

`getAdPerformanceOrders`:
- Filters orders in date range matching resolved platform + campaign
- Returns **consent-safe attribution view**:
  - If analytics+marketing both false → strip UTM + click IDs in the *display* view
  - If marketing false → keep UTM but hide click IDs (`gclid`, `fbclid`, etc.)
  - Consent label: `Analytics + Marketing` / `Analytics only` / `Marketing only` / `Rejected`

Modal columns: Order | Customer | Date | Total | Source | Campaign | UTM source/medium/campaign | gclid | fbclid | ttclid | msclkid | Consent | First touch | Last touch

---

## 4. Module B — Campaign analytics

### 4.1 What the UI shows (copy this layout)

**Page shell**
- Title: `Campaign analytics`
- Subtitle: `Email marketing campaign performance — from link click to purchase.`
- Back link to analytics dashboard (emerald)

**Filter card**
- From / To dates + same date presets (blue active)
- Medium filters (emerald active): `All mediums` | `Email only` (`medium=''` | `medium='Email'`)
- Group-by (indigo active): `By campaign` | `By term (utm_term)`

**Warnings / meta**
- Amber historical-orders warning from `stats.historicalOrdersWarning`
- Gray note: click tracking started since `clickTrackingStartedAt`

**Summary cards** (emerald, 6 cols on large screens)

| Key | Label |
|-----|-------|
| campaigns | Campaigns |
| clicks | Link clicks |
| visitors | Visitors |
| conversions | Conversions |
| revenue | Revenue |
| conversionRate | Conversion rate (`N/A` or `X%`) |

**Chart**
- Chart.js `Bar` (react-chartjs-2)
- Top 10 rows
- Datasets: Clicks (blue), Visitors (purple), Conversions (emerald)
- Height 340px

**Performance table**
Columns:
{Campaign|Term} | Source | Medium | Clicks | Visitors | Conversions | Conv. rate | Click→purchase | Revenue | AOV | Last click

Behavior:
- Campaign/term name is a **Link** to:
  ```
  /admin/analytics/campaign-orders?groupBy=&value=&from=&to=&medium=
  ```
- Formulas shown in helper text:
  - Conv. rate = conversions ÷ unique visitors
  - Click→purchase = conversions ÷ link clicks

### 4.2 Campaign orders drill-down page

Separate full page (not modal):
- Title `Campaign orders`
- Shows attributed orders with customer, products (image + name + qty + price), status pills, revenue
- Back link to campaign analytics (preserves medium / groupBy query)

### 4.3 Admin API client

```js
GET analytics/campaigns?from&to&medium&groupBy     → { success, stats }
GET analytics/campaigns/orders?from&to&groupBy&value&medium → { success, stats }
```

### 4.4 Backend API

```text
POST /analytics/campaign/click          PUBLIC  → campaignController.trackClick
GET  /analytics/campaigns               requireAdmin → getCampaignAnalytics
GET  /analytics/campaigns/orders        requireAdmin → getCampaignOrders
```

### 4.5 Backend logic (`campaignTracking.js`)

#### 4.5.1 Record click (`recordCampaignClick`)

- Require at least one of: `utmSource`, `utmMedium`, `utmCampaign`, `utmId`
- Create `CampaignEvent` with `type: 'click'`, visitor/session, UTMs, landingPage, referrer, deviceType, userAgent
- Best-effort; null if no campaign signal

#### 4.5.2 Analytics join (`getCampaignAnalytics`)

Group dimension:
```js
campaign → event.utmCampaign / session.attribution.utmCampaign / order.marketingAttribution.utmCampaign
term     → event.utmTerm     / session.attribution.utmTerm     / order.marketingAttribution.utmTerm
```

Three aggregates merged by dimension value:
1. **CampaignEvent** → clicks, clickVisitors, source, medium, first/last click
2. **VisitorSession** → sessions, unique visitors (filter `lastSeen` in range; optional medium)
3. **Order** → conversions, revenue (same orderMatch; optional medium)

Per row:
- visitors denominator = session visitors OR clickVisitors
- conversionRate via `computeConversionRate`
- clickToPurchaseRate = conversions / clicks * 100
- averageOrderValue

Totals + `clickTrackingStartedAt` + data-quality flags.

#### 4.5.3 Campaign orders (`getCampaignOrders`)

- Filter orders where `marketingAttribution.utmCampaign` or `.utmTerm` equals `value`
- Return order list with cart line items for admin table

---

## 5. Data models (must exist for both reports)

### 5.1 Shared `marketingAttribution` subdocument

```js
{
  visitorId, sessionId,
  utmSource, utmMedium, utmCampaign, utmTerm, utmContent, utmId,
  referrer, landingPage,
  gclid, gbraid, wbraid, fbclid, ttclid, msclkid, oppref,
  fbc, fbp, gaClientId,
  firstVisitAt, lastVisitAt, firstTouchTimestamp, lastTouchTimestamp
}
```

Used on:
- `Order.marketingAttribution`
- `VisitorSession.attribution`

### 5.2 `Order.conversionConsent`

```js
conversionConsent: {
  analytics: Boolean,  // default false
  marketing: Boolean,  // default false
}
```

Persisted at checkout from storefront consent cookies. Powers “Consented revenue” and consent-safe drill-downs.

### 5.3 `CampaignEvent`

Append-only click log. Indexes on `createdAt`, `utmCampaign+createdAt`, `utmMedium+utmCampaign+createdAt`.

### 5.4 `VisitorSession`

- Unique `sessionId`
- `attribution`, `pagesViewed`, `productsViewed`, `lastSeen`, `visitorId`
- **No TTL** — historical basis for campaign/marketing reports

---

## 6. Storefront tracking (feeds both reports)

### 6.1 Global mount (`layout.tsx`)

```tsx
<ConsentManager />
<Suspense><AnalyticsTracker /></Suspense>
```

### 6.2 `AnalyticsTracker` responsibilities

On pathname/search change:
1. **Always** `bootstrapAttribution(pathname, search, analytics, marketing)` — captures URL UTMs + click IDs even before consent
2. **Always** `trackCampaignClick(pathname, search)` — if URL has campaign UTMs, POST click (consent-independent; first-party URL data)
3. Listen `CONSENT_UPDATED_EVENT` → re-bootstrap; if analytics → page view; if marketing → TikTok/OpenAI page views; if both denied → clear persisted visitor id (do **not** clear attribution click IDs)

On pathname (analytics consent only):
- `trackPageView` → `POST /analytics/session`

On pathname (marketing consent only):
- TikTok / OpenAI page view pixels

Also starts live monitoring socket (presence-only without analytics consent) — optional for these two reports; not required for Ad/Campaign reports themselves.

### 6.3 Identity (`identity.ts`)

| Key | Storage | When |
|-----|---------|------|
| `zextons_visitor_id` | localStorage if analytics consent; else sessionStorage ephemeral | visitorId |
| `zextons_session_id` | sessionStorage | sessionId |

Rename storage key prefix to target brand when porting.

### 6.4 Attribution store (`attribution.ts`)

- Storage key: `zextons_attribution` in **both** sessionStorage + localStorage
- On each visit: update last touch; keep first touch / landing page
- **Always capture from URL** (no consent required):
  - UTMs: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`
  - Click IDs: `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`, `msclkid`, `oppref`
- **Require marketing consent:** cookie `_fbc`, `_fbp`
- **Require analytics consent:** `gaClientId` from `_ga` / gtag (with retry schedule)

Order payload helper `getOrderMarketingAttribution`:
- Without marketing consent → strip only cookie-based keys (`fbc`, `fbp`); **keep** URL click IDs
- Without analytics consent → `gaClientId` null; visitorId may be null

### 6.5 Session tracker endpoints

| Function | Endpoint | Consent gate |
|----------|----------|--------------|
| `trackCampaignClick` | `POST /analytics/campaign/click` | None (needs UTM signal) |
| `trackPageView` | `POST /analytics/session` | Analytics required |
| `trackProductView` | `POST /analytics/session` | Analytics required |
| `getMarketingAttributionForOrder` | (client-only; attached to order create) | Partial field stripping |

**Campaign click body:**
```json
{
  "visitorId", "sessionId",
  "utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent", "utmId",
  "landingPage", "referrer"
}
```

**Session body:**
```json
{
  "visitorId", "sessionId", "userId",
  "attribution": { /* full MarketingAttribution */ },
  "pageView": { "path", "title" }
}
```

### 6.6 Checkout attachment (critical for both reports)

Wherever an order is created (checkout hook, orderService, express checkout), send:

```js
marketingAttribution: getMarketingAttributionForOrder(),
conversionConsent: getConversionConsent(), // { analytics, marketing } from cookies
```

Backend `createOrder` must persist both on the Order document. Without this, both admin reports stay empty / unattributed.

---

## 7. Cookie consent (full storefront flow)

### 7.1 Preference model

Categories:
- **Necessary** — always on
- **Analytics** — sessions, Clarity, Ahrefs, GA client id
- **Marketing** — Meta/TikTok/OpenAI pixels, `_fbc`/`_fbp`, enhanced conversions user data

### 7.2 Storage (`consentStorage.ts`)

Cookies (365 days, `SameSite=Lax`, `Secure` on HTTPS):

| Cookie | Values |
|--------|--------|
| `cookieConsent` | `accepted` \| `rejected` \| `preferences` \| `customized` |
| `analytics` | `"true"` / `"false"` |
| `marketing` | `"true"` / `"false"` |

Legacy aliases cleaned on save: `performance`, `targeting`.

Events:
- `zextons-consent-updated` — after save; ConsentManager reloads scripts; AnalyticsTracker re-bootstraps
- `zextons-open-consent-settings` — reopen modal on preferences view (footer “Cookie settings” etc.)

Helpers: `getConsentPreferences()`, `saveConsentPreferences()`, `hasAnalyticsConsent()`, `hasMarketingConsent()`, `openConsentSettings()`.

### 7.3 UI (`ConsentManager` + modal)

- Default UI mode: **`"modal"`** (toggle to `"banner"` for legacy)
- Show when `!preferences.hasChoice` OR when settings event fires
- Modal views:
  1. **Intro** — cookie image, privacy copy, links to `/cookie-policy` + `/privacy-policy`, buttons: Accept all / Reject all / Set preferences
  2. **Preferences** — toggles for Analytics + Marketing; Necessary locked on; Save
- Buttons use `bg-primary` (brand token) for Accept / primary actions
- Overlay: `fixed inset-0 z-[10000] bg-black/50`, dialog `max-w-lg rounded-2xl`

Actions:
- Accept all → analytics+marketing true, status `accepted`
- Reject all → both false, status `rejected`
- Save preferences → granular status via `resolveGranularConsentStatus`

### 7.4 Script loading (`trackingScripts.ts` + `consentMode.ts`)

On every load / consent update:

1. `setDefaultConsentMode()` — Consent Mode v2 **denied by default** (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`), `ads_data_redaction`, `url_passthrough`
2. **Always** load GTM (cookieless pings allowed while denied)
3. `applyGoogleConsentMode(analytics, marketing)` — grant/deny update
4. If analytics → Clarity + Ahrefs
5. If marketing → Meta Pixel + TikTok (from store settings) + OpenAI pixel (from public settings); else revoke TikTok/OpenAI

**Porting note:** Replace hard-coded `GTM_ID`, `CLARITY_ID`, Meta pixel env, brand cookie event names, and policy URLs with the target brand’s values.

### 7.5 Consent ↔ tracking matrix (implement exactly)

| Data / action | No choice / rejected | Analytics only | Marketing only | Both |
|---------------|----------------------|----------------|----------------|------|
| URL UTMs in local attribution | ✅ | ✅ | ✅ | ✅ |
| URL click IDs (gclid, fbclid, …) | ✅ | ✅ | ✅ | ✅ |
| Campaign click POST | ✅ (if UTM present) | ✅ | ✅ | ✅ |
| `_fbc` / `_fbp` | ❌ | ❌ | ✅ | ✅ |
| `gaClientId` | ❌ | ✅ | ❌ | ✅ |
| Persist visitorId in localStorage | ❌ | ✅ | ❌ | ✅ |
| `POST /analytics/session` page views | ❌ | ✅ | ❌ | ✅ |
| Meta/TikTok/OpenAI pixels | ❌ | ❌ | ✅ | ✅ |
| Order keeps URL click IDs | ✅ | ✅ | ✅ | ✅ |
| Order keeps fbc/fbp | ❌ | ❌ | ✅ | ✅ |
| `conversionConsent` on order | `{f,f}` | `{t,f}` | `{f,t}` | `{t,t}` |
| Consented revenue (admin) | not counted | counted | counted | counted |

---

## 8. End-to-end user journeys

### Journey A — Paid ad → Ad performance report

1. User lands with `?gclid=…&utm_campaign=brand-search`
2. `initAttribution` stores gclid + UTM (no consent needed for those)
3. If analytics accepted → session upserted with attribution → visitors for that campaign
4. User checks out → order saved with `marketingAttribution` + `conversionConsent`
5. Admin opens Ad performance → order groups under **Google Ads** / campaign; spend joins → ROAS/CPA
6. Click row → modal lists orders (consent-safe fields)

### Journey B — Email link → Campaign analytics

1. Email link: `?utm_source=Klaviyo&utm_medium=Email&utm_campaign=spring-sale&utm_term=hero`
2. `trackCampaignClick` → `CampaignEvent` (increments Link clicks)
3. Analytics consent → page views accumulate visitors on session
4. Purchase → Order with same UTM fields → Conversions + Revenue
5. Admin Campaign analytics (Email only / By campaign or By term) shows funnel
6. Click campaign name → Campaign orders page

---

## 9. Porting checklist (same UI + same behavior)

### Backend
- [ ] Models: `marketingAttribution`, Order fields, `CampaignEvent`, `VisitorSession`
- [ ] Public: `POST /analytics/campaign/click`, `POST /analytics/session`
- [ ] Admin: ad-performance (+ orders), campaigns (+ orders)
- [ ] Services: `adPerformanceReport`, `adPerformanceOrders`, `campaignTracking`, `attributionPlatform`, `trackSession`, date/dataQuality helpers, spend join if ROAS needed
- [ ] Persist attribution + conversionConsent in `createOrder`

### Storefront
- [ ] `consentStorage` + Consent Mode v2 + ConsentManager modal (brand copy/colors)
- [ ] `attribution` + `identity` + `sessionTracker` + `AnalyticsTracker`
- [ ] Checkout attaches marketingAttribution + conversionConsent
- [ ] Brand rename of storage keys / event names / GTM & pixel IDs

### Admin
- [ ] Sidebar links + routes + permissions
- [ ] Copy `AdPerformanceReport`, `CampaignAnalyticsReport`, `CampaignOrdersReport` + shared components/utils/service methods
- [ ] Chart.js dependency for campaign bar chart
- [ ] Replace “Zextons” titles with target brand; keep emerald/orange/blue/indigo filter button colors unless brand system overrides (then map tokens but keep structure)

### Verification
- [ ] Land with UTM → CampaignEvent created without accepting cookies
- [ ] Accept analytics → VisitorSession rows appear
- [ ] Place test order → appears in both reports with correct platform/campaign
- [ ] Reject marketing → fbc/fbp absent on order; gclid still present if in URL
- [ ] Admin date presets + drill-downs work
- [ ] Consent modal Accept / Reject / Preferences persist and reload scripts

---

## 10. UI style tokens used by these pages (for visual parity)

| Element | Classes / values |
|---------|------------------|
| Page title | `text-2xl font-bold text-gray-900` |
| Subtitle | `mt-1 text-sm text-gray-600` |
| Back link | `text-sm font-medium text-emerald-700 hover:underline` |
| Filter card | `rounded-xl border border-gray-200 bg-white p-4 shadow-sm` |
| Date labels | `text-xs font-semibold uppercase text-gray-500` |
| Active date preset | `bg-blue-600 text-white border border-blue-600` |
| Active medium filter | `bg-emerald-600 text-white` |
| Active group-by | `bg-indigo-600 text-white` |
| Revenue/KPI cards | `rounded-xl border border-emerald-100 bg-emerald-50 p-4` |
| Spend KPI cards | `rounded-xl border border-orange-100 bg-orange-50 p-4` |
| Tables | white card, `bg-gray-50` thead, `divide-y` |
| Warning | `border-amber-200 bg-amber-50 text-amber-900` |
| Content width | `mx-auto max-w-7xl space-y-6` |

---

## 11. File copy order (recommended when implementing in target repo)

1. Backend models (`marketingAttribution`, `campaignEvent`, visitor session attribution, order fields)
2. Backend ingest (`trackSession`, `recordCampaignClick`) + public routes
3. Backend report services + admin routes
4. Storefront consent stack
5. Storefront attribution + AnalyticsTracker
6. Checkout wiring
7. Admin service methods
8. Admin UI pages + sidebar + routes
9. Branding pass (names, primary color, GTM/pixels, currency locale)

---

*Generated from the Zextons monorepo analysis for porting Ad performance report + Campaign analytics with tracking and cookie consent.*
