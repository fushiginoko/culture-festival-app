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
