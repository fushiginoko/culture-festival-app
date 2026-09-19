import type { OrderItem, SlotStatus, TimeSlot } from "./types";
import { generateAuthCode } from "./crockfordBase32";

// ▼ 営業時間・枠の設定（実際の文化祭のスケジュールに合わせて変更してください）
const OPEN_HOUR = 10;
const OPEN_MINUTE = 0;
const CLOSE_HOUR = 15;
const CLOSE_MINUTE = 0;
const SLOT_MINUTES = 15;
const CAPACITY_PER_SLOT = 8; // 1枠あたりの受付上限人数

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function generateSlotLabels(): { start: string; end: string }[] {
  const labels: { start: string; end: string }[] = [];
  let h = OPEN_HOUR;
  let m = OPEN_MINUTE;

  while (h < CLOSE_HOUR || (h === CLOSE_HOUR && m < CLOSE_MINUTE)) {
    const start = `${pad(h)}:${pad(m)}`;
    let nextM = m + SLOT_MINUTES;
    let nextH = h;
    if (nextM >= 60) {
      nextM -= 60;
      nextH += 1;
    }
    labels.push({ start, end: `${pad(nextH)}:${pad(nextM)}` });
    h = nextH;
    m = nextM;
  }
  return labels;
}

function statusFromRatio(ratio: number): SlotStatus {
  if (ratio >= 1) return "full";
  if (ratio >= 0.8) return "few";
  if (ratio >= 0.5) return "some";
  return "many";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 各時間帯の空き状況を取得する。
 *
 * TODO: ここをスタッフ側と同期しているサーバー（例: 独自REST API や
 * Firebase Realtime Database など）への問い合わせに置き換えてください。
 * 今はデモ用にランダムな空き状況を返しています。
 */
export async function fetchTimeSlots(): Promise<TimeSlot[]> {
  await wait(400);
  return generateSlotLabels().map(({ start, end }) => {
    const reserved = Math.floor(Math.random() * (CAPACITY_PER_SLOT + 2));
    return { start, end, status: statusFromRatio(reserved / CAPACITY_PER_SLOT) };
  });
}

export type SubmitOrderResult =
  | { ok: true; authCode: string }
  | { ok: false; reason: "slot_full" | "network_error" };

/**
 * 注文を送信し、スタッフ側のシステムに受け付けられたことを確認してから
 * 認証コードを受け取る。
 *
 * TODO: ここを実際のサーバーへの送信処理に置き換えてください。
 * サーバー側で「その時間帯がまだ埋まっていないか」を再チェックし、
 * 受付が確定した場合にのみ authCode を発行してレスポンスとして
 * 返すようにすると、二重予約や表示上の空き枠とのズレを防げます。
 * （認証コードはここで生成していますが、本番ではスタッフ側との
 * 照合のためサーバー側で発行するのが望ましいです）
 */
export async function submitOrder(
  items: OrderItem[],
  slot: Pick<TimeSlot, "start" | "end">
): Promise<SubmitOrderResult> {
  await wait(600);
  void items; // 実装時はここでリクエストボディに含める
  void slot; // 実装時はここでリクエストボディに含める

  // デモ用: まれに「ちょうど満枠になってしまった」ケースを再現
  if (Math.random() < 0.05) {
    return { ok: false, reason: "slot_full" };
  }

  return { ok: true, authCode: generateAuthCode(6) };
}
