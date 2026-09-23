import { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import type { OrderItem, TimeSlot } from "../types";
import { fetchTimeSlots, submitOrder } from "../lib/pickupApi";
import { saveTicket } from "../lib/ticketStorage";
import TimeSlotGrid from "../components/TimeSlotGrid";
import OrderConfirmBar from "../components/OrderConfirmBar";
import type { Ticket } from "../lib/ticketStorage";
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

    // ページを開いたまま受付締切をまたいでも、選択可能な枠を更新する。
    const refreshTimer = window.setInterval(() => {
      fetchTimeSlots()
        .then((data) => {
          if (cancelled) return;
          setSlots(data);
          setSelectedSlot((selected) => {
            if (!selected) return null;
            const refreshed = data.find(
              (slot) =>
                slot.start === selected.start && slot.end === selected.end
            );
            return refreshed &&
              refreshed.status !== "full" &&
              refreshed.status !== "closed" &&
              refreshed.status !== "past"
              ? refreshed
              : null;
          });
        })
        .catch(() => {});
    }, 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length]);

  if (cartItems.length === 0) {
    return <Navigate to="/" replace />;
  }

  const handleSelectSlot = (slot: TimeSlot) => {
    if (
      slot.status === "full" ||
      slot.status === "closed" ||
      slot.status === "past" ||
      view === "submitting"
    )
      return;
    setSelectedSlot((prev) => (prev && prev.start === slot.start ? null : slot));
  };

  const handleConfirm = async () => {
    if (
      !selectedSlot ||
      selectedSlot.status === "full" ||
      selectedSlot.status === "closed" ||
      selectedSlot.status === "past"
    )
      return;
    setView("submitting");
    setErrorMessage("");

    try {
      // 確定直前に再取得し、画面表示後の締切・満枠を反映する。
      const latestSlots = await fetchTimeSlots();
      setSlots(latestSlots);
      const latestSlot = latestSlots.find(
        (slot) =>
          slot.start === selectedSlot.start && slot.end === selectedSlot.end
      );

      if (
        !latestSlot ||
        latestSlot.status === "full" ||
        latestSlot.status === "closed" ||
        latestSlot.status === "past"
      ) {
        setSelectedSlot(null);
        setErrorMessage(
          "選んだ時間帯は受付終了または満枠になりました。別の時間を選んでください。"
        );
        setView("ready");
        return;
      }

      setSelectedSlot(latestSlot);
      const result = await submitOrder(cartItems, latestSlot);

      if (result.ok) {
        const newTicket: Ticket = {
          code: result.authCode,
          items: cartItems,
          pickupTime: `${latestSlot.start}〜${latestSlot.end}`,
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
