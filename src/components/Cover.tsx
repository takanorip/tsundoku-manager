"use client";

import { useMemo, useState } from "react";
import { coverCandidates, isTinyCover } from "@/lib/covers";

type CoverProps = {
  title: string;
  coverUrl?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  className?: string;
};

function Spine({ title, className }: { title: string; className: string }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-kumo-contrast px-3 py-4 text-kumo-inverse ${className}`}
    >
      <span className="spine-title text-sm leading-6 tracking-[0.2em]">{title}</span>
    </div>
  );
}

function CoverImage({
  title,
  urls,
  className,
}: {
  title: string;
  urls: string[];
  className: string;
}) {
  const [index, setIndex] = useState(0);
  const src = urls[index];

  if (!src) {
    return <Spine title={title} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${title} の表紙`}
      referrerPolicy="no-referrer"
      className={`h-full w-full object-cover ${className}`}
      onLoad={(event) => {
        const image = event.currentTarget;
        if (isTinyCover(image.naturalWidth, image.naturalHeight)) {
          setIndex((current) => current + 1);
        }
      }}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}

export function Cover({ title, coverUrl, isbn13, isbn10, className = "" }: CoverProps) {
  const urls = useMemo(() => coverCandidates({ coverUrl, isbn13, isbn10 }), [coverUrl, isbn10, isbn13]);
  return <CoverImage key={urls.join("|")} title={title} urls={urls} className={className} />;
}
