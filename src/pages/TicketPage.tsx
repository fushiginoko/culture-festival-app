import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { Ticket } from "../lib/ticketStorage";
import { clearStoredTicket, readStoredTicket } from "../lib/ticketStorage";
import OrderHeader from "../components/OrderHeader";
import "./PickupTimePage.css";

function TicketPage() {
  const navigate = useNavigate();
  const [ticket] = useState<Ticket | null>(() => readStoredTicket());

  if (!ticket) {
    return <Navigate to="/" replace />;
  }

  const handleStartNewOrder = () => {
    const okToProceed = window.confirm(
      "スクリーンショットは保存しましたか？（新しい注文に進むと現在の画面はリセットされます）"
    );
    if (!okToProceed) return;

    clearStoredTicket();
    navigate("/", { replace: true });
  };

  return (
    <div className="pickup-page pickup-page--confirmed">
      <OrderHeader currentStep={3} />
      <div className="ticket-flow">
        <main className="ticket-card">
          <header className="ticket-header">
            <span className="ticket-success-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m5 12 4.5 4.5L19 7" />
              </svg>
            </span>
            <p className="pickup-eyebrow">ORDER CONFIRMED</p>
            <h1>予約が完了しました</h1>
            <p className="ticket-instruction">
              受け取りまで、この画面を保存しておいてください。
            </p>
          </header>

          <section className="ticket-code-block" aria-label={`認証コード ${ticket.code}`}>
            <p>受け取り用コード</p>
            <div className="auth-code">{ticket.code}</div>
            <p className="ticket-code-hint">受け取りの際にスタッフへお見せください</p>
          </section>

          <div className="ticket-details">
            <section className="ticket-time">
              <p>受け取り時間</p>
              <strong>{ticket.pickupTime}</strong>
            </section>
            <section className="ticket-items">
              <h2>ご注文内容</h2>
              <ul className="order-summary">
                {ticket.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <strong>{item.count}点</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <p className="note">
            スクリーンショットでもお受け取りいただけます。混み合う場合は、スタッフが順番にご案内します。
          </p>
          <button
            type="button"
            className="new-order-button"
            onClick={handleStartNewOrder}
          >
            次の注文を始める
          </button>
        </main>
      </div>
    </div>
  );
}

export default TicketPage;
