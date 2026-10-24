# NextRate

Mobile-first gold and silver market dashboard for India, styled to match the approved NextRate mockups. The NextRate icon uses the original approved logo artwork (transparent PNG).

## Screens

- Home: simplified gold and silver price presentation, chart, and four global drivers.
- Markets: LBMA, COMEX, MCX, USD/INR and explanation of market influences.
- Compare: 24K gold, 22K gold and silver across five cities.
- Insights: explanatory market factors and transparent forecast limitations.

## Deploy to GitHub Pages

**One-time setup required:**
1. Visit [Settings → Pages](https://github.com/Vignesh-S-GitHub/Next-Rate/settings/pages).
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open [Actions](https://github.com/Vignesh-S-GitHub/Next-Rate/actions/workflows/pages.yml) and run **Deploy NextRate to GitHub Pages** (or push a new commit).
4. Once the workflow is green, visit <https://vignesh-s-github.github.io/Next-Rate/>.

If Pages settings are unavailable because this repo is private, GitHub Free requires the repository to be public for Pages. GitHub Pro / Team / Enterprise plans may support private repositories. Changing repository visibility is a decision for the owner; a public Pages site is accessible to everyone even if source remains private.

### Previous deployment failure

The original workflow stopped at `actions/configure-pages@v5` with `Get Pages site failed: Not Found`. This indicates that Pages has not been enabled/configured for the repository. The workflow now validates the JavaScript and the required logo asset before trying to deploy, but GitHub Pages still requires the owner to enable the publishing source.

## Data accuracy

**All values are illustrative sample data.** No live quote API, real forecasting model, city retail feed, or trained confidence scoring has been connected. Real forecasting would require source-licensed LBMA / COMEX / MCX / IBJA feeds, timestamps, trading-calendar awareness, currency conversion, city-specific physical bullion premiums, backtesting and calibrated uncertainty bands. Do not use the sample price values as investment guidance.

## Technology

HTML + CSS + vanilla JavaScript, no npm runtime dependencies. The GitHub Actions workflow checks JavaScript syntax, stages only public site files, and deploys using the official Pages actions.
