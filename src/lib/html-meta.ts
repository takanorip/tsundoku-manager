import { detectIsbn } from "./isbn";

export type HtmlMeta = {
  title?: string;
  description?: string;
  image?: string;
  isbn13?: string;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function metaContent(html: string, names: string[]): string | undefined {
  for (const name of names) {
    const propertyFirst = html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    );
    if (propertyFirst?.[1]) return decodeEntities(propertyFirst[1]);

    const contentFirst = html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
        "i",
      ),
    );
    if (contentFirst?.[1]) return decodeEntities(contentFirst[1]);
  }
  return undefined;
}

function extractJsonLdIsbn(html: string): string | undefined {
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!blocks) return undefined;

  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const data = JSON.parse(json) as Record<string, unknown> | Record<string, unknown>[];
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const isbn = typeof node.isbn === "string" ? node.isbn : undefined;
        if (isbn) {
          const found = detectIsbn(isbn);
          if (found) return found;
        }
      }
    } catch {
      const found = detectIsbn(json);
      if (found) return found;
    }
  }
  return undefined;
}

export function extractHtmlMeta(html: string): HtmlMeta {
  const title =
    metaContent(html, ["og:title", "twitter:title"]) ??
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();

  const cleanedTitle = title
    ? decodeEntities(title)
        .replace(/\s*[|:：].*(Amazon|amazon|楽天|Rakuten).*$/u, "")
        .trim()
    : undefined;

  const isbn13 =
    extractJsonLdIsbn(html) ??
    detectIsbn(html.match(/ISBN(?:-13)?[^\d]{0,12}(97[89][\d-]{10,14})/i)?.[1] ?? "") ??
    detectIsbn(html.match(/ISBN(?:-10)?[^\dX]{0,12}([\d-]{10,17}X?)/i)?.[1] ?? "") ??
    undefined;

  return {
    title: cleanedTitle,
    description: metaContent(html, ["og:description", "description"]),
    image: metaContent(html, ["og:image", "twitter:image"]),
    isbn13,
  };
}
