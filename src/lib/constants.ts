/** 注文・チケットに関する業務ルール。 */
export const MAX_ITEM_QUANTITY = 3;
export const AUTH_CODE_LENGTH = 6;
export const TICKET_STORAGE_KEY = "bunkasai-order-ticket";

/** 受け取り枠に関する業務ルール。 */
export const PICKUP_OPEN_HOUR = 10;
export const PICKUP_OPEN_MINUTE = 0;
export const PICKUP_CLOSE_HOUR = 15;
export const PICKUP_CLOSE_MINUTE = 0;
export const PICKUP_SLOT_DURATION_MINUTES = 15;
export const PICKUP_SLOT_CAPACITY = 5;

/** APIデモの挙動を制御する設定。 */
export const TIME_SLOTS_FETCH_DELAY_MS = 400;
export const ORDER_SUBMIT_DELAY_MS = 600;
export const DEMO_RESERVED_CAPACITY_BUFFER = 2;
export const DEMO_SLOT_FULL_PROBABILITY = 0.05;

/** 時刻・空き状況の計算に使う定数。 */
export const MINUTES_PER_HOUR = 60;
export const TIME_LABEL_DIGITS = 2;
export const SLOT_STATUS_FULL_THRESHOLD = 1;
export const SLOT_STATUS_FEW_THRESHOLD = 0.8;
export const SLOT_STATUS_SOME_THRESHOLD = 0.5;

/** Crockford Base32の文字集合。 */
export const CROCKFORD_BASE32_ALPHABET =
  "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
