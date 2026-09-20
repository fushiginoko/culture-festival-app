import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import type { Ticket } from "./pages/ticketStorage";
import { clearStoredTicket, readStoredTicket } from "./pages/ticketStorage";
import "./pages/PickupTimePage.css";

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

export default TicketPage;
