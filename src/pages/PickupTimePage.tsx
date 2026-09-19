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

    </>
  );
}

export default PickupTimePage;
