<div align="center">

<img src="assets/nextrate-icon.svg" alt="NextRate logo" width="96" />

# NextRate

**Indian gold and silver rates, history, and experimental next-publication estimates.**

![JavaScript](https://img.shields.io/badge/JavaScript-B88A00?style=flat-square&logo=javascript&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat-square&logo=github&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare%20D1-F38020?style=flat-square&logo=cloudflare&logoColor=white)

[Open NextRate](https://vignesh-s-github.github.io/Next-Rate/) · [Publication status](https://nextrate-scheduler.vigneshshanmugam.workers.dev/status.json) · [Quick start](#quick-start) · [Data refresh](#data-refresh-and-hosting)

</div>

---

A compact English/Tamil bullion dashboard for dated Indian benchmark rates, indicative city quotes, global spot/FX references, fund NAVs, and next-publication-day estimates. The static website runs on GitHub Pages; Cloudflare collects, validates, forecasts, and stores market publications.

## ✨ Features

| View | What you can inspect |
|---|---|
| Home | Dated IBJA gold/silver observations, Today/7D/30D/90D changes, and experimental estimates |
| History and charts | Published observations, interactive ranges, and forecast comparisons |
| City and market references | Indicative dated city quotes, global metal prices, and USD/INR |
| Tools | **Sell / Exchange · Verify Hallmark · ETF Comparison** |
| Language and layout | English/Tamil content with desktop columns and a compact mobile stack |

The Home return card uses the latest actual rate on or before its calendar-day cutoff and identifies the starting date. Insufficient history is labelled. These actual-price changes are separate from tomorrow's forecast.

<a id="quick-start"></a>

## 🚀 Quick start

The frontend is static and has no build step. Use a local HTTP server so its JSON fetches work correctly:

```bash
git clone https://github.com/Vignesh-S-GitHub/Next-Rate.git
cd Next-Rate
python -m http.server 8080
```

Open **http://localhost:8080**. The frontend reads the configured Cloudflare publication; committed dated JSON provides an outage fallback. Serving the repository does not start a collector or change production data.

<a id="data-refresh-and-hosting"></a>

## ☁️ Data refresh and hosting

| Component | Responsibility |
|---|---|
| GitHub Pages | Static interface and fallback JSON |
| `nextrate-scheduler` Worker | Timer, source collection, validation, forecasts, and publication API |
| `nextrate-data` D1 | Durable publication documents and receipts |
| [pages.yml](.github/workflows/pages.yml) | Tests and frontend deployment; **no data-refresh cron** |

The website reads all six documents from one consistent Worker publication. No GitHub runtime token or Actions refresh workflow is required. Annual static archives remain migration/history backups.

| India time (IST) | Scheduled purpose |
|---|---|
| 08:15 | Overnight market update for today’s unpublished target |
| 13:15 | AM collection |
| 19:15 | PM collection |
| 22:15, 23:15 | Evening market updates for the next IBJA publication |
| 13:45, 14:15, 19:45, 20:15 | Guarded recovery checks |

These are the configured timer slots, not a guarantee of publication at an exact second. Source availability and validation determine whether a new publication is accepted. Inspect [live status](https://nextrate-scheduler.vigneshshanmugam.workers.dev/status.json) and [Cloudflare operations](docs/CLOUDFLARE_SCHEDULER.md) for receipts and recovery behavior.

## 📊 Sources and units

| Source | Used for | Interpretation |
|---|---|---|
| [IBJA](https://www.ibjarates.com/) | National AM/PM gold and silver benchmarks | Not retail checkout prices; GST and making charges excluded |
| [Goodreturns](https://www.goodreturns.in/gold-rates/) | Dated city quotes | Indicative, not guaranteed dealer offers |
| [AMFI](https://www.amfiindia.com/) | Fund NAVs | Not executable ETF exchange prices |
| [Gold API](https://gold-api.com/docs) | International metal references | Indicative spot observations |
| [Frankfurter](https://frankfurter.dev/) | USD/INR reference | Dated FX data, not a live execution quote |

Unit/date labels matter when comparing benchmark, city, spot, and NAV values. The hallmark tool links to the official BIS Care workflow; NextRate itself cannot verify an HUID.

## 🧮 Forecast behavior

Forecasts combine historical observations and, when valid references exist, changes in same-provider global metals and USD/INR. The application records forward errors and compares against a latest-rate baseline. [Model notes](docs/MARKET_FORECAST.md) document assumptions and ranges.

Estimates are experimental ranges, not guarantees of future accuracy or trade recommendations. No licensed LBMA/COMEX/MCX feed or verified jewellery checkout feed is connected. Forecasts pause when the next publication year's holiday calendar is not verified.

## 🧪 Development checks

Python and Node.js are needed for checks; CI uses **Node 24**.

```bash
python -m unittest discover -s tests -v
node --test tests/*.test.cjs
python scripts/archive_data.py --verify
python scripts/validate_publication.py
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

`python scripts/smoke_site.py` checks the published site. Collector bundle validation:

```bash
npm ci --prefix cloudflare/nextrate-scheduler
npm run build --prefix cloudflare/nextrate-scheduler
```

Python collectors remain regression/offline migration tools; production collection runs in the Worker. [App audit](docs/APP_AUDIT.md), [production checks](docs/PRODUCTION_CHECKS.md), and [retention guide](docs/DATA_RETENTION.md) describe the checks and operational limits.

## 📁 Repository guide

| Path | Purpose |
|---|---|
| [index.html](index.html), [app.js](app.js), [styles.css](styles.css) | Main dashboard |
| [features.js](features.js), [features-core.js](features-core.js) | The three supported tools |
| [chart-ui.js](chart-ui.js), [chart-interaction.js](chart-interaction.js) | Charts and interaction |
| [data-loader.js](data-loader.js), [data-quality.js](data-quality.js) | Consistent loading and freshness checks |
| [cloudflare/nextrate-scheduler/](cloudflare/nextrate-scheduler/) | Production collection/runtime |
| [data/](data/), [scripts/](scripts/), [tests/](tests/) | Dated data, offline tooling, and regression coverage |

Provider data and branding have their own terms; review redistribution rights before commercial reuse.

## 🤝 Contributing

Open an issue with a reproducible example or submit a focused pull request. Keep setup instructions and documentation aligned with any behavior changes.

## 📄 License

No repository-level `LICENSE` file is currently included.

Currency input policy: paired provider conversion quotes are preferred only when both the immutable benchmark reference and current snapshot are verified. The separately attributed daily FX reference remains a fallback. A conversion quote is not labelled as a verified FX tick. See [model timing and input rules](docs/MARKET_FORECAST.md).
