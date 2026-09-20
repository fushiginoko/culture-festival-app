import { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import type { OrderItem, TimeSlot } from "./types";
import { fetchTimeSlots, submitOrder } from "./pickupApi";
import { saveTicket } from "./ticketStorage";
import TimeSlotGrid from "../components/TimeSlotGrid";
import OrderConfirmBar from "../components/OrderConfirmBar";
import type { Ticket } from "./ticketStorage";
import "./PickupTimePage.css";

type LocationState = { selectedItems: OrderItem[] } | undefined;
type ViewState = "loading" | "ready" | "submitting" | "error";

function PickupTimePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const cartItems = state?.selectedItems ?? [];

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [view, setView] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // カートが空の場合は枠の取得を行わない
    if (cartItems.length === 0) return;

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
  }, [cartItems.length]);

  if (cartItems.length === 0) {
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
        saveTicket(newTicket);
        navigate("/ticket", { replace: true });
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
          <TimeSlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            disabled={view === "submitting"}
            onSelect={handleSelectSlot}
          />
        </>
      )}

      <OrderConfirmBar
        selectedSlot={selectedSlot}
        submitting={view === "submitting"}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default PickupTimePage;
