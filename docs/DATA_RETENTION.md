# NextRate historical data policy

NextRate keeps **verified historical observations indefinitely** in annual archives while serving small recent-data files to GitHub Pages. No scheduled task deletes an annual archive record.

## Where the data lives

| Path | Role | Retention |
|---|---|---|
| `data/latest.json` | Latest IBJA, international spot and FX references | Latest source observations |
| `data/forecast.json` | Current experimental next-session forecast | Latest forecast |
| `data/history.json` | Recent rates loaded by the browser | Most recent **120** IBJA dates, 120 XAU quotes, 120 XAG quotes, 120 FX dates |
| `data/forecast_history.json` | Recent forecast issuances | Most recent **90**; earlier issuances are archived |
| `data/archive/ibja/YYYY.json` | Canonical published India 24K, 22K and Silver 999 AM/PM observations | **Permanent** |
| `data/archive/spot-xau/YYYY.json` and `spot-xag/YYYY.json` | Canonical source-dated spot quotes, de-duplicated by original quote timestamp | **Permanent** |
| `data/archive/fx/YYYY.json` | Dated daily USD/INR references, with individual provider attribution | **Permanent** |
| `data/archive/forecasts/YYYY.json` | Original issued predictions and subsequent scoring; grouped by forecast target year | **Permanent** |
| `data/archive/manifest.json` | Inventory, row counts, and SHA-256 checksums for every annual shard | Updated when an archive changes |

The **website deploys only the small recent files**, not the full archive. Historical model testing reassembles the records from annual shards. Model training currently uses up to 365 recent dated PM observations while retaining older ones for auditing, rebuilding, and future improved models.

## Each automated update

1. Validate the existing archive manifest **before** the new forecast is generated.
2. Collect current IBJA, spot, FX, and AMFI data and conservatively backfill genuine PM closes.
3. Rebuild the complete time-ordered series from the historical yearly files plus recent observations.
4. Produce and score forecasts using source dates. Original forecasts are immutable; a later actual PM close may add an accuracy evaluation.
5. Merge new observations into their appropriate yearly archive with source priority and duplicate checks.
6. Verify the files and their SHA-256 manifest before **compacting the browser files**.
7. Commit the archived files and recent snapshots in the scheduled GitHub Action. A failure stops the publication rather than silently discarding older data.

Records with the same date/timestamp are not added twice. Already captured official IBJA PM quotes take priority over rounded reprints. No absent 22K quote is invented, and AM/PM rates are not mixed to create a fictional close. Exchange spot quotes are keyed to the provider quote timestamp, not mistaken for exchange executions.

## Reliability and recovery

- All archive files are committed to Git, so the repository is an initial versioned copy. This is **not an independent off-site backup**; keep a separate periodically downloaded Git clone or repository backup for disaster recovery.
- Restore a recent browser snapshot using `python scripts/archive_data.py`. The script reconstructs it from the annual source files while preserving their historical records.
- Verify all years without changing any data using `python scripts/archive_data.py --verify`.
- Run storage tests using `python -m unittest discover -s tests -v`.
- **Never manually delete or rewrite a yearly archive file** without explicit migration, backups and an updated manifest. Ordinary GitHub Pages deployments do not delete archives.
- Source licences and future external data-feed changes still need monitoring; storage integrity alone cannot guarantee that a quoted market value is correct.

## Growing beyond GitHub

Annual JSON shards keep each file reasonably sized, and the app bundle remains independent of total historical years. If the number of records becomes very large (for example minute-level exchange feeds), migrate the **canonical store** to inexpensive object storage such as a year/month partitioned bucket. Retain year archives, source metadata, and forecast issuance/evaluation pairs during migration. Do **not** automatically purge validated historical observations merely because the frontend limits its 7D/30D/90D chart.
