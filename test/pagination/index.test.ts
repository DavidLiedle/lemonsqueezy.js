import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { lemonSqueezySetup, listOrders, paginate } from "../../src";

// ---------------------------------------------------------------------------
// Minimal fetch mock helpers
// ---------------------------------------------------------------------------

type MockPage = {
  items: unknown[];
  currentPage: number;
  lastPage: number;
};

let originalFetch: typeof fetch;

function mockPaginatedFetch(pages: MockPage[]) {
  originalFetch = global.fetch;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = async (_url: string) => {
    const url = new URL(_url);
    const pageNumber = Number(url.searchParams.get("page[number]") ?? 1);
    const page = pages[pageNumber - 1] ?? pages[pages.length - 1];

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        jsonapi: { version: "1.0" },
        links: { first: "/v1/orders?page[number]=1", last: `/v1/orders?page[number]=${page.lastPage}` },
        meta: {
          page: {
            currentPage: page.currentPage,
            from: 1,
            lastPage: page.lastPage,
            perPage: page.items.length,
            to: page.items.length,
            total: pages.flatMap((p) => p.items).length,
          },
        },
        data: page.items,
      }),
    };
  };
}

function restoreFetch() {
  if (originalFetch) global.fetch = originalFetch;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  lemonSqueezySetup({ apiKey: "test-api-key" });
});

afterEach(() => {
  restoreFetch();
});

describe("paginate", () => {
  it("yields a single page when there is only one page", async () => {
    const items = [{ id: "1" }, { id: "2" }];
    mockPaginatedFetch([{ items, currentPage: 1, lastPage: 1 }]);

    const pages: unknown[][] = [];
    for await (const page of paginate(listOrders)) {
      pages.push(page);
    }

    expect(pages.length).toBe(1);
    expect(pages[0]).toEqual(items);
  });

  it("yields all pages when there are multiple pages", async () => {
    const page1 = [{ id: "1" }, { id: "2" }];
    const page2 = [{ id: "3" }, { id: "4" }];
    const page3 = [{ id: "5" }];

    mockPaginatedFetch([
      { items: page1, currentPage: 1, lastPage: 3 },
      { items: page2, currentPage: 2, lastPage: 3 },
      { items: page3, currentPage: 3, lastPage: 3 },
    ]);

    const pages: unknown[][] = [];
    for await (const page of paginate(listOrders)) {
      pages.push(page);
    }

    expect(pages.length).toBe(3);
    expect(pages[0]).toEqual(page1);
    expect(pages[1]).toEqual(page2);
    expect(pages[2]).toEqual(page3);
  });

  it("collects all items across pages with spread", async () => {
    const page1 = [{ id: "1" }, { id: "2" }];
    const page2 = [{ id: "3" }];

    mockPaginatedFetch([
      { items: page1, currentPage: 1, lastPage: 2 },
      { items: page2, currentPage: 2, lastPage: 2 },
    ]);

    const all: unknown[] = [];
    for await (const page of paginate(listOrders)) {
      all.push(...page);
    }

    expect(all).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
  });

  it("stops early when fetch returns an error", async () => {
    originalFetch = global.fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ errors: [{ title: "Unauthorized" }] }),
    });

    const pages: unknown[][] = [];
    for await (const page of paginate(listOrders)) {
      pages.push(page);
    }

    expect(pages.length).toBe(0);
  });

  it("accepts list-function-specific filter params", async () => {
    const items = [{ id: "10" }];
    mockPaginatedFetch([{ items, currentPage: 1, lastPage: 1 }]);

    const pages: unknown[][] = [];
    // TypeScript should accept filter.storeId since listOrders supports it
    for await (const page of paginate(listOrders, { filter: { storeId: "42" } })) {
      pages.push(page);
    }

    expect(pages.length).toBe(1);
    expect(pages[0]).toEqual(items);
  });

  it("respects a custom page size", async () => {
    let capturedUrl = "";
    originalFetch = global.fetch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          jsonapi: { version: "1.0" },
          links: { first: "/", last: "/" },
          meta: { page: { currentPage: 1, from: 1, lastPage: 1, perPage: 5, to: 5, total: 5 } },
          data: [],
        }),
      };
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of paginate(listOrders, { page: { size: 5 } })) { /* drain */ }

    expect(new URL(capturedUrl).searchParams.get("page[size]")).toBe("5");
  });
});
