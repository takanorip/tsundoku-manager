"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Input, LayerCard, LinkButton, Select, SkeletonLine, Text } from "@cloudflare/kumo";
import { BooksIcon, PlusIcon } from "@phosphor-icons/react";
import {
  PURCHASE_SOURCES,
  READING_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  type Book,
  type PurchaseSource,
  type ReadingStatus,
  type Stats,
} from "@/lib/types";
import { getStats, listBooks } from "@/lib/books";
import { BookCard } from "./BookCard";
import { StatsStrip } from "./StatsStrip";

type SortKey = "added" | "title" | "unread" | "purchase";

export function Bookshelf() {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<ReadingStatus | "ALL">("ALL");
  const [source, setSource] = useState<PurchaseSource | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("added");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listBooks({
        status,
        source,
        q: q.trim() || undefined,
        sort,
      }),
      getStats(),
    ])
      .then(([nextBooks, nextStats]) => {
        if (cancelled) return;
        setBooks(nextBooks);
        setStats(nextStats);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, source, sort, q]);

  const emptyLabel = useMemo(() => {
    if (q || status !== "ALL" || source !== "ALL") return "条件に合う本がありません。検索や絞り込みを変えてみてください。";
    return "ISBNや注文履歴から本を入れてください。";
  }, [q, source, status]);

  return (
    <div>
      <div className="mb-6 space-y-2">
        <Text variant="mono-secondary">BOOKSHELF</Text>
        <Text variant="heading" size="lg" as="h1">
          本棚
        </Text>
        <Text variant="secondary">買った本と、まだ読んでいない時間を一覧します。</Text>
      </div>

      {stats ? <StatsStrip stats={stats} /> : null}

      <LayerCard className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Input
            label="検索"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="タイトル、著者、ISBN"
            className="flex-1"
          />
          <Select
            label="状態"
            className="min-w-40"
            value={status}
            onValueChange={(value) => setStatus((value as ReadingStatus | "ALL") ?? "ALL")}
            items={{
              ALL: "すべて",
              ...Object.fromEntries(READING_STATUSES.map((value) => [value, STATUS_LABELS[value]])),
            }}
          />
          <Select
            label="入手元"
            className="min-w-40"
            value={source}
            onValueChange={(value) => setSource((value as PurchaseSource | "ALL") ?? "ALL")}
            items={{
              ALL: "すべて",
              ...Object.fromEntries(PURCHASE_SOURCES.map((value) => [value, SOURCE_LABELS[value]])),
            }}
          />
          <Select
            label="並び順"
            className="min-w-44"
            value={sort}
            onValueChange={(value) => setSort((value as SortKey) ?? "added")}
            items={{
              added: "追加が新しい順",
              unread: "積読が長い順",
              purchase: "購入日が新しい順",
              title: "タイトル",
            }}
          />
        </div>
      </LayerCard>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <LayerCard key={index} className="overflow-hidden p-4">
              <div className="mb-4 aspect-[3/4] rounded-lg bg-kumo-recessed" />
              <div className="space-y-2">
                <SkeletonLine minWidth={70} maxWidth={95} className="h-4" />
                <SkeletonLine minWidth={40} maxWidth={70} className="h-3" />
              </div>
            </LayerCard>
          ))}
        </div>
      ) : books.length === 0 ? (
        <Empty
          icon={<BooksIcon size={48} className="text-kumo-inactive" />}
          title="空の棚"
          description={emptyLabel}
          contents={
            <LinkButton href="/add" variant="primary" icon={PlusIcon}>
              本を追加する
            </LinkButton>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
