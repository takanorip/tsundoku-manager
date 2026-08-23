const ISBN10_RE = /^[0-9]{9}[0-9X]$/;
const ISBN13_RE = /^97[89][0-9]{10}$/;

export function normalizeIsbn(input: string): string {
  return input.replace(/[-\s　]/g, "").toUpperCase();
}

export function isbn10CheckDigit(body9: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(body9[i]) * (10 - i);
  }
  const remainder = (11 - (sum % 11)) % 11;
  return remainder === 10 ? "X" : String(remainder);
}

export function isbn13CheckDigit(body12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function isIsbn10(value: string): boolean {
  const normalized = normalizeIsbn(value);
  if (!ISBN10_RE.test(normalized)) return false;
  return isbn10CheckDigit(normalized.slice(0, 9)) === normalized[9];
}

export function isIsbn13(value: string): boolean {
  const normalized = normalizeIsbn(value);
  if (!ISBN13_RE.test(normalized)) return false;
  return isbn13CheckDigit(normalized.slice(0, 12)) === normalized[12];
}

export function isIsbn(value: string): boolean {
  return isIsbn10(value) || isIsbn13(value);
}

export function isbn10To13(isbn10: string): string {
  const normalized = normalizeIsbn(isbn10);
  if (!isIsbn10(normalized)) {
    throw new Error(`Invalid ISBN-10: ${isbn10}`);
  }
  const body12 = `978${normalized.slice(0, 9)}`;
  return `${body12}${isbn13CheckDigit(body12)}`;
}

export function isbn13To10(isbn13: string): string {
  const normalized = normalizeIsbn(isbn13);
  if (!isIsbn13(normalized) || !normalized.startsWith("978")) {
    throw new Error(`Cannot convert ISBN-13 to ISBN-10: ${isbn13}`);
  }
  const body9 = normalized.slice(3, 12);
  return `${body9}${isbn10CheckDigit(body9)}`;
}

export function toIsbn13(value: string): string | null {
  const normalized = normalizeIsbn(value);
  if (isIsbn13(normalized)) return normalized;
  if (isIsbn10(normalized)) return isbn10To13(normalized);
  return null;
}

export function toIsbn10(value: string): string | null {
  const normalized = normalizeIsbn(value);
  if (isIsbn10(normalized)) return normalized;
  if (isIsbn13(normalized) && normalized.startsWith("978")) {
    return isbn13To10(normalized);
  }
  return null;
}

export function detectIsbn(text: string): string | null {
  const compact = text.replace(/[-\s　]/g, "").toUpperCase();
  const isbn13 = compact.match(/97[89]\d{10}/g) ?? [];
  for (const candidate of isbn13) {
    if (isIsbn13(candidate)) return candidate;
  }

  const isbn10 = compact.match(/\d{9}[\dX]/g) ?? [];
  for (const candidate of isbn10) {
    if (isIsbn10(candidate)) return isbn10To13(candidate);
  }

  return null;
}

export function hyphenateIsbn13(isbn13: string): string {
  const normalized = normalizeIsbn(isbn13);
  if (!isIsbn13(normalized)) return isbn13;
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 12)}-${normalized.slice(12)}`;
}
