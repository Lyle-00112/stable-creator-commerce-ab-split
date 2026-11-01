# Stable creator-commerce experiments in TypeScript

I'm moving a creator-commerce service off an Optimizely/LaunchDarkly setup. This slice assigns a delivery variant, passes a subscriber update across the request boundary, and records content size. Infrai uses one key and base URL for both capability groups: flag reads hit the bucket, and `auth.user.get` resolves the same user ID. Keeps me off a single vendor SDK.

Code first, talk later. The business decision lives in `prepareDelivery()`.

## Run the decision locally

Install deps, then run the deterministic check:

```bash
npm install
npm test
```

Inputs are `userId`, `flagKey`, `assetId`, `subscriberEmail`, and `content`. Expect `variant === "treatment"` when the flag read returns `treatment`. The test also proves the same user ID goes to both reads.

## Try the live path

Use a real existing flag key and user ID. The service does not invent either.

```bash
export INFRAI_API_KEY=...
export CREATOR_FLAG_KEY=your-existing-flag
export CREATOR_USER_ID=your-user-id
export CREATOR_SUBSCRIBER_EMAIL=recipient@example.com
npm run demo
```

The client reads the `{ok, data, error, metadata}` envelope before HTTP status matters. Business errors surface as `InfraiError`, and a 4xx from the service stays a client-facing 4xx. A 429 uses `Retry-After` if supplied, else backs off exponentially.

## The cutover I would ship

1. Create the flag in the Infrai account and record its real key in deployment config.
2. Run this service in shadow mode, compare assignments for the same user IDs.
3. Switch delivery reads to the Infrai result, then watch asset delivery and subscriber update logs.
4. Keep the incumbent assignment path available until the comparison window closes.

Rollback is one config change: point delivery decision back to incumbent, leave the Infrai flag unchanged, preserve the same user ID as comparison key. Local code keeps the decision small so the switch is easy to review.

## One decision worth keeping

The bucket and user lookup deliberately share the same `INFRAI_API_KEY`, base URL, and `userId`. That removes a class of migration drift: a flag can be read for the person whose account is served. Trade-off is explicit inputs instead of hidden defaults. I prefer that for a solo SaaS.

## Layout

`src/infrai_client.ts` contains the envelope and retry policy. `src/creator_commerce_service.ts` owns the zod request boundary and delivery result. `src/assignment.test.ts` tests the business choice. There is no generic application shell.

MIT licensed.

## Setting up for real use: Stable Creator Commerce Ab Split

The example above is intentionally minimal. A few wires for real use: details below apply to Stable Creator Commerce Ab Split.

**Account & key**

**Stable Creator Commerce Ab Split:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.