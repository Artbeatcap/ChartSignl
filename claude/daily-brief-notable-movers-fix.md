# Cursor Prompt — Fix Notable Movers in the Daily Brief

Paste everything between the `====` markers into Cursor (Composer / Agent mode, with the repo open).

====

## Task

Fix the **Notable Movers** section of the ChartSignl daily brief email. It is currently surfacing single-stock leveraged and inverse ETFs instead of real companies, which makes the newsletter look automated and untrustworthy.

### Evidence of the bug

Two consecutive sends contained these "movers":

| Ticker | Move | What it actually is |
|---|---|---|
| HOOZ | -27.33% | Defiance Daily Target 2X **Short** HOOD ETF |
| HOOG | +27.29% | Leverage Shares 2X **Long** HOOD Daily ETF |
| CONI | -16.61% | T-Rex 2X Inverse COIN ETF |
| SMST | -12.62% | Defiance Daily Target 2X Short MSTR ETF |
| BABX | -17.24% | 2X Short BABA ETF |
| AAOX | -27.49% | Tradr 2X Long AAOI Daily ETF |
| AAOZ | +27.44% | Tradr 2X Short AAOI Daily ETF |
| ASTX | -17.96% | 2X leveraged ASTS ETF |
| QBTX | -16.01% | 2X leveraged quantum-computing ETF |
| TJGC, CIFU | ±17–31% | Illiquid micro-caps, no catalyst |
| RGNX | -24.86% | REGENXBIO — the **only** legitimate entry across both sends |

Note the mirror pairs: `HOOZ -27.33%` / `HOOG +27.29%` and `AAOX -27.49%` / `AAOZ +27.44%`. Those are the same event printed twice with opposite signs.

### Root cause

The movers list is being read straight off Polygon's full-universe gainers/losers snapshot (`/v2/snapshot/locale/us/markets/stocks/gainers` and `/losers`) with no security-type filter. That endpoint returns every listed security — ETFs, ETNs, warrants, units, preferreds.

2X leveraged single-stock ETFs are **structurally guaranteed** to sit at the top of a raw percentage-move ranking: they move twice as much as their underlying by design. So the section is mathematically doomed to be dominated by them every single day. Adding a blocklist of tickers will not work — new single-stock leveraged ETFs list every week.

The fix is to filter by **security type from Polygon's reference data**, then apply liquidity and quality gates.

---

## Implement

### 1. New module: `apps/backend/src/lib/moversFilter.ts`

```ts
import type { PolygonSnapshotTicker } from './polygon';

/** Polygon `type` codes we accept. Everything else is excluded. */
const ALLOWED_SECURITY_TYPES = new Set(['CS', 'ADRC']);
// CS = Common Stock, ADRC = American Depositary Receipt Common
// Explicitly excluded: ETF, ETN, ETV, ETS, FUND, SP (structured product),
// WARRANT, RIGHT, UNIT, PFD, BOND, LT (liquidating trust), OS, AGEN, BASKET, INDEX

const ALLOWED_EXCHANGES = new Set(['XNYS', 'XNAS', 'ARCX', 'BATS', 'XASE']);

/**
 * Backstop for anything that slips past the type code (Polygon occasionally
 * tags a leveraged product as CS on the first days after listing).
 */
const FUND_NAME_PATTERN =
  /\b(\d+(\.\d+)?X|2X|3X|ULTRA(SHORT|PRO)?|LEVERAGED|INVERSE|DAILY\s+TARGET|BULL|BEAR|ETF|ETN|EXCHANGE[- ]TRADED|TRUST|FUND|INDEX|PORTFOLIO|NOTES?|SHARES\b.*\b(LONG|SHORT)|ACQUISITION\s+CORP)\b/i;

/** Known leveraged/inverse issuers — name-prefix backstop. */
const FUND_ISSUER_PATTERN =
  /\b(DEFIANCE|DIREXION|PROSHARES|GRANITESHARES|LEVERAGE\s+SHARES|TRADR|T-REX|REX\s+SHARES|VOLATILITY\s+SHARES|YIELDMAX|KURV|INNOVATOR|SIMPLIFY|BATTERY\s+SHARES)\b/i;

export interface MoverQualityConfig {
  minPrice: number;
  minAvgVolume: number;      // 20-day average shares
  minDollarVolume: number;   // today's shares * price
  minMarketCap: number;
  minAbsChangePct: number;
  maxAbsChangePct: number;   // above this is almost always a split/halt artifact
}

export const DEFAULT_MOVER_CONFIG: MoverQualityConfig = {
  minPrice: 3,
  minAvgVolume: 500_000,
  minDollarVolume: 10_000_000,
  minMarketCap: 300_000_000,
  minAbsChangePct: 4,
  maxAbsChangePct: 60,
};

export interface TickerMeta {
  ticker: string;
  name: string;
  type: string;            // Polygon reference `type`
  market: string;
  active: boolean;
  primaryExchange: string;
  marketCap: number | null;
}

export function isRealOperatingCompany(meta: TickerMeta): boolean {
  if (!meta.active) return false;
  if (meta.market !== 'stocks') return false;
  if (!ALLOWED_SECURITY_TYPES.has(meta.type)) return false;
  if (!ALLOWED_EXCHANGES.has(meta.primaryExchange)) return false;
  if (FUND_NAME_PATTERN.test(meta.name)) return false;
  if (FUND_ISSUER_PATTERN.test(meta.name)) return false;
  return true;
}

export function passesQualityGate(
  snap: PolygonSnapshotTicker,
  meta: TickerMeta,
  cfg: MoverQualityConfig = DEFAULT_MOVER_CONFIG,
): boolean {
  const price = snap.day?.c ?? snap.lastTrade?.p ?? 0;
  const volume = snap.day?.v ?? 0;
  const prevVolume = snap.prevDay?.v ?? 0;
  const absChange = Math.abs(snap.todaysChangePerc ?? 0);

  if (price < cfg.minPrice) return false;
  if (absChange < cfg.minAbsChangePct) return false;
  if (absChange > cfg.maxAbsChangePct) return false;       // split / halt / bad print
  if (price * volume < cfg.minDollarVolume) return false;
  if (Math.max(volume, prevVolume) < cfg.minAvgVolume) return false;
  if (meta.marketCap !== null && meta.marketCap < cfg.minMarketCap) return false;

  return true;
}

/**
 * Rank by relevance, not raw percentage. A 9% move on $2B of volume is a
 * bigger story than a 30% move on $12M.
 */
export function scoreMover(snap: PolygonSnapshotTicker): number {
  const absChange = Math.abs(snap.todaysChangePerc ?? 0);
  const dollarVolume = (snap.day?.c ?? 0) * (snap.day?.v ?? 0);
  return absChange * Math.log10(Math.max(dollarVolume, 1));
}
```

### 2. Ticker metadata lookup with caching: `apps/backend/src/lib/tickerMeta.ts`

Fetching `/v3/reference/tickers/{ticker}` for every candidate every morning is slow and burns rate limit. Cache it.

- Add a Supabase table:

```sql
create table if not exists public.ticker_metadata (
  ticker text primary key,
  name text not null,
  type text not null,
  market text not null,
  active boolean not null default true,
  primary_exchange text,
  market_cap numeric,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_ticker_metadata_fetched_at
  on public.ticker_metadata(fetched_at);
```

- `getTickerMeta(tickers: string[]): Promise<Map<string, TickerMeta>>`
  - Read rows from `ticker_metadata` where `fetched_at > now() - interval '30 days'`.
  - For cache misses, call `GET /v3/reference/tickers/{ticker}?apiKey=...`, map `results.type`, `results.name`, `results.market`, `results.active`, `results.primary_exchange`, `results.market_cap`, and upsert.
  - Cap concurrency at 5, and fail **closed**: if the reference lookup errors for a ticker, exclude that ticker from movers rather than letting it through unvetted.

### 3. Rewrite the movers step in the daily-brief generator

Locate the daily brief generation code (search for `Notable Movers`, `notableMovers`, `gainers`, or `daily-brief`; likely `apps/backend/src/routes/dailyBrief.ts` and/or `apps/backend/src/lib/marketData.ts`). Replace the current movers logic with this pipeline:

1. Pull **50** gainers and **50** losers from the Polygon snapshot (not 10 — most get filtered out).
2. `getTickerMeta()` for the combined candidate list.
3. `filter(isRealOperatingCompany)` then `filter(passesQualityGate)`.
4. **Split-guard**: drop any ticker returned by `GET /v3/reference/splits?ticker=X&execution_date.gte=<yesterday>`.
5. **Enrich with a reason** (see step 4 below).
6. Sort by `scoreMover` descending, take the top **6**, but cap at **4 in the same direction** so the section never reads as all-red or all-green.
7. If fewer than 3 survive, relax `minMarketCap` to `100_000_000` and retry once. If still fewer than 3, render the section with whatever survived; if zero survive, **omit the section entirely** rather than printing junk to fill space.

### 4. Attach a "why it moved" line to each mover

A ticker and a percentage with no reason is noise even when the ticker is legitimate. For each surviving mover:

```
GET /v2/reference/news?ticker={T}&published_utc.gte={now - 36h}&order=desc&limit=3&apiKey=...
```

- Take the most recent headline whose `tickers` array contains `T` **as the first or second entry** (avoids generic "10 stocks to watch" roundups being attributed to one name).
- Truncate the headline to 90 characters at a word boundary.
- Store as `mover.reason` and `mover.reasonUrl`.
- If no qualifying article exists, set `mover.reason = null`. Render those as `No headline — flow-driven` in muted grey rather than dropping them; a legitimate mover with no news is itself information.

Extend the mover type:

```ts
export interface NotableMover {
  ticker: string;
  companyName: string;      // NEW — from ticker_metadata
  changePercent: number;
  price: number;
  reason: string | null;    // NEW
  reasonUrl: string | null; // NEW
}
```

### 5. Update the email template

In the Notable Movers card, keep the existing card styling (`background:#fafbfc; border:1px solid #eef1f6; border-radius:10px;`) and add the company name and reason:

```html
<td style="padding:13px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="font-size:15px;font-weight:800;color:#0b1220;">$TICKER</span>
  <span style="font-size:14px;font-weight:700;margin-left:8px;color:#10B981;">+X.XX%</span>
  <span style="font-size:13px;color:#78716C;margin-left:8px;">Company Name</span>
  <div style="font-size:13px;line-height:1.5;color:#4a586b;margin-top:5px;">Reason headline here</div>
</td>
```

Use `#10B981` for positive, `#EF4444` for negative, `#9aa6b5` for the muted "No headline — flow-driven" case.

### 6. Tests: `apps/backend/src/lib/__tests__/moversFilter.test.ts`

Write a test that asserts **every** ticker below is excluded:

```
HOOZ HOOG CONI SMST BABX AAOX AAOZ ASTX QBTX TJGC CIFU
```

and that these are **retained** given realistic snapshot data: `RGNX NVDA AAPL PLTR SMCI`.

Include one test proving that a mirror pair (a 2X long and 2X short on the same underlying) can never both appear, and one proving the section is omitted rather than rendered empty when zero movers survive.

### 7. Observability

Log one structured line per brief generation:

```
{ event: 'movers_filter', candidates: 100, afterTypeFilter: N, afterQualityGate: N, withNews: N, rendered: N }
```

If `rendered < 3` on any run, log at `warn` level. That is your early warning that the thresholds have drifted out of tune.

---

## Constraints

- Do not implement this as a hardcoded ticker blocklist. New leveraged single-stock ETFs list weekly; a blocklist is stale the day you ship it.
- Do not silently pad the section with the next-best junk to always hit 6 rows.
- Keep all existing email styling, colors, and mobile media queries untouched.
- Do not change any other section of the brief in this change.

====

---

## Two other bugs visible in the same emails

Worth a separate small pass after the movers fix lands:

1. **Markdown separators leaking into the HTML.** The Monday send renders a literal `---` at the end of the Opening Bias box, Session Setup, Levels for Today, and Today's Watch. The AI output contains markdown section dividers that aren't being stripped before templating. Strip `/^\s*-{3,}\s*$/gm` from every AI text field before it goes into the template.

2. **Greetings landing in the wrong container.** Tuesday's send has "Hey guys, here is your morning brief." inside the *Opening Bias* callout box and "Have a great day guys!" inside *The biggest risk* box. The model is writing conversational framing into fields meant to hold only analysis. Fix in the prompt — instruct the model that each JSON field contains only its own content, no greetings or sign-offs — and add a post-processing strip as a backstop. If you want the greeting and sign-off, make them their own template fields.

3. **Stale headlines.** The Headlines in Focus block is byte-identical across Monday and Tuesday — all eight articles, same order. Either the news query is cached too aggressively or it isn't filtering by `published_utc`. Add `published_utc.gte = now - 24h` and dedupe against the previous send's article IDs.
