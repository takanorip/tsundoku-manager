import { describe, expect, it } from "vitest";
import { coverCandidates, isTinyCover } from "./covers";

describe("coverCandidates", () => {
  it("keeps an explicit cover and adds ISBN fallbacks", () => {
    const urls = coverCandidates({
      coverUrl: "https://example.com/cover.jpg",
      isbn13: "978-4-87311-565-8",
    });
    expect(urls[0]).toBe("https://example.com/cover.jpg");
    expect(urls).toContain("https://cover.openbd.jp/9784873115658.jpg");
    expect(urls).toContain("https://img.hanmoto.com/bd/img/9784873115658.jpg");
    expect(urls).toContain("https://images-na.ssl-images-amazon.com/images/P/4873115655.09.LZZZZZZZ.jpg");
  });

  it("returns nothing without a cover or ISBN", () => {
    expect(coverCandidates({})).toEqual([]);
  });

  it("rejects 1x1 Amazon placeholders", () => {
    expect(isTinyCover(1, 1)).toBe(true);
    expect(isTinyCover(352, 500)).toBe(false);
  });
});
