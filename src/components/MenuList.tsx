import MenuItem from "./MenuItem"

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

function MenuList(props: { items: MenuItem[] }) {
  return (
    <div>
      {props.items.map((item) => (
        <MenuItem
          key={item.id}
          name={item.name}
          price={item.price}
        />
      ))}
    </div>
  )
}
export default MenuList
