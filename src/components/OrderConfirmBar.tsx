import type { TimeSlot } from "../types";

type OrderConfirmBarProps = {
  selectedSlot: TimeSlot | null;
  submitting: boolean;
  onConfirm: () => void;
};

function OrderConfirmBar({
  selectedSlot,
  submitting,
  onConfirm,
}: OrderConfirmBarProps) {
  return (
    <div className={`confirm-bar ${selectedSlot ? "confirm-bar--visible" : ""}`}>
      <div className="confirm-bar__inner">
        <span>
          {selectedSlot ? `${selectedSlot.start}〜${selectedSlot.end} で受け取る` : ""}
        </span>
        <button
          type="button"
          className="confirm-button"
          disabled={!selectedSlot || submitting}
          onClick={onConfirm}
        >
          {submitting ? "送信中…" : "注文を確定する"}
        </button>
      </div>
    </div>
  );
}

export default OrderConfirmBar;
