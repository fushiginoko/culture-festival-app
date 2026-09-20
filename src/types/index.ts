export type OrderItem = {
  id: number;
  name: string;
  price: number;
  count: number;
};

/**
 * その時間帯の空き状況
 * ◎ many : 空きが十分にある
 * ○ some : やや埋まってきている
 * △ few  : 残りわずか
 * × full : 満枠（選択不可）
 */
export type SlotStatus = "many" | "some" | "few" | "full";

export type TimeSlot = {
  start: string; // 例: "10:15"
  end: string; // 例: "10:30"
  status: SlotStatus;
};
