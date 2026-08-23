"use client";

import { useRef, useState } from "react";
import {
  Banner,
  Button,
  Checkbox,
  InputArea,
  LayerCard,
  LinkButton,
  Text,
} from "@cloudflare/kumo";
import { DownloadSimpleIcon, LinkIcon, PlusIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Cover } from "@/components/Cover";
import { createBooksBulk, exportBooks } from "@/lib/books";
import { previewCsv as parseCsvImport, previewUrls as parseUrlImport } from "@/lib/import-books";
import type { Book, BookInput, BookMetadata, PurchaseSource } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

type UrlItem = {
  url: string;
  source: PurchaseSource;
  metadata: BookMetadata | null;
  existing: Book | null;
  error: string | null;
  selected: boolean;
};

type CsvItem = {
  line: number;
  book: BookInput;
  skipped: boolean;
  reason?: string;
  existing: Book | null;
  selected: boolean;
};

type CsvStats = {
  total: number;
  books: number;
  nonBooks: number;
  invalid: number;
};

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState("");
  const [urlItems, setUrlItems] = useState<UrlItem[]>([]);
  const [csvItems, setCsvItems] = useState<CsvItem[]>([]);
  const [csvStats, setCsvStats] = useState<CsvStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function previewUrls() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const items = await parseUrlImport(
        urls
          .split(/\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      );
      setUrlItems(
        items.map((item) => ({
          ...item,
          selected: Boolean(item.metadata) && !item.existing,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "URLの解析に失敗しました");
    } finally {
      setPending(false);
    }
  }

  async function previewCsv(file: File) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const data = await parseCsvImport(file, "AMAZON");
      setCsvStats(data.stats);
      setCsvItems(
        data.items
          .filter((item) => item.reason !== "本以外の注文です")
          .map((item) => ({
            ...item,
            selected: !item.skipped && !item.existing,
          })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSVの解析に失敗しました");
    } finally {
      setPending(false);
    }
  }

  async function importBooks(books: BookInput[]) {
    if (books.length === 0) {
      setError("取り込む本が選ばれていません");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await createBooksBulk(books, true);
      setMessage(`${data.created.length}冊を棚に入れました。重複 ${data.duplicates.length}冊は飛ばしました。`);
      setUrlItems([]);
      setCsvItems([]);
      setCsvStats(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取り込みに失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <Text variant="mono-secondary">IMPORT</Text>
        <Text variant="heading" size="lg" as="h1">
          過去の買い物を棚へ
        </Text>
        <Text variant="secondary">Amazon や楽天の商品URL、または注文履歴CSVから本だけを一括登録します。</Text>
      </div>

      <LayerCard>
        <LayerCard.Secondary>商品URL</LayerCard.Secondary>
        <LayerCard.Primary className="space-y-4">
          <p className="text-sm text-kumo-subtle">1行に1件。Amazon / 楽天ブックスの商品ページを貼ってください。</p>
          <InputArea
            label="URL一覧"
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            rows={6}
            placeholder={"https://www.amazon.co.jp/dp/4873115655\nhttps://books.rakuten.co.jp/rb/12345678/"}
          />
          <Button type="button" variant="primary" icon={LinkIcon} loading={pending} onClick={() => void previewUrls()}>
            URLを解析
          </Button>
          {urlItems.length > 0 ? (
            <PreviewList
              items={urlItems.map((item, index) => ({
                key: `${item.url}-${index}`,
                title: item.metadata?.title ?? item.existing?.title ?? item.url,
                authors: item.metadata?.authors ?? item.existing?.authors ?? [],
                coverUrl: item.metadata?.coverUrl ?? item.existing?.coverUrl,
                isbn13: item.metadata?.isbn13 ?? item.existing?.isbn13,
                isbn10: item.metadata?.isbn10 ?? item.existing?.isbn10,
                selected: item.selected,
                note: item.existing
                  ? "すでに棚にあります"
                  : item.error
                    ? item.error
                    : SOURCE_LABELS[item.source],
                disabled: !item.metadata || Boolean(item.existing),
              }))}
              onToggle={(index, selected) => {
                setUrlItems((current) => current.map((item, i) => (i === index ? { ...item, selected } : item)));
              }}
              onImport={() =>
                void importBooks(
                  urlItems
                    .filter((item) => item.selected && item.metadata)
                    .map((item) => ({
                      title: item.metadata!.title,
                      subtitle: item.metadata!.subtitle,
                      authors: item.metadata!.authors,
                      isbn10: item.metadata!.isbn10,
                      isbn13: item.metadata!.isbn13,
                      asin: item.metadata!.asin,
                      publisher: item.metadata!.publisher,
                      publishedDate: item.metadata!.publishedDate,
                      pageCount: item.metadata!.pageCount,
                      description: item.metadata!.description,
                      coverUrl: item.metadata!.coverUrl,
                      source: item.source,
                      sourceUrl: item.metadata!.sourceUrl ?? item.url,
                      price: item.metadata!.price,
                      status: "UNREAD",
                    })),
                )
              }
            />
          ) : null}
        </LayerCard.Primary>
      </LayerCard>

      <LayerCard>
        <LayerCard.Secondary>注文履歴CSV</LayerCard.Secondary>
        <LayerCard.Primary className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-7 text-kumo-subtle">
            <li>Amazon.co.jp の「注文履歴レポート」をCSVで書き出す</li>
            <li>ISBN・カテゴリー・Kindle版から本の注文だけを読みます</li>
            <li>同じISBNは重複登録しません。書誌と表紙は自動で補います</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              icon={UploadSimpleIcon}
              loading={pending}
              onClick={() => fileRef.current?.click()}
            >
              CSVを選ぶ
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void previewCsv(file);
              }}
            />
            <LinkButton href="/sample-amazon-orders.csv" variant="secondary" icon={DownloadSimpleIcon}>
              サンプルCSV
            </LinkButton>
          </div>
          {csvStats ? (
            <Banner
              title={`本 ${csvStats.books}件を読みました`}
              description={
                csvStats.nonBooks > 0
                  ? `本以外の注文 ${csvStats.nonBooks}件は除外しています。`
                  : "すべて本として認識しました。"
              }
            />
          ) : null}
          {csvItems.length > 0 ? (
            <PreviewList
              items={csvItems.map((item, index) => ({
                key: `csv-${item.line}-${index}`,
                title: item.book.title || `行 ${item.line}`,
                authors: item.book.authors ?? [],
                coverUrl: item.book.coverUrl,
                isbn13: item.book.isbn13,
                isbn10: item.book.isbn10,
                selected: item.selected,
                note: item.existing
                  ? "すでに棚にあります"
                  : item.skipped
                    ? item.reason
                    : `${SOURCE_LABELS[item.book.source ?? "AMAZON"]} / ${item.book.isbn13 ?? "ISBNなし"}`,
                disabled: item.skipped || Boolean(item.existing),
              }))}
              onToggle={(index, selected) => {
                setCsvItems((current) => current.map((item, i) => (i === index ? { ...item, selected } : item)));
              }}
              onImport={() =>
                void importBooks(csvItems.filter((item) => item.selected && !item.skipped).map((item) => item.book))
              }
            />
          ) : null}
        </LayerCard.Primary>
      </LayerCard>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => void exportBooks("json")}>
          JSONで書き出す
        </Button>
        <Button type="button" variant="secondary" onClick={() => void exportBooks("csv")}>
          CSVで書き出す
        </Button>
        <LinkButton href="/add" variant="outline" icon={PlusIcon}>
          1冊だけ追加する
        </LinkButton>
      </div>

      {error ? <Banner variant="error" title={error} /> : null}
      {message ? <Banner variant="default" title={message} /> : null}
    </div>
  );
}

function PreviewList({
  items,
  onToggle,
  onImport,
}: {
  items: Array<{
    key: string;
    title: string;
    authors: string[];
    coverUrl?: string | null;
    isbn13?: string | null;
    isbn10?: string | null;
    selected: boolean;
    note?: string;
    disabled?: boolean;
  }>;
  onToggle: (index: number, selected: boolean) => void;
  onImport: () => void;
}) {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-kumo-hairline overflow-hidden rounded-lg border border-kumo-hairline">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-center gap-3 bg-kumo-base px-3 py-3">
            <Checkbox
              checked={item.selected}
              disabled={item.disabled}
              onCheckedChange={(checked) => onToggle(index, Boolean(checked))}
              aria-label={item.title}
              label={<span className="sr-only">{item.title}</span>}
            />
            <div className="h-14 w-10 overflow-hidden rounded bg-kumo-recessed">
              <Cover title={item.title} coverUrl={item.coverUrl} isbn13={item.isbn13} isbn10={item.isbn10} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-kumo-strong">{item.title}</p>
              <p className="truncate text-xs text-kumo-subtle">
                {item.authors.join(" / ") || item.note}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Button type="button" variant="primary" onClick={onImport}>
        選んだ本を取り込む
      </Button>
    </div>
  );
}
