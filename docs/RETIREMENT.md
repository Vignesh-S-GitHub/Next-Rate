# NextRate retirement — 30 October 2026

The user requested removal of all NextRate schedules and Cloudflare resources, retention of the GitHub source, and screenshots of the application. This record supersedes the former hosting and scheduling instructions.

## Preserved in GitHub

- Full frontend, collector, forecast model and regression source.
- Final publication revision **49**, checked **2026-10-30T08:15:31.538Z (13:45 IST)**.
- All six application JSON documents and verified annual history.
- `data/retired-cloudflare/2026-10-30.sql.gz`: final `publication`, `observations` and `refresh_runs` tables. Restore into a local SQLite database with `gzip -dc data/retired-cloudflare/2026-10-30.sql.gz | sqlite3 retired.sqlite`.
- Backup manifest: SQL SHA-256, publication revision and counts (**1 publication, 363 observations, 52 runs**).
- **40 real screenshots**: all five tabs, three tools, desktop/mobile, English/Tamil, calendar-period and chart states. The gallery documents its snapshot time and offline emblem fallback.

The frontend defaults to local committed data. Focus, visibility and interval-based refresh hooks have been removed. No credentials or runtime API are needed for a local preview. Source links remain normal links to the original publishers.

## Retirement state

- Cloudflare cron triggers: cleared and verified empty.
- Worker `nextrate-scheduler`: deletion follows verified preservation of the backup and screenshots in GitHub.
- D1 `nextrate-data` (`9bbbac81-d301-42fc-8686-6ef910b9cb59`): deletion follows the Worker and verified backup.
- GitHub Actions: active Pages workflow removed; original source retained under `docs/reference/pages.yml.example`.
- Repository Worker configuration: cron list and D1 binding list empty.
- GitHub Pages: unpublication requires the repository's Pages settings; the connected GitHub tool does not expose that administration operation.

Cloudflare inventory showed no NextRate KV namespace or Pages project; R2 is not enabled in the account. Other projects are outside this retirement.

## Verification

Before infrastructure deletion, the SQL export was restored into in-memory SQLite and its table counts inspected. All six documents passed publication validation. Annual archive checks, **119 JavaScript tests, 98 Python tests and 136 browser checks** passed. Screenshots use the actual final data, not mock prices. Historical dated regression scenarios use preserved fixtures so advancing production snapshots cannot change their test clock.

To reactivate the source later, deliberately provision new hosting/storage, configure bindings and sources, review provider rights and the holiday calendar, then add a new deployment and schedule. The retained source does not reactivate services automatically.
