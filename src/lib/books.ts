import {
  deleteBookFromStore,
  getAllBooksFromStore,
  getBookFromStore,
  getMeta,
  putBookInStore,
  resetShelfDatabase,
  setMeta,
} from "./idb";
import { SAMPLE_BOOKS } from "./sample-books";
import { toIsbn10, toIsbn13 } from "./isbn";
import {
  isPurchaseSource,
  isReadingStatus,
  type Book,
  type BookInput,
  type PurchaseSource,
  type ReadingStatus,
  type Stats,
} from "./types";

export class DuplicateBookError extends Error {
  readonly book: Book;

  constructor(book: Book) {
    super("同じISBNの本がすでにあります");
    this.name = "DuplicateBookError";
    this.book = book;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function stampStatusDates(
  status: ReadingStatus,
  current?: { startedAt?: string | null; finishedAt?: string | null },
) {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "READING") {
    return { startedAt: current?.startedAt ?? today, finishedAt: current?.finishedAt ?? null };
  }
  if (status === "FINISHED") {
    return { startedAt: current?.startedAt ?? today, finishedAt: current?.finishedAt ?? today };
  }
  return {
    startedAt: current?.startedAt ?? null,
    finishedAt: status === "UNREAD" ? null : (current?.finishedAt ?? null),
  };
}

function toBook(input: BookInput, current?: Book): Book {
  const isbn13 = input.isbn13 ? toIsbn13(input.isbn13) : null;
  const isbn10 = input.isbn10 ? toIsbn10(input.isbn10) : isbn13 ? toIsbn10(isbn13) : null;
  const status = input.status ?? current?.status ?? "UNREAD";
  const dates = stampStatusDates(status, {
    startedAt: input.startedAt ?? current?.startedAt,
    finishedAt: input.finishedAt ?? current?.finishedAt,
  });

  return {
    id: current?.id ?? createId(),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    authors: input.authors ?? current?.authors ?? [],
    isbn10,
    isbn13,
    asin: input.asin?.trim() || isbn10,
    publisher: input.publisher?.trim() || null,
    publishedDate: input.publishedDate?.trim() || null,
    pageCount: input.pageCount ?? null,
    currentPage: input.currentPage ?? null,
    description: input.description?.trim() || null,
    coverUrl: input.coverUrl?.trim() || null,
    status,
    source: input.source ?? current?.source ?? "MANUAL",
    sourceUrl: input.sourceUrl?.trim() || null,
    purchaseDate: input.purchaseDate?.trim() || null,
    price: input.price ?? null,
    notes: input.notes?.trim() || null,
    rating: input.rating ?? null,
    tags: input.tags ?? current?.tags ?? [],
    startedAt: dates.startedAt,
    finishedAt: dates.finishedAt,
    createdAt: current?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

let seedPromise: Promise<void> | null = null;

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      if (await getMeta<boolean>("seeded")) return;
      const existing = await getAllBooksFromStore<Book>();
      if (existing.length === 0) {
        for (const book of SAMPLE_BOOKS) {
          await putBookInStore(book);
        }
      }
      await setMeta("seeded", true);
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

export type BookQuery = {
  status?: ReadingStatus | "ALL";
  source?: PurchaseSource | "ALL";
  q?: string;
  sort?: "added" | "title" | "unread" | "purchase";
};

export async function listBooks(query: BookQuery = {}): Promise<Book[]> {
  await ensureSeeded();
  let books = await getAllBooksFromStore<Book>();

  if (query.status && query.status !== "ALL") {
    books = books.filter((book) => book.status === query.status);
  }
  if (query.source && query.source !== "ALL") {
    books = books.filter((book) => book.source === query.source);
  }
  if (query.q?.trim()) {
    const needle = query.q.trim().toLowerCase();
    books = books.filter((book) =>
      [book.title, book.authors.join(" "), book.isbn13, book.isbn10, book.publisher]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }

  books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  switch (query.sort) {
    case "title":
      return books.sort((a, b) => a.title.localeCompare(b.title, "ja"));
    case "purchase":
      return books.sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
    case "unread":
      return books.sort((a, b) => {
        const aDate = a.purchaseDate ?? a.createdAt;
        const bDate = b.purchaseDate ?? b.createdAt;
        return aDate.localeCompare(bDate);
      });
    default:
      return books;
  }
}

export async function getBook(id: string): Promise<Book | null> {
  await ensureSeeded();
  return (await getBookFromStore<Book>(id)) ?? null;
}

export async function findByIsbn(isbn13: string): Promise<Book | null> {
  const normalized = toIsbn13(isbn13);
  if (!normalized) return null;
  const books = await getAllBooksFromStore<Book>();
  return books.find((book) => book.isbn13 === normalized) ?? null;
}

export async function createBook(input: BookInput): Promise<Book> {
  await ensureSeeded();
  if (!input.title.trim()) {
    throw new Error("タイトルは必須です");
  }
  const isbn13 = input.isbn13 ? toIsbn13(input.isbn13) : null;
  if (isbn13) {
    const existing = await findByIsbn(isbn13);
    if (existing) throw new DuplicateBookError(existing);
  }
  const book = toBook(input);
  await putBookInStore(book);
  return book;
}

export async function updateBook(id: string, input: Partial<BookInput>): Promise<Book> {
  await ensureSeeded();
  const current = await getBookFromStore<Book>(id);
  if (!current) throw new Error("本が見つかりません");

  const nextStatus = input.status ?? (isReadingStatus(current.status) ? current.status : "UNREAD");
  const merged: BookInput = {
    title: input.title ?? current.title,
    subtitle: input.subtitle ?? current.subtitle,
    authors: input.authors ?? current.authors,
    isbn10: input.isbn10 ?? current.isbn10,
    isbn13: input.isbn13 ?? current.isbn13,
    asin: input.asin ?? current.asin,
    publisher: input.publisher ?? current.publisher,
    publishedDate: input.publishedDate ?? current.publishedDate,
    pageCount: input.pageCount ?? current.pageCount,
    currentPage: input.currentPage ?? current.currentPage,
    description: input.description ?? current.description,
    coverUrl: input.coverUrl ?? current.coverUrl,
    status: nextStatus,
    source: input.source ?? (isPurchaseSource(current.source) ? current.source : "MANUAL"),
    sourceUrl: input.sourceUrl ?? current.sourceUrl,
    purchaseDate: input.purchaseDate ?? current.purchaseDate,
    price: input.price ?? current.price,
    notes: input.notes ?? current.notes,
    rating: input.rating ?? current.rating,
    tags: input.tags ?? current.tags,
    startedAt: input.startedAt ?? current.startedAt,
    finishedAt: input.finishedAt ?? current.finishedAt,
  };

  const nextIsbn = merged.isbn13 ? toIsbn13(merged.isbn13) : null;
  if (nextIsbn && nextIsbn !== current.isbn13) {
    const existing = await findByIsbn(nextIsbn);
    if (existing && existing.id !== id) throw new DuplicateBookError(existing);
  }

  const book = toBook(merged, current);
  await putBookInStore(book);
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  await ensureSeeded();
  await deleteBookFromStore(id);
}

export async function createBooksBulk(
  inputs: BookInput[],
  skipDuplicates = true,
): Promise<{ created: Book[]; skipped: BookInput[]; duplicates: Book[] }> {
  const created: Book[] = [];
  const skipped: BookInput[] = [];
  const duplicates: Book[] = [];

  for (const input of inputs) {
    if (!input.title?.trim()) {
      skipped.push(input);
      continue;
    }
    try {
      created.push(await createBook(input));
    } catch (error) {
      if (error instanceof DuplicateBookError) {
        duplicates.push(error.book);
        continue;
      }
      if (skipDuplicates) skipped.push(input);
      else throw error instanceof Error ? error : new Error(`登録に失敗しました: ${input.title}`);
    }
  }

  return { created, skipped, duplicates };
}

export async function getStats(): Promise<Stats> {
  const books = await listBooks();
  const unread = books.filter((book) => book.status === "UNREAD");
  const oldest = unread
    .map((book) => new Date(book.purchaseDate ?? book.createdAt).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b)[0];

  return {
    total: books.length,
    unread: unread.length,
    reading: books.filter((book) => book.status === "READING").length,
    finished: books.filter((book) => book.status === "FINISHED").length,
    paused: books.filter((book) => book.status === "PAUSED").length,
    abandoned: books.filter((book) => book.status === "ABANDONED").length,
    unreadPages: unread.reduce((sum, book) => sum + (book.pageCount ?? 0), 0),
    oldestUnreadDays: oldest ? Math.max(0, Math.floor((Date.now() - oldest) / 86_400_000)) : 0,
  };
}

export function booksToCsv(books: Book[]): string {
  const header = [
    "title",
    "authors",
    "isbn13",
    "isbn10",
    "asin",
    "publisher",
    "status",
    "source",
    "purchaseDate",
    "price",
    "url",
    "notes",
  ];
  const lines = books.map((book) =>
    [
      book.title,
      book.authors.join(" / "),
      book.isbn13 ?? "",
      book.isbn10 ?? "",
      book.asin ?? "",
      book.publisher ?? "",
      book.status,
      book.source,
      book.purchaseDate ?? "",
      book.price ?? "",
      book.sourceUrl ?? "",
      book.notes ?? "",
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportBooks(format: "json" | "csv") {
  const books = await listBooks();
  if (format === "csv") {
    downloadTextFile("tsundoku.csv", booksToCsv(books), "text/csv;charset=utf-8");
    return;
  }
  downloadTextFile("tsundoku.json", JSON.stringify({ books }, null, 2), "application/json");
}

export async function resetShelfForTests(options: { seed?: boolean } = {}) {
  seedPromise = null;
  await resetShelfDatabase();
  if (options.seed) {
    await ensureSeeded();
    return;
  }
  seedPromise = setMeta("seeded", true);
  await seedPromise;
}
