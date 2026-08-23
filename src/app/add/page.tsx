"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner, Button, Input, LayerCard, Tabs, Text } from "@cloudflare/kumo";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BookForm, metadataToInput } from "@/components/BookForm";
import { Cover } from "@/components/Cover";
import { createBook, DuplicateBookError } from "@/lib/books";
import { lookupBooks } from "@/lib/metadata";
import { bookHref } from "@/lib/paths";
import type { BookInput, BookMetadata, PurchaseSource } from "@/lib/types";

const TABS = [
  { value: "isbn", label: "ISBN" },
  { value: "barcode", label: "バーコード" },
  { value: "url", label: "ECのURL" },
  { value: "search", label: "タイトル検索" },
  { value: "manual", label: "手入力" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default function AddPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("isbn");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<BookInput | null>(null);
  const [results, setResults] = useState<BookMetadata[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function lookup(payload: { isbn?: string; query?: string; url?: string }, source?: PurchaseSource) {
    setPending(true);
    setError(null);
    setNote(null);
    try {
      const data = await lookupBooks(payload);
      if (!data.metadata) {
        if (data.results?.length) {
          setResults(data.results);
          setDraft(null);
          return;
        }
        throw new Error("書誌が見つかりませんでした");
      }
      setResults(data.results ?? []);
      setDraft(
        metadataToInput(data.metadata, {
          source: source ?? data.source ?? (payload.url ? undefined : "MANUAL"),
          sourceUrl: payload.url,
        }),
      );
      setNote(
        data.metadata.providers.length > 0
          ? `書誌: ${data.metadata.providers.join(" / ")}`
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setPending(false);
    }
  }

  async function save(input: BookInput) {
    try {
      const book = await createBook(input);
      router.push(bookHref(book.id));
    } catch (error) {
      if (error instanceof DuplicateBookError) {
        router.push(bookHref(error.book.id));
        return;
      }
      throw error;
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Text variant="mono-secondary">ADD</Text>
        <Text variant="heading" size="lg" as="h1">
          本を棚に入れる
        </Text>
        <Text variant="secondary">ISBN、バーコード、商品URL、または手入力で登録します。</Text>
      </div>

      <Tabs
        variant="underline"
        tabs={[...TABS]}
        value={tab}
        onValueChange={(value) => {
          setTab(value as Tab);
          setError(null);
        }}
      />

      {tab === "isbn" ? (
        <LookupBox
          label="ISBN"
          placeholder="9784..."
          value={query}
          pending={pending}
          onChange={setQuery}
          onSubmit={() => lookup({ isbn: query })}
        />
      ) : null}

      {tab === "url" ? (
        <LookupBox
          label="Amazon / 楽天などの商品URL"
          placeholder="https://www.amazon.co.jp/dp/..."
          value={query}
          pending={pending}
          onChange={setQuery}
          onSubmit={() => lookup({ url: query })}
        />
      ) : null}

      {tab === "search" ? (
        <LookupBox
          label="タイトルや著者"
          placeholder="リーダブルコード"
          value={query}
          pending={pending}
          onChange={setQuery}
          onSubmit={() => lookup({ query })}
        />
      ) : null}

      {tab === "barcode" ? (
        <BarcodeScanner
          onDetect={(isbn) => {
            setQuery(isbn);
            void lookup({ isbn });
          }}
        />
      ) : null}

      {error ? <Banner variant="error" title={error} /> : null}

      {results.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((item, index) => (
            <button
              key={`${item.isbn13 ?? item.title}-${index}`}
              type="button"
              onClick={() => {
                setDraft(metadataToInput(item));
                setNote(item.providers.join(" / "));
              }}
            >
              <LayerCard className="flex gap-3 p-3 text-left">
                <div className="h-24 w-16 overflow-hidden rounded-lg bg-kumo-recessed">
                  <Cover title={item.title} coverUrl={item.coverUrl} isbn13={item.isbn13} isbn10={item.isbn10} />
                </div>
                <div>
                  <p className="font-medium text-kumo-strong">{item.title}</p>
                  <p className="mt-1 text-sm text-kumo-subtle">{item.authors.join(" / ")}</p>
                </div>
              </LayerCard>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "manual" && !draft ? <BookForm onSubmit={save} /> : null}
      {draft ? (
        <BookForm
          key={`${draft.isbn13}-${draft.title}`}
          initial={draft}
          metadataNote={note ?? undefined}
          onSubmit={save}
        />
      ) : null}
    </div>
  );
}

function LookupBox({
  label,
  placeholder,
  value,
  pending,
  onChange,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Input
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button type="submit" variant="primary" icon={MagnifyingGlassIcon} loading={pending}>
        書誌を取得
      </Button>
    </form>
  );
}
