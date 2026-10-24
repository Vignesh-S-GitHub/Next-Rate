# NextRate
A responsive, static GitHub Pages-ready demonstration of the locked NextRate gold-and-silver interface.

## Pages setup
Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**. Push to main or manually run **Deploy NextRate to GitHub Pages**.

Expected Pages URL (once enabled and deployed): https://vignesh-s-github.github.io/Next-Rate/

## Data integrity
All sample rates and percentage changes are **illustrative**, not live or actual forecasts. This V1 deliberately does not invent a prediction engine or imply live LBMA, COMEX, MCX, IBJA or city prices. Production integration needs licensed data feeds, scheduled ingestion, city-specific price calibration and measured forecast error. No backend is required for this static UI.

## Development
Open index.html in a browser. No npm dependencies. Assets use relative URLs for GitHub Pages project hosting.
