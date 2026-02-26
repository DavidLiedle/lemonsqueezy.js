import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { lemonSqueezySetup } from "../../src";
import { $fetch } from "../../src/internal";
import { mockFetch } from "../utils/mock-fetch";

const StoreId = import.meta.env.LEMON_SQUEEZY_STORE_ID;
beforeAll(() => {
  lemonSqueezySetup({
    apiKey: import.meta.env.LEMON_SQUEEZY_API_KEY,
  });
});

describe("$fetch test", () => {
  it("Should call success", async () => {
    const { error, data, statusCode } = await $fetch({ path: "/v1/users/me" });
    expect(statusCode).toEqual(200);
    expect(data).toBeDefined();
    expect(error).toBeNull();
  });

  it("Should return an error that the Lemon Squeezy API key was not provided", async () => {
    lemonSqueezySetup({ apiKey: "" });
    const { error, statusCode } = await $fetch({ path: "/v1/user/me" });
    expect(statusCode).toBeNull();
    expect(error?.message).toMatch("Lemon Squeezy API");
  });

  it("The configured `onError` method should be executed", async () => {
    lemonSqueezySetup({
      apiKey: "",
      onError(error) {
        expect(error.message).toMatch("Lemon Squeezy API");
      },
    });
    const { error, data, statusCode } = await $fetch({ path: "/v1/user/me" });
    expect(data).toBeNull();
    expect(statusCode).toBeNull();
    expect(error?.message).toMatch("Lemon Squeezy API");
  });

  it("Should return a Lemon Squeezy API error", async () => {
    lemonSqueezySetup({ apiKey: "0123456789" });
    const { error, statusCode } = await $fetch({ path: "/v1/user/me" });
    expect(statusCode).toEqual(404);
    expect(error).toBeDefined();
    expect(error?.cause).toBeArray();
  });

  it("Should be called successfully with the query parameter", async () => {
    lemonSqueezySetup({
      apiKey: import.meta.env.LEMON_SQUEEZY_API_KEY,
    });
    const { error, data, statusCode } = await $fetch({
      path: "/v1/products",
      query: {
        "filter[store_id]": StoreId,
      },
    });

    expect(data).toBeDefined();
    expect(statusCode).toEqual(200);
    expect(error).toBeNull();
  });

  it("Should be called successfully with the body parameter", async () => {
    const {
      statusCode,
      error,
      data: _data,
    } = await $fetch({
      path: "/v1/webhooks",
      method: "POST",
      body: {
        data: {
          type: "webhooks",
          attributes: {
            url: "https://google.com/webhooks",
            events: ["subscription_created", "subscription_cancelled"],
            secret: "SUBSCRIPTION_SECRET",
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: StoreId.toString(),
              },
            },
          },
        },
      },
    });
    expect(statusCode).toEqual(201);
    expect(error).toBeNull();
    expect(_data).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Offline tests — use mock-fetch, no API credentials required
// ---------------------------------------------------------------------------

describe("$fetch offline (mocked)", () => {
  let spy: ReturnType<typeof mockFetch>;

  afterEach(() => {
    spy?.restore();
    // Restore a valid key so subsequent tests aren't affected
    lemonSqueezySetup({ apiKey: "test-key" });
  });

  it("returns data and null error on a 2xx response", async () => {
    const responseBody = { data: { id: "1", type: "orders" } };
    spy = mockFetch({ status: 200, body: responseBody });

    lemonSqueezySetup({ apiKey: "test-key" });
    const { data, error, statusCode } = await $fetch({ path: "/v1/orders" });

    expect(statusCode).toBe(200);
    expect(data).toEqual(responseBody);
    expect(error).toBeNull();
  });

  it("returns an error and preserves statusCode on a 4xx response", async () => {
    spy = mockFetch({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      body: { errors: [{ title: "Invalid attribute", detail: "storeId is required" }] },
    });

    lemonSqueezySetup({ apiKey: "test-key" });
    const { data, error, statusCode } = await $fetch({ path: "/v1/checkouts" });

    expect(statusCode).toBe(422);
    expect(error).not.toBeNull();
    expect(error?.name).toBe("Lemon Squeezy Error");
    expect(data).toBeDefined();
  });

  it("invokes onError with the error on a failed response", async () => {
    spy = mockFetch({ ok: false, status: 500, statusText: "Internal Server Error", body: {} });

    let capturedError: Error | null = null;
    lemonSqueezySetup({
      apiKey: "test-key",
      onError: (e) => { capturedError = e; },
    });

    await $fetch({ path: "/v1/orders" });

    expect(capturedError).not.toBeNull();
    expect((capturedError as unknown as Error).name).toBe("Lemon Squeezy Error");
  });

  it("attaches the Authorization header when an API key is set", async () => {
    spy = mockFetch({ status: 200, body: {} });

    lemonSqueezySetup({ apiKey: "my-secret-key" });
    await $fetch({ path: "/v1/orders" });

    const authHeader = (spy.calls[0].options.headers as Headers).get("Authorization");
    expect(authHeader).toBe("Bearer my-secret-key");
  });

  it("serialises the body as JSON for POST requests", async () => {
    spy = mockFetch({ status: 201, body: {} });

    lemonSqueezySetup({ apiKey: "test-key" });
    const payload = { data: { type: "checkouts", attributes: { test: true } } };
    await $fetch({ path: "/v1/checkouts", method: "POST", body: payload });

    expect(spy.calls[0].options.body).toBe(JSON.stringify(payload));
  });

  it("returns an error (no status) when fetch itself throws a network error", async () => {
    const originalFetch = global.fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = async () => { throw new Error("Network error"); };

    lemonSqueezySetup({ apiKey: "test-key" });
    const { error, statusCode, data } = await $fetch({ path: "/v1/orders" });

    global.fetch = originalFetch;

    expect(statusCode).toBeNull();
    expect(data).toBeNull();
    expect(error?.message).toBe("Network error");
  });
});
