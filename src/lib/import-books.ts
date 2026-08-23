import { findByIsbn } from "./books";
import { csvToBooks, summarizeCsv, type CsvImportStats, type CsvPreviewRow } from "./csv";
import { decodeCsvBuffer } from "./encoding";
import { lookupByUrl, lookupOpenBdMany } from "./metadata";
import type { Book, BookInput, BookMetadata, PurchaseSource } from "./types";

function mergeMetadata(book: BookInput, metadata: BookMetadata): BookInput {
  return {
    ...book,
    title: metadata.title || book.title,
    subtitle: metadata.subtitle ?? book.subtitle,
    authors: metadata.authors.length > 0 ? metadata.authors : book.authors,
    isbn10: metadata.isbn10 ?? book.isbn10,
    coverUrl: metadata.coverUrl ?? book.coverUrl,
    publisher: metadata.publisher ?? book.publisher,
    publishedDate: metadata.publishedDate ?? book.publishedDate,
    pageCount: metadata.pageCount ?? book.pageCount,
    description: metadata.description ?? book.description,
  };
}

export type UrlPreviewItem = {
  url: string;
  source: PurchaseSource;
  metadata: BookMetadata | null;
  existing: Book | null;
  error: string | null;
};

export type CsvPreviewItem = CsvPreviewRow & {
  existing: Book | null;
};

export async function previewUrls(urls: string[]): Promise<UrlPreviewItem[]> {
  const unique = urls.map((url) => url.trim()).filter(Boolean);
  return Promise.all(
    unique.map(async (url) => {
      try {
        const result = await lookupByUrl(url);
        const isbn13 = result.metadata?.isbn13;
        const existing = isbn13 ? await findByIsbn(isbn13) : null;
        return {
          url,
          source: result.source,
          metadata: result.metadata,
          existing,
          error: result.metadata ? null : "URLからISBNを取れず、書誌を取得できませんでした",
        };
      } catch (error) {
        return {
          url,
          source: "OTHER" as const,
          metadata: null,
          existing: null,
          error: error instanceof Error ? error.message : "取得に失敗しました",
        };
      }
    }),
  );
}

export async function previewCsv(
  file: File,
  fallbackSource: PurchaseSource = "AMAZON",
): Promise<{ items: CsvPreviewItem[]; stats: CsvImportStats }> {
  const csv = decodeCsvBuffer(await file.arrayBuffer());
  if (!csv.trim()) {
    throw new Error("CSVが空です");
  }

  const rows = csvToBooks(csv, fallbackSource);
  const stats = summarizeCsv(rows);
  const catalog = await lookupOpenBdMany(
    rows.flatMap((row) => (row.skipped || !row.book.isbn13 ? [] : [row.book.isbn13])),
  );

  const items = await Promise.all(
    rows.map(async (row) => {
      const isbn13 = row.book.isbn13;
      const metadata = isbn13 ? catalog.get(isbn13) : undefined;
      const book = metadata ? mergeMetadata(row.book, metadata) : row.book;
      const existing = isbn13 ? await findByIsbn(isbn13) : null;
      return { ...row, book, existing };
    }),
  );

  return { items, stats };
}
