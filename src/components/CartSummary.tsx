import type { MenuItemProps } from "./MenuItem";

function CartSummary(props: { items: MenuItemProps[] }) {
  const { items } = props;
  const total = items.reduce((acc, item) => acc + item.price * item.count, 0);

  return (
    <div>
      <p>合計: {total}円</p>
    </div>
  );
}

export default CartSummary;
