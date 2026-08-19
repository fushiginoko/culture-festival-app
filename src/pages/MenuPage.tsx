import { useState } from "react";
import MenuList from "../components/MenuList";
import CartSummary from "../components/CartSummary";
import type { MenuItemProps } from "../components/MenuItem";

function MenuPage() {
  const [count_1, setCount_1] = useState(0);
  const [count_2, setCount_2] = useState(0);
  const [count_3, setCount_3] = useState(0);

  // 仮の値
  const menuItems: MenuItemProps[] = [
    {id: 1, name: "ハンバーガー", price: 300, count: count_1, onChange: setCount_1 },
    {id: 2, name: "フライドチキン", price: 400, count: count_2, onChange: setCount_2 },
    {id: 3, name: "ピザ", price: 500, count: count_3, onChange: setCount_3 },
  ]

  return (
    <div>
      <MenuList items={menuItems} />
    </div>
  )
}

export default MenuPage
