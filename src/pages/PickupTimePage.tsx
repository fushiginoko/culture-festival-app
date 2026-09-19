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

  if (selectedItems.length === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <>

    </>
  );
}

export default PickupTimePage;
