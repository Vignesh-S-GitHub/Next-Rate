## Production verification and daily data reliability

Production checks now validate all published IBJA, historical, city, AMFI NAV and forecast records before an automated data commit, validate staged assets, and smoke-test 17 files from the live GitHub Pages URL after deployment. Forecast accuracy counts one independent target date per model version; older sessions do not impersonate new IBJA prices. **Existing features only.** See [production checks, failure scenarios and incident runbook](docs/PRODUCTION_CHECKS.md).

## Interactive forecast chart and clear prediction labelling

Home retains NextRate’s **existing gold line chart** (solid actual IBJA closing prices, gradient, dotted next-session estimate, gold scenario band). Tap any date on the SVG line or use the **Explore dates** slider to view the exact published day and amount. 7D/30D/90D selection works with touch, tap, keyboard arrows and accessible previous/next controls. A permanently visible detail panel explicitly says either **ACTUAL** (with dated IBJA rate) or **PREDICTION** (unconfirmed estimated value and non-guaranteed scenario range). Charts are backed by the original dated history, never extrapolated actuals. The projection has its own separate selected point.

Forecast cards distinguish *predicted value* from the *possible non-calibrated range*. A 0% same-last-close strategy says **Same as last close**, not a confidence signal or “correct” prediction. Holdout simulation error is identified as past simulation, not verified future accuracy; actual results remain pending until the target-day closing IBJA quote exists. No changes to the prediction model or market data were made for this chart UX update.

Files: `chart-interaction.js` (pure verified date/price selection), `chart-ui.js` (SVG and controls), `tests/chart-interaction.test.cjs`. Both Pages and scheduled Actions validate and ship the chart scripts.


## Official app and data-source identity links

NextRate now displays **unaltered externally hosted IBJA, Goodreturns and NSE source images** directly alongside the references they identify, with clickable links to the respective publishers. On Home and Compare, IBJA identifies the India national bullion benchmark; Goodreturns identifies *indicative* city quotes; on ETF Comparison, NSE identifies exchange information, **not** an exchange-price feed provided to NextRate.

**BIS Care:** Links to official [BIS Care information](https://www.bis.gov.in/bis-apps/?lang=en), the verified [Android app (Bureau of Indian Standards)](https://play.google.com/store/apps/details?id=com.bis.bisapp) and the verified [iOS app](https://apps.apple.com/in/app/bis-care-app/id6443724891). NextRate never claims to perform HUID verification. [BIS logo usage rules](https://www.bis.gov.in/bis-logo-guidelines/?lang=en) require prior authorization for an independent website, so the linked badge uses a generic icon and text, *not* the official BIS certification mark.

**AMFI:** Provides a text/financial-source badge linking to the [official AMFI homepage](https://www.amfiindia.com/) and distinguishes dated NAV from executable exchange prices. The [AMFI linking and logo terms](https://www.amfiindia.com/terms-of-use) require written logo permission, so the actual AMFI mark is not copied to NextRate.

**Source image URLs:** 
- IBJA: \`https://www.ibja.co/images/IBJA_logo-big.png\` (publisher site)
- Goodreturns: \`https://images.goodreturns.in/images/goodreturns-og-image-1727936148894.jpg\`
- NSE: \`https://nsearchives.nseindia.com/web/sites/default/files/2019-07/NSE%404x-100.jpg\` (NSE media resource)
The images are kept unedited, loaded on demand, and accompanied by source names; where a third-party server blocks or removes an image, NextRate displays a plain-text fallback. The logos are source identifications, **not endorsements or partnerships**. \`source-logos.js\` centralizes these link destinations and branding restrictions.

## Nine mobile tools added

NextRate now has a **Tools** screen (English / தமிழ்) with **Price Alerts**, **Jewellery Bill**, **Accuracy**, **Compare Shops**, **My Gold**, **Sell / Exchange**, **Hallmark**, **Gold & Silver ETF**, and **World Markets**. Home has compact shortcuts; existing prices, graphics and daily refresh are unchanged.

Only dated, sourced price inputs are used. Shop price comparisons and portfolios use local user entries. Alerts are evaluated in-app when open, not through a background push service; HUID verification opens BIS Care; official LBMA/COMEX/MCX price integrations are not claimed. See [all tools and limitations](docs/NINE_TOOLS.md).

## City gold/silver prices and Tamil language

The **Compare** screen now shows published *indicative* gold/silver rates for Chennai, Mumbai, Delhi, Bengaluru and Hyderabad. The five-city table comes from [Goodreturns Gold](https://www.goodreturns.in/gold-rates/) and [Goodreturns Silver](https://www.goodreturns.in/silver-rates/); each metal retains its original publication date. Unlike the [IBJA national benchmark](https://www.ibjarates.com/), city references are informational and are **not authenticated individual jeweller checkout prices**. GST, jewellery making charges, seller premiums and levies are additional. City gold is displayed per 1 gram and 8 gram (pavan); city silver per 1 kilogram. The Home screen shows the currently selected city's 22K reference beside national prices.

`scripts/update_cities.py` fetches city tables on the scheduled updates; `data/cities.json` is the published, dated snapshot. A failed or missing source does not result in invented prices: old values keep the original dates and values older than seven days are hidden. This collector uses public third-party pages with link attribution, not an official shop feed; automated scraping can become unavailable if the publisher changes its markup or access terms.

Select **EN** or **தமிழ்** in the header to translate screen labels into Tamil. Language preference is retained in the browser where storage is available. The site loads `i18n.js` before `app.js` on both deployment paths. Gold/FX values remain in INR/USD numerals. Tests: `tests/test_city_rates.py`, `tests/i18n.test.cjs` and `tests/ui-cities.test.cjs`.

## Long-term verified data storage

Historical gold, silver, USD/INR and issued predictions are now stored in permanent **yearly archives** under `data/archive/`. The website receives only the most recent 120 market rows (per stream) and 90 forecasts to stay fast. No historical year is automatically deleted. `data/archive/manifest.json` validates archive counts and SHA-256 hashes before compaction; old history is restored automatically when forecasting. See [Data retention and recovery](docs/DATA_RETENTION.md).

## Verified IBJA history and measured accuracy

The first NextRate release kept four dated IBJA PM closes. The backfill now downloads older actual published IBJA closing-rate series from [TrackLivePrice](https://trackliveprice.com/methodology/) with required attribution. Individual endpoints cover [24K](https://trackliveprice.com/api/gold/999.json), [22K](https://trackliveprice.com/api/gold/916.json), and [Silver](https://trackliveprice.com/api/silver.json). Purity, dates, units, overlapping official rates and source freshness are validated. Conflicts are rejected; no unknown 22K history is guessed. Archived silver rates converted from INR/g can differ by up to ₹5/kg due to source rounding. The original IBJA PM observations always take priority.

Both deployment workflows backfill before forecasting; the scheduled updater commits dated records. Historical daily PM observations are **not** real-time exchange ticks, and LBMA/COMEX/MCX are not yet forecast inputs.

Model v3 retains the point-model selection from v2 and tests multiple simple one-step methods against an unchanged last-close baseline. When 55+ historical sessions are available for a metal, a strategy is chosen on earlier chronological validation and tested on a later untouched holdout, with separate MAPE scores. If candidates do not clearly beat the baseline on validation, the model chooses last-close. Historical test improvement **does not guarantee a more accurate future forecast**.

Home shows the latest actual change in rupees and percent against the previous published date, with both session/date labels; weekends do not become invented observations. The compact forecast range is a **typical-move band targeting 50% of earlier historical errors**, tested on later untouched PM closes. Its actual historical coverage is shown under About this estimate. It is narrower than the retained wider heuristic scenario, not a claim of greater point accuracy or guaranteed future coverage. AM-based previews are labelled provisional.

Forecast check compares immutable forecasts issued before their target day with the matching dated actual quote. AM comparisons display error but remain pending until PM; final results separate range hit/miss, rupee/percentage error, and directional correctness. No issued past forecast is rewritten to improve its score.

The compact Home page shows Tomorrow, Today, gram weights and quick buying prices. Detailed calculators and all buying options expand within Home rather than filling the screen.

# NextRate

[NextRate web application](https://vignesh-s-github.github.io/Next-Rate/) — a minimal, mobile-first Indian gold and silver dashboard with **actual dated market observations**, using the approved NextRate logo and theme.

## What updates automatically

The [NextRate market scheduler](.github/workflows/market-scheduler.yml) owns the clock. It calls the existing [Refresh market rates and publish NextRate](.github/workflows/refresh-rates.yml) pipeline only when the source session or a verified timer/publication receipt is missing.

| UTC | India time (IST) | Purpose |
|---|---|---|
| 07:45 | 1:15 PM | Primary AM collection |
| 13:45 | 7:15 PM | Primary PM collection |
| Minutes 07, 22, 37, 52 during 07–17 UTC | 12:37 PM–11:22 PM | Lightweight heartbeat and recovery checks; checks before 1:15 PM skip collection |

Retries skip completed sessions. A receipt in `data/refresh_status.json` certifies a timer only when the original trigger is `schedule`, source/AM/PM archive checks pass, and the deployed site passes its live HTTP smoke test. Push/manual successes cannot certify the timer. Each check writes its reason to the GitHub job summary. Late PM collection also retains the opening AM rate from the same validated source table.

GitHub cron remains a best-effort service; it can be delayed or dropped. Extra check slots improve recovery but do not guarantee execution at an exact minute. The actual scheduler event must be observed before claiming that the automatic path is verified. Both workflows can also be started manually from Actions. Archive concurrency is separate from UI deployments; a delayed job checks out current `main` and rechecks freshness after acquiring the market lock.

The workflow executes:

1. Python standard-library collector `scripts/update_rates.py`.
2. Unit tests in `tests/test_update_rates.py`.
3. Source freshness, currency and purity consistency validation.
4. Produce `data/forecast.json`, archive immutable issuances in `data/forecast_history.json`, and evaluate completed forecasts against the target-day IBJA PM close.
5. Commit verified observations and immutable issued forecasts to permanent annual archives on GitHub; serve recent compact browser caches (120 dated rates and 90 issued forecasts).
6. Direct GitHub Pages deployment of the updated site in the **same workflow**. GitHub does not trigger `push` workflows from a commit made with `GITHUB_TOKEN`; direct deployment avoids that limitation.

The regular Pages workflow `.github/workflows/pages.yml` continues to publish ordinary source-code changes.

## Tomorrow / next expected publication forecast

**NextRate now puts an experimental tomorrow-price outlook first on the Home screen**, presented as a compact stock-market-style watchlist beside a trend chart, ahead of actual prices and the weight calculator. Tapping 24K, 22K or silver switches the chart without altering stored forecasts. A separate transparent forecasting script runs after market-data collection on GitHub Actions:

- **Predictions:** 24K gold and 22K gold in rupees per 10 g, Silver 999 in rupees per kg, plus simple conversions to 1 g and 8 g (gold) or 1 g and 100 g (silver).
- **Model:** Damped median of the last 2–7 published IBJA price changes, with a deliberately broad heuristic range based on recent price variation and sensible minimum widths. Does not infer fake LBMA, COMEX or MCX futures prices.
- **Time horizon:** If tomorrow is an ordinary weekday, it predicts that expected publication date. If tomorrow is Saturday or Sunday, it transparently shows the next expected weekday instead of inventing a non-trading-day IBJA rate. The **official 2026 IBJA commodity-exchange holiday list** is considered; dates for 2027 onward must be verified and loaded when published. Some festival dates can change. See [IBJA 2026 holiday list](https://www.ibjarates.com/pdf/List-of-Holidays/List-of-Holidays-2026.pdf).
- **Accuracy:** 98 reconstructed dated IBJA closing observations support a historical walk-forward test, but do not establish that predictions beat the previous-close baseline. The 25-sample holdout errors at 25 October 2026 were approximately 0.63% (gold) and 1.48% (silver). Issued forecasts remain archived immutably and can be graded only against the matching future IBJA PM close. Published forward error summaries require at least 10 independently evaluated target dates for the active model.
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

**An experimental next-publication-day forecast is active.** The source history now includes 98 dated closing observations (as of 25 October 2026), with a separate 25-observation holdout per metal. Those past errors are not proof of future accuracy or an advantage over last-close. The model publishes a heuristic planning range, not statistically calibrated confidence limits. More reliable predictions would require longer unbiased historical data, time-aligned international/FX inputs and prospective validation.

**LBMA auction prices, COMEX futures and MCX futures are not yet connected**, because free international spot data cannot be presented as official exchange/futures values. The Markets screen links to those venues without suggesting they are collected.

If an individual source fails validation, its last validated observation is retained with its original date/time, and the collector reports the unsuccessful attempt. If all sources fail, no misleading new snapshot is published.

## Deployment

UI/source changes use the standard Pages workflow. Market collection runs twice daily, can be started manually, and also bootstraps when the archive scripts or scheduled workflow change. Market refreshes have a **separate concurrency queue** so they are not cancelled by UI-only builds. Both workflows publish a compact website; the scheduled market workflow also commits the permanent annual archives.



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

## Consolidated nine-tool interface

The Tools screen uses `features-core.js` and `features.js` with the new `features.css` layout. It provides nine verified reference-based workflows: page-open price alerts, CBIC-style 3% jewellery bill calculation, forecast accuracy, user-input shop comparison, private portfolio and local JSON backup/restore, resale/exchange estimates, BIS Care HUID handoff, AMFI ETF NAV comparison with manual quoted premium, and transparently sourced global spot/FX references. The old `tools-ui.js` remains only for compatibility tests and is not loaded in the website. There is **no background web-push service**, no live verified shop checkout feed, no direct HUID API and no licensed LBMA/COMEX/MCX live feed. No unsupported prices are invented. All user-entered records stay on the device.
