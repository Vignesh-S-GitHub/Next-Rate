# NextRate

[NextRate web application](https://vignesh-s-github.github.io/Next-Rate/) — a minimal, mobile-first Indian gold and silver dashboard with **actual dated market observations**, using the approved NextRate logo and theme.

## What updates automatically

The [Refresh market rates and publish NextRate](.github/workflows/refresh-rates.yml) workflow runs on GitHub Actions twice daily:

| UTC | India time (IST) | Purpose |
|---|---|---|
| 07:15 | 12:45 PM | Check newly published Indian bullion AM rates |
| 13:45 | 7:15 PM | Check Indian bullion PM rates and daily international references |

GitHub-hosted scheduled jobs may begin later than the specified minute. Workflows can also be run manually using **Actions → Refresh market rates and publish NextRate → Run workflow**.

The workflow executes:

1. Python standard-library collector `scripts/update_rates.py`.
2. Unit tests in `tests/test_update_rates.py`.
3. Source freshness, currency and purity consistency validation.
4. Atomic Git commit of `data/latest.json` and a rolling `data/history.json` (up to 180 publication dates).
5. Direct GitHub Pages deployment of the updated site in the **same workflow**. GitHub does not trigger `push` workflows from a commit made with `GITHUB_TOKEN`; direct deployment avoids that limitation.

The regular Pages workflow `.github/workflows/pages.yml` continues to publish ordinary source-code changes.

## Prices by Indian weight

On the home dashboard and Compare screen, **Prices by Weight** converts the verified published India Bullion and Jewellers Association (IBJA) rates into familiar gram quantities.

- Select **24K Gold**, **22K Gold**, or **Silver 999**; display presets include **1 g, 8 g (one sovereign/pavan for gold), 10 g, 20 g, 50 g, 100 g, and 1 kg**.
- Tap any preset to calculate it, or enter a custom quantity in grams or kilograms.
- Indian rupee formatting uses lakh and crore group separators and displays paise when applicable.
- Gold: `IBJA 10g rate × weight in grams / 10`; silver: `IBJA 1kg rate × weight in grams / 1000`.
- 8 g = one sovereign/pavan in some Indian markets; the price is a weight conversion, not a jewellery store quote.
- The displayed rate is an **India-wide published benchmark**, not a city-specific retail quotation or next-day prediction. The calculation excludes GST, making charges, and local premiums.
- Pure conversion helpers are in `weights.js`; zero-dependency validation tests are in `tests/weights.test.cjs` and run before both Pages and daily data deployments.

## Actual data sources

| Data shown | Source | Exact meaning |
|---|---|---|
| 24K Gold (Gold 999) | [IBJA](https://www.ibjarates.com/) | India-wide physical bullion benchmark in INR per **10 g** |
| 22K Gold (Gold 916) | [IBJA](https://www.ibjarates.com/) | India-wide physical bullion benchmark in INR per **10 g** |
| Silver 999 | [IBJA](https://www.ibjarates.com/) | India-wide physical silver benchmark in INR per **kg** |
| XAU, XAG | [Gold API](https://gold-api.com/docs) | International indicative spot quote in USD per **troy ounce**, **not** LBMA benchmark or futures price |
| USD/INR | [Frankfurter](https://frankfurter.dev/) | Latest available daily exchange-rate reference; when a primary endpoint is stale, a fresher Frankfurter endpoint is used |
| USD/INR fallback | [ExchangeRate-API](https://www.exchangerate-api.com) | Free open-access daily FX quote, **attributed in the app whenever used** |

The India benchmark is not the same as a retail jewellery-shop price; IBJA published values exclude GST and making charges. The five selected cities are UI context only until verified city-specific retail feeds are connected; the app **does not invent city offsets**.

Rates are not necessarily updated on Saturdays, Sundays or Indian government holidays. The app retains and labels the most recently published valid session and flags older quotations. Each international spot quote carries its original source timestamp.

## Limitations and forecasting

**No tomorrow-price forecast has been activated.** Accurate predictions would need reliable historical data, a time-aligned forecasting model, measured out-of-sample errors, calibrated ranges and independently verified city-specific actuals.

**LBMA auction prices, COMEX futures and MCX futures are not yet connected**, because free international spot data cannot be presented as official exchange/futures values. The Markets screen links to those venues without suggesting they are collected.

If an individual source fails validation, its last validated observation is retained with its original date/time, and the collector reports the unsuccessful attempt. If all sources fail, no misleading new snapshot is published.

## Deployment

- Main website: https://vignesh-s-github.github.io/Next-Rate/
- Deployment workflow: [Pages](.github/workflows/pages.yml)
- Scheduled collection and deployment: [Refresh rates](.github/workflows/refresh-rates.yml)
- Generated data: [latest.json](data/latest.json), [history.json](data/history.json)

No API keys or database are required. HTML, CSS and vanilla JavaScript are hosted by GitHub Pages; Python runs only inside GitHub Actions.

To run collector tests locally: `python -m unittest discover -s tests -v`.

For production or commercial usage, verify any publication/redistribution licence applicable to each data provider before relying on that source.
