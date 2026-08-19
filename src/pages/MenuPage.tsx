import MenuList from "../components/MenuList";
import type { MenuItem } from "../components/MenuList";

function MenuPage() {
  // 仮の値
  const menuItems: MenuItem[] = [
    {id: 1, name: "ハンバーガー", price: 300 },
    {id: 2, name: "フライドチキン", price: 400 },
    {id: 3, name: "ピザ", price: 500 },
  ]

  return (
    <div>
      <MenuList items={menuItems} />
    </div>
  )
}

export default MenuPage
