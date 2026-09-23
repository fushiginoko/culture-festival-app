import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core'; // ※Tauri v1なら '@tauri-apps/api/tauri'
import { supabase } from '../lib/supabase'; // 先ほど作ったSupabaseクライアント

// Rust側の Order 構造体と一致する型
interface Order {
  id: string;
  auth_code: string;
  slot_id: string;
  items: Array<{
    product_id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  total_price: number;
  status: string;
  created_at: string;
}

// 呼び出し側に「SQLiteの中身が変わったので画面を更新してほしい」ことを伝えるためのイベント種別
// - INITIAL: 起動時の一括同期が完了した
// - INSERT : 新規注文を検知した
// - UPDATE : 既存注文の更新（status変更など）を検知した
type OrderSyncEvent = 'INITIAL' | 'INSERT' | 'UPDATE';

// payload.new をそのまま信頼せず、最低限の形をランタイムでチェックする
function isValidOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.auth_code === 'string' &&
    typeof v.slot_id === 'string' &&
    Array.isArray(v.items) &&
    typeof v.total_price === 'number' &&
    typeof v.status === 'string' &&
    typeof v.created_at === 'string'
  );
}

// 再接続時のバックオフ間隔（ミリ秒）
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
// 短時間に複数のイベントが連続した場合にrefreshが連打されないようにする間隔
const CHANGE_DEBOUNCE_MS = 250;

export function useOrderSync(
  onOrderChange?: (order: Order | null, eventType: OrderSyncEvent) => void
) {
  // インラインコールバックによる不要な再購読を避けるため ref 経由で保持
  const onOrderChangeRef = useRef(onOrderChange);
  useEffect(() => {
    onOrderChangeRef.current = onOrderChange;
  }, [onOrderChange]);

  useEffect(() => {
    let isMounted = true;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // 短時間の連続イベントをまとめて1回のコールバック呼び出しにする
    function notifyChange(order: Order | null, eventType: OrderSyncEvent) {
      if (!isMounted) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) onOrderChangeRef.current?.(order, eventType);
      }, CHANGE_DEBOUNCE_MS);
    }

    // 起動時：Supabaseから過去の全注文を取得してSQLiteに一括同期
    async function initialSync() {
      try {
        console.log('🔄 [Tauri] Supabaseから既存注文を一括取得中...');
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        if (data && data.length > 0) {
          const synced = await invoke<number>('sync_orders', { orders: data });
          console.log(`✅ [Tauri] 初期同期完了: ${synced} 件を新規/更新でSQLiteに保存`);
        }

        // 一括同期がゼロ件でも「初期化は完了した」ことを呼び出し側に知らせる。
        // これにより、UI側の初回refresh()がinitialSyncより先に走ってしまう競合を解消できる。
        notifyChange(null, 'INITIAL');
      } catch (err) {
        console.error('❌ [Tauri] 初期同期エラー:', err);
      }
    }

    initialSync();

    // リアルタイム：WebSocketで新着注文（INSERT）と既存注文の更新（UPDATE）を監視
    function subscribeRealtime() {
      console.log('🔌 [Tauri] WebSocket接続待機中...');
      channel = supabase
        .channel('staff-realtime-orders')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => handleChange(payload.new, 'INSERT')
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload) => handleChange(payload.new, 'UPDATE')
        )
        .subscribe((status) => {
          console.log('📡 [Tauri] WebSocket接続ステータス:', status);

          if (status === 'SUBSCRIBED') {
            reconnectAttempt = 0; // 接続成功したらカウントリセット
            return;
          }

          // 切断・エラー・タイムアウト時はバックオフしながら再接続
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (!isMounted) return;

            const delay =
              RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
            reconnectAttempt += 1;

            console.warn(
              `⚠️ [Tauri] WebSocket切断（${status}）。${delay}ms後に再接続を試みます（${reconnectAttempt}回目）`
            );

            if (channel) {
              supabase.removeChannel(channel);
              channel = null;
            }

            reconnectTimer = setTimeout(() => {
              if (isMounted) subscribeRealtime();
            }, delay);
          }
        });
    }

    async function handleChange(rawOrder: unknown, eventType: 'INSERT' | 'UPDATE') {
      const label = eventType === 'INSERT' ? '新着注文' : '注文の更新';
      console.log(`⚡ [Tauri] WebSocketで${label}を検知！:`, rawOrder);

      if (!isValidOrder(rawOrder)) {
        console.error('❌ [Tauri] 不正な形式の注文データを受信、無視します:', rawOrder);
        return;
      }

      try {
        // Rustの sync_orders コマンドを叩いてSQLiteに即時反映（新規/更新どちらもupsertで対応）
        await invoke('sync_orders', { orders: [rawOrder] });
        console.log(`💾 [Tauri] SQLiteへの反映に成功: ${rawOrder.auth_code}`);
        notifyChange(rawOrder, eventType);
      } catch (err) {
        console.error('❌ [Tauri] SQLite反映失敗:', err);
      }
    }

    subscribeRealtime();

    // クリーンアップ（コンポーネントが破棄されたら購読解除）
    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // onOrderChange は ref 経由にしたため依存配列から除外
}
