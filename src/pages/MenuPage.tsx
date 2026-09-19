import { useState } from "react";
import MenuList from "../components/MenuList";
import CartSummary from "../components/CartSummary";
import type { MenuItemProps } from "../components/MenuItem";
import { useNavigate } from "react-router-dom";
import { BrowserRouter, Route, Routes } from "react-router";
import PickupTimePage from "./PickupTimePage";

// count と onChange を除いた「元データ」の型
type MenuItemData = Omit<MenuItemProps, "count" | "onChange">;

// 仮の値
const MENU_DATA: MenuItemData[] = [
  { id: 1, name: "ハンバーガー", price: 300 },
  { id: 2, name: "フライドチキン", price: 400 },
  { id: 3, name: "ピザ", price: 500 },
];

function MenuPage() {
  const navigate = useNavigate();

  // idごとのcountをオブジェクトで一括管理
  const [counts, setCounts] = useState<Record<number, number>>(
    Object.fromEntries(MENU_DATA.map((item) => [item.id, 0]))
  );

  const handleChange = (id: number, newCount: number) => {
    setCounts((prev) => ({ ...prev, [id]: newCount }));
  };

  const menuItems: MenuItemProps[] = MENU_DATA.map((item) => ({
    ...item,
    count: counts[item.id],
    onChange: (newCount: number) => handleChange(item.id, newCount),
  }));

  return (
    <div>
      <MenuList items={menuItems} />
      <CartSummary items={menuItems} onSelectTime={() => navigate("/pickup-time")} />
    </div>
  );
}

export default MenuPage;
