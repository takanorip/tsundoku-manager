import { detectIsbn, isIsbn, toIsbn10, toIsbn13 } from "./isbn";
import type { BookInput, PurchaseSource } from "./types";
import { isPurchaseSource } from "./types";

export type CsvPreviewRow = {
  line: number;
  book: BookInput;
  skipped: boolean;
  reason?: string;
};

export type CsvImportStats = {
  total: number;
  books: number;
  nonBooks: number;
  invalid: number;
};

const HEADER_ALIASES: Record<string, string> = {
  title: "title",
  商品名: "title",
  タイトル: "title",
  "product name": "title",
  authors: "authors",
  author: "authors",
  著者: "authors",
  isbn: "isbn",
  isbn13: "isbn",
  isbn10: "isbn",
  "asin/isbn": "isbn",
  asin: "asin",
  "製品コード（asin/isbn）": "isbn",
  "製品コード(asin/isbn)": "isbn",
  製品コード: "isbn",
  publisher: "publisher",
  出版社: "publisher",
  source: "source",
  購入元: "source",
  website: "source",
  purchasedate: "purchaseDate",
  "purchase date": "purchaseDate",
  注文日: "purchaseDate",
  購入日: "purchaseDate",
  "order date": "purchaseDate",
  price: "price",
  価格: "price",
  "unit price": "price",
  "total owed": "price",
  支払い合計: "price",
  url: "url",
  sourceurl: "url",
  notes: "notes",
  付帯情報: "notes",
  category: "category",
  カテゴリー: "category",
  商品のカテゴリー: "category",
  ジャンル: "category",
  商品カテゴリ: "category",
  unspsc: "unspsc",
  "unspsc code": "unspsc",
  orderid: "orderId",
  "order id": "orderId",
  注文番号: "orderId",
};

const BOOK_CATEGORIES =
  /本|書籍|洋書|漫画|コミック|雑誌|ラノベ|文庫|kindle|book|ebook|comic|magazine|abis_book|abis_ebooks/i;

const NON_BOOK_CATEGORIES =
  /家電|カメラ|パソコン|pcソフト|食品|飲料|日用品|ファッション|服|靴|化粧品|ドラッグストア|スポーツ|おもちゃ|ゲーム|diy|ペット|車|自転車|楽器|electronics|grocery|fashion|beauty|toy|automotive|software(?! book)/i;

const BOOK_UNSPSC = /^(551015|551115|551217)/;

const BOOK_TITLE =
  /kindle版|kindle unlimited|文庫|新書|単行本|全集|選集|漫画|コミック|絵本|詩集|作品集|【本】|\[book\]/i;

const ORDER_HISTORY_HINT =
  /注文番号|order id|orderid|website|商品のカテゴリー|category|unspsc|出品者|seller|shipment|配送/;

export function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function mapHeader(header: string): string | null {
  const key = normalizeHeader(header);
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  const compact = key.replace(/[\s_]/g, "");
  return HEADER_ALIASES[compact] ?? null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

function parsePrice(value: string): number | undefined {
  const digits = value.replace(/[^\d.-]/g, "");
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isFinite(amount) ? Math.round(amount) : undefined;
}

function parseDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const iso = trimmed.replace(/[./]/g, "-");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return iso.slice(0, 10);
}

function parseSource(value: string, fallback: PurchaseSource): PurchaseSource {
  const normalized = value.trim().toUpperCase();
  if (isPurchaseSource(normalized)) return normalized;
  if (/kindle/i.test(value)) return "KINDLE";
  if (/amazon|アマゾン/i.test(value)) return "AMAZON";
  if (/楽天|rakuten/i.test(value)) return "RAKUTEN";
  if (/古本|古書|used/i.test(value)) return "USED";
  if (/書店|bookstore/i.test(value)) return "BOOKSTORE";
  return fallback;
}

export function isOrderHistoryCsv(rawHeaders: string[]): boolean {
  return rawHeaders.some((header) => ORDER_HISTORY_HINT.test(normalizeHeader(header)));
}

export function isBookOrder(record: {
  title?: string;
  category?: string;
  isbn?: string;
  asin?: string;
  unspsc?: string;
}): boolean {
  const category = record.category ?? "";
  const title = record.title ?? "";
  const code = record.isbn || record.asin || "";
  const unspsc = record.unspsc ?? "";

  if (category && BOOK_CATEGORIES.test(category)) return true;
  if (unspsc && BOOK_UNSPSC.test(unspsc.replace(/\s/g, ""))) return true;
  if (isIsbn(code) || Boolean(toIsbn13(code) || detectIsbn(code))) return true;
  if (BOOK_TITLE.test(title)) return true;
  if (category && NON_BOOK_CATEGORIES.test(category)) return false;
  if (category) return false;
  return false;
}

export function summarizeCsv(rows: CsvPreviewRow[]): CsvImportStats {
  return {
    total: rows.length,
    books: rows.filter((row) => !row.skipped).length,
    nonBooks: rows.filter((row) => row.reason === "本以外の注文です").length,
    invalid: rows.filter((row) => row.skipped && row.reason !== "本以外の注文です").length,
  };
}

export function csvToBooks(
  text: string,
  fallbackSource: PurchaseSource = "AMAZON",
): CsvPreviewRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(mapHeader);
  const orderHistory = isOrderHistoryCsv(rawHeaders);
  const hasTitle = headers.includes("title");
  const hasIsbn = headers.includes("isbn") || headers.includes("asin");
  if (!hasTitle && !hasIsbn) {
    return [
      {
        line: 1,
        book: { title: "" },
        skipped: true,
        reason: "タイトルまたはISBN列が見つかりません",
      },
    ];
  }

  const previews: CsvPreviewRow[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const record: Record<string, string> = {};
    headers.forEach((key, index) => {
      if (!key) return;
      record[key] = (cells[index] ?? "").trim();
    });

    const rawCode = record.isbn || record.asin || "";
    const isbn13 = toIsbn13(rawCode) ?? detectIsbn(rawCode);
    const isbn10 = toIsbn10(rawCode) ?? (isbn13 ? toIsbn10(isbn13) : null);
    const title = record.title || (isbn13 ? `ISBN ${isbn13}` : "");
    const kindle = /kindle/i.test(`${record.category ?? ""} ${title}`);

    if (!title && !isbn13) {
      previews.push({
        line: i + 1,
        book: { title: "" },
        skipped: true,
        reason: "タイトルもISBNもありません",
      });
      continue;
    }

    if (orderHistory && !isBookOrder(record)) {
      previews.push({
        line: i + 1,
        book: { title: title || rawCode || "不明な商品" },
        skipped: true,
        reason: "本以外の注文です",
      });
      continue;
    }

    previews.push({
      line: i + 1,
      skipped: false,
      book: {
        title,
        authors: record.authors
          ? record.authors.split(/[,、／/]/).map((part) => part.trim()).filter(Boolean)
          : [],
        isbn13: isbn13 ?? null,
        isbn10: isbn10 ?? null,
        asin: record.asin || (isbn10 ?? null),
        publisher: record.publisher || null,
        source: parseSource(record.source || record.category || "", kindle ? "KINDLE" : fallbackSource),
        sourceUrl: record.url || null,
        purchaseDate: parseDate(record.purchaseDate ?? "") ?? null,
        price: parsePrice(record.price ?? "") ?? null,
        notes: record.notes || null,
        status: "UNREAD",
      },
    });
  }

  return previews;
}
