import { invoke } from '@tauri-apps/api/core'

export type OrderItem = {
  product_id: number
  name: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  auth_code: string
  slot_id: string
  items: OrderItem[]
  total_price: number
  status: string
  created_at: string
}

export function lookupOrder(authCode: string): Promise<Order | null> {
  return invoke<Order | null>('lookup_order', { authCode })
}

export function completeOrder(authCode: string): Promise<void> {
  return invoke('complete_order', { authCode })
}

export function getOrders(): Promise<Order[]> {
  return invoke<Order[]>('get_orders')
}
