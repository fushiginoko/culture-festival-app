import { useEffect, useState } from "react";
import MenuList from "../components/MenuList";
import CartSummary from "../components/CartSummary";
import type { MenuItemProps } from "../components/MenuItem";
import { useNavigate, Navigate } from "react-router-dom";
import { readStoredTicket } from "../lib/ticketStorage";
import { MENU_DATA } from "../lib/constants";
import { fetchOrderedQuantities } from "../lib/stockApi";
import OrderHeader from "../components/OrderHeader";
import "./MenuPage.css";

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
      <OrderHeader currentStep={1} />
      <aside className="menu-sidebar">
        <div className="menu-sidebar__message">
          <p className="menu-eyebrow">会場で受け取る</p>
          <h1>
            できたてを、
            <br />
            会場で。
          </h1>
          <p>好きなメニューを選んで、受け取り時間を決めてください。</p>
        </div>
        <p className="menu-sidebar__note">ご注文後、画面に表示されるコードを大切に保管してください。</p>
      </aside>

      <main className="menu-page__content">
        <header className="menu-header">
          <div>
            <p className="menu-eyebrow">TODAY'S MENU</p>
            <h2>メニューを選ぶ</h2>
          </div>
          <span className="menu-open-label">
            <span aria-hidden="true" />
            受付中
          </span>
        </header>

        <MenuList items={menuItems} />
      </main>
      <CartSummary items={menuItems} onSelectTime={handleSelectTime} />
    </div>
  );
}

export default MenuPage;
