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
  const state = location.state as { selectedItems: OrderItem[] } | undefined;
  const selectedItems = state?.selectedItems ?? [];

  if (selectedItems.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <>

    </>
  );
}

export default PickupTimePage;
