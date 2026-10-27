# NextRate

[Open NextRate](https://vignesh-s-github.github.io/Next-Rate/) · [GitHub Actions](https://github.com/Vignesh-S-GitHub/Next-Rate/actions)

NextRate is a static, bilingual Indian gold/silver dashboard on GitHub Pages. Existing pages show dated IBJA national rates, indicative city quotes, international spot/FX references, fund NAVs, interactive charts, gold/silver weight calculators, jewellery tools and **experimental** next-publication-day forecasts. No background phone notification service or verified jewellery checkout feed is provided.

## Production application and data

- **Web UI:** `index.html`, `app.js`, `styles.css`, `features.js`, `features-core.js`, `features.css`, `chart-ui.js`, `chart-interaction.js`, `weights.js`, `buy-options.js`, `i18n.js`, `data-quality.js`, `source-logos.js`, `assets/`.
- **Collectors and safety checks:** `scripts/update_rates.py`, `update_cities.py`, `update_funds.py`, `backfill_rates.py`, `forecast.py`, `forecast_models.py`, `archive_data.py`, `schedule_refresh.py`, `validate_publication.py`, `smoke_site.py`.
- **Published data:** `data/latest.json`, `history.json`, `cities.json`, `funds.json`, `forecast.json`, `forecast_history.json`. Permanent history lives in `data/archive/`; `data/refresh_status.json` tracks completed publication sessions.
- **Tests:** `tests/` guards parsing, dates, prices, source attribution, forecast accuracy, archive integrity, retries, accessibility and existing UI functions.

## Exactly two production workflows

**[Refresh market rates](.github/workflows/refresh-rates.yml)** runs only from the `schedule` cron or optional manual `workflow_dispatch`; code pushes do not trigger market collection. It accepts only explicitly dated and AM/PM-labelled IBJA rows, produces dated forecasts, validates and archives data, safely commits data-only changes, deploys Pages directly and smoke-tests the live site. Later scheduled checks rerun collection only when a verified scheduled publication receipt is missing.

| India time (IST) | Purpose |
| --- | --- |
| 13:15 | AM collection after the expected source publication |
| 19:15 | PM collection |
| 13:45, 14:15 and 19:45, 20:15 | Guarded AM/PM recovery checks |

GitHub Actions cron is **best-effort**, evaluated in UTC on the default branch; GitHub can delay or drop a run. Recovery checks use the same GitHub scheduler and cannot guarantee execution during a scheduler-wide outage. If a dated source row is delayed, the last verified rate stays visible and the scheduled run may fail until a recovery check. Timer acceptance requires a real `event=schedule` workflow run and `trigger=schedule` entry in `data/refresh_status.json`.

**[Deploy to GitHub Pages](.github/workflows/pages.yml)** tests normal source commits and serves **the already committed source-backed snapshots**. It never fetches bullion rates, refits forecasts or rewrites historical archives. GitHub-token market-data commits do not trigger a new Pages build, so the refresh pipeline deploys itself.

## Market data and forecast limitations

- [IBJA](https://www.ibjarates.com/): national AM/PM gold and silver benchmark observations, not shop checkout prices; GST and making charges excluded.
- [Goodreturns](https://www.goodreturns.in/gold-rates/): indicative dated city prices, not guaranteed dealer offers.
- [AMFI](https://www.amfiindia.com/): dated NAVs, not executable ETF trade prices.
- [Gold API](https://gold-api.com/docs) and [Frankfurter](https://frankfurter.dev/): indicative global spot and dated USD/INR; licensed LBMA/COMEX/MCX data not connected.
- Forecast estimates and model ranges are experimental. Historical backtests do not establish a guarantee of future predictive accuracy. Forecasts pause when the next publication year's holiday calendar is not verified.

## Production verification

```sh
python -m unittest discover -s tests -v
node --test tests/*.test.cjs
python scripts/archive_data.py --verify
python scripts/validate_publication.py
python scripts/smoke_site.py
```

The pipeline retains actual publication timestamps when sources fail and refuses corrupt/mismatched data. For incident procedures see [production checks](docs/PRODUCTION_CHECKS.md) and [permanent data retention](docs/DATA_RETENTION.md). Verify source redistribution rights before commercial usage.
