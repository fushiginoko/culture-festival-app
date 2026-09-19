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
    if (count < 9) onChange(count + 1);
  };

  return (
    <div className="menu-item">
      <div>
        <h2>{name}</h2>
        <p>{price}円</p>
      </div>
      <div className="stepper">
        <button onClick={handleDecrement} disabled={count === 0} aria-label="減らす">
          −
        </button>
        <span className="count-display">{count}</span>
        <button onClick={handleIncrement} disabled={count >= 9} aria-label="増やす">
          ＋
        </button>
      </div>
    </div>
  );
}

export default MenuItem;
