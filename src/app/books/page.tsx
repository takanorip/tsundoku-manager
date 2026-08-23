"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Banner,
  Breadcrumbs,
  Button,
  Dialog,
  LayerCard,
  Link,
  Meter,
  SkeletonLine,
  Tabs,
  Text,
} from "@cloudflare/kumo";
import { ArrowLeftIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { BookForm } from "@/components/BookForm";
import { Cover } from "@/components/Cover";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteBook, getBook, updateBook } from "@/lib/books";
import { hyphenateIsbn13 } from "@/lib/isbn";
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  unreadDays,
  type Book,
  type BookInput,
  type ReadingStatus,
} from "@/lib/types";

const QUICK_STATUSES: ReadingStatus[] = ["UNREAD", "READING", "FINISHED", "PAUSED"];

export default function BookDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <SkeletonLine className="h-4" minWidth={20} maxWidth={40} />
          <SkeletonLine className="h-8" minWidth={40} maxWidth={70} />
        </div>
      }
    >
      <BookDetail />
    </Suspense>
  );
}

function BookDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getBook(id)
      .then((next) => {
        if (cancelled) return;
        if (next) setBook(next);
        else setError("本が見つかりません");
      })
      .catch(() => {
        if (!cancelled) setError("読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return <Banner variant="error" title="本が見つかりません" />;
  }

  async function patch(input: Partial<BookInput>) {
    const next = await updateBook(id, input);
    setBook(next);
    setEditing(false);
  }

  async function remove() {
    await deleteBook(id);
    router.push("/");
  }

  if (error) {
    return <Banner variant="error" title={error} />;
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <SkeletonLine className="h-4" minWidth={20} maxWidth={40} />
        <SkeletonLine className="h-8" minWidth={40} maxWidth={70} />
        <SkeletonLine className="h-4" minWidth={30} maxWidth={55} />
      </div>
    );
  }

  const days = unreadDays(book);
  const progress =
    book.pageCount && book.currentPage
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : 0;

  return (
    <div className="space-y-8">
      <Breadcrumbs>
        <Breadcrumbs.Link href="/" icon={<ArrowLeftIcon size={16} />}>
          本棚
        </Breadcrumbs.Link>
        <Breadcrumbs.Separator />
        <Breadcrumbs.Current>{book.title}</Breadcrumbs.Current>
      </Breadcrumbs>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <LayerCard className="overflow-hidden">
          <div className="aspect-[3/4]">
            <Cover title={book.title} coverUrl={book.coverUrl} isbn13={book.isbn13} isbn10={book.isbn10} />
          </div>
        </LayerCard>

        <div className="space-y-5">
          <StatusBadge status={book.status} />
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-kumo-strong">{book.title}</h1>
            {book.subtitle ? (
              <div className="mt-2">
                <Text variant="secondary">{book.subtitle}</Text>
              </div>
            ) : null}
          </div>
          <Text>{book.authors.join(" / ") || "著者未登録"}</Text>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Meta label="入手元" value={SOURCE_LABELS[book.source]} />
            <Meta label="出版社" value={book.publisher} />
            <Meta label="刊行" value={book.publishedDate} />
            <Meta label="ISBN" value={book.isbn13 ? hyphenateIsbn13(book.isbn13) : book.isbn10} />
            <Meta label="購入日" value={book.purchaseDate} />
            <Meta label="価格" value={book.price ? `${book.price.toLocaleString("ja-JP")}円` : null} />
            <Meta label="積読日数" value={days ? `${days}日` : "—"} />
            <Meta label="ページ" value={book.pageCount ? `${book.currentPage ?? 0} / ${book.pageCount}` : null} />
          </dl>

          {book.pageCount ? (
            <div className="space-y-3">
              <Meter
                label="進捗"
                value={progress}
                customValue={`${book.currentPage ?? 0} / ${book.pageCount}`}
              />
              <input
                type="range"
                min={0}
                max={book.pageCount}
                value={book.currentPage ?? 0}
                className="w-full"
                onChange={(event) => {
                  void patch({ currentPage: Number(event.target.value) });
                }}
              />
            </div>
          ) : null}

          <Tabs
            size="sm"
            tabs={QUICK_STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABELS[status],
            }))}
            value={book.status}
            onValueChange={(value) => {
              void patch({ status: value as ReadingStatus });
            }}
          />

          {book.sourceUrl ? (
            <Link href={book.sourceUrl} target="_blank" rel="noopener noreferrer">
              購入元のページを開く <Link.ExternalIcon />
            </Link>
          ) : null}

          {book.description ? (
            <p className="max-w-2xl text-sm leading-7 text-kumo-default">{book.description}</p>
          ) : null}
          {book.notes ? (
            <LayerCard className="max-w-2xl p-4 text-sm leading-7">{book.notes}</LayerCard>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              icon={PencilSimpleIcon}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "編集を閉じる" : "詳しく編集"}
            </Button>
            <Dialog.Root>
              <Dialog.Trigger
                render={(props) => (
                  <Button {...props} variant="destructive" icon={TrashIcon}>
                    棚から下ろす
                  </Button>
                )}
              />
              <Dialog className="p-6">
                <Dialog.Title>この本を棚から下ろしますか？</Dialog.Title>
                <Dialog.Description className="text-kumo-subtle">
                  {book.title} の記録を削除します。この操作は取り消せません。
                </Dialog.Description>
                <div className="mt-6 flex justify-end gap-2">
                  <Dialog.Close render={(props) => <Button {...props} variant="secondary">やめる</Button>} />
                  <Dialog.Close
                    render={(props) => (
                      <Button
                        {...props}
                        variant="destructive"
                        onClick={() => void remove()}
                      >
                        削除する
                      </Button>
                    )}
                  />
                </div>
              </Dialog>
            </Dialog.Root>
          </div>
        </div>
      </div>

      {editing ? (
        <LayerCard className="p-6">
          <BookForm initial={book} submitLabel="変更を保存" onSubmit={patch} />
        </LayerCard>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-kumo-subtle">{label}</dt>
      <dd className="mt-1 text-kumo-default">{value || "—"}</dd>
    </div>
  );
}
