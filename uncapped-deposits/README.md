# Uncapped Deposits

Shopify app for deposits & partial payments with **flat pricing** — no
percentage fees, no order-value caps, no overages. Ever.

Built for made-to-order and high-AOV sellers (custom furniture, jewelry,
bridal, art commissions, equipment) — the merchants that usage-priced
competitors punish hardest.

> Working name. Product/brand name TBD.

## How it works

The app never touches the money. It creates **deposit selling plans**
(Shopify's deferred purchase options API): customers pay a configurable
deposit percentage at Shopify checkout through the merchant's own payment
gateway, and the remaining balance is due X days after checkout or on an
exact date. The app orchestrates plan configuration, tracks outstanding
balances, and (later) triggers automated balance capture.

## Current state (MVP scaffold)

- `app/services/deposit-plans.server.ts` — create / list / delete deposit
  selling plans via `sellingPlanGroupCreate` (fixed billing policy, checkout
  charge %, remaining-balance trigger).
- `app/routes/app.deposits.tsx` — embedded admin UI (Polaris): create a plan,
  pick products, list and delete plans.
- `app/routes/app._index.tsx` — dashboard: deposits collected, balances
  outstanding, per-order tracking.
- `app/routes/webhooks.orders.create.tsx` + `DepositOrder` Prisma model —
  records deposit orders and outstanding balances from order webhooks.

## Roadmap

1. **Now** — dev-store validation of the deposit checkout flow end to end.
2. Balance collection v1: invoice/reminder emails for due balances.
3. Protected scopes approval (`read_customer_payment_methods`,
   `write_payment_mandate`) → automated vaulted-card balance capture.
4. Theme app extension: deposit option widget on the product page.
5. Migration tool: import open balances from Downpay/Depo installs.
6. FR/EN localization; app store listing + Built for Shopify review pass.

## Dev setup

Requires a Shopify Partner account and a development store.

```bash
npm install
npm run config:link   # links this code to an app record in the Partner org (interactive login)
npm run dev           # tunnels + installs on the dev store
```

`npm run config:link` fills in `client_id` in `shopify.app.toml`.

## Pricing model (decided)

Tier on features, never usage: Starter $29 / Pro $59 / Studio $99 per month.
Unlimited order value on every tier. Founding offer: first 100 stores lock
Pro at $39 for life. See `../BUSINESS_IDEAS.md` for the full analysis.
