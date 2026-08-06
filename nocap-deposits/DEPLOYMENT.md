# Deploying NoCap Deposits (cloud hosting — nothing runs on your computer)

The app runs on Railway (~$5/mo). One-time setup, then Claude handles all
future deploys.

## One-time setup (browser only, ~10 minutes)

### 1. Give the app its own GitHub repo
- Go to github.com/new
- Repository name: `nocap-deposits` — keep it **Private** — click **Create repository**
- Don't add any files; Claude will push the code into it.

### 2. Create the Railway project
- Go to railway.app → **Login with GitHub**
- **New Project → Deploy from GitHub repo** → pick `nocap-deposits`
- Railway detects the Dockerfile automatically.

### 3. Set the app's environment variables (Railway → your service → Variables)
| Name | Value |
|---|---|
| `SHOPIFY_API_KEY` | the app Client ID (`fd539a95a41afab22069e73ff8bb0745`) |
| `SHOPIFY_API_SECRET` | the **Client secret** — Dev Dashboard → NoCap Deposits → Settings (click reveal/copy) |
| `SCOPES` | `write_products,read_orders,read_purchase_options,write_purchase_options` |
| `SHOPIFY_APP_URL` | the public URL Railway gives the service (Settings → Networking → Generate Domain), e.g. `https://nocap-deposits-production.up.railway.app` |
| `PORT` | `3000` |

### 4. Let Claude drive future deploys
- Railway → Account Settings → **Tokens** → create a token
- Add it to the Claude Code environment variables as `RAILWAY_API_TOKEN`

## After hosting is live (Claude's job)
1. Set `application_url` + auth redirect URLs in `shopify.app.toml` to the
   Railway domain and redeploy the app config (`shopify app deploy`).
2. Install the app on the dev store from the Dev Dashboard (Test on store).
3. End-to-end test: create a deposit plan, place a test order, verify the
   deposit + balance tracking.
