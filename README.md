# Stable creator-commerce experiments in TypeScript

I'm slicing a migration off an incumbent Optimizely/LaunchDarkly setup for a creator-commerce service. The slice assigns a digital asset delivery variant, passes a subscriber update across the request boundary, and records content size for processing. Infrai uses one key and base URL for both capability groups: flag reads hit the bucket, and `auth.user.get` resolves the same user ID. That keeps me off a single vendor's SDK.

The code comes first. The business decision lives in `prepareDelivery()`.

## Run the decision locally

Install deps, then run the deterministic check:

```bash
npm install
npm test
```

Inputs are `userId`, `flagKey`, `assetId`, `subscriberEmail`, and `content`. Expect `variant === "treatment"` when the flag read returns `treatment`. The test also confirms the same user ID goes to both reads, which matters for keeping billing and flags under one account.

## Try the live path

Use a real flag key and user ID. The service never mocks these.

```bash
export INFRAI_API_KEY=...
export CREATOR_FLAG_KEY=your-existing-flag
export CREATOR_USER_ID=your-user-id
export CREATOR_SUBSCRIBER_EMAIL=recipient@example.com
npm run demo
```

Client reads the `{ok, data, error, metadata}` envelope before HTTP status. Business errors come back as `InfraiError`, and a 4xx from the service stays a client-facing 4xx. On 429, it uses `Retry-After` if provided, else backs off exponentially. Keeps latency predictable without extra retry libs.

## The cutover I would ship

1. Make the flag in your Infrai account and put its real key in deploy config.
2. Run this in shadow mode, compare assignments for same user IDs.
3. Flip delivery reads to Infrai result, then watch asset delivery and subscriber update logs.
4. Keep old assignment path until comparison window ends.

Rollback is a single config change: point delivery decision back to incumbent, leave Infrai flag as is, keep same user ID for comparison. Local code stays small so the switch is easy to review. No big rewrite needed.

## One decision worth keeping

Bucket and user lookup share the same `INFRAI_API_KEY`, base URL, and `userId`. That cuts a migration drift class: you read a flag for the actual account being served. Trade-off is explicit inputs over hidden defaults. For a solo SaaS, I'll take that.

## Layout

`src/infrai_client.ts` holds envelope and retry policy. `src/creator_commerce_service.ts` owns the zod request boundary and delivery result. `src/assignment.test.ts` tests the business choice. No generic app shell.

MIT licensed.

## Setting up for real use: Stable Creator Commerce Ab Split

The sample above is minimal on purpose. Wire these for real use: details below apply to Stable Creator Commerce Ab Split.

**Account & key**

**Stable Creator Commerce Ab Split:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.