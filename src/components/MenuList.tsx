import MenuItem from "./MenuItem";
import type { MenuItemProps } from "./MenuItem";

function MenuList(props: { items: MenuItemProps[] }) {
  return (
    <section className="menu-list" aria-label="商品一覧">
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
    </section>
  );
}

export default MenuList;
