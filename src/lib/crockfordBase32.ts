// Crockford's Base32 で使う文字集合。
// 見間違えやすい I, L, O, U を除いた32文字。
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * ランダムな認証コードを生成する。
 * 32種類の文字に対して1バイト(0〜255)を対応させており、
 * 256 ÷ 32 = 8 で割り切れるため、剰余を取っても文字の出現に偏りは出ない。
 */
export function generateAuthCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => CROCKFORD_ALPHABET[byte % CROCKFORD_ALPHABET.length]
  ).join("");
}
