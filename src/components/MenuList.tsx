import MenuItem from "./MenuItem"
import type { MenuItemProps } from "./MenuItem"


function MenuList(props: { items: MenuItemProps[] }) {
  return (
    <div>
      {props.items.map((item) => (
        <MenuItem
          key={item.id}
          id={item.id}
          name={item.name}
          price={item.price}
          count={item.count}
          onChange={item.onChange}
        />
      ))}
    </div>
  )
}
export default MenuList
