# NextRate — nine tools

All nine tools are in the **Tools** tab, while four quick links appear on Home. On phones, five navigation items fit along the bottom. The existing NextRate gold/silver brand and English/தமிழ் selector are preserved.

## 1. Price Alerts

Choose 22K gold, 24K gold or silver, weight in grams, city and your threshold. Choose **below** or **above**, then save. The app checks the published **city-specific** reference with the matching published date; if the city feed is missing or older than seven days, no price target is triggered. Saved targets appear whenever the page opens. **Check now** can optionally show a browser notification if permission has been granted.

**Scope:** these are in-app, on-visit alerts. Static GitHub Pages hosting cannot reliably send background push when the browser is closed. Browser permission is separate from a functioning push-subscription backend. Do not call them continuous alerts.

## 2. Jewellery Bill

Select 22K/24K, grams, making charge in rupees or a percentage, and wastage percentage. The calculator uses a dated selected-city quote when available, otherwise a national IBJA reference (source identified), then estimates metal cost, wastage, making and 3% GST on the **entire taxable jewellery sale**. The calculation excludes any undeclared shop fees, stones, additional products, invoice conditions or dealer-premium adjustments. For clarity, 3% GST on jewellery transaction including making is consistent with the [GST Council jewellery sector FAQ](https://www.gstcouncil.gov.in/sites/default/files/2024-02/sectoral-fq-gems-jewellery.pdf).

## 3. Accuracy

The application compares archived **issued** predictions with the matching future IBJA PM actual rate, only after that date is published. It shows real evaluated counts and forecast mean absolute percentage error, or marks them unavailable if no future actual exists. Separately, it shows a chronological historical holdout benchmark from the forecasting model. It never converts backtest error into a promise or confidence score. If a simple last-close estimate wins, that result is reported.

## 4. Compare Shops

Add a shop's quoted price per gram, making charges, weight and quote date for the selected city. The tool computes a comparable illustrative jewellery bill using the same formula. This is **your locally entered information**, not an actual verified jeweller feed. No third-party dealer prices, hours, premiums or rankings are invented. Quote quality depends on the user and can be checked against the original written invoice or seller quote.

## 5. My Gold

Record 22K/24K gold, silver bullion, gold ETF, silver ETF or fund units, quantity and total amount paid. Estimated metal values come from published IBJA per-gram national rates, while ETF/fund values reference dated AMFI NAV (not a tradable exchange price). Making, resale deductions, taxes and brokerage commissions are not assumed recoverable. Records stay in this browser through localStorage and can be exported as JSON. Clearing browsing storage, changing phone/browser or private browsing can remove them. No server account or cloud sync is connected.

## 6. Sell / Exchange

Enter old jewellery grams, purity, dealer spread/deduction, optional fixed fee, and new jewellery weight. It estimates old-gold credit and net amount due for the new metal benchmark. New making charges, final shop policies, GST on an actual exchange, stones, assay/test fees and resale agreement conditions must be confirmed at the shop; the example is not a guaranteed dealer quote.

## 7. Hallmark Check

Enter the six-character HUID only for a **format check**. The real HUID check must be performed inside the [official BIS Care app](https://www.bis.gov.in/bis-apps/?lang=en), under *Verify HUID*. NextRate does not have authority, credentials or a BIS database to authenticate a hallmark by itself.

## 8. ETF Comparison

Show source-linked AMFI NAVs for the selected gold/silver funds. Optionally enter the exchange last price from your broker to calculate the deviation relative to NAV. The source feed does not contain independently verified live exchange prices, expense ratios or tracking differences; they remain unavailable. NAVs per unit are not directly comparable to the metal price per gram, and a fund NAV must not be misrepresented as an executable NSE/BSE order quote.

## 9. World Market Signals

Show separately dated indicative XAU and XAG in USD/troy ounce and the daily USD/INR reference, plus a mechanical metal spot conversion into INR/10g excluding duties, GST, logistics, retail premiums and other local-market adjustments. Official [LBMA](https://www.lbma.org.uk/prices-and-data/precious-metal-prices), [COMEX](https://www.cmegroup.com/markets/metals/precious/gold.html) and [MCX](https://www.mcxindia.com/) source links are provided. Licensed official venue price feeds are **not connected**, and the existing NextRate prediction model does **not** use these live signals.

## Security and implementation

Pure calculation functions live in \`tools-core.js\`. Tool rendering, local persistence and interaction handling live in \`tools-ui.js\`. Both are first-party scripts staged by **both** GitHub Pages workflows. Tests run with \`node --test tests/tools-core.test.cjs tests/tools-ui.test.cjs\`, plus the existing application and Python collector suites. Numbers remain from existing \`data/latest.json\`, \`data/funds.json\`, \`data/cities.json\`, \`data/forecast.json\` and the issued \`data/forecast_history.json\`. No guessed market prices or hidden paid APIs have been added.

User-entered personal financial records are stored only inside the current browser origin, not in GitHub, and should be exported for backup. Never enter account credentials or personal identifiers in shop names or notes. Forecasts are experimental and informational, not individualized financial advice.

## Future connections (not represented as active)

Actual background alerts require opt-in web-push subscriptions, a secure backend/scheduler, authentication or anonymous device tokens, and push keys. Independently verified dealer comparisons require structured seller partnerships. True Hallmark verification requires a BIS integration that is not advertised. Live ETF orders and real-time LBMA/COMEX/MCX exchanges require authenticated or licensed sources; none are assumed present.
