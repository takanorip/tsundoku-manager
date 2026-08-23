const ROLE_SUFFIX = /[　\s]*(著|訳|編|監修|画|作).*$/u;
const JAPANESE = /[\u3040-\u30ff\u4e00-\u9fff]/;

export function formatPersonName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  if (trimmed.includes(",") && JAPANESE.test(trimmed)) {
    return trimmed.replace(/[,，]\s*/g, "");
  }

  const western = trimmed.match(/^([A-Za-z.'-]+),\s*([A-Za-z.' -]+)$/);
  if (western) {
    return `${western[2].trim()} ${western[1].trim()}`;
  }

  return trimmed;
}

export function splitAuthors(raw?: string): string[] {
  if (!raw) return [];

  return raw
    .split(/[／/]/)
    .map((part) => part.replace(ROLE_SUFFIX, "").trim())
    .filter(Boolean)
    .flatMap((part) => {
      if (part.includes("、")) {
        return part.split("、").map((item) => item.trim());
      }
      if (/,[^\s]/.test(part) && /\s/.test(part)) {
        return part.split(/\s+/);
      }
      return [part];
    })
    .map(formatPersonName)
    .filter(Boolean);
}

export function splitTitle(raw: string): { title: string; subtitle?: string } {
  const [title, subtitle] = raw.split(/\s*[:：]\s*/, 2);
  return { title: title.trim(), subtitle: subtitle?.trim() || undefined };
}
