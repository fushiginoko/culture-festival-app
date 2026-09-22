use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

struct DBState {
    db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    let conn = Connection::open("culture_festival.db")?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS orders
        (
            id TEXT PRIMARY KEY,
            auth_code TEXT NOT NULL UNIQUE,
            slot_id TEXT NOT NULL,
            items TEXT NOT NULL,
            total_price INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT DEFAULT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_orders_auth_code ON  orders(auth_code)",
        [],
    )?;

    tauri::Builder::default()
        .manage(DBState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![lookup_order, complete_order])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())?;

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_id: u32,
    pub name: String,
    pub quantity: u32,
    pub price: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub auth_code: String,
    pub slot_id: String,
    pub items: Vec<OrderItem>,
    pub total_price: u32,
    pub status: String,
    pub created_at: String,
}

fn lookup_order_impl(
    state: &DBState,
    auth_code: &str,
) -> Result<Option<Order>, Box<dyn std::error::Error>> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, auth_code, slot_id, items, total_price, status, created_at FROM orders WHERE auth_code = ?")?;
    let mut rows = stmt.query([auth_code])?;
    if let Some(row) = rows.next()? {
        let items_json: String = row.get(3)?;
        let items: Vec<OrderItem> = serde_json::from_str(&items_json)?;

        let order: Order = Order {
            id: row.get(0)?,
            auth_code: row.get(1)?,
            slot_id: row.get(2)?,
            items,
            total_price: row.get(4)?,
            status: row.get(5)?,
            created_at: row.get(6)?,
        };
        Ok(Some(order))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn lookup_order(state: State<DBState>, auth_code: &str) -> Result<Option<Order>, String> {
    lookup_order_impl(&state, auth_code).map_err(|e| e.to_string())
}

#[tauri::command]
fn complete_order(state: State<DBState>, auth_code: &str) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let updated_rows = conn
        .execute(
            "UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE auth_code = ?",
            [auth_code],
        )
        .map_err(|e| e.to_string())?;

    if updated_rows == 0 {
        return Err("指定されたauth_codeの注文が見つかりませんでした".to_string());
    }

    Ok(())
}
