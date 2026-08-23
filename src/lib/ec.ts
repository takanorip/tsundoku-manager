import { detectIsbn, isIsbn10, isbn10To13, normalizeIsbn } from "./isbn";
import type { PurchaseSource } from "./types";

export type ParsedEcUrl = {
  source: PurchaseSource;
  url: string;
  asin?: string;
  isbn13?: string;
  rakutenItemCode?: string;
};

const AMAZON_HOSTS = [
  "amazon.co.jp",
  "www.amazon.co.jp",
  "amazon.com",
  "www.amazon.com",
  "amzn.to",
  "amzn.asia",
];

const RAKUTEN_HOSTS = [
  "books.rakuten.co.jp",
  "item.rakuten.co.jp",
  "www.rakuten.co.jp",
  "a.r10.to",
];

export function hostnameOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isAmazonHost(host: string): boolean {
  return AMAZON_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

export function isRakutenHost(host: string): boolean {
  return RAKUTEN_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

export function extractAmazonAsin(url: string): string | null {
  const patterns = [
    /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /[?&]asin=([A-Z0-9]{10})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

export function extractRakutenIsbn(url: string): string | null {
  const fromIsbnParam = url.match(/[?&](?:isbn|sitem)=([0-9Xx-]{10,17})/i);
  if (fromIsbnParam) {
    const isbn = detectIsbn(fromIsbnParam[1]);
    if (isbn) return isbn;
  }
  return detectIsbn(url);
}

export function parseEcUrl(rawUrl: string): ParsedEcUrl | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const isbn13 = detectIsbn(trimmed) ?? undefined;

  if (isAmazonHost(host)) {
    const asin = extractAmazonAsin(trimmed) ?? undefined;
    const fromAsin =
      asin && isIsbn10(asin) ? isbn10To13(asin) : undefined;
    return {
      source: host.includes("kindle") ? "KINDLE" : "AMAZON",
      url: trimmed,
      asin,
      isbn13: isbn13 ?? fromAsin,
    };
  }

  if (isRakutenHost(host)) {
    const itemCode = url.pathname.match(/\/rb\/(\d+)/)?.[1];
    return {
      source: "RAKUTEN",
      url: trimmed,
      isbn13,
      rakutenItemCode: itemCode,
    };
  }

  if (isbn13) {
    return { source: "OTHER", url: trimmed, isbn13 };
  }

  return { source: "OTHER", url: trimmed };
}

export function sourceFromHost(url: string): PurchaseSource {
  const parsed = parseEcUrl(url);
  return parsed?.source ?? "OTHER";
}

export function looksLikeIsbnAsin(asin: string): boolean {
  return isIsbn10(normalizeIsbn(asin));
}
