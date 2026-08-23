import { describe, expect, it } from "vitest";
import { extractHtmlMeta } from "./html-meta";

describe("html meta", () => {
  it("reads Open Graph tags and ISBN", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="リーダブルコード | Amazon" />
          <meta property="og:image" content="https://example.com/cover.jpg" />
          <script type="application/ld+json">{"@type":"Book","isbn":"978-4-87311-565-8"}</script>
        </head>
      </html>
    `;
    const meta = extractHtmlMeta(html);
    expect(meta.title).toBe("リーダブルコード");
    expect(meta.image).toBe("https://example.com/cover.jpg");
    expect(meta.isbn13).toBe("9784873115658");
  });
});
