use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

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
