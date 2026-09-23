import type { SlotStatus, TimeSlot } from "../types";

type TimeSlotGridProps = {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  disabled: boolean;
  onSelect: (slot: TimeSlot) => void;
};

const STATUS_LABEL: Record<SlotStatus, string> = {
  many: "◎",
  some: "○",
  few: "△",
  full: "×",
  closed: "締切",
  past: "終了",
};

const STATUS_TEXT: Record<SlotStatus, string> = {
  many: "空きあり",
  some: "やや混雑",
  few: "残りわずか",
  full: "満枠",
  closed: "受付終了",
  past: "終了済み",
};

function TimeSlotGrid({
  slots,
  selectedSlot,
  disabled,
  onSelect,
}: TimeSlotGridProps) {
  const allFull = slots.length > 0 && slots.every((slot) => slot.status === "full");

  return (
    <>
      <div className="legend">
        <span>◎ 空きあり</span>
        <span>○ やや混雑</span>
        <span>△ 残りわずか</span>
        <span>× 満枠</span>
        <span>締切 受付終了</span>
        <span>終了 過去の枠</span>
      </div>

      {allFull && (
        <p className="error-banner">
          本日の受け取り枠はすべて埋まってしまいました。スタッフにお声がけください。
        </p>
      )}

      <div className="time-grid">
        {slots.map((slot) => {
          const isSelected =
            selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;

          return (
            <button
              key={slot.start}
              type="button"
              className={`time-slot time-slot--${slot.status} ${
                isSelected ? "time-slot--selected" : ""
              }`}
              disabled={
                slot.status === "full" ||
                slot.status === "closed" ||
                slot.status === "past" ||
                disabled
              }
              aria-pressed={isSelected}
              aria-label={`${slot.start}から${slot.end}、${STATUS_TEXT[slot.status]}`}
              onClick={() => onSelect(slot)}
            >
              {/* グリッド上は開始時刻のみの簡略表記。フル表記は確定バー／チケット側で表示 */}
              <span className="time-slot__label">{slot.start}〜</span>
              <span className="time-slot__status" aria-hidden="true">
                {STATUS_LABEL[slot.status]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export default TimeSlotGrid;
