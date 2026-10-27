# Cloudflare scheduler cutover

## Current state

The `nextrate-scheduler` Worker is prepared as a timer-only dispatcher. The
repository supports its dated workflow inputs and publication receipts. Its
GitHub credential is still required. GitHub cron stays enabled until live
acceptance passes; Cloudflare schedules stay unconfigured during this preparation.
The website and market collectors continue running on GitHub Pages and Actions.

## Restricted credential

Create a fine-grained GitHub personal access token owned by the repository owner:

- Repository access: **Only select repositories → Vignesh-S-GitHub/Next-Rate**.
- Repository permission: **Actions: Read and write**. Metadata read is automatic.
- No Contents, Workflows, administration or other write permissions are needed.
- Use an expiry date and renew before expiration. An expired/revoked token causes
  dispatch failure and requires replacement; recovery timers cannot repair it.

Add its value directly to the Worker's **Settings → Variables and Secrets** as an
encrypted **Secret** named `GITHUB_ACTIONS_TOKEN`. Never paste it into an issue,
chat, source file, plain-text variable or workflow input. The existing GitHub app
connection does not supply a reusable runtime token to Cloudflare.

## Schedule and safeguards

| UTC cron | IST | Purpose |
| --- | --- | --- |
| `45 7 * * *` | 13:15 | AM primary |
| `45 13 * * *` | 19:15 | PM primary |
| `15 8,14 * * *` | 13:45, 19:45 | First recovery |
| `45 8,14 * * *` | 14:15, 20:15 | Second recovery |

The Worker has no HTTP handler. Destination, workflow and branch are fixed.
Dispatches have a 15-second timeout, reject redirects and do not log credentials.
Cloudflare logs record acceptance without claiming the workflow completed.
A network failure is not blindly retried because GitHub may already have accepted
the POST; the next recovery slot can safely recheck the session.

Both Worker and workflow validate the approved cron and original timer time.
Future, malformed and more-than-three-hours-old events fail. Delayed invocations
retain their original IST date/session. Workflow concurrency serializes refreshes;
source/date validation and successful-publication receipts suppress redundant
collection after success. Prior GitHub timer receipts remain valid during migration.

## Live acceptance and cutover

1. Deploy the source at `cloudflare/nextrate-scheduler/worker.mjs`, preserving the
   encrypted secret, with compatibility date `2026-10-27` and full observability.
   Keep workers.dev and preview URLs disabled.
2. Configure the four Cloudflare cron expressions above. Changes can take up to
   15 minutes to propagate. Observe a real configured primary or recovery event.
3. Match its `dispatch_accepted` log timestamp/cron to a GitHub run titled
   `Refresh rates · cloudflare · <scheduled_at>`. GitHub records its event type as
   `workflow_dispatch`, which is expected for this architecture.
4. Verify collector tests, session/archive checks, Pages deployment and the live
   asset smoke check all succeed. Match `data/refresh_status.json` to that run:
   `trigger=cloudflare`, `event=workflow_dispatch`, `published=true`, its `run_id`,
   original `scheduled_at`, `cron`, target date and AM/PM session.
5. A skipped run after an existing GitHub receipt does not establish Cloudflare
   publication. Verify a session that lacks a prior receipt, or remove only the
   relevant operational receipt before an approved test; never alter price history.
6. After acceptance, remove only the `on.schedule` block from
   `.github/workflows/refresh-rates.yml`, update its workflow test and README, and
   rerun tests. Keep `workflow_dispatch` and the code-only Pages workflow.
7. Confirm GitHub has no remaining cron trigger and Cloudflare still lists all
   four schedules. Check the next AM and PM receipts across a day boundary.

No Cloudflare-triggered live publication has been verified at this preparation
stage. Exact-minute delivery and scheduler/provider availability are not guaranteed.

## Recovery and rollback

Inspect Cloudflare invocation logs and the corresponding Actions run when a
receipt is missing. HTTP 401/403 indicates an expired/revoked token or insufficient
Actions permission; 404 can also indicate inaccessible repo/workflow; 422 indicates
invalid workflow inputs/ref. Replace credentials privately in Worker secrets.
Source failures keep the previous dated quote and are retried at recovery slots.

To roll back after cutover, restore the prior GitHub `on.schedule` block and disable
Cloudflare cron triggers. Keep the compatibility code and all price archives.
Before a manual recovery refresh, inspect the source dates. Manual success by
itself does not prove a timer event.
