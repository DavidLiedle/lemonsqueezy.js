import {
  $fetch,
  convertIncludeToQueryString,
  convertKeys,
  convertListParamsToQueryString,
  requiredCheck,
} from "../internal";
import type {
  GetWebhookParams,
  ListWebhooks,
  ListWebhooksParams,
  NewWebhook,
  UpdateWebhook,
  Webhook,
} from "./types";

/**
 * Create a webhook.
 *
 * @param storeId The store id.
 * @param webhook a new webhook info.
 * @returns A webhook object.
 */
export function createWebhook(storeId: number | string, webhook: NewWebhook) {
  requiredCheck({ storeId });

  const { url, events, secret, testMode } = webhook;

  return $fetch<Webhook>({
    path: "/v1/webhooks",
    method: "POST",
    body: {
      data: {
        type: "webhooks",
        attributes: convertKeys({
          url,
          events,
          secret,
          testMode,
        }),
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId.toString(),
            },
          },
        },
      },
    },
  });
}

/**
 * Retrieve a webhook.
 *
 * @param webhookId The given webhook id.
 * @param [params] (Optional) Additional parameters.
 * @param [params.include] (Optional) Related resources.
 * @returns A webhook object.
 */
export function getWebhook(
  webhookId: number | string,
  params: GetWebhookParams = {}
) {
  requiredCheck({ webhookId });
  return $fetch<Webhook>({
    path: `/v1/webhooks/${webhookId}${convertIncludeToQueryString(params.include)}`,
  });
}

/**
 * Update a webhook.
 *
 * @param webhookId The webhook id.
 * @param webhook The webhook info you want to update.
 * @returns A webhook object.
 */
export function updateWebhook(
  webhookId: number | string,
  webhook: UpdateWebhook
) {
  requiredCheck({ webhookId });

  const { url, events, secret } = webhook;

  return $fetch<Webhook>({
    path: `/v1/webhooks/${webhookId}`,
    method: "PATCH",
    body: {
      data: {
        id: webhookId.toString(),
        type: "webhooks",
        attributes: convertKeys({
          url,
          events,
          secret,
        }),
      },
    },
  });
}

/**
 * Delete a webhook.
 *
 * @param webhookId The webhook id.
 * @returns A `204` status code and `No Content` response on success.
 */
export function deleteWebhook(webhookId: number | string) {
  requiredCheck({ webhookId });
  return $fetch<null>({
    path: `/v1/webhooks/${webhookId}`,
    method: "DELETE",
  });
}

/**
 * List all webhooks.
 *
 * @param [params] (Optional) Additional parameters.
 * @param [params.filter] (Optional) Filter parameters.
 * @param [params.filter.storeId] (Optional) Only return webhooks belonging to the store with this ID.
 * @param [params.page] (Optional) Custom paginated queries.
 * @param [params.page.number] (Optional) The parameter determine which page to retrieve.
 * @param [params.page.size] (Optional) The parameter to determine how many results to return per page.
 * @param [params.include] (Optional) Related resources.
 * @returns A paginated list of webhook objects ordered by `created_at`.
 */
export function listWebhooks(params: ListWebhooksParams = {}) {
  return $fetch<ListWebhooks>({
    path: `/v1/webhooks${convertListParamsToQueryString(params)}`,
  });
}

/**
 * Verify the signature of an incoming Lemon Squeezy webhook request.
 *
 * Lemon Squeezy signs each webhook payload with HMAC-SHA256 using the secret
 * set when the webhook was created. The resulting hex digest is sent in the
 * `X-Signature` request header.
 *
 * Always verify webhook signatures before processing the payload to ensure
 * the request genuinely originated from Lemon Squeezy.
 *
 * @param rawBody The raw UTF-8 request body string (before any JSON parsing).
 * @param secret The webhook signing secret set when the webhook was created.
 * @param signature The value of the `X-Signature` header from the incoming request.
 * @returns `true` if the signature is valid, `false` otherwise.
 *
 * @see https://docs.lemonsqueezy.com/help/webhooks#signing-requests
 *
 * @example
 * ```ts
 * // Express
 * app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
 *   const valid = await verifyWebhookSignature(
 *     req.body.toString(),
 *     process.env.WEBHOOK_SECRET,
 *     req.headers['x-signature']
 *   );
 *   if (!valid) return res.status(400).send('Invalid signature');
 *   // process req.body ...
 * });
 * ```
 */
export async function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );
  const digest = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (digest.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < digest.length; i++) {
    mismatch |= digest.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
