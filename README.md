# NextRate

[Open NextRate](https://vignesh-s-github.github.io/Next-Rate/) · [GitHub Actions](https://github.com/Vignesh-S-GitHub/Next-Rate/actions)

NextRate is a static, bilingual Indian gold/silver dashboard on GitHub Pages. Existing pages show dated IBJA national rates, indicative city quotes, international spot/FX references, fund NAVs, interactive charts, gold/silver weight calculators, jewellery tools and **experimental** next-publication-day forecasts. No background phone notification service or verified jewellery checkout feed is provided.

## Production application and data

- **Web UI:** `index.html`, `app.js`, `styles.css`, `features.js`, `features-core.js`, `features.css`, `chart-ui.js`, `chart-interaction.js`, `weights.js`, `buy-options.js`, `i18n.js`, `data-quality.js`, `source-logos.js`, `data-loader.js`, `assets/`.
- **Collectors and safety checks:** `scripts/update_rates.py`, `update_cities.py`, `update_funds.py`, `backfill_rates.py`, `forecast.py`, `forecast_models.py`, `archive_data.py`, `schedule_refresh.py`, `validate_publication.py`, `smoke_site.py`.
- **Published data:** `data/latest.json`, `history.json`, `cities.json`, `funds.json`, `forecast.json`, `forecast_history.json`. Permanent history lives in `data/archive/`; Cloudflare D1 stores current publication receipts; `data/refresh_status.json` retains the former GitHub timer record.
- **Tests:** `tests/` guards parsing, dates, prices, source attribution, forecast accuracy, archive integrity, retries, accessibility and existing UI functions.

## Cloudflare data refresh; GitHub Pages website

Cloudflare owns the timer, source collection, validation, forecasts and durable
D1 storage. The GitHub Pages website reads all six documents from one consistent
Cloudflare publication. No GitHub runtime token or Actions refresh workflow is
needed. The original dated static files remain an outage fallback and the
original annual archives remain a migration backup.

| India time (IST) | Purpose |
| --- | --- |
| 13:15 | AM collection |
| 19:15 | PM collection |
| 22:15 | Late market update for the next IBJA publication |
| 13:45, 14:15 and 19:45, 20:15 | Guarded recovery checks |

Worker: `nextrate-scheduler`. Database: `nextrate-data`.
[Live timer/publication status](https://nextrate-scheduler.vigneshshanmugam.workers.dev/status.json).
See [Cloudflare operations](docs/CLOUDFLARE_SCHEDULER.md) for source, schedules,
transaction safeguards, retention and recovery behavior.

**[Deploy to GitHub Pages](.github/workflows/pages.yml)** is the only production
GitHub workflow. It tests code changes and publishes the static website without
collecting bullion data. There is no GitHub cron trigger. Python collectors remain
as regression references and offline migration/verification tools; production
collection runs in `cloudflare/nextrate-scheduler/`.

The [market-adjusted forecast](docs/MARKET_FORECAST.md) uses changes in same-provider
global metal and USD/INR references since the first verified IBJA check. It states
its parity assumptions and tracks forward errors against the latest-rate baseline.

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
npm ci
npx playwright install --with-deps chromium
npm run test:browser
python scripts/smoke_site.py
```

For the tab-by-tab data contract, repaired edge cases and browser coverage, see the [app audit](docs/APP_AUDIT.md). Pull requests run the same browser checks before deployment.

The pipeline retains actual publication timestamps when sources fail and refuses corrupt/mismatched data. For incident procedures see [production checks](docs/PRODUCTION_CHECKS.md) and [permanent data retention](docs/DATA_RETENTION.md). Verify source redistribution rights before commercial usage.
