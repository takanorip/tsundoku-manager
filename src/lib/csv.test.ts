import { describe, expect, it } from "vitest";
import { csvToBooks, isBookOrder, isOrderHistoryCsv, parseCsv, summarizeCsv } from "./csv";

describe("csv", () => {
  it("parses quoted commas", () => {
    expect(parseCsv('title,authors\n"Hello, World","A, B"')).toEqual([
      ["title", "authors"],
      ["Hello, World", "A, B"],
    ]);
  });

  it("imports Amazon Japan order history headers", () => {
    const csv = [
      "注文日,注文番号,商品名,価格,製品コード（ASIN/ISBN）",
      "2024/03/12,249-1,リーダブルコード,2640,4873115655",
    ].join("\n");

    const rows = csvToBooks(csv, "AMAZON");
    expect(rows).toHaveLength(1);
    expect(rows[0].skipped).toBe(false);
    expect(rows[0].book.title).toBe("リーダブルコード");
    expect(rows[0].book.isbn13).toBe("9784873115658");
    expect(rows[0].book.source).toBe("AMAZON");
    expect(rows[0].book.price).toBe(2640);
    expect(rows[0].book.purchaseDate).toBe("2024-03-12");
  });

  it("skips rows without title or ISBN", () => {
    const csv = "authors,isbn\n誰か,";
    const rows = csvToBooks(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].skipped).toBe(true);
  });

  it("keeps a simple book list without order-history columns", () => {
    const csv = "title,isbn\n手入力の本,";
    const rows = csvToBooks(csv);
    expect(rows[0].skipped).toBe(false);
    expect(rows[0].book.title).toBe("手入力の本");
  });
});

describe("book-only order history", () => {
  const mixed = [
    "注文日,注文番号,商品名,価格,商品のカテゴリー,製品コード（ASIN/ISBN）",
    "2024/03/12,249-1,リーダブルコード,2640,本,4873115655",
    "2024/03/13,249-2,Echo Dot,6980,家電＆カメラ,B09B8VGCR8",
    "2024/03/14,249-3,思考の整理学 (Kindle版),825,Kindle本,B00ABCDE12",
    "2024/03/15,249-4,コーヒー豆 200g,1280,食品・飲料・お酒,B07COFFEE1",
    "2024/03/16,249-5,四畳半神話大系,616,本,404387801X",
  ].join("\n");

  it("detects Amazon order history reports", () => {
    expect(isOrderHistoryCsv(["注文日", "注文番号", "商品名", "製品コード（ASIN/ISBN）"])).toBe(true);
    expect(isOrderHistoryCsv(["title", "isbn"])).toBe(false);
  });

  it("treats ISBN and book categories as books", () => {
    expect(isBookOrder({ title: "リーダブルコード", isbn: "4873115655" })).toBe(true);
    expect(isBookOrder({ title: "何か", category: "Kindle本", asin: "B00ABCDE12" })).toBe(true);
    expect(isBookOrder({ title: "Echo Dot", category: "家電＆カメラ", asin: "B09B8VGCR8" })).toBe(false);
  });

  it("reads only book orders from a mixed Amazon CSV", () => {
    const rows = csvToBooks(mixed, "AMAZON");
    const stats = summarizeCsv(rows);
    expect(stats.total).toBe(5);
    expect(stats.books).toBe(3);
    expect(stats.nonBooks).toBe(2);

    const imported = rows.filter((row) => !row.skipped).map((row) => row.book.title);
    expect(imported).toEqual(["リーダブルコード", "思考の整理学 (Kindle版)", "四畳半神話大系"]);
    expect(rows.find((row) => row.book.title === "思考の整理学 (Kindle版)")?.book.source).toBe("KINDLE");
    expect(rows.find((row) => row.book.title === "Echo Dot")?.reason).toBe("本以外の注文です");
  });

  it("reads English Retail.OrderHistory columns", () => {
    const csv = [
      "Order Date,Order ID,Product Name,Category,ASIN,Unit Price",
      "2024-03-12,111-1,Clean Code,Books,0132350882,4000",
      "2024-03-13,111-2,AirPods Pro,Electronics,B0D1X6BGB4,38000",
    ].join("\n");
    const rows = csvToBooks(csv);
    expect(rows.filter((row) => !row.skipped)).toHaveLength(1);
    expect(rows[0].book.title).toBe("Clean Code");
    expect(rows[0].book.isbn13).toBe("9780132350884");
    expect(rows[1].skipped).toBe(true);
  });
});
