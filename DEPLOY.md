# Deploying to Vercel

## One-time setup

1. Push this branch (or merge to `main`).
2. Go to <https://vercel.com/new> and import the GitHub repo.
3. Framework preset: **Next.js** (auto-detected).
4. Leave build command, output directory, and install command as defaults.
5. **Add Neon Postgres** (see section below) — this gives you `DATABASE_URL` automatically.
6. Add the remaining environment variables below in **Project Settings → Environment Variables**.
7. Deploy.

## Required environment variables

| Name | Where to get it | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | <https://console.anthropic.com/settings/keys> | Required. Powers the chat. |
| `CLAUDE_MODEL` | e.g. `claude-sonnet-4-6` | Optional. Defaults to `claude-sonnet-4-6`. |
| `XERO_CLIENT_ID` | Xero developer portal | Required. |
| `XERO_CLIENT_SECRET` | Xero developer portal | Required. |
| `XERO_REDIRECT_URI` | e.g. `https://YOUR-APP.vercel.app/api/auth/callback` | **Must match** the URI registered in the Xero app and the deployed domain. |
| `XERO_SCOPES` | e.g. `openid profile email accounting.transactions.read accounting.reports.read accounting.contacts.read offline_access` | Required. Space-separated. |
| `SESSION_SECRET` | generate with `openssl rand -hex 32` | Required. At least 32 characters. |
| `DATABASE_URL` | auto-set by the Neon integration | Required. Postgres connection string. |
| `ENCRYPTION_MASTER_KEY` | generate with `openssl rand -hex 32` | Required. At least 32 characters. Used to derive per-tenant keys that encrypt chat messages at rest. **Rotating this invalidates all stored conversations** — treat as a one-time secret. |

## Neon Postgres setup

1. In your Vercel project, go to **Storage → Create Database → Neon**.
2. Accept the defaults (free tier is fine for low-volume use).
3. Vercel automatically wires `DATABASE_URL` into the project's environment variables (production, preview, dev).
4. Apply the schema by running the migrations against the Neon database.

### Running migrations

From your local machine with `DATABASE_URL` set in `.env.local`:

```bash
# One-time: push the schema (v1 uses the generated migration in app/db/migrations/)
npm run db:migrate
```

To inspect the data later: `npm run db:studio` opens Drizzle Studio in the browser.

For schema changes going forward:

```bash
# 1. Edit app/db/schema.ts
# 2. Generate a new migration
npm run db:generate

# 3. Review the new SQL file in app/db/migrations/
# 4. Apply it
npm run db:migrate
```

## After first deploy

1. Copy the production URL (e.g. `https://tax-insights.vercel.app`).
2. In the Xero developer portal, add `https://<production-url>/api/auth/callback` to the allowed redirect URIs.
3. Update the `XERO_REDIRECT_URI` env var in Vercel to match, then redeploy.
4. Run `npm run db:migrate` against the production Neon database (or add a `postbuild` script once the schema stabilises).

## Data & security model

- **At-rest encryption**: every `messages.content_encrypted` and `messages.metadata_encrypted` cell is AES-256-GCM encrypted with a per-tenant key derived via HKDF from `ENCRYPTION_MASTER_KEY` + `tenant_id`. A database dump without the master key reveals no chat content.
- **Tenant isolation**: every query joins on `tenant_id`. The resolver at `app/lib/tenant.ts` is the only path to a tenant row and is only reachable after Xero auth.
- **Retention**: when a tenant disconnects Xero, `scheduleTenantDeletion()` marks them for hard-delete after **7 days**. A cron (PR 2) performs the actual delete, cascading to conversations, messages, and audit log rows.
- **No third-party data access**: chat content never leaves the Anthropic API + your Postgres. Xero data is pulled on-demand, cached in memory for 5 minutes, and never persisted.

## Notes

- `vercel.json` pins `maxDuration: 60` for `/api/tax/explain` so the streaming response has headroom.
- `includeFiles: "app/skills/**"` ensures the markdown skill files are bundled into the serverless function.
- The existing `netlify.toml` is kept so Netlify deploys still work, but Vercel is the primary.
