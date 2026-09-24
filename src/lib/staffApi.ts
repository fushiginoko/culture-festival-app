import { invoke } from '@tauri-apps/api/core'
import { supabase } from './supabase'

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

export async function completeOrder(authCode: string): Promise<void> {
  // 1. まずオフラインでも動くようにローカルSQLiteを確実に消し込む
  await invoke('complete_order', { authCode })

  // 2. クラウド（Supabase）にも完了を非同期で同期する
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('auth_code', authCode)

    if (error) {
      console.warn('Supabaseへの完了同期に失敗（オフラインの可能性）:', error.message)
    } else {
      console.log('✅ Supabaseのステータスを completed に更新しました')
    }
  } catch (err) {
    // 学校Wi-Fiが切れていても、ローカルPCの処理（1番）を落とさないための防御
    console.warn('ネットワークエラーのためSupabase同期をスキップ:', err)
  }
}

export function getOrders(): Promise<Order[]> {
  return invoke<Order[]>('get_orders')
}
