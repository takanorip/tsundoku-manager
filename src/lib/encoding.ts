function scoreDecodedCsv(text: string): number {
  let score = 0;
  if (/注文日|商品名|製品コード|カテゴリー|ジャンル/.test(text)) score += 6;
  if (/Order Date|Product Name|ASIN/.test(text)) score += 4;
  if (/title|isbn/i.test(text)) score += 2;
  if (text.includes("\uFFFD")) score -= 8;
  if (/ã.|å.|æ.|ó|•i|–¼/.test(text) && !/注文|商品/.test(text)) score -= 4;
  return score;
}

function decodeWith(label: string, bytes: Uint8Array): string | null {
  try {
    return new TextDecoder(label).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}

export function decodeCsvBuffer(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const utf8 = decodeWith("utf-8", bytes) ?? "";
  const shiftJis = decodeWith("shift_jis", bytes) ?? decodeWith("windows-31j", bytes);
  if (!shiftJis) return utf8;
  return scoreDecodedCsv(shiftJis) > scoreDecodedCsv(utf8) ? shiftJis : utf8;
}
