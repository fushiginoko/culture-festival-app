import { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import type { OrderItem, TimeSlot } from "../types";
import { fetchTimeSlots, submitOrder } from "../lib/pickupApi";
import { saveTicket } from "../lib/ticketStorage";
import TimeSlotGrid from "../components/TimeSlotGrid";
import OrderConfirmBar from "../components/OrderConfirmBar";
import OrderHeader from "../components/OrderHeader";
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
      <OrderHeader currentStep={2} />
      <header className="pickup-page__header">
        <div>
          <p className="pickup-eyebrow">受け取りの準備</p>
          <h1>受け取り時間を選ぶ</h1>
          <p className="pickup-page__intro">都合のよい時間をひとつ選んでください。</p>
        </div>
        <p className="pickup-page__step-note"><strong>15分ごと</strong>の受け取り枠から選べます</p>
      </header>

      <main className="pickup-page__content">
        {view === "loading" && (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="loading-state__mark" aria-hidden="true" />
            <p>受け取り枠を確認しています</p>
          </div>
        )}

        {view === "error" && (
          <div className="error-state" role="alert">
            <span className="error-state__mark" aria-hidden="true">!</span>
            <div>
              <p>{errorMessage}</p>
              <button type="button" onClick={() => window.location.reload()}>
                空き状況を読み込み直す
              </button>
            </div>
          </div>
        )}

        {(view === "ready" || view === "submitting") && (
          <div className="pickup-layout">
            <section className="pickup-schedule" aria-label="受け取り可能な時間">
              <header className="pickup-schedule__header">
                <div>
                  <p className="pickup-eyebrow">AVAILABLE TIMES</p>
                  <h2>受け取り枠</h2>
                </div>
                <p>空き状況を見て、枠をお選びください。</p>
              </header>
              {errorMessage && <p className="error-banner" role="alert">{errorMessage}</p>}
              <TimeSlotGrid
                slots={slots}
                selectedSlot={selectedSlot}
                disabled={view === "submitting"}
                onSelect={handleSelectSlot}
              />
            </section>

            <aside className="order-glance">
              <p className="pickup-eyebrow">YOUR ORDER</p>
              <h2>今回のご注文</h2>
              <ul>
                {cartItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <strong>{item.count}点</strong>
                  </li>
                ))}
              </ul>
              <p className="order-glance__note">選んだ時間にあわせてご用意します。受け取り時は、完了画面のコードをスタッフにお見せください。</p>
            </aside>
          </div>
        )}
      </main>

      <OrderConfirmBar
        selectedSlot={selectedSlot}
        submitting={view === "submitting"}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

export default PickupTimePage;
