import { MAX_ITEM_QUANTITY } from "../lib/constants";

export type MenuItemProps = {
  id: number;
  name: string;
  price: number;
  count: number;
  onChange: (newCount: number) => void;
};

function MenuItem({ name, price, count, onChange }: MenuItemProps) {
  const handleDecrement = () => {
    if (count > 0) onChange(count - 1);
  };
  const handleIncrement = () => {
    if (count < MAX_ITEM_QUANTITY) onChange(count + 1);
  };

  return (
    <article className="menu-item">
      <div className="menu-item__details">
        <h2 className="menu-item__name">{name}</h2>
        <p className="menu-item__price">¥{price.toLocaleString("ja-JP")}</p>
      </div>
      <div className="stepper">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={count === 0}
          aria-label={`${name}を1個減らす`}
        >
          −
        </button>
        <span className="count-display">{count}</span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={count >= MAX_ITEM_QUANTITY}
          aria-label={`${name}を1個増やす`}
        >
          ＋
        </button>
      </div>
    </article>
  );
}

export default MenuItem;
