/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FetchResponse } from "../internal/fetch/types";

type PaginatedResponse<D> = {
  data: D[];
  meta: {
    page: {
      currentPage: number;
      lastPage: number;
    };
  };
};

type ExtractData<F> = F extends (
  ...args: any[]
) => Promise<FetchResponse<PaginatedResponse<infer D>>>
  ? D
  : never;

type ExtractParams<F> = F extends (params?: infer P) => any ? P : never;

/**
 * Iterate through all pages of a Lemon Squeezy list endpoint.
 *
 * Automatically increments `page.number` on each iteration and stops when
 * the last page is reached or an error is returned. All other parameters
 * (filters, includes, page size) are forwarded unchanged on every request.
 *
 * @param fn A list function (e.g. `listOrders`, `listSubscriptions`).
 * @param params Optional parameters to pass to the list function.
 *   The `page.number` field is managed internally and should not be set here.
 * @yields An array of resource items for each page.
 *
 * @example
 * ```ts
 * // Collect all orders for a store across all pages
 * const allOrders = [];
 * for await (const page of paginate(listOrders, { filter: { storeId: '123' } })) {
 *   allOrders.push(...page);
 * }
 * ```
 *
 * @example
 * ```ts
 * // Control page size
 * for await (const page of paginate(listSubscriptions, { page: { size: 100 } })) {
 *   for (const subscription of page) {
 *     console.log(subscription.id);
 *   }
 * }
 * ```
 */
export async function* paginate<
  F extends (...args: any[]) => Promise<FetchResponse<PaginatedResponse<any>>>,
>(
  fn: F,
  params?: Omit<NonNullable<ExtractParams<F>>, "page"> & {
    page?: { size?: number };
  }
): AsyncGenerator<ExtractData<F>[]> {
  let pageNumber = 1;

  while (true) {
    const { data, error } = await fn({
      ...(params as NonNullable<ExtractParams<F>>),
      page: { ...(params as any)?.page, number: pageNumber },
    });

    if (error || !data) break;

    yield data.data as ExtractData<F>[];

    if (pageNumber >= data.meta.page.lastPage) break;
    pageNumber++;
  }
}
