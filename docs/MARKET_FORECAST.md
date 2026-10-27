# Market-adjusted forecast — version 4

## What is implemented

This is an experimental market-implied next-IBJA-publication estimate. It uses
observed global gold/silver movements and USD/INR changes after a verified national
benchmark check. It is a structural parity model, not a fitted machine-learning
model and not a proven predictor of tomorrow's market movement.

For each metal:

```
projected IBJA = latest published IBJA
              × current global spot / reference global spot
              × current USD/INR / reference USD/INR
```

Gold 24K and 22K use the same XAU factor, preserving their published purity ratio
apart from whole-rupee rounding. Silver uses XAG separately. The dollar-metal
contribution is calculated first; the FX contribution includes the interaction
term. Their sum equals the unrounded price adjustment.

This estimates a next national rate conditional on current world metal and FX
levels holding, and the domestic premium/tax basis staying unchanged. It cannot
forecast news or world-price moves that have not happened. A flat result is still
possible when input movements are zero or offset one another.

## Comparable references and timing

`market-anchors` observations in D1 store the first coupled, verified source
snapshot for each `IBJA date:AM/PM` key. They include the original national prices,
spot quotes, daily FX reference, provider URLs and observation/check timestamps.
The first reference is immutable. A new IBJA session gets a new reference.

During deployment, the previous saved publication can bootstrap a reference only
if all original source checks and timestamps are valid. Historical quotes from
separate days are never joined to invent a same-time reference. The global quote
is the one observed at the first benchmark check, not an assumed IBJA release time;
movements before that first check cannot be reconstructed by this method.

Current global quotes must be within 90 minutes of a fresh check; the daily FX
reference must be no more than five days old. All three current market checks must
succeed, provider origins must match the reference, and timestamps must not regress
or be in the future. A projected movement of 15% or more is outside this model's
supported range and is withheld. On failure, the UI explicitly labels the
IBJA-history fallback and explains why market adjustment is inactive.

## Ranges and evidence

The initial scenario band uses the 80th percentile of past absolute daily IBJA
moves, up to 90 observations, centred on the market-adjusted point and rounded
outwards. This is a descriptive historical-move scenario. It is **not** an 80%
prediction interval or a calibrated coverage guarantee. Legacy 50% typical-range
and historical model backtest results are not attributed to the market model.

Every forecast edition is saved before its target outcome. Its key includes model
version, target date, benchmark date/session, mode and market check timestamp.
Later market data does not rewrite earlier predictions. Matching target-date PM
prices grade the saved prediction; AM remains provisional. Forecasts issued after
the target day began are excluded from prospective accuracy.

Forward evidence reports market-model MAPE alongside the unchanged latest-rate
baseline on the same target dates. Only the latest pre-target-day market edition
per target date counts, avoiding repeated intraday observations inflating sample
size. Baseline fallback editions do not count as market-model performance. Fewer
than 20 independent outcomes are labelled collecting. This threshold is a reporting
rule, not proof of statistical reliability. The browser cache retains independent
target-day evidence plus recent editions; all editions and anchors remain in D1.

## Refresh times

Cloudflare runs at 13:15, 13:45, 14:15, 19:15, 19:45, 20:15 and 22:15 IST. Later
checks update market inputs even if IBJA has already published the day's quote.
The two cron expressions are `45 7,13,16 * * *` and `15,45 8,14 * * *` (UTC).
GitHub Actions continues to deploy UI source changes only.

## Sources and limits

- Gold API XAU/XAG: indicative USD per troy ounce, with provider fetch timestamps.
- Frankfurter (or the collector's attributed fallback): dated daily USD/INR.
- Explicitly dated official IBJA HTML/PDF rows: national AM/PM benchmarks.
- Attributed IBJA archive: historical national moves for the descriptive band.

No new API key, paid subscription, public write endpoint or GitHub credential is
required. LBMA, COMEX, MCX, retail shop premiums and intraday FX are not connected.
Their values or predictive effects are not invented. A genuinely fitted predictive
model can be added once sufficiently long, correctly timed input/outcome history
is available; this release does not claim that improvement has already been proven.
