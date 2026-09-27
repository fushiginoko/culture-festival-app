import { supabase } from "./supabase";

type ProductQuantityTotalRow = {
  product_id: number;
  total_quantity: number;
};

/**
 * product_quantity_totals ビューから、商品ごとの累計注文数量を取得する。
 * 戻り値は { [product_id]: 累計quantity } の形（未注文の商品はキー自体が存在しない）。
 */
export async function fetchOrderedQuantities(): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from("product_quantity_totals")
    .select("product_id, total_quantity");

  if (error) {
    throw error;
  }

  const totals: Record<number, number> = {};
  (data as ProductQuantityTotalRow[] | null ?? []).forEach((row) => {
    totals[row.product_id] = row.total_quantity;
  });

  return totals;
}
