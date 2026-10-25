## Long-term verified data storage

Historical gold, silver, USD/INR and issued predictions are now stored in permanent **yearly archives** under `data/archive/`. The website receives only the most recent 120 market rows (per stream) and 90 forecasts to stay fast. No historical year is automatically deleted. `data/archive/manifest.json` validates archive counts and SHA-256 hashes before compaction; old history is restored automatically when forecasting. See [Data retention and recovery](docs/DATA_RETENTION.md).

## Verified IBJA history and measured accuracy

The first NextRate release kept four dated IBJA PM closes. The backfill now downloads older actual published IBJA closing-rate series from [TrackLivePrice](https://trackliveprice.com/methodology/) with required attribution. Individual endpoints cover [24K](https://trackliveprice.com/api/gold/999.json), [22K](https://trackliveprice.com/api/gold/916.json), and [Silver](https://trackliveprice.com/api/silver.json). Purity, dates, units, overlapping official rates and source freshness are validated. Conflicts are rejected; no unknown 22K history is guessed. Archived silver rates converted from INR/g can differ by up to ₹5/kg due to source rounding. The original IBJA PM observations always take priority.

Both deployment workflows backfill before forecasting; the scheduled updater commits dated records. Historical daily PM observations are **not** real-time exchange ticks, and LBMA/COMEX/MCX are not yet forecast inputs.

Model v2 tests multiple simple one-step methods against an unchanged last-close baseline. When 55+ historical sessions are available for a metal, a strategy is chosen on earlier chronological validation and tested on a later untouched holdout, with separate MAPE scores. If candidates do not clearly beat the baseline on validation, the model chooses last-close. Historical test improvement **does not guarantee a more accurate future forecast**.

The compact Home page shows Tomorrow, Today, gram weights and quick buying prices. Detailed calculators and all buying options expand within Home rather than filling the screen.

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
4. Produce `data/forecast.json`, archive immutable issuances in `data/forecast_history.json`, and evaluate completed forecasts against the target-day IBJA PM close.
5. Commit verified observations and archived forecasts to GitHub (up to 180 source dates and 300 forecast issuances).
6. Direct GitHub Pages deployment of the updated site in the **same workflow**. GitHub does not trigger `push` workflows from a commit made with `GITHUB_TOKEN`; direct deployment avoids that limitation.

The regular Pages workflow `.github/workflows/pages.yml` continues to publish ordinary source-code changes.

## Tomorrow / next expected publication forecast

**NextRate now puts an experimental tomorrow-price outlook first on the Home screen**, presented as a compact stock-market-style watchlist beside a trend chart, ahead of actual prices and the weight calculator. Tapping 24K, 22K or silver switches the chart without altering stored forecasts. A separate transparent forecasting script runs after market-data collection on GitHub Actions:

- **Predictions:** 24K gold and 22K gold in rupees per 10 g, Silver 999 in rupees per kg, plus simple conversions to 1 g and 8 g (gold) or 1 g and 100 g (silver).
- **Model:** Damped median of the last 2–7 published IBJA price changes, with a deliberately broad heuristic range based on recent price variation and sensible minimum widths. Does not infer fake LBMA, COMEX or MCX futures prices.
- **Time horizon:** If tomorrow is an ordinary weekday, it predicts that expected publication date. If tomorrow is Saturday or Sunday, it transparently shows the next expected weekday instead of inventing a non-trading-day IBJA rate. The **official 2026 IBJA commodity-exchange holiday list** is considered; dates for 2027 onward must be verified and loaded when published. Some festival dates can change. See [IBJA 2026 holiday list](https://www.ibjarates.com/pdf/List-of-Holidays/List-of-Holidays-2026.pdf).
- **Accuracy:** Not statistically validated with the available short history; no made-up confidence probability or success percentage is displayed. Issued predictions are archived immutably in `data/forecast_history.json`, and measured against the **next target-date IBJA PM closing rate** once published. Error summaries require at least 10 evaluated forecasts.
- **Important:** An estimated range is not a guaranteed or calibrated confidence interval. This is a national benchmark outlook, not a city-specific retail jeweller quote. GST, making charges, local premiums and taxes are excluded.
- **Model sources:** IBJA history only at present. International XAU/XAG spot and USD/INR are shown separately as market references, not covertly included as forecasting signals. Official LBMA, COMEX and MCX feeds are not yet connected.

Files: `scripts/forecast.py`, `tests/test_forecast.py`, `data/forecast.json`, `data/forecast_history.json`. Both GitHub Pages and data-refresh workflows generate and publish the forecast. The data-refresh workflow retries bot pushes safely if another commit moves `main` during processing.

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

**An experimental tomorrow/next-publication-day forecast is now active.** Its current four-day source history is too short to establish dependable predictive accuracy. The model deliberately publishes a heuristic planning range, not statistically calibrated confidence limits. More reliable predictions require longer unbiased historical data, time-aligned international and FX inputs, out-of-sample validation and independently verified city-level prices.

**LBMA auction prices, COMEX futures and MCX futures are not yet connected**, because free international spot data cannot be presented as official exchange/futures values. The Markets screen links to those venues without suggesting they are collected.

If an individual source fails validation, its last validated observation is retained with its original date/time, and the collector reports the unsuccessful attempt. If all sources fail, no misleading new snapshot is published.

## Deployment

UI/source changes run only the standard Pages workflow; the market-data refresher runs on its two daily cron schedules or from the **Run workflow** button. This avoids competing builds overwriting a more recent market snapshot. Market updates deploy the site directly from the refresh workflow, and both workflows share a deployment concurrency lock.



- Main website: https://vignesh-s-github.github.io/Next-Rate/
- Deployment workflow: [Pages](.github/workflows/pages.yml)
- Scheduled collection and deployment: [Refresh rates](.github/workflows/refresh-rates.yml)
- Generated data: [latest.json](data/latest.json), [history.json](data/history.json), [forecast.json](data/forecast.json), [forecast_history.json](data/forecast_history.json)

No API keys or database are required. HTML, CSS and vanilla JavaScript are hosted by GitHub Pages; Python runs only inside GitHub Actions.

To run collector tests locally: `python -m unittest discover -s tests -v`.

For production or commercial usage, verify any publication/redistribution licence applicable to each data provider before relying on that source.

## Theme-consistent mobile menus

City choice and gram/kilogram selection use NextRate-styled controls rather than Android's default system selection sheet. Buttons keep the existing white, charcoal, gold and silver theme, support touch and keyboard interaction (including Escape and arrow navigation in the city menu), and indicate the active selection. Selecting a city highlights it on the Compare page but does not fabricate a city-specific price.


## Stock-market-style Home interface

The Home outlook presents three selectable quote rows, recent IBJA closing-rate chart points, a separately dashed model estimate with a shaded heuristic range, and small attributed spot/FX reference quotes. On narrow phones the watchlist appears above the chart. Source facts, model-only signals, unvalidated uncertainty and accuracy status remain accessible inside an expandable methodology panel. International spot/FX reference values are explicitly not represented as inputs to the current IBJA-only baseline.

## Stock-market dashboard UI

The Home screen retains the NextRate white, gold and navy brand in a compact market-board layout: an interactive watchlist for 24K gold, 22K gold and silver, red/green expected movements, a dated historical IBJA line chart with a **dashed** next-session experimental outlook, and a mini reference strip of international spot and currency observations. They include source dates and are not presented as live futures, official LBMA/COMEX/MCX rates or inputs to the short-history forecast model. Analysis methodology and uncertainty notes are expandable. On mobile, the watchlist shows stacked rows followed by the responsive chart, and the actual rate/weight calculator remain below.

## Consistent two-bar metal artwork

The gold icons for both 24K and 22K use the same two-bullion-bar silhouette as the Silver icon. A gold-only CSS tone filter preserves the highlights, composition, and exact double-bar geometry of the original silver illustration. This applies to both actual-rate cards and next-session forecast rows. The original approved NextRate brand logo is unchanged.

## Date and quote accuracy

On weekends the Markets page explicitly says markets are closed. A Gold API `updatedAt` timestamp means **the source fetched a quote at that time**, not that a gold futures contract or spot transaction occurred then. USD/INR is a *daily reference*, not a continuously traded tick. Last published IBJA AM/PM rates remain dated to the original session. Forecast results cannot be evaluated until the **target-date IBJA PM close** is available; historical model error is not a guarantee for the coming day.
