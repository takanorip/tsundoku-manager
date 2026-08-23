import { describe, expect, it } from "vitest";
import { decodeCsvBuffer } from "./encoding";

const SHIFT_JIS_ORDER_CSV = Uint8Array.from([
  146, 141, 149, 182, 147, 250, 44, 143, 164, 149, 105, 150, 188, 44, 143, 164, 149, 105, 130, 204, 131,
  74, 131, 101, 131, 83, 131, 138, 129, 91, 44, 144, 187, 149, 105, 131, 82, 129, 91, 131, 104, 129, 105,
  65, 83, 73, 78, 47, 73, 83, 66, 78, 129, 106, 10, 50, 48, 50, 52, 47, 48, 49, 47, 48, 49, 44, 131, 138,
  129, 91, 131, 95, 131, 117, 131, 139, 131, 82, 129, 91, 131, 104, 44, 150, 123, 44, 52, 56, 55, 51, 49,
  49, 53, 54, 53, 53,
]);

describe("csv encoding", () => {
  it("keeps UTF-8 Amazon headers", () => {
    const text = "注文日,商品名,製品コード（ASIN/ISBN）\n2024/01/01,本,4873115655";
    expect(decodeCsvBuffer(new TextEncoder().encode(text))).toContain("商品名");
  });

  it("decodes Shift-JIS order history reports", () => {
    const decoded = decodeCsvBuffer(SHIFT_JIS_ORDER_CSV);
    expect(decoded).toContain("商品名");
    expect(decoded).toContain("リーダブルコード");
    expect(decoded).toContain("商品のカテゴリー");
  });
});
