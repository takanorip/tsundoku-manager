export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function bookHref(id: string) {
  return `/books/?id=${encodeURIComponent(id)}`;
}
