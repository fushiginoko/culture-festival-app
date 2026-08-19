export type MenuItemProps = {
  id: number;
  name: string;
  price: number;
  count: number;
  onChange: (newCount: number) => void;
}

function MenuItem(props: MenuItemProps) {

  return (
    <div>
      <h2>{props.name}</h2>
      <p>{props.price}円</p>
      <input type="number" min="0" max="9" value={props.count} onChange={(e) => props.onChange(Number(e.target.value))} />
    </div>
  )
}

export default MenuItem
