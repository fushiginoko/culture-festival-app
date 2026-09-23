import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './StaffPage.css'
import { completeOrder, getOrders, lookupOrder } from '../lib/staffApi'
import type { Order } from '../lib/staffApi'

type StaffMode = 'pickup' | 'kitchen'
const MODE_KEY = 'toot-staff-mode'
const NOT_FOUND = 'その認証コードでの注文を確認できませんでした。受取時間をご確認ください'

function readMode(): StaffMode {
  return localStorage.getItem(MODE_KEY) === 'kitchen' ? 'kitchen' : 'pickup'
}

function formatYen(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`
}

export default function StaffPage() {
  const [mode, setMode] = useState<StaffMode>(readMode)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const changeMode = (next: StaffMode) => {
    setMode(next)
    localStorage.setItem(MODE_KEY, next)
    setSettingsOpen(false)
  }

  return (
    <main className="staff-page">
      <header className="staff-header">
        <div>
          <p className="eyebrow">TOOT / STAFF DESK</p>
          <h1>{mode === 'pickup' ? '受取窓口' : '厨房キュー'}</h1>
        </div>
        <div className="settings">
          <button className="icon-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="設定" aria-expanded={settingsOpen}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 2h4.6l.5 2.1a8.2 8.2 0 0 1 1.7 1l2-.8 2.3 4-1.6 1.4a8 8 0 0 1 0 2l1.6 1.4-2.3 4-2-.8a8.2 8.2 0 0 1-1.7 1L14.3 20H9.7l-.5-2.1a8.2 8.2 0 0 1-1.7-1l-2 .8-2.3-4 1.6-1.4a8 8 0 0 1 0-2L3.2 9.3l2.3-4 2 .8a8.2 8.2 0 0 1 1.7-1L9.7 2Z" /><circle cx="12" cy="11" r="3.2" /></svg>
          </button>
          {settingsOpen && (
            <div className="settings-menu">
              <strong>担当モード</strong>
              <button className={mode === 'pickup' ? 'selected' : ''} onClick={() => changeMode('pickup')}>受取窓口用</button>
              <button className={mode === 'kitchen' ? 'selected' : ''} onClick={() => changeMode('kitchen')}>厨房用</button>
            </div>
          )}
        </div>
      </header>
      {mode === 'pickup' ? <PickupView /> : <KitchenView />}
    </main>
  )
}

function PickupView() {
  const [code, setCode] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const lookup = async (event: FormEvent) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!/^[0-9A-HJKMNP-TV-Z]{6}$/.test(normalized)) {
      setOrder(null)
      setMessage('6桁の認証コードを入力してください')
      return
    }
    setBusy(true)
    setMessage('')
    setOrder(null)
    try {
      const result = await lookupOrder(normalized)
      setOrder(result)
      if (!result) setMessage(NOT_FOUND)
    } catch {
      setMessage('照合に失敗しました。もう一度お試しください')
    } finally {
      setBusy(false)
    }
  }

  const complete = async () => {
    if (!order || !window.confirm('この注文を受取済みにしますか？')) return
    setBusy(true)
    try {
      await completeOrder(order.auth_code)
      setMessage('受取済みにしました。次のお客様をお呼びください。')
      setOrder(null)
      setCode('')
    } catch {
      setMessage('更新に失敗しました。もう一度お試しください')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pickup-view">
      <div className="lookup-panel">
        <h2>認証コードを照合</h2>
        <p className="muted">お客様から伝えられた6桁のコードを入力してください</p>
        <form onSubmit={lookup} className="lookup-form">
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} inputMode="text" maxLength={6} autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="例: 4K7M2P" aria-label="認証コード" />
          <button className="primary-button" type="submit" disabled={busy}>{busy ? '照合中…' : '照合する'}</button>
        </form>
        {message && <p className="status-message" role="status">{message}</p>}
      </div>
      {order && (
        <div className="order-card">
          <div className="order-card-title"><span>注文内容</span><span className="order-status">{order.status}</span></div>
          <ul className="order-items">{order.items.map((item) => <li key={item.product_id}><span>{item.name}</span><strong>× {item.quantity}</strong></li>)}</ul>
          <div className="order-meta"><span>受取枠 <strong>{order.slot_id}</strong></span><span>合計 <strong>{formatYen(order.total_price)}</strong></span></div>
          <button className="complete-button" onClick={complete} disabled={busy}>受取済みにする</button>
        </div>
      )}
    </section>
  )
}

function KitchenView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [cooked, setCooked] = useState<Record<string, number>>({})
  const [message, setMessage] = useState('')

  const refresh = async () => {
    try {
      setOrders(await getOrders())
      setMessage('')
    } catch {
      setMessage('注文一覧を読み込めませんでした')
    }
  }
  useEffect(() => { void refresh() }, [])

  const slots = useMemo(() => {
    const grouped = new Map<string, Map<number, { item: Order['items'][number]; quantity: number }>>()
    orders.filter((order) => order.status !== 'completed').forEach((order) => {
      const items = grouped.get(order.slot_id) ?? new Map()
      order.items.forEach((item) => {
        const existing = items.get(item.product_id)
        items.set(item.product_id, { item, quantity: (existing?.quantity ?? 0) + item.quantity })
      })
      grouped.set(order.slot_id, items)
    })
    return [...grouped.entries()]
  }, [orders])

  const adjust = (key: string, amount: number) => setCooked((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + amount) }))
  const [currentSlot, ...upcomingSlots] = slots
  const renderItems = (slot: string, items: Map<number, { item: Order['items'][number]; quantity: number }>, compact = false) => (
    <ul className={compact ? 'kitchen-items kitchen-items--compact' : 'kitchen-items'}>
      {[...items.values()].map(({ item, quantity }) => {
        const key = `${slot}:${item.product_id}`
        const done = cooked[key] ?? 0
        const remaining = Math.max(0, quantity - done)
        return <li className={remaining === 0 ? 'item-complete' : ''} key={key}>
          <div><strong>{item.name}</strong><span className="remaining">{compact ? `必要 ${quantity} 個` : <>未調理 <b>{remaining}</b> 個 / {quantity} 個</>}</span></div>
          {!compact && <div className="stepper"><button onClick={() => adjust(key, -1)} aria-label={`${item.name}を1個減らす`}>−</button><span>{done}</span><button onClick={() => adjust(key, 1)} aria-label={`${item.name}を1個増やす`}>＋</button></div>}
          {!compact && remaining === 0 && <span className="complete-label">完了</span>}
        </li>
      })}
    </ul>
  )

  return (
    <section className="kitchen-view">
      <div className="kitchen-toolbar"><p className="muted">未完了の注文を受取枠ごとに集計しています</p><button className="secondary-button" onClick={() => void refresh()}>↻ 更新</button></div>
      {message && <p className="status-message">{message}</p>}
      {slots.length === 0 && <div className="empty-state">現在、作るものはありません</div>}
      {currentSlot && <div className="kitchen-columns">
        <article className="slot-card slot-card--current">
          <div className="slot-heading"><span className="slot-kicker">いま作る枠</span><h2>{currentSlot[0]}</h2></div>
          {renderItems(currentSlot[0], currentSlot[1])}
        </article>
        <aside className="upcoming-slots">
          <h2 className="upcoming-title">次の準備</h2>
          {upcomingSlots.slice(0, 2).map(([slot, items]) => <article className="slot-card slot-card--upcoming" key={slot}><h3>{slot}</h3>{renderItems(slot, items, true)}</article>)}
          {upcomingSlots.length === 0 && <p className="empty-preview">続く枠はありません</p>}
        </aside>
      </div>}
    </section>
  )
}
