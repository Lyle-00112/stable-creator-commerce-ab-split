import assert from "node:assert/strict";
import { prepareDelivery } from "./creator_commerce_service.ts";

const calls: string[] = [];
const client = {
  getFlagValue: async (key: string, userId: string) => { calls.push(`${key}:${userId}`); return "treatment"; },
  getUser: async (userId: string) => ({ id: userId })
} as never;

const result = await prepareDelivery({ userId: "user-7", flagKey: "creator-checkout", assetId: "zip-1", subscriberEmail: "buyer@example.com", content: "hello" }, client);
assert.equal(result.variant, "treatment");
assert.deepEqual(calls, ["creator-checkout:user-7"]);
console.log("assignment test passed: the same user receives treatment for the supplied flag");
