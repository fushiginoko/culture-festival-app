import { useState } from "react";
import MenuList from "../components/MenuList";
import CartSummary from "../components/CartSummary";
import type { MenuItemProps } from "../components/MenuItem";
import { useNavigate, Navigate } from "react-router-dom";
import { readStoredTicket } from "../lib/ticketStorage";
import "./MenuPage.css";

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
  const [hasStoredTicket] = useState(() => Boolean(readStoredTicket()));

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

  const handleSelectTime = () => {
    const selectedItems = menuItems.filter((item) => item.count > 0).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      count: item.count,
    }));
    navigate("/pickup-time", { state: { selectedItems } });
  };

  // 保存済みのチケットがある場合は、メニューを選ばせずチケット画面へ戻す。
  // 新しい注文はチケット画面の「新しく注文する」ボタンから始めてもらう。
  if (hasStoredTicket) {
    return <Navigate to="/ticket" replace />;
  }

  return (
    <div className="menu-page">
      <main className="menu-page__content">
        <header className="menu-header">
          <div className="menu-header__logo-frame" role="img" aria-label="TOOT ロゴ">
            {/* 将来ここをSVGロゴに差し替える。 */}
            <span aria-hidden="true">TOOT</span>
          </div>
          <div className="menu-header__copy">
            <h1 className="menu-header__logo">TOOT</h1>
            <p className="menu-header__subtitle">三年生の出店・出来立て予約</p>
          </div>
        </header>

        <MenuList items={menuItems} />
      </main>
      <CartSummary items={menuItems} onSelectTime={handleSelectTime} />
    </div>
  );
}

export default MenuPage;
