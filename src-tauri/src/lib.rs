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
    if cfg!(debug_assertions) {
        // テスト用データの挿入関数
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM orders", [], |r| r.get(0))?;
        if count == 0 {
            conn.execute(
                "INSERT INTO orders (id, auth_code, slot_id, items, total_price, status, created_at) VALUES
                ('1', 'A2T61W', '12:15', '[{\"product_id\":1,\"name\":\"ハンバーガー\",\"quantity\":5,\"price\":300},{\"product_id\":2,\"name\":\"フライドチキン\",\"quantity\":3,\"price\":400}]', 2700, 'pending', datetime('now')),
                ('2', 'K946RE', '12:30', '[{\"product_id\":1,\"name\":\"ハンバーガー\",\"quantity\":2,\"price\":300},{\"product_id\":3,\"name\":\"ピザ\",\"quantity\":1,\"price\":500}]', 1100, 'pending', datetime('now')),
                ('3', 'B9DD9J', '12:45', '[{\"product_id\":2,\"name\":\"フライドチキン\",\"quantity\":4,\"price\":400}]', 1600, 'pending', datetime('now'))",
                [],
            )?;
        }
    }

    tauri::Builder::default()
        .manage(DBState {
            db: Mutex::new(conn),
        })
        .invoke_handler(tauri::generate_handler![
            lookup_order,
            complete_order,
            get_orders
        ])
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
fn get_orders(state: State<DBState>) -> Result<Vec<Order>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, auth_code, slot_id, items, total_price, status, created_at FROM orders ORDER BY slot_id, created_at")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let items_json: String = row.get(3)?;
            let items: Vec<OrderItem> = serde_json::from_str(&items_json)
                .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
            Ok(Order {
                id: row.get(0)?,
                auth_code: row.get(1)?,
                slot_id: row.get(2)?,
                items,
                total_price: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn complete_order(state: State<DBState>, auth_code: &str) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let updated_rows = conn
        .execute(
            "UPDATE orders SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE auth_code = ?",
            [auth_code],
        )
        .map_err(|e| e.to_string())?;

    if updated_rows == 0 {
        return Err("指定されたauth_codeの注文が見つかりませんでした".to_string());
    }

    Ok(())
}
