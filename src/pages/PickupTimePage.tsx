import { useLocation, Navigate } from "react-router-dom";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  count: number;
};

function PickupTimePage() {
  const location = useLocation();
  const state = location.state as { selectedItems: OrderItem[] } | undefined;
  const selectedItems = state?.selectedItems ?? [];

  return (
    <>

    </>
  );
}

export default PickupTimePage;
