import { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import type { OrderItem, SlotStatus, TimeSlot } from "./types";
import { fetchTimeSlots, submitOrder } from "./pickupApi";
import "./PickupTimePage.css";

type LocationState = { selectedItems: OrderItem[] } | undefined;
type ViewState = "loading" | "ready" | "submitting" | "error" | "confirmed";

type Ticket = {
  code: string;
  items: OrderItem[];
  pickupTime: string; // フル表記。例: "10:00〜10:15"
};

const STATUS_LABEL: Record<SlotStatus, string> = {
  many: "◎",
  some: "○",
  few: "△",
  full: "×",
};

const STATUS_TEXT: Record<SlotStatus, string> = {
  many: "空きあり",
  some: "やや混雑",
  few: "残りわずか",
  full: "満枠",
};

const STORAGE_KEY = "bunkasai-order-ticket";

function readStoredTicket(): Ticket | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function clearStoredTicket() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 失敗しても致命的ではないので握りつぶす
  }
}

function PickupTimePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const cartItems = state?.selectedItems ?? [];

  // 初回マウント時に保存済みチケットがあれば即座に復元する
  const [ticket, setTicket] = useState<Ticket | null>(() => readStoredTicket());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [view, setView] = useState<ViewState>(() => (ticket ? "confirmed" : "loading"));
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // 復元済みチケットがある場合や、カートが空の場合は枠の取得を行わない
    if (ticket || cartItems.length === 0) return;

    let cancelled = false;
    fetchTimeSlots()
      .then((data) => {
        if (cancelled) return;
        setSlots(data);
        setView("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage(
          "受け取り時間の空き状況を取得できませんでした。電波の良い場所でもう一度お試しください。"
        );
        setView("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, cartItems.length]);

  // カートが空でも、復元できるチケットがあればメニューへは戻さない
  if (!ticket && cartItems.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleSelectSlot = (slot: TimeSlot) => {
    if (slot.status === "full" || view === "submitting") return;
    setSelectedSlot((prev) => (prev && prev.start === slot.start ? null : slot));
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setView("submitting");
    setErrorMessage("");

    try {
      const result = await submitOrder(cartItems, selectedSlot);

      if (result.ok) {
        const newTicket: Ticket = {
          code: result.authCode,
          items: cartItems,
          pickupTime: `${selectedSlot.start}〜${selectedSlot.end}`,
        };
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...newTicket, createdAt: new Date().toISOString() })
        );
        setTicket(newTicket);
        setView("confirmed");
        return;
      }

      if (result.reason === "slot_full") {
        setErrorMessage(
          "選んだ時間帯がちょうど満枠になってしまいました。別の時間を選んでください。"
        );
        setSelectedSlot(null);
        fetchTimeSlots()
          .then(setSlots)
          .catch(() => {});
      } else {
        setErrorMessage("通信エラーが発生しました。もう一度お試しください。");
      }
      setView("ready");
    } catch {
      setErrorMessage("通信エラーが発生しました。もう一度お試しください。");
      setView("ready");
    }
  };

  const handleStartNewOrder = () => {
    const okToProceed = window.confirm(
      "スクリーンショットは保存しましたか？（新しい注文に進むと現在の画面はリセットされます）"
    );
    if (!okToProceed) return;
    clearStoredTicket();
    navigate("/", { replace: true });
  };

  // ── 予約確定後：認証コードのチケット画面 ──────────────────
  if (view === "confirmed" && ticket) {
    return (
      <div className="pickup-page pickup-page--confirmed">
        <h1>予約が完了しました</h1>
        <p className="ticket-instruction">
          この画面をスクリーンショットして保存してください。
        </p>
        <div className="auth-code" aria-label={`認証コード ${ticket.code}`}>
          {ticket.code}
        </div>
        <p className="pickup-time">受け取り時間：{ticket.pickupTime}</p>
        <ul className="order-summary">
          {ticket.items.map((item) => (
            <li key={item.id}>
              {item.name} × {item.count}
            </li>
          ))}
        </ul>
        <p className="note">
          受け取りの際は、この画面またはスクリーンショットを見せるか、
          コードを口頭で伝えてください。
        </p>
        <button
          type="button"
          className="new-order-button"
          onClick={handleStartNewOrder}
        >
          別の商品を新しく注文する
        </button>
      </div>
    );
  }

  const allFull = slots.length > 0 && slots.every((s) => s.status === "full");

  // ── 時間指定グリッド画面 ──────────────────────────────
  return (
    <div className="pickup-page">
      <h1>受け取り時間を選んでください</h1>

      {view === "loading" && <p>読み込み中…</p>}

      {view === "error" && (
        <div className="error-banner">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </div>
      )}

      {(view === "ready" || view === "submitting") && (
        <>
          {errorMessage && <p className="error-banner">{errorMessage}</p>}

          <div className="legend">
            <span>◎ 空きあり</span>
            <span>○ やや混雑</span>
            <span>△ 残りわずか</span>
            <span>× 満枠</span>
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
                  disabled={slot.status === "full" || view === "submitting"}
                  aria-pressed={isSelected}
                  aria-label={`${slot.start}から${slot.end}、${STATUS_TEXT[slot.status]}`}
                  onClick={() => handleSelectSlot(slot)}
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
      )}

      <div className={`confirm-bar ${selectedSlot ? "confirm-bar--visible" : ""}`}>
        <div className="confirm-bar__inner">
          <span>
            {selectedSlot ? `${selectedSlot.start}〜${selectedSlot.end} で受け取る` : ""}
          </span>
          <button
            type="button"
            className="confirm-button"
            disabled={!selectedSlot || view === "submitting"}
            onClick={handleConfirm}
          >
            {view === "submitting" ? "送信中…" : "注文を確定する"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PickupTimePage;
