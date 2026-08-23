import { formatPersonName, splitAuthors, splitTitle } from "./authors";
import { extractAmazonAsin, parseEcUrl, sourceFromHost } from "./ec";
import { detectIsbn, toIsbn10, toIsbn13 } from "./isbn";
import type { BookMetadata, PurchaseSource } from "./types";

const FETCH_TIMEOUT_MS = 8000;

type OpenBdSummary = {
  isbn?: string;
  title?: string;
  volume?: string;
  publisher?: string;
  pubdate?: string;
  cover?: string;
  author?: string;
};

type OpenBdRecord = {
  summary?: OpenBdSummary;
  onix?: {
    CollateralDetail?: {
      TextContent?: Array<{ Text?: string }>;
    };
    DescriptiveDetail?: {
      Extent?: Array<{ ExtentValue?: string }>;
      Contributor?: Array<{ PersonName?: { content?: string } }>;
      TitleDetail?: {
        TitleElement?: {
          TitleText?: { content?: string };
          Subtitle?: { content?: string };
        };
      };
    };
  };
};

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    description?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mergeMetadata(parts: Array<Partial<BookMetadata> | null>): BookMetadata | null {
  const usable = parts.filter((part): part is Partial<BookMetadata> => Boolean(part?.title || part?.isbn13));
  if (usable.length === 0) return null;

  const providers = new Set<string>();
  const authors = new Set<string>();
  const merged: BookMetadata = {
    title: "",
    authors: [],
    providers: [],
  };

  for (const part of usable) {
    if (!merged.title && part.title) merged.title = part.title;
    if (!merged.subtitle && part.subtitle) merged.subtitle = part.subtitle;
    for (const author of part.authors ?? []) authors.add(author);
    merged.isbn10 = merged.isbn10 ?? part.isbn10;
    merged.isbn13 = merged.isbn13 ?? part.isbn13;
    merged.asin = merged.asin ?? part.asin;
    merged.publisher = merged.publisher ?? part.publisher;
    merged.publishedDate = merged.publishedDate ?? part.publishedDate;
    merged.pageCount = merged.pageCount ?? part.pageCount;
    merged.description = merged.description ?? part.description;
    merged.coverUrl = merged.coverUrl ?? part.coverUrl;
    merged.sourceUrl = merged.sourceUrl ?? part.sourceUrl;
    merged.price = merged.price ?? part.price;
    for (const provider of part.providers ?? []) providers.add(provider);
  }

  merged.authors = [...authors];
  merged.providers = [...providers];
  if (!merged.title) return null;
  return merged;
}

function fromOpenBd(isbn13: string, record: OpenBdRecord): BookMetadata | null {
  if (!record.summary?.title) return null;

  const description = record.onix?.CollateralDetail?.TextContent?.find((item) => item.Text)?.Text;
  const pageCount = Number(record.onix?.DescriptiveDetail?.Extent?.[0]?.ExtentValue);
  const titled = splitTitle(record.summary.title);
  const onixAuthors = (record.onix?.DescriptiveDetail?.Contributor ?? [])
    .map((contributor) => formatPersonName(contributor.PersonName?.content ?? ""))
    .filter(Boolean);

  return {
    title: titled.title,
    subtitle:
      titled.subtitle ?? record.onix?.DescriptiveDetail?.TitleDetail?.TitleElement?.Subtitle?.content,
    authors: onixAuthors.length > 0 ? onixAuthors : splitAuthors(record.summary.author),
    isbn13,
    isbn10: toIsbn10(isbn13) ?? undefined,
    publisher: record.summary.publisher,
    publishedDate: record.summary.pubdate,
    coverUrl: record.summary.cover || undefined,
    pageCount: Number.isFinite(pageCount) && pageCount > 0 ? pageCount : undefined,
    description,
    providers: ["openbd"],
  };
}

export async function lookupOpenBd(isbn: string): Promise<Partial<BookMetadata> | null> {
  const isbn13 = toIsbn13(isbn);
  if (!isbn13) return null;
  const records = await fetchJson<Array<OpenBdRecord | null>>(
    `https://api.openbd.jp/v1/get?isbn=${isbn13}`,
  );
  const record = records?.[0];
  return record ? fromOpenBd(isbn13, record) : null;
}

export async function lookupOpenBdMany(isbns: string[]): Promise<Map<string, BookMetadata>> {
  const unique = [...new Set(isbns.map((isbn) => toIsbn13(isbn)).filter((isbn): isbn is string => Boolean(isbn)))];
  const found = new Map<string, BookMetadata>();

  for (let index = 0; index < unique.length; index += 100) {
    const chunk = unique.slice(index, index + 100);
    const records = await fetchJson<Array<OpenBdRecord | null>>(
      `https://api.openbd.jp/v1/get?isbn=${chunk.join(",")}`,
    );
    chunk.forEach((isbn13, offset) => {
      const record = records?.[offset];
      if (!record) return;
      const metadata = fromOpenBd(isbn13, record);
      if (metadata) found.set(isbn13, metadata);
    });
  }

  return found;
}

export async function lookupGoogleBooks(query: string): Promise<Partial<BookMetadata> | null> {
  const isbn13 = toIsbn13(query);
  const q = isbn13 ? `isbn:${isbn13}` : encodeURIComponent(query);
  const data = await fetchJson<{ items?: GoogleVolume[] }>(
    `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`,
  );
  const info = data?.items?.[0]?.volumeInfo;
  if (!info?.title) return null;

  const identifiers = info.industryIdentifiers ?? [];
  const rawIsbn13 = identifiers.find((item) => item.type === "ISBN_13")?.identifier;
  const rawIsbn10 = identifiers.find((item) => item.type === "ISBN_10")?.identifier;
  const resolved13 = rawIsbn13 ? toIsbn13(rawIsbn13) : isbn13 ?? undefined;

  return {
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors ?? [],
    isbn13: resolved13 ?? undefined,
    isbn10: rawIsbn10 ? toIsbn10(rawIsbn10) ?? rawIsbn10 : resolved13 ? toIsbn10(resolved13) ?? undefined : undefined,
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    pageCount: info.pageCount,
    description: info.description,
    coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") ??
      info.imageLinks?.smallThumbnail?.replace("http://", "https://"),
    providers: ["google"],
  };
}

type CiniiItem = {
  title?: string;
  "dc:creator"?: string;
  "dc:publisher"?: string | string[];
  "dcterms:hasPart"?: Array<{ "@id"?: string }> | { "@id"?: string };
  "prism:publicationDate"?: string;
};

export function isbnFromCiniiPart(partId?: string): string | undefined {
  if (!partId) return undefined;
  const match = partId.match(/isbn:([0-9Xx-]{10,17})/i);
  return match ? toIsbn13(match[1]) ?? undefined : undefined;
}

export async function searchCiniiBooks(query: string): Promise<BookMetadata[]> {
  const data = await fetchJson<{ "@graph"?: Array<{ items?: CiniiItem[] }> }>(
    `https://ci.nii.ac.jp/books/opensearch/search?title=${encodeURIComponent(query)}&format=json&count=8`,
  );
  const items = data?.["@graph"]?.[0]?.items ?? [];
  const results: BookMetadata[] = [];

  for (const item of items) {
    if (!item.title) continue;
    const parts = item["dcterms:hasPart"];
    const partList = Array.isArray(parts) ? parts : parts ? [parts] : [];
    const isbn13 = partList.map((part) => isbnFromCiniiPart(part["@id"])).find(Boolean);
    const publisher = item["dc:publisher"];
    results.push({
      title: splitTitle(item.title).title,
      subtitle: splitTitle(item.title).subtitle,
      authors: splitAuthors(item["dc:creator"]),
      isbn13,
      isbn10: isbn13 ? toIsbn10(isbn13) ?? undefined : undefined,
      publisher: Array.isArray(publisher) ? publisher[0] : publisher,
      publishedDate: item["prism:publicationDate"],
      coverUrl: undefined,
      providers: ["cinii"],
    });
  }

  return results;
}

export async function searchGoogleBooks(query: string): Promise<BookMetadata[]> {
  const data = await fetchJson<{ items?: GoogleVolume[] }>(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`,
  );
  const results: BookMetadata[] = [];
  for (const item of data?.items ?? []) {
    const info = item.volumeInfo;
    if (!info?.title) continue;
    const identifiers = info.industryIdentifiers ?? [];
    const rawIsbn13 = identifiers.find((entry) => entry.type === "ISBN_13")?.identifier;
    const isbn13 = rawIsbn13 ? toIsbn13(rawIsbn13) ?? undefined : undefined;
    results.push({
      title: info.title,
      subtitle: info.subtitle,
      authors: info.authors ?? [],
      isbn13,
      isbn10: isbn13 ? toIsbn10(isbn13) ?? undefined : undefined,
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      pageCount: info.pageCount,
      description: info.description,
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
      providers: ["google"],
    });
  }
  return results;
}

export async function lookupByIsbn(isbn: string): Promise<BookMetadata | null> {
  const isbn13 = toIsbn13(isbn);
  if (!isbn13) return null;

  const [openbd, google] = await Promise.all([lookupOpenBd(isbn13), lookupGoogleBooks(isbn13)]);
  return mergeMetadata([openbd, google]);
}

export async function lookupByUrl(rawUrl: string): Promise<{
  metadata: BookMetadata | null;
  source: PurchaseSource;
  asin?: string;
  resolvedUrl: string;
}> {
  const parsed = parseEcUrl(rawUrl);
  const source = parsed?.source ?? sourceFromHost(rawUrl);
  const asin = parsed?.asin ?? extractAmazonAsin(rawUrl) ?? undefined;
  const isbn13 = parsed?.isbn13 ?? detectIsbn(rawUrl) ?? undefined;
  const fromIsbn = isbn13 ? await lookupByIsbn(isbn13) : null;
  const metadata = fromIsbn
    ? {
        ...fromIsbn,
        asin: fromIsbn.asin ?? asin,
        sourceUrl: fromIsbn.sourceUrl ?? rawUrl,
      }
    : null;

  return {
    metadata,
    source,
    asin,
    resolvedUrl: rawUrl,
  };
}

export async function lookupBooks(input: {
  isbn?: string;
  query?: string;
  url?: string;
}): Promise<{ metadata: BookMetadata | null; results?: BookMetadata[]; source?: PurchaseSource }> {
  if (input.url?.trim()) {
    const result = await lookupByUrl(input.url.trim());
    return { metadata: result.metadata, source: result.source };
  }

  if (input.isbn?.trim()) {
    const isbn = toIsbn13(input.isbn) ?? detectIsbn(input.isbn);
    if (!isbn) return { metadata: null };
    return { metadata: await lookupByIsbn(isbn) };
  }

  if (input.query?.trim()) {
    const isbn = toIsbn13(input.query) ?? detectIsbn(input.query);
    if (isbn) return { metadata: await lookupByIsbn(isbn) };

    const cinii = await searchCiniiBooks(input.query.trim());
    const enriched = await Promise.all(
      cinii.slice(0, 5).map(async (item) => {
        if (!item.isbn13) return item;
        const detailed = await lookupByIsbn(item.isbn13);
        return detailed ?? item;
      }),
    );
    if (enriched.length > 0) {
      return { metadata: enriched[0], results: enriched };
    }

    const results = await searchGoogleBooks(input.query.trim());
    return { metadata: results[0] ?? null, results };
  }

  return { metadata: null };
}
