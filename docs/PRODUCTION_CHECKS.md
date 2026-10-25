# NextRate production operations and verification

Updated 25 October 2026. **No new end-user features**: these are reliability gates for the existing GitHub Pages site.

## Release acceptance

- **Collector correctness:** `python -m unittest discover -s tests -v` covers IBJA parsing, fallback FX, international spot, Goodreturns city values, AMFI NAVs, backfill, archive immutability, holiday calendar, forecasting, and corrupt/mismatched snapshot scenarios.
- **UI regressions:** `node --test tests/*.test.cjs` covers all five tabs, nine existing tools, 7D/30D/90D chart, tooltip behaviour, responsive CSS structure, calculations, locale switching, and source/price labelling.
- **Pre-publication gate:** `python scripts/validate_publication.py` rejects mismatched latest/history, dates in the future, bad purity ratios, impossible prices, mismatched model baselines, malformed ranges, duplicate forecast issue identifiers, invalid NAVs/city quotes.
- **Staged-artifact gate:** `python scripts/validate_publication.py --root _site --site` validates the actual deployable folder, not just source files.
- **Live-site verification:** both workflows fetch the published URL, 17 essential files, and the six market JSON feeds through `scripts/smoke_site.py`. Invalid HTTP responses, missing assets, old HTML, or inconsistent live market data fail the workflow.
- **Permanent history:** `python scripts/archive_data.py --verify` checks every annual shard against SHA-256 manifest, record counts, order and identity. Neither scheduled workflow nor UI build is allowed to erase old archive records.
- **Production source vs projection:** actual IBJA rates retain their source date/session. Estimates appear only when target date, source session, and all three model baselines agree with the independently fetched benchmark.

GitHub Pages remains the static website. Scheduled market-data updates are managed by the existing `.github/workflows/refresh-rates.yml`; they run at **07:15 UTC and 13:45 UTC** (12:45 and 19:15 India time). GitHub-hosted schedules can start later than requested. The regular Pages workflow also runs for code commits.

## Failure scenarios and expected behaviour

| Scenario | Collector/publisher behaviour | Browser behaviour |
| --- | --- | --- |
| IBJA market closed on weekend or declared exchange holiday | Retain the last actual dated close; never infer a new holiday session from the undated AM/PM table | Display original date and market-closed or older-reference messaging |
| IBJA HTML stale for more than four days | Do not stamp undated source prices with today's date; retain dated historical observation | Warn when the reference is old; do not substitute a made-up daily close |
| One upstream source unavailable | Preserve the previous value **with original source date**; record unavailable source status | Show old source dates or unavailable values, never invented market prices |
| All four national/spot/FX sources unavailable | Collector exits with nonzero status; data not published | Previously deployed site remains available with its last dated data |
| FX provider unavailable | Try next documented provider, validate currency/rate/date | Use validated fallback or show unavailable |
| City gold or silver source unavailable | Keep each metal's own last publication date, even if the other metal refreshes | Hide city rates older than seven days |
| AMFI text feed fails or fund name/code differs | Retain dated prior NAVs and mark source failure | Hide out-of-date NAVs (older than ten days) |
| Forecast cannot be generated / source too old | Publish unavailable status, retain historical issued predictions for independent evaluation | Display a clear unavailable/pending state |
| Forecast does not match independently fetched quote | Publication integrity gate fails; old good deployment remains | Browser independently suppresses stale/mismatched forecast cards |
| Price file missing but latest quote exists | Static asset gate rejects missing file; JS accepts verified latest snapshot if recent history fails on a different CDN fetch | Current benchmark still appears; chart may be temporarily empty |
| Corrupt or inconsistent JSON, implausible number, future date | Validation rejects publication before the scheduled commit | Browser refuses invalid primary benchmark values |
| Historical archive hash/count conflict | Archive verification aborts; automated overwrite is blocked | Previously deployed values remain unchanged |
| Concurrent scheduled market refresh and code push | Data-only commit retries safely against current main without force pushing | Static release must pass checks before publication |
| GitHub Pages publish succeeds but assets/CDN are stale | Post-deployment HTTP smoke retries the live URL and fails if problems persist | GitHub Actions shows a failed run for investigation |

**A failed workflow is an incident, not a reason to invent substitute values.**
Look at the failing step in [GitHub Actions](https://github.com/Vignesh-S-GitHub/Next-Rate/actions) and its source-specific logs before re-running.

## Data quality limitations

- **IBJA:** national 999 gold per 10g, 916 gold per 10g, and 999 silver per kilogram, excluding GST and making charges. These are not city shop checkout prices; no observations on Saturdays, Sundays or relevant holidays. Source: [IBJA](https://www.ibjarates.com/).
- **Goodreturns cities:** publisher's indicative observations, potentially published on different dates from IBJA, never substituted for national rates.
- **AMFI NAV:** dated official mutual-fund NAV, not ETF exchange execution price.
- **Spot and currency:** third-party indicative USD metal prices and daily FX reference, not official MCX/COMEX/LBMA prices.
- **Forecasts:** experimental. Gold 24K/22K model v2 held-out historical MAPE was ~0.63%, and silver ~1.48% on 25 observations per metal as of 25 October 2026, **not** demonstrated superior to last-close; accuracy of future live forecasts remains unproven. Different model versions and revisions of a target date do **not** count as independent realisations.
- **No web push:** the retired notification feature is not part of the site. Stored price targets are only checked when NextRate is opened or focused.

## Manual incident procedure

1. Inspect the latest runs for **both** `Deploy NextRate to GitHub Pages` and `Refresh market rates and publish NextRate`, including the post-deployment live smoke result.
2. Check the source/date in `data/latest.json`, `data/cities.json`, `data/funds.json`, `data/forecast.json`; compare the IBJA price with official AM/PM source **for that date**, not calendar today's date when the market is closed.
3. Run `python -m unittest discover -s tests -v`, `node --test tests/*.test.cjs`, and `python scripts/validate_publication.py` before any corrective commit.
4. If an upstream publisher is unavailable, preserve original dated records. Do not backfill from predictions, shop websites, or guessed currency conversion. Wait for the verified source or correct the parser with documented tests.
5. For data-history mismatch, inspect annual archives and manifest before changing any data. Never edit issued forecasts or old price observations without a documented source correction and review.
6. Verify the live published site with `python scripts/smoke_site.py`. Re-run the existing workflow through GitHub Actions after fixing the root cause.

## Verification scope

The automated smoke validates HTTP availability and internal data integrity of the deployed frontend; it does not emulate an actual Android touchscreen, guarantee upstream providers will remain available tomorrow, grant browser permissions, or prove that speculative forecasts will beat a simple baseline. End-user device testing and continuing monitoring of failed Actions runs remain operational responsibilities.
