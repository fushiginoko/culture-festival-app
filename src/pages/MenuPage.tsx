import { useEffect, useState } from "react";
import MenuList from "../components/MenuList";
import CartSummary from "../components/CartSummary";
import type { MenuItemProps } from "../components/MenuItem";
import { useNavigate, Navigate } from "react-router-dom";
import { readStoredTicket } from "../lib/ticketStorage";
import { MENU_DATA } from "../lib/constants";
import { fetchOrderedQuantities } from "../lib/stockApi";
import "./MenuPage.css";
import tootLogo from "../assets/TOOT_logo.svg";

function MenuPage() {
  const navigate = useNavigate();
  const [hasStoredTicket] = useState(() => Boolean(readStoredTicket()));

  // idごとのcountをオブジェクトで一括管理
  const [counts, setCounts] = useState<Record<number, number>>(
    Object.fromEntries(MENU_DATA.map((item) => [item.id, 0]))
  );

  // 商品ごとの「これまでの注文済み数量」。取得できるまでは0として扱う。
  const [orderedQuantities, setOrderedQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadStock() {
      try {
        const totals = await fetchOrderedQuantities();
        if (isMounted) setOrderedQuantities(totals);
      } catch (error) {
        console.error("在庫数の取得に失敗しました", error);
      }
    }

    loadStock();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (id: number, newCount: number) => {
    setCounts((prev) => ({ ...prev, [id]: newCount }));
  };

  const menuItems: MenuItemProps[] = MENU_DATA.map((item) => {
    const ordered = orderedQuantities[item.id] ?? 0;
    const remaining = Math.max(item.maxQuantity - ordered, 0);

    return {
      ...item,
      maxQuantity: remaining,
      count: counts[item.id],
      onChange: (newCount: number) => handleChange(item.id, newCount),
    };
  });

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
          <div className="menu-header__logo-frame">
            <img src={tootLogo} alt="" className="menu-header__logo" />
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
