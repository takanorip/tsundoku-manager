"use client";

import { useState } from "react";
import { Banner, Button, Input, InputArea, LayerCard, Select } from "@cloudflare/kumo";
import {
  PURCHASE_SOURCES,
  READING_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  type BookInput,
  type BookMetadata,
  type PurchaseSource,
  type ReadingStatus,
} from "@/lib/types";
import { Cover } from "./Cover";

type BookFormProps = {
  initial?: Partial<BookInput>;
  metadataNote?: string;
  submitLabel?: string;
  onSubmit: (input: BookInput) => Promise<void>;
};

function authorsToText(authors?: string[]): string {
  return authors?.join(" / ") ?? "";
}

export function BookForm({
  initial,
  metadataNote,
  submitLabel = "棚に入れる",
  onSubmit,
}: BookFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [authors, setAuthors] = useState(authorsToText(initial?.authors));
  const [isbn13, setIsbn13] = useState(initial?.isbn13 ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [publishedDate, setPublishedDate] = useState(initial?.publishedDate ?? "");
  const [pageCount, setPageCount] = useState(initial?.pageCount?.toString() ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ReadingStatus>(initial?.status ?? "UNREAD");
  const [source, setSource] = useState<PurchaseSource>(initial?.source ?? "MANUAL");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        title,
        authors: authors.split(/[/／,、]/).map((part) => part.trim()).filter(Boolean),
        isbn13: isbn13 || null,
        isbn10: initial?.isbn10 ?? null,
        asin: initial?.asin ?? null,
        publisher: publisher || null,
        publishedDate: publishedDate || null,
        pageCount: pageCount ? Number(pageCount) : null,
        coverUrl: coverUrl || null,
        description: description || null,
        status,
        source,
        sourceUrl: sourceUrl || null,
        purchaseDate: purchaseDate || null,
        price: price ? Number(price) : null,
        notes: notes || null,
        subtitle: initial?.subtitle ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <LayerCard className="overflow-hidden">
        <div className="aspect-[3/4]">
          <Cover title={title || "無題"} coverUrl={coverUrl} isbn13={isbn13} />
        </div>
      </LayerCard>
      <div className="space-y-4">
        {metadataNote ? <Banner size="sm" title={metadataNote} /> : null}
        <Input label="タイトル" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <Input
          label="著者"
          value={authors}
          onChange={(event) => setAuthors(event.target.value)}
          placeholder="著者1 / 著者2"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="ISBN-13" value={isbn13} onChange={(event) => setIsbn13(event.target.value)} />
          <Input label="出版社" value={publisher} onChange={(event) => setPublisher(event.target.value)} />
          <Input label="刊行" value={publishedDate} onChange={(event) => setPublishedDate(event.target.value)} />
          <Input
            label="ページ数"
            value={pageCount}
            onChange={(event) => setPageCount(event.target.value)}
            inputMode="numeric"
          />
        </div>
        <Input label="表紙URL" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="読書状況"
            value={status}
            onValueChange={(value) => setStatus((value as ReadingStatus) ?? "UNREAD")}
            items={Object.fromEntries(READING_STATUSES.map((value) => [value, STATUS_LABELS[value]]))}
          />
          <Select
            label="入手元"
            value={source}
            onValueChange={(value) => setSource((value as PurchaseSource) ?? "MANUAL")}
            items={Object.fromEntries(PURCHASE_SOURCES.map((value) => [value, SOURCE_LABELS[value]]))}
          />
          <Input
            label="購入日"
            type="date"
            value={purchaseDate}
            onChange={(event) => setPurchaseDate(event.target.value)}
          />
          <Input label="価格" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="numeric" />
        </div>
        <Input label="商品URL" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        <InputArea label="紹介文" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
        <InputArea label="メモ" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        {error ? <Banner variant="error" title={error} /> : null}
        <Button type="submit" variant="primary" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function metadataToInput(
  metadata: BookMetadata,
  extras: Partial<BookInput> = {},
): BookInput {
  return {
    title: metadata.title,
    subtitle: metadata.subtitle ?? null,
    authors: metadata.authors,
    isbn10: metadata.isbn10 ?? null,
    isbn13: metadata.isbn13 ?? null,
    asin: metadata.asin ?? null,
    publisher: metadata.publisher ?? null,
    publishedDate: metadata.publishedDate ?? null,
    pageCount: metadata.pageCount ?? null,
    description: metadata.description ?? null,
    coverUrl: metadata.coverUrl ?? null,
    sourceUrl: metadata.sourceUrl ?? extras.sourceUrl ?? null,
    price: metadata.price ?? extras.price ?? null,
    status: extras.status ?? "UNREAD",
    source: extras.source ?? "MANUAL",
    purchaseDate: extras.purchaseDate ?? null,
  };
}
