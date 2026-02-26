import { describe, expect, it } from "bun:test";
import {
  camelToUnderscore,
  convertIncludeToQueryString,
  convertKeys,
  convertListParamsToQueryString,
  generateDiscount,
  getKV,
  isObject,
  requiredCheck,
  setKV,
} from "../../src/internal";
import { type Config } from "../../src/internal/setup/types";

describe("Test isObject", () => {
  it("String is not an object type", () => {
    expect(isObject("test")).toBeFalse();
  });
  it("Number is not an object type", () => {
    expect(isObject(1)).toBeFalse();
  });
  it("Boolean is not an object type", () => {
    expect(isObject(true)).toBeFalse();
  });
  it("null is not an object type", () => {
    expect(isObject(null)).toBeFalse();
  });
  it("undefined is not an object type", () => {
    expect(isObject(undefined)).toBeFalse();
  });
  it("symbol is not an object type", () => {
    expect(isObject(Symbol("test"))).toBeFalse();
  });
  it("Array is not an object type", () => {
    expect(isObject([1])).toBeFalse();
  });
  it("Function is not an object type", () => {
    expect(isObject(() => {})).toBeFalse();
  });
  it("Date is not an object type", () => {
    expect(isObject(new Date())).toBeFalse();
  });
  it("RegExp is not an object type", () => {
    expect(isObject(/(?:)/)).toBeFalse();
  });
  it("Map is not an object type", () => {
    expect(isObject(new Map())).toBeFalse();
  });
  it("Set is not an object type", () => {
    expect(isObject(new Set())).toBeFalse();
  });
  it("Object is an object type", () => {
    expect(isObject(new Object())).toBeTrue();
  });
  it("Object is an object type", () => {
    expect(isObject({})).toBeTrue();
  });
});

describe("Test KV", () => {
  const config = { apiKey: "0123456789" };
  const key = "Store";

  it("Set value successfully", () => {
    expect(getKV(key)).toBeUndefined();

    setKV(key, config);
    expect(getKV<Config>(key)).toEqual(config);
  });

  it("Get value successfully", () => {
    const _config = getKV<Config>(key);
    expect(_config).toEqual(config);
    expect(_config.apiKey).toEqual(config.apiKey);
  });
});

describe("Test camelToUnderscore", () => {
  it("Convert camel to underscore successfully", () => {
    expect(camelToUnderscore("storeId")).toEqual("store_id");
  });

  it("Convert no camel to no camel successfully", () => {
    expect(camelToUnderscore("store")).toEqual("store");
  });

  it("Convert camel to camel successfully", () => {
    expect(camelToUnderscore("store_id")).toEqual("store_id");
  });
});

describe("convertKeys", () => {
  it("converts camelCase keys to snake_case", () => {
    expect(convertKeys({ storeId: 1, variantId: 2 })).toEqual({
      store_id: 1,
      variant_id: 2,
    });
  });

  it("recursively converts nested object keys", () => {
    expect(convertKeys({ checkoutData: { customerEmail: "a@b.com" } })).toEqual({
      checkout_data: { customer_email: "a@b.com" },
    });
  });

  it("excludes keys whose value equals the excludedValue (default: undefined)", () => {
    const result = convertKeys({ storeId: 1, variantId: undefined });
    expect(result).toEqual({ store_id: 1 });
    expect("variant_id" in result).toBeFalse();
  });

  it("allows a custom excludedValue", () => {
    const result = convertKeys({ storeId: 1, variantId: null }, null);
    expect(result).toEqual({ store_id: 1 });
    expect("variant_id" in result).toBeFalse();
  });

  it("passes non-object values through unchanged", () => {
    expect(convertKeys({ count: 42, flag: true, label: "hi" })).toEqual({
      count: 42,
      flag: true,
      label: "hi",
    });
  });
});

describe("convertIncludeToQueryString", () => {
  it("returns an empty string for undefined", () => {
    expect(convertIncludeToQueryString(undefined)).toBe("");
  });

  it("returns an empty string for an empty array", () => {
    expect(convertIncludeToQueryString([])).toBe("");
  });

  it("returns a query string for a single include value", () => {
    expect(convertIncludeToQueryString(["store"])).toBe("?include=store");
  });

  it("joins multiple values with commas", () => {
    const qs = convertIncludeToQueryString(["store", "variant"]);
    expect(qs).toBe("?include=store%2Cvariant");
  });

  it("percent-encodes special characters", () => {
    const qs = convertIncludeToQueryString(["store&evil=1"]);
    expect(qs).not.toContain("&evil=1");
    expect(qs).toContain("%26");
  });
});

describe("convertListParamsToQueryString", () => {
  it("returns an empty string for empty params", () => {
    expect(convertListParamsToQueryString({})).toBe("");
  });

  it("includes filter params as filter[key]=value", () => {
    const qs = convertListParamsToQueryString({ filter: { storeId: "1" } });
    expect(qs).toContain("filter%5Bstore_id%5D=1");
  });

  it("includes page params", () => {
    const qs = convertListParamsToQueryString({ page: { number: 2, size: 10 } });
    expect(qs).toContain("page%5Bnumber%5D=2");
    expect(qs).toContain("page%5Bsize%5D=10");
  });

  it("includes include param as a comma-separated string", () => {
    const qs = convertListParamsToQueryString({ include: ["store", "variant"] });
    expect(qs).toContain("include=store%2Cvariant");
  });
});

describe("requiredCheck", () => {
  it("does not throw when all values are present", () => {
    expect(() => requiredCheck({ storeId: "1", variantId: "2" })).not.toThrow();
  });

  it("throws when a value is an empty string", () => {
    expect(() => requiredCheck({ storeId: "" })).toThrow("storeId");
  });

  it("throws when a value is undefined", () => {
    expect(() => requiredCheck({ storeId: undefined })).toThrow("storeId");
  });

  it("throws when a value is null", () => {
    expect(() => requiredCheck({ storeId: null })).toThrow("storeId");
  });

  it("throws when a value is 0", () => {
    expect(() => requiredCheck({ count: 0 })).toThrow("count");
  });

  it("includes the parameter name in the error message", () => {
    expect(() => requiredCheck({ webhookId: "" })).toThrow(
      "Please provide the required parameter: webhookId."
    );
  });
});

describe("generateDiscount", () => {
  it("returns an 8-character string", () => {
    expect(generateDiscount().length).toBe(8);
  });

  it("returns only uppercase alphanumeric characters", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateDiscount()).toMatch(/^[A-Z0-9]+$/);
    }
  });

  it("returns different values on successive calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateDiscount()));
    // 50 calls should produce at least 45 unique codes
    expect(codes.size).toBeGreaterThan(45);
  });
});
