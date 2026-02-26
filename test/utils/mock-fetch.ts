/**
 * Lightweight fetch mock for unit tests.
 *
 * Replaces global.fetch for the duration of a test and returns a spy object
 * that records every call made. Call `spy.restore()` in afterEach to put the
 * real fetch back.
 *
 * @example
 * ```ts
 * const spy = mockFetch({ status: 200, body: { data: [] } });
 * // ... call code under test ...
 * expect(spy.calls[0].url).toContain('/v1/orders');
 * spy.restore();
 * ```
 *
 * Pass an array to return different responses for successive calls:
 * ```ts
 * const spy = mockFetch([
 *   { status: 200, body: page1 },
 *   { status: 200, body: page2 },
 * ]);
 * ```
 */

export type MockResponse = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  /** The value that response.json() will resolve to. */
  body?: unknown;
};

export type FetchSpy = {
  /** Every call recorded as { url, options }. */
  calls: Array<{ url: string; options: RequestInit }>;
  /** Restore global.fetch to its original value. */
  restore: () => void;
};

export function mockFetch(response: MockResponse | MockResponse[]): FetchSpy {
  const originalFetch = global.fetch;
  const calls: Array<{ url: string; options: RequestInit }> = [];
  let callIndex = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = async (url: string, options: RequestInit = {}) => {
    calls.push({ url, options });

    const r = Array.isArray(response)
      ? (response[callIndex++] ?? response[response.length - 1])
      : response;

    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      statusText: r.statusText ?? "OK",
      json: async () => r.body ?? {},
    };
  };

  return {
    calls,
    restore: () => {
      global.fetch = originalFetch;
    },
  };
}
