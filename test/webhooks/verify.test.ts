import { describe, expect, it } from "bun:test";
import { verifyWebhookSignature } from "../../src";

const SECRET = "test-webhook-secret";
const BODY = JSON.stringify({ meta: { event_name: "order_created" }, data: { id: "1" } });

/**
 * Compute the expected HMAC-SHA256 hex digest for a given body and secret,
 * using the same algorithm as verifyWebhookSignature.
 */
async function computeSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("verifyWebhookSignature", () => {
  it("should return true for a valid signature", async () => {
    const signature = await computeSignature(BODY, SECRET);
    const result = await verifyWebhookSignature(BODY, SECRET, signature);
    expect(result).toBe(true);
  });

  it("should return false for an incorrect signature string", async () => {
    const result = await verifyWebhookSignature(BODY, SECRET, "not-a-valid-sig");
    expect(result).toBe(false);
  });

  it("should return false when the body has been tampered with", async () => {
    const signature = await computeSignature(BODY, SECRET);
    const tamperedBody = JSON.stringify({ meta: { event_name: "order_refunded" }, data: { id: "1" } });
    const result = await verifyWebhookSignature(tamperedBody, SECRET, signature);
    expect(result).toBe(false);
  });

  it("should return false when signed with a different secret", async () => {
    const wrongSig = await computeSignature(BODY, "wrong-secret");
    const result = await verifyWebhookSignature(BODY, SECRET, wrongSig);
    expect(result).toBe(false);
  });

  it("should return false for an empty signature", async () => {
    const result = await verifyWebhookSignature(BODY, SECRET, "");
    expect(result).toBe(false);
  });

  it("should handle an empty body", async () => {
    const signature = await computeSignature("", SECRET);
    const result = await verifyWebhookSignature("", SECRET, signature);
    expect(result).toBe(true);
  });
});
