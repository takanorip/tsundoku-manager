export const READING_STATUSES = [
  "UNREAD",
  "READING",
  "FINISHED",
  "PAUSED",
  "ABANDONED",
] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const PURCHASE_SOURCES = [
  "AMAZON",
  "RAKUTEN",
  "KINDLE",
  "BOOKSTORE",
  "USED",
  "LIBRARY",
  "MANUAL",
  "OTHER",
] as const;

export type PurchaseSource = (typeof PURCHASE_SOURCES)[number];

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  UNREAD: "積読",
  READING: "読書中",
  FINISHED: "読了",
  PAUSED: "中断",
  ABANDONED: "手放した",
};

export const SOURCE_LABELS: Record<PurchaseSource, string> = {
  AMAZON: "Amazon",
  RAKUTEN: "楽天",
  KINDLE: "Kindle",
  BOOKSTORE: "書店",
  USED: "古書店",
  LIBRARY: "図書館",
  MANUAL: "手入力",
  OTHER: "その他",
};

export type Book = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn10: string | null;
  isbn13: string | null;
  asin: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  currentPage: number | null;
  description: string | null;
  coverUrl: string | null;
  status: ReadingStatus;
  source: PurchaseSource;
  sourceUrl: string | null;
  purchaseDate: string | null;
  price: number | null;
  notes: string | null;
  rating: number | null;
  tags: string[];
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookInput = {
  title: string;
  subtitle?: string | null;
  authors?: string[];
  isbn10?: string | null;
  isbn13?: string | null;
  asin?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  currentPage?: number | null;
  description?: string | null;
  coverUrl?: string | null;
  status?: ReadingStatus;
  source?: PurchaseSource;
  sourceUrl?: string | null;
  purchaseDate?: string | null;
  price?: number | null;
  notes?: string | null;
  rating?: number | null;
  tags?: string[];
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type BookMetadata = {
  title: string;
  subtitle?: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
  asin?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  description?: string;
  coverUrl?: string;
  sourceUrl?: string;
  price?: number;
  providers: string[];
};

export type Stats = {
  total: number;
  unread: number;
  reading: number;
  finished: number;
  paused: number;
  abandoned: number;
  unreadPages: number;
  oldestUnreadDays: number;
};

export function isReadingStatus(value: string): value is ReadingStatus {
  return (READING_STATUSES as readonly string[]).includes(value);
}

export function isPurchaseSource(value: string): value is PurchaseSource {
  return (PURCHASE_SOURCES as readonly string[]).includes(value);
}

export function unreadDays(book: Pick<Book, "status" | "purchaseDate" | "createdAt">): number {
  if (book.status !== "UNREAD" && book.status !== "PAUSED") return 0;
  const start = book.purchaseDate ?? book.createdAt;
  const then = new Date(start).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}
