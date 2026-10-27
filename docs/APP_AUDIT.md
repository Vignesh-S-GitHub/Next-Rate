# App production audit — 27 October 2026

## Data displayed by each tab

| Tab | Verified behavior |
| --- | --- |
| Home | Dated IBJA AM/PM values; changes against the previous published date; city indicative price with its own date; experimental forecast kept separate from actual rates; gram/kg conversions; physical price plus GST kept separate from NAV. |
| Markets | Indicative USD/troy-ounce quotes and dated FX; timestamps shown in IST; IBJA benchmark identified as a separate national market. |
| Compare | Five city prices validated independently for gold and silver; missing/future/expired city observations never replaced with national prices; gold per gram and silver per kg explicitly labelled. |
| Insights | Educational content remains available during source outages; relationships are labelled as general explanations rather than causes of today's movement. |
| Tools | Nine panels with validated inputs, dated reference values, local-only saved entries, and explicit source gaps. |

## Repairs and safeguards

- City dates use real calendar validation and reject future dates; prices use numeric bounds and purity checks.
- NAVs require the expected AMFI scheme code, numeric value and valid observation date. Quotes over ten days old are unavailable throughout the app.
- Portfolio values and alerts refuse expired/future references. Tiny saved holdings down to 0.001 g have consistent calculations.
- Forecast accuracy is recalculated from verified target-date PM observations. AM comparisons remain provisional; forecasts issued after their target day began are not scored as prospective predictions.
- History cannot override the current snapshot, introduce a later session, or retain conflicting/invalid observations. Chart actual points identify their AM/PM session.
- Forecast direction/percentage are derived from the estimate and baseline. Malformed performance evidence is withheld.
- A return to the page checks for updates (at most once a minute); an idle visible page checks every five minutes. Routine refresh controls are removed. Automatic refresh continues; only failed connections, backup data and old rates show a compact warning.
- A source/API outage preserves the last verified in-page publication. Initial committed fallback data is visibly labelled. A fallback cannot replace a newer live publication.
- Tool fields and purity selections survive a refresh or language change. Prior calculated results clear when references are refreshed, so an older calculation is not presented with a new source date.
- Calculator reference labels include both published gold purities. Suggested shop rates change with purity; manually edited shop prices are retained.
- Shop totals are sorted by amount with an explicit instruction to compare identical purity and weight. They are not advertised as the cheapest comparable offer.
- A manual exchange price with a different date from NAV has no displayed premium percentage.
- Restored JSON backups and older browser storage are validated before rendering or aggregating totals. Invalid imports leave current saved entries intact.
- Blocked/full browser storage reports that changes will only last for the current visit, with a prompt to download a backup.
- Dynamic tool outputs and accessibility labels update correctly between English and Tamil.

## Repeatable verification

```sh
npm ci --prefix cloudflare/nextrate-scheduler
npm run build --prefix cloudflare/nextrate-scheduler
node --test tests/*.test.cjs
python -m unittest discover -s tests -v
python scripts/archive_data.py --verify
python scripts/validate_publication.py
npm ci
npx playwright install --with-deps chromium
npm run test:browser
python scripts/smoke_site.py
```

CI uses the GitHub runner's preinstalled Chrome; local runs can install Playwright Chromium with the command above. Browser checks run against isolated deterministic publications at 1440, 1024, 768, 390 and 360 pixel widths. They exercise five routes, the three supported tools (Sell / Exchange, Verify Hallmark and ETF Comparison), both languages, chart periods/selection, calculator outputs, purity changes, saved ETF quotes, offline fallback, malformed optional feeds and corrupted saved data. Live HTTP and cross-document checks run separately after Pages deployment. Failed browser checks retain a screenshot as a GitHub Actions artifact.

## Operating limits

External sources and hosting can be unavailable. The app preserves the original observation dates, labels fallbacks, and withholds invalid references rather than inventing a price. National, city, spot, FX and NAV figures have different units and publication schedules. Forecasts remain experimental; future prices are not guaranteed. Browser automation checks Chromium; Safari and Firefox are not part of this regression matrix.

Cloudflare remains the sole refresh scheduler and collector. GitHub Actions only verifies/deploys UI source changes.
