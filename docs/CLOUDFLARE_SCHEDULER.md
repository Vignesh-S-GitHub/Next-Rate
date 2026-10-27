# Cloudflare-owned data refresh

NextRate uses Cloudflare for scheduling, market collection, validation, forecast
calculation and permanent storage. The browser loads one consistent publication
from Cloudflare. GitHub Pages hosts the website; its code deployment workflow does
not collect data or run on a cron timer. No GitHub runtime token is required.

## Production resources

- Worker: `nextrate-scheduler`.
- Data API: `https://nextrate-scheduler.vigneshshanmugam.workers.dev`.
- D1 database: `nextrate-data` (`9bbbac81-d301-42fc-8686-6ef910b9cb59`).
- Source: `cloudflare/nextrate-scheduler/`; schema: `schema.sql`.
- `GET /bundle.json` supplies all six documents from one database publication.
- `GET /status.json` exposes the latest timer attempts and verified receipts.
- `GET /data/<filename>` supports direct inspection of individual documents.
- Public HTTP access is read-only. It cannot start collection or write data.

## Timers

| UTC cron | IST collection times |
| --- | --- |
| `45 7,13 * * *` | 13:15 AM check; 19:15 PM check |
| `15,45 8,14 * * *` | 13:45, 14:15 AM recovery; 19:45, 20:15 PM recovery |

Two cron expressions retain all six intended times while fitting the account's
remaining free-plan trigger allowance. Changes can take up to 15 minutes to
propagate. Timer execution and source availability remain best effort; the API
reports the original quote date rather than labelling stale data as today's price.

## Collection and safety

Collectors retain explicitly dated IBJA AM/PM observations from the historical
HTML rows and the official dated 30-day PDF linked by IBJA. The PDF is used when
HTML history trails the requested session. Its purity/unit/session headers and
column coordinates are verified; blank PM cells remain blank. PDF filenames and
undated current-page quotes are never used to invent an observation date.
Collectors also retain timestamped indicative
spot/FX data, dated Goodreturns city indications and selected AMFI NAVs. Attributed
TrackLivePrice history can enrich gaps without replacing directly observed rates.
The chronological model and prospective forecast scoring match the Python
regression implementation. Forecasts pause beyond the verified holiday year.

A database lease serializes collectors. A transaction fence rejects an expired
or superseded writer. Archive changes, all six browser documents and the receipt
commit in one D1 transaction. A complete source outage keeps the previous publication. A delayed IBJA session
retains its real quote date while independently verified references may update;
its receipt has `session_verified=false` and the run is `waiting_source`. Recovery runs skip only after a successful, session-verified Cloudflare
publication for that IST date/session. Original GitHub annual archives remain as
the migration backup; D1 observations have no automatic deletion policy.

Requests enforce response-size and timeout limits. Source failures retain their
original timestamps; optional sources report unavailable status. CORS permits the
GitHub Pages origin. `data-loader.js` fetches one publication per page load; if the
API is unavailable it loads the committed static fallback as a set, preserving
its older dates. It does not mix documents from two publications.

## Verification and operations

Check `/status.json` for `trigger=cloudflare`, its real `scheduled_at`, `cron`,
`published=true`, `session_verified=true`, source quote date/session and run ID. Check the associated
Cloudflare scheduled invocation, then validate the browser bundle with
`scripts/validate_publication.py`. A code push or HTTP health request does not
prove that a timer ran. GitHub Actions is not part of the data-refresh path.

The Pages smoke check validates both the static fallback and the live Cloudflare
bundle, plus every referenced frontend script and stylesheet. Tests cover
cross-runtime forecast parity, source parsing, SQLite transactions, expired
writers, overlapping timers, failed sources, API read-only behavior and fallback.

For an incident, inspect the scheduled invocation and `/status.json`, check the
source's actual publication date, fix the collector, and deploy the Worker.
Recovery slots retry automatically. Do not change archived prices or clear a
valid receipt to make a failed check appear successful. The public API provides
no manual write/refresh endpoint.

Worker deployments use the Cloudflare connection or Wrangler. No GitHub Action,
personal access token, GitHub browser session or secret is needed for daily data
collection. A UI source commit still uses the ordinary GitHub Pages deployment.

## Cutover verification — 27 October 2026

A real Cloudflare test timer at `2026-10-27T08:41:08.895Z` (14:11 IST)
completed successfully and committed publication revision 1. Run ID:
`925db092-d66a-4883-81a7-0d0cac8f9de9`. The public bundle then passed the
existing Python publication validator. At that check the collector only consumed HTML history through
26 October PM; the receipt correctly reported `waiting_source` and
`session_verified=false` for the requested 27 October AM session. No price date
was fabricated. Spot, FX, city and NAV checks also succeeded. This verifies the
independent timer, collector, transaction and public delivery path; it does not
claim that IBJA has released the missing AM row.

The temporary every-minute test schedule was removed from configuration. The two
production expressions above remain. The migration retained all 104 IBJA session
rows, 4 forecasts, 30 observations of each spot metal and 3 FX observations before
new collections. Regression validation: 97 Python tests and 101 JavaScript tests,
including real SQLite transaction/fencing tests and Python/JavaScript parity.

## Dated PDF correction — 27 October 2026

The first collector missed today's AM quote because IBJA's current HTML quote
table has no explicit observation date and its historical HTML rows lagged a day.
IBJA's official PDF already contained the dated 27 October AM row. This was a
collector limitation, not evidence that IBJA had not published its AM rate.

The collector now reads the official linked PDF when HTML lacks the requested
session. It validates the document's 12 AM/PM columns, rupee units, purities,
observation dates and plausible numeric ratios. PDF.js text coordinates preserve
missing PM prices. Existing verified HTML and PDF observations must agree for
the same source date/session; source changes cannot overwrite issued forecasts.
The PDF has a 3 MB download limit and must contain one recognized table page.

Dependencies are pinned in `cloudflare/nextrate-scheduler/package-lock.json`.
Build the deployable bundle with `npm ci --prefix cloudflare/nextrate-scheduler`
and `npm run build --prefix cloudflare/nextrate-scheduler`. Pages CI builds and
tests the collector without collecting live prices. Daily collection still runs
entirely on Cloudflare. No GitHub runtime credential is used.
