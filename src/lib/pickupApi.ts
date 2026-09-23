import type { OrderItem, SlotStatus, TimeSlot } from "../types";
import { supabase } from "./supabase";
import {
  MINUTES_PER_HOUR,
  PICKUP_CLOSE_HOUR,
  PICKUP_CLOSE_MINUTE,
  PICKUP_OPEN_HOUR,
  PICKUP_OPEN_MINUTE,
  PICKUP_SLOT_CAPACITY,
  PICKUP_SLOT_DURATION_MINUTES,
  SLOT_STATUS_FULL_THRESHOLD,
  SLOT_STATUS_FEW_THRESHOLD,
  SLOT_STATUS_SOME_THRESHOLD,
  TIME_LABEL_DIGITS,
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

/**
 * Supabaseから実際の注文数を取得し、各時間帯の混雑状況を計算して返す
 */
export async function fetchTimeSlots(
  simulatedTime: Date = new Date()
): Promise<TimeSlot[]> {
  try {
    // Supabaseから現在有効な注文の slot_id を取得
    const { data: orders, error } = await supabase
      .from("orders")
      .select("slot_id")
      .neq("status", "cancelled");

    if (error) {
      console.error("注文状況の取得に失敗しました:", error.message);
      throw error;
    }

    // スロットごとの予約数をカウント
    const counts: Record<string, number> = {};
    for (const order of orders || []) {
      counts[order.slot_id] = (counts[order.slot_id] || 0) + 1;
    }

    // 枠一覧に対して実際の混雑度をマッピング
    return generateSlotLabels().map(({ start, end }) => {
      const slotId = `${start}-${end}`;
      const reserved = counts[slotId] || 0;
      const ratio = reserved / PICKUP_SLOT_CAPACITY;

      return {
        start,
        end,
        status: statusForSlot(
          start,
          end,
          simulatedTime,
          statusFromRatio(ratio)
        ),
      };
    });
  } catch (e) {
    console.error("fetchTimeSlots failed:", e);
    // 万が一ネットが繋がらない時は全枠closed等にフォールバック
    return generateSlotLabels().map(({ start, end }) => ({
      start,
      end,
      status: "closed",
    }));
  }
}

export type SubmitOrderResult =
  | { ok: true; authCode: string }
  | { ok: false; reason: "slot_full" | "network_error" };

/**
 * 注文をSupabaseに送信し、確定したらBase32認証コードを返す
 */
export async function submitOrder(
  items: OrderItem[],
  slot: Pick<TimeSlot, "start" | "end">
): Promise<SubmitOrderResult> {
  const slotId = `${slot.start}-${slot.end}`;

  try {
    // 1. 念のため現在の枠の埋まり具合をチェック
    const { count, error: countError } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", slotId)
      .neq("status", "cancelled");

    if (countError) throw countError;

    if (count !== null && count >= PICKUP_SLOT_CAPACITY) {
      return { ok: false, reason: "slot_full" };
    }

    // 3. 合計金額の計算
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.count,
      0
    );

    // （Rust側が受け取れるように product_id と quantity に整形して送信）
    const formattedItems = items.map((item) => ({
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.count,
    }));

    // 4. Supabaseの orders テーブルへ INSERT！
    const result = await supabase.from("orders").insert({
      slot_id: slotId,
      items: formattedItems,
      total_price: totalPrice,
      status: "pending",
    }).select("auth_code").single();

    if (result.error) {
      console.error("Supabase insert error:", result.error.message);
      return { ok: false, reason: "network_error" };
    }

    const authCode = (result.data as { auth_code: string }).auth_code;
    console.log(`🎉 注文確定！ [AuthCode: ${authCode}, Slot: ${slotId}]`);
    return { ok: true, authCode };
  } catch (error) {
    console.error("submitOrder failed:", error);
    return { ok: false, reason: "network_error" };
  }
}
