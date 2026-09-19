import type { MenuItemProps } from "./MenuItem";

interface CartSummaryProps {
  items: MenuItemProps[];
  onSelectTime: () => void;
}

function CartSummary({ items, onSelectTime }: CartSummaryProps) {
  const total = items.reduce((acc, item) => acc + item.price * item.count, 0);
  const totalCount = items.reduce((acc, item) => acc + item.count, 0);

  return (
    <div>
      <p>合計: {total}円</p>

      {/* 1個以上注文を受けていないと押せないボタン */}
      <button onClick={onSelectTime} disabled={totalCount === 0}>
        {totalCount === 0 ? "商品を選択してください" : "受取時間を選ぶ"}
      </button>
    </div>
  );
}

export default CartSummary;
