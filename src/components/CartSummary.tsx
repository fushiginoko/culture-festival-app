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

        {/* ボタンと規約をグループ化 */}
        <div className="cart-summary__action">
          <button
            type="button"
            className="cart-summary__button"
            onClick={onSelectTime}
            disabled={totalCount === 0}
          >
            受け取り時間を選ぶ
          </button>

          <p className="cart-summary__legal">
            進むことで
            <a href="/terms.html" target="_blank" rel="noopener noreferrer">
              利用規約
            </a>
            ・
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
              プライバシーポリシー
            </a>
            に同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}

export default CartSummary;
