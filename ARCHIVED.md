# Project Archived

This repository has been archived and development is discontinued (2025-09-01).

All environments should be considered read-only. If you need to keep the
artifact for reference, clone the repo and retain the local database file
`web/local.db` as a snapshot.

## Maintenance Guard (safe shutdown)

To prevent accidental API usage after archival, the codebase includes a
maintenance guard. When the environment variable `MAINTENANCE_MODE` is set to
`1` or `true`, all API routes under `/api/*` return HTTP 410 Gone.

- Env var: `MAINTENANCE_MODE=1`
- Behavior: JSON body `{ ok: false, maintenance: true, status: 410 }`
- Scope: `/api/*` only (UI pages can still render static assets if needed)

See `web/src/middleware.ts` for implementation details.

## Recommended Deprovision Steps

Use the following checklist to disable or remove external resources and prevent
any continuing costs.

1) Vercel (if used)
- Delete the Project: Settings → Danger Zone → Delete Project
- Remove Cron Jobs: Settings → Cron Jobs → delete all
- Remove Custom Domains: Settings → Domains → remove
- Remove Environment Variables: Settings → Environment Variables → delete

2) Turso/LibSQL (if used)
- CLI: `turso db ls` to list DBs → `turso db destroy <name>`
- Revoke tokens: `turso auth revoke`
- Dashboard: delete Database and API tokens

3) Cloudflare (if used)
- Workers: delete the worker(s) and routes
- KV/R2: delete namespaces and buckets
- DNS/Pages: remove routes and projects

4) Sentry (if used)
- Delete or disable the project (removes DSN)
- Ensure DSN env vars are unset in any runtime environment

5) Email/Notification providers (if used)
- SMTP/API keys (e.g. SendGrid): revoke or delete
- Remove webhooks and any scheduled jobs

6) Uptime/Monitoring (if used)
- Remove monitors hitting `/api/*` or the site root

7) Domains (if used)
- Remove DNS records for the app domain
- Optionally let the domain expire or transfer it

## Data Retention

- Local DB: `web/local.db` contains a SQLite snapshot. Back it up if needed.
- Media files: If you used any external storage (e.g., Cloudflare R2), export
  and delete the bucket.

## Reactivating (not recommended)

If you must bring the project back temporarily:

1. Unset `MAINTENANCE_MODE`
2. Restore external services (DB, hosting) and configure env vars again
3. Start locally: `cd web && npm ci && npm run dev`

