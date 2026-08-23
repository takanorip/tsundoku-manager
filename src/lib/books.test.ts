import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createBook,
  createBooksBulk,
  deleteBook,
  DuplicateBookError,
  getBook,
  getStats,
  listBooks,
  resetShelfForTests,
  updateBook,
} from "./books";

afterEach(async () => {
  await resetShelfForTests({ seed: false });
});

describe("indexeddb bookshelf", () => {
  it("seeds sample books on first open", async () => {
    const books = await listBooks();
    expect(books.length).toBeGreaterThan(0);
    expect(books.some((book) => book.title === "リーダブルコード")).toBe(true);
  });

  it("creates, updates, and deletes a book", async () => {
    await resetShelfForTests({ seed: false });
    const created = await createBook({
      title: "テストの本",
      authors: ["著者"],
      status: "UNREAD",
      source: "MANUAL",
    });
    expect(created.id).toBeTruthy();
    expect((await listBooks()).map((book) => book.title)).toContain("テストの本");

    const updated = await updateBook(created.id, { status: "READING", currentPage: 12 });
    expect(updated.status).toBe("READING");
    expect(updated.currentPage).toBe(12);
    expect(updated.startedAt).toBeTruthy();

    await deleteBook(created.id);
    expect(await getBook(created.id)).toBeNull();
  });

  it("rejects a duplicate ISBN", async () => {
    await resetShelfForTests({ seed: false });
    await createBook({ title: "一冊目", isbn13: "9784873115658" });
    await expect(createBook({ title: "二冊目", isbn13: "978-4-87311-565-8" })).rejects.toBeInstanceOf(
      DuplicateBookError,
    );
  });

  it("skips duplicates in bulk import", async () => {
    await resetShelfForTests({ seed: false });
    const result = await createBooksBulk(
      [
        { title: "一冊目", isbn13: "9784873115658" },
        { title: "重複", isbn13: "9784873115658" },
        { title: "" },
      ],
      true,
    );
    expect(result.created).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
  });

  it("calculates stats from stored books", async () => {
    await resetShelfForTests({ seed: false });
    await createBook({ title: "積読", status: "UNREAD", pageCount: 100 });
    await createBook({ title: "読了", status: "FINISHED" });
    const stats = await getStats();
    expect(stats.total).toBe(2);
    expect(stats.unread).toBe(1);
    expect(stats.finished).toBe(1);
    expect(stats.unreadPages).toBe(100);
  });
});
