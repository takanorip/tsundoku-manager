"use client";

import { LayerCard, Link } from "@cloudflare/kumo";
import { bookHref } from "@/lib/paths";
import { SOURCE_LABELS, unreadDays, type Book } from "@/lib/types";
import { Cover } from "./Cover";
import { StatusBadge } from "./StatusBadge";

export function BookCard({ book }: { book: Book }) {
  const days = unreadDays(book);

  return (
    <Link href={bookHref(book.id)} variant="plain" className="block">
      <LayerCard className="overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden bg-kumo-recessed">
          <Cover title={book.title} coverUrl={book.coverUrl} isbn13={book.isbn13} isbn10={book.isbn10} />
          <div className="absolute left-3 top-3">
            <StatusBadge status={book.status} />
          </div>
        </div>
        <LayerCard.Primary className="space-y-2">
          <h2 className="line-clamp-2 text-base font-semibold text-kumo-strong">{book.title}</h2>
          <p className="line-clamp-1 text-sm text-kumo-subtle">
            {book.authors.join(" / ") || "著者未登録"}
          </p>
          <div className="flex items-center justify-between pt-1 text-xs text-kumo-subtle">
            <span>{SOURCE_LABELS[book.source]}</span>
            {days > 0 ? <span>積んで {days} 日</span> : <span>{book.publishedDate ?? ""}</span>}
          </div>
        </LayerCard.Primary>
      </LayerCard>
    </Link>
  );
}
