# Deploying to Vercel

## One-time setup

1. Push this branch (or merge to `main`).
2. Go to <https://vercel.com/new> and import the GitHub repo.
3. Framework preset: **Next.js** (auto-detected).
4. Leave build command, output directory, and install command as defaults.
5. Add the environment variables below in **Project Settings → Environment Variables**, then deploy.

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

## After first deploy

1. Copy the production URL (e.g. `https://tax-insights.vercel.app`).
2. In the Xero developer portal, add `https://<production-url>/api/auth/callback` to the allowed redirect URIs.
3. Update the `XERO_REDIRECT_URI` env var in Vercel to match, then redeploy.

## Notes

- `vercel.json` pins `maxDuration: 60` for `/api/tax/explain` so the streaming response has headroom.
- `includeFiles: "app/skills/**"` ensures the markdown skill files are bundled into the serverless function — they're read from disk at runtime.
- The existing `netlify.toml` is kept so Netlify deploys still work if you want a secondary environment, but Vercel is the primary.
