# NextRate production operations and verification

Updated 26 October 2026. **No new end-user features**: these are reliability gates for the existing GitHub Pages site.

## Release acceptance

- **Collector correctness:** `python -m unittest discover -s tests -v` covers IBJA parsing, fallback FX, international spot, Goodreturns city values, AMFI NAVs, backfill, archive immutability, holiday calendar, forecasting, and corrupt/mismatched snapshot scenarios.
- **UI regressions:** `node --test tests/*.test.cjs` covers all five tabs, nine existing tools, 7D/30D/90D chart, tooltip behaviour, responsive CSS structure, calculations, locale switching, and source/price labelling.
- **Pre-publication gate:** `python scripts/validate_publication.py` rejects mismatched latest/history, dates in the future, bad purity ratios, impossible prices, mismatched model baselines, malformed ranges, duplicate forecast issue identifiers, invalid NAVs/city quotes.
- **Staged-artifact gate:** `python scripts/validate_publication.py --root _site --site` validates the actual deployable folder, not just source files.
- **Live-site verification:** the market pipeline and regular Pages workflow fetch the published URL, 19 essential assets, and the six market JSON feeds through `scripts/smoke_site.py`. Invalid HTTP responses, missing assets, old HTML, or inconsistent live market data fail the workflow.
- **Permanent history:** `python scripts/archive_data.py --verify` checks every annual shard against SHA-256 manifest, record counts, order and identity. Neither scheduled workflow nor UI build is allowed to erase old archive records.
- **Production source vs projection:** actual IBJA rates retain their source date/session. Estimates appear only when target date, source session, and all three model baselines agree with the independently fetched benchmark.

GitHub Pages remains the static website. `.github/workflows/refresh-rates.yml` directly runs one collector/deployment job at **07:45 / 13:45 UTC** (13:15 / 19:15 IST), using the execution structure of the successful October 25 workflow. The earlier 12:45 IST AM slot is moved past the collector's 13:00 acceptance gate. There is no preparation/skip job, separate scheduler, or temporary sample cron. Source/session verification and post-deployment receipts remain. `pages.yml` deploys committed snapshots for source commits. GitHub cron remains best effort; successful code pushes do not prove automatic triggering.

## Failure scenarios and expected behaviour

| Scenario | Collector/publisher behaviour | Browser behaviour |
| --- | --- | --- |
| Scheduled session missing, source not yet published, or deployment fails | Inspect Actions and use workflow_dispatch to recover after checking the source; daily cron has no automatic backup slots | Keep the last verified dated deployment until a valid replacement is published |
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

1. Inspect `Refresh market rates and publish NextRate` for a real `schedule` event and completed data/live deployment checks, and `Deploy NextRate to GitHub Pages` for code-only releases. Match the session's `data/refresh_status.json` receipt to the successful scheduled run; a push or manual success alone does not verify the timer.
2. Check the source/date in `data/latest.json`, `data/cities.json`, `data/funds.json`, `data/forecast.json`; compare the IBJA price with official AM/PM source **for that date**, not calendar today's date when the market is closed.
3. Run `python -m unittest discover -s tests -v`, `node --test tests/*.test.cjs`, and `python scripts/validate_publication.py` before any corrective commit.
4. If an upstream publisher is unavailable, preserve original dated records. Do not backfill from predictions, shop websites, or guessed currency conversion. Wait for the verified source or correct the parser with documented tests.
5. For data-history mismatch, inspect annual archives and manifest before changing any data. Never edit issued forecasts or old price observations without a documented source correction and review.
6. Verify the live published site with `python scripts/smoke_site.py`. Re-run the existing workflow through GitHub Actions after fixing the root cause.

## Verification scope

The automated smoke validates HTTP availability and internal data integrity of the deployed frontend; it does not emulate an actual Android touchscreen, guarantee upstream providers will remain available tomorrow, grant browser permissions, or prove that speculative forecasts will beat a simple baseline. End-user device testing and continuing monitoring of failed Actions runs remain operational responsibilities.

### Home comparisons and forecast range (26 October 2026)

- Latest actual movement uses the previous available published date (not the previous calendar day) and retains AM/PM labels.
- Model v3 changes interval presentation, not the point-model selection policy. Earlier median absolute relative forecast errors set the typical 50% historical band; the subsequent holdout only reports realised coverage. AM observations do not become validation closes.
- The wider heuristic scenario remains available in About this estimate. Neither range is a guaranteed future probability; a tighter interval alone is not higher accuracy.
- Forecast check requires an issuance before the target day, preserves the issued estimate, and marks matching AM prices provisional. PM results show error, range coverage and direction separately. Earlier model versions remain in the audit archive.

### Scheduled-trigger investigation and recovery — 26 October 2026

Observed: the old workflow was active on the default `main` branch with valid UTC cron settings, but no `schedule` event had created a run on 26 October. The same collector/deployment pipeline succeeded on pushes. This locates the observed failure before runner/collector execution; GitHub does not expose its internal cron queue, so a specific internal GitHub cause is not claimed.

Recovery: restore the October 25 direct single-job execution structure and two daily slots, retaining current production modules, archive/session validation, safe data commits and live smoke checks. The AM slot is corrected to 13:15 IST. Retry/sample schedules and the preparation gate are removed. Market collection is triggered only by schedule or explicit manual recovery; code pushes run the static Pages checks. This simplification does not establish why GitHub created no October 26 schedule event.

Acceptance: observe an actual `event=schedule` run, successful collection/deployment, and a matching `data/refresh_status.json` receipt with `trigger=schedule` and `published=true`. Push/manual runs alone do not satisfy this check. Tomorrow's AM/PM receipts provide independent day-boundary verification; exact-minute execution is not promised.

Integration verification: [run 40349765480](https://github.com/Vignesh-S-GitHub/Next-Rate/actions/runs/40349765480), triggered by the repair commit's **push**, passed the session guard, shared collection pipeline, archive validation, 82 Python tests, 101 JavaScript tests and live verification of 19 assets. It published the 26 October PM source snapshot at 21:00 IST. This verifies the reusable pipeline and recovery logic; it is not evidence that GitHub's timer has recovered.

Timer acceptance remains **pending**: the direct October 25 structure has been restored, but an actual subsequent `schedule` event and successful publication receipt must be observed before declaring automatic triggering recovered.
