import {
  AUTH_CODE_LENGTH,
  CROCKFORD_BASE32_ALPHABET,
} from "./constants";

/**
 * ランダムな認証コードを生成する。
 * 32種類の文字に対して1バイト(0〜255)を対応させており、
 * 256 ÷ 32 = 8 で割り切れるため、剰余を取っても文字の出現に偏りは出ない。
 */
export function generateAuthCode(length = AUTH_CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) =>
      CROCKFORD_BASE32_ALPHABET[
        byte % CROCKFORD_BASE32_ALPHABET.length
      ]
  ).join("");
}
