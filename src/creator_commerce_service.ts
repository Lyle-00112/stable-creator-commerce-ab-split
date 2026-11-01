import { z } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.ts";

export const deliveryRequest = z.object({
  userId: z.string().min(1), flagKey: z.string().min(1), assetId: z.string().min(1),
  subscriberEmail: z.string().email(), content: z.string().min(1)
});
export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export async function prepareDelivery(input: unknown, client: InfraiClient) {
  const request = deliveryRequest.parse(input);
  const [bucket, user] = await Promise.all([
    client.getFlagValue(request.flagKey, request.userId),
    client.getUser(request.userId)
  ]);
  const variant = bucket === "control" || bucket === "treatment" ? bucket : "control";
  return { assetId: request.assetId, subscriberEmail: request.subscriberEmail, variant, contentLength: request.content.length, user };
}

export async function main() {
  const key = process.env.INFRAI_API_KEY;
  const userId = process.env.CREATOR_USER_ID;
  const flagKey = process.env.CREATOR_FLAG_KEY;
  const subscriberEmail = process.env.CREATOR_SUBSCRIBER_EMAIL;
  if (!key || !userId || !flagKey || !subscriberEmail) throw new Error("Set INFRAI_API_KEY, CREATOR_USER_ID, CREATOR_FLAG_KEY, and CREATOR_SUBSCRIBER_EMAIL");
  const result = await prepareDelivery({ userId, flagKey, assetId: "asset-demo", subscriberEmail, content: "new subscriber update" }, new InfraiClient(key));
  console.log(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) { console.error(JSON.stringify({ status: error.status, error: error.code })); process.exitCode = 4; return; }
    console.error(error); process.exitCode = 1;
  });
}
