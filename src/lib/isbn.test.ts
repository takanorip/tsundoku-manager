import { describe, expect, it } from "vitest";
import {
  detectIsbn,
  hyphenateIsbn13,
  isbn10To13,
  isbn13To10,
  isIsbn10,
  isIsbn13,
  normalizeIsbn,
  toIsbn13,
} from "./isbn";

describe("isbn", () => {
  it("normalizes hyphens and spaces", () => {
    expect(normalizeIsbn("978-4-87311-565-8")).toBe("9784873115658");
    expect(normalizeIsbn("4 87311 565 5")).toBe("4873115655");
  });

  it("validates ISBN-10 and ISBN-13 check digits", () => {
    expect(isIsbn10("4873115655")).toBe(true);
    expect(isIsbn10("4873115650")).toBe(false);
    expect(isIsbn13("9784873115658")).toBe(true);
    expect(isIsbn13("9784873115650")).toBe(false);
  });

  it("converts ISBN-10 to ISBN-13 and back", () => {
    expect(isbn10To13("4873115655")).toBe("9784873115658");
    expect(isbn13To10("9784873115658")).toBe("4873115655");
    expect(toIsbn13("4873115655")).toBe("9784873115658");
  });

  it("accepts ISBN-10 ending with X", () => {
    expect(isIsbn10("080442957X")).toBe(true);
    expect(isbn10To13("080442957X")).toBe("9780804429573");
  });

  it("detects ISBN from messy text", () => {
    expect(detectIsbn("ISBN978-4-87311-565-8 リーダブルコード")).toBe("9784873115658");
    expect(detectIsbn("ASIN: 4873115655")).toBe("9784873115658");
  });

  it("hyphenates ISBN-13", () => {
    expect(hyphenateIsbn13("9784873115658")).toMatch(/^978-/);
  });
});
