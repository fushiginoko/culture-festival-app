import type { OrderItem, SlotStatus, TimeSlot } from "../types";
import { generateAuthCode } from "./crockfordBase32";
import {
  AUTH_CODE_LENGTH,
  DEMO_RESERVED_CAPACITY_BUFFER,
  DEMO_SLOT_FULL_PROBABILITY,
  MINUTES_PER_HOUR,
  PICKUP_CLOSE_HOUR,
  PICKUP_CLOSE_MINUTE,
  PICKUP_OPEN_HOUR,
  PICKUP_OPEN_MINUTE,
  PICKUP_SLOT_CAPACITY,
  PICKUP_SLOT_DURATION_MINUTES,
  ORDER_SUBMIT_DELAY_MS,
  SLOT_STATUS_FULL_THRESHOLD,
  SLOT_STATUS_FEW_THRESHOLD,
  SLOT_STATUS_SOME_THRESHOLD,
  TIME_LABEL_DIGITS,
  TIME_SLOTS_FETCH_DELAY_MS,
} from "./constants";

function pad(n: number): string {
  return n.toString().padStart(TIME_LABEL_DIGITS, "0");
}

function generateSlotLabels(): { start: string; end: string }[] {
  const labels: { start: string; end: string }[] = [];
  let h = PICKUP_OPEN_HOUR;
  let m = PICKUP_OPEN_MINUTE;

  while (
    h < PICKUP_CLOSE_HOUR ||
    (h === PICKUP_CLOSE_HOUR && m < PICKUP_CLOSE_MINUTE)
  ) {
    const start = `${pad(h)}:${pad(m)}`;
    let nextM = m + PICKUP_SLOT_DURATION_MINUTES;
    let nextH = h;
    if (nextM >= MINUTES_PER_HOUR) {
      nextM -= MINUTES_PER_HOUR;
      nextH += 1;
    }
    labels.push({ start, end: `${pad(nextH)}:${pad(nextM)}` });
    h = nextH;
    m = nextM;
  }
  return labels;
}

function statusFromRatio(ratio: number): SlotStatus {
  if (ratio >= SLOT_STATUS_FULL_THRESHOLD) return "full";
  if (ratio >= SLOT_STATUS_FEW_THRESHOLD) return "few";
  if (ratio >= SLOT_STATUS_SOME_THRESHOLD) return "some";
  return "many";
}

function slotTimeOnDate(time: string, date: Date): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  );
}

function statusForSlot(
  start: string,
  end: string,
  simulatedTime: Date,
  capacityStatus: SlotStatus
): SlotStatus {
  const endTime = slotTimeOnDate(end, simulatedTime);
  const startTime = slotTimeOnDate(start, simulatedTime);
  const cutoffTime = new Date(
    startTime.getTime() -
      PICKUP_SLOT_DURATION_MINUTES * MINUTES_PER_HOUR * 1000
  );

  if (simulatedTime >= endTime) return "past";
  if (simulatedTime >= cutoffTime) return "closed";
  return capacityStatus;
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
export async function fetchTimeSlots(
  simulatedTime: Date = new Date()
): Promise<TimeSlot[]> {
  await wait(TIME_SLOTS_FETCH_DELAY_MS);
  return generateSlotLabels().map(({ start, end }) => {
    const reserved = Math.floor(
      Math.random() * (PICKUP_SLOT_CAPACITY + DEMO_RESERVED_CAPACITY_BUFFER)
    );
    return {
      start,
      end,
      status: statusForSlot(
        start,
        end,
        simulatedTime,
        statusFromRatio(reserved / PICKUP_SLOT_CAPACITY)
      ),
    };
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
  await wait(ORDER_SUBMIT_DELAY_MS);
  void items; // 実装時はここでリクエストボディに含める
  void slot; // 実装時はここでリクエストボディに含める

  // デモ用: まれに「ちょうど満枠になってしまった」ケースを再現
  if (Math.random() < DEMO_SLOT_FULL_PROBABILITY) {
    return { ok: false, reason: "slot_full" };
  }

  return { ok: true, authCode: generateAuthCode(AUTH_CODE_LENGTH) };
}
