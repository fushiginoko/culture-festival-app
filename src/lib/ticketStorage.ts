import type { OrderItem } from "../types";
import { TICKET_STORAGE_KEY } from "./constants";

export type Ticket = {
  code: string;
  items: OrderItem[];
  pickupTime: string; // フル表記。例: "10:00〜10:15"
};

/**
 * 保存済みのチケットを読み込む。
 * MenuPage（チケットの有無だけ確認したい）と
 * TicketPage（チケット画面を表示したい）の両方から使う。
 */
export function readStoredTicket(): Ticket | null {
  try {
    const raw = localStorage.getItem(TICKET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Ticket> & { createdAt?: string };
    if (
      !parsed ||
      typeof parsed.code !== "string" ||
      typeof parsed.pickupTime !== "string" ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    return { code: parsed.code, items: parsed.items, pickupTime: parsed.pickupTime };
  } catch {
    return null;
  }
}

/** 注文確定時にチケットを保存する。 */
export function saveTicket(ticket: Ticket) {
  try {
    localStorage.setItem(
      TICKET_STORAGE_KEY,
      JSON.stringify({ ...ticket, createdAt: new Date().toISOString() })
    );
  } catch {
    // 保存に失敗しても致命的ではないので握りつぶす
  }
}

/** 「新しく注文する」を選んだときなどにチケットを消す。 */
export function clearStoredTicket() {
  try {
    localStorage.removeItem(TICKET_STORAGE_KEY);
  } catch {
    // 失敗しても致命的ではないので握りつぶす
  }
}
