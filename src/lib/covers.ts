import { toIsbn10, toIsbn13 } from "./isbn";

export function coverCandidates(input: {
  coverUrl?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
}): string[] {
  const seen = new Set<string>();
  const add = (url?: string | null) => {
    const trimmed = url?.trim();
    if (trimmed) seen.add(trimmed);
  };

  add(input.coverUrl);

  const isbn13 = input.isbn13 ? toIsbn13(input.isbn13) : null;
  const isbn10 = input.isbn10 ? toIsbn10(input.isbn10) : isbn13 ? toIsbn10(isbn13) : null;

  if (isbn13) {
    add(`https://cover.openbd.jp/${isbn13}.jpg`);
    add(`https://img.hanmoto.com/bd/img/${isbn13}.jpg`);
  }
  if (isbn10) {
    add(`https://images-na.ssl-images-amazon.com/images/P/${isbn10}.09.LZZZZZZZ.jpg`);
  }

  return [...seen];
}

export function isTinyCover(width: number, height: number) {
  return width < 40 || height < 40;
}
