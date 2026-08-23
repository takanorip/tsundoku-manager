import { describe, expect, it } from "vitest";
import { extractAmazonAsin, parseEcUrl } from "./ec";

describe("ec url parsing", () => {
  it("extracts Amazon ASIN and converts book ASIN to ISBN-13", () => {
    const parsed = parseEcUrl("https://www.amazon.co.jp/dp/4873115655?ref=abc");
    expect(parsed?.source).toBe("AMAZON");
    expect(parsed?.asin).toBe("4873115655");
    expect(parsed?.isbn13).toBe("9784873115658");
  });

  it("supports gp/product URLs", () => {
    expect(extractAmazonAsin("https://www.amazon.co.jp/gp/product/B0ABCDEFGH")).toBe(
      "B0ABCDEFGH",
    );
  });

  it("parses Rakuten Books URLs", () => {
    const parsed = parseEcUrl("https://books.rakuten.co.jp/rb/12345678/?isbn=9784873115658");
    expect(parsed?.source).toBe("RAKUTEN");
    expect(parsed?.rakutenItemCode).toBe("12345678");
    expect(parsed?.isbn13).toBe("9784873115658");
  });

  it("returns OTHER for unknown shops if ISBN is present", () => {
    const parsed = parseEcUrl("https://example.com/book/9784873115658");
    expect(parsed?.source).toBe("OTHER");
    expect(parsed?.isbn13).toBe("9784873115658");
  });

  it("returns null for invalid URLs", () => {
    expect(parseEcUrl("not a url")).toBeNull();
  });
});
