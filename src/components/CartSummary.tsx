import type { MenuItemProps } from "./MenuItem";

interface CartSummaryProps {
  items: MenuItemProps[];
  onSelectTime: () => void;
}

function CartSummary({ items, onSelectTime }: CartSummaryProps) {
  const total = items.reduce((acc, item) => acc + item.price * item.count, 0);
  const totalCount = items.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="cart-summary">
      <div className="cart-summary__inner">
        <div className="cart-summary__totals" aria-live="polite">
          <span className="cart-summary__count">{totalCount}点</span>
          <strong className="cart-summary__total">
            合計 ¥{total.toLocaleString("ja-JP")}
          </strong>
        </div>

        <button
          type="button"
          className="cart-summary__button"
          onClick={onSelectTime}
          disabled={totalCount === 0}
        >
          受取時間を選ぶ →
        </button>
      </div>
    </div>
  );
}

export default CartSummary;
