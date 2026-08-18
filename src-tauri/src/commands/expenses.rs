use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub is_active: i64,
    pub sort_order: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseTx {
    pub id: i64,
    pub category_id: i64,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryWithTotals {
    #[serde(flatten)]
    pub category: Category,
    pub total_minor: i64,
    pub transactions: Vec<ExpenseTx>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpenseRecord {
    pub id: i64,
    pub category_id: i64,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExpensePayload {
    pub category_id: Option<i64>,
    pub amount_minor: Option<i64>,
    pub description: Option<String>,
    pub date: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetFixedPayload {
    pub category_id: i64,
    pub amount_minor: i64,
    pub month: String,
}

fn validate(payload: &ExpensePayload) -> Result<(), String> {
    if payload.category_id.is_none() {
        return Err("Category is required.".into());
    }
    match payload.amount_minor {
        Some(v) if v > 0 => {}
        _ => return Err("Amount must be greater than zero.".into()),
    }
    match &payload.date {
        Some(d)
            if !d.is_empty()
                && chrono::NaiveDate::parse_from_str(&d[..10.min(d.len())], "%Y-%m-%d").is_ok() => {
        }
        _ => return Err("A valid date is required.".into()),
    }
    Ok(())
}

pub fn list_categories_impl(conn: &Connection) -> Result<Vec<Category>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, is_active, sort_order FROM expense_categories
             WHERE is_active = 1 ORDER BY sort_order",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                is_active: row.get(3)?,
                sort_order: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub fn list_for_month_impl(
    conn: &Connection,
    month: &str,
) -> Result<Vec<CategoryWithTotals>, String> {
    let categories = list_categories_impl(conn)?;
    let mut out = Vec::with_capacity(categories.len());

    for category in categories {
        let total_minor: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM expenses
                 WHERE category_id = ?1 AND substr(date, 1, 7) = ?2",
                params![category.id, month],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, category_id, amount_minor, description, date, created_at
                 FROM expenses WHERE category_id = ?1 AND substr(date, 1, 7) = ?2
                 ORDER BY date ASC, id ASC",
            )
            .map_err(|e| e.to_string())?;
        let transactions = stmt
            .query_map(params![category.id, month], |row| {
                Ok(ExpenseTx {
                    id: row.get(0)?,
                    category_id: row.get(1)?,
                    amount_minor: row.get(2)?,
                    description: row.get(3)?,
                    date: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        out.push(CategoryWithTotals {
            category,
            total_minor,
            transactions,
        });
    }

    Ok(out)
}

pub fn total_for_month_impl(conn: &Connection, month: &str) -> Result<i64, String> {
    conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM expenses WHERE substr(date, 1, 7) = ?1",
        params![month],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

pub fn total_all_time_impl(conn: &Connection) -> Result<i64, String> {
    conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM expenses",
        [],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BreakdownRow {
    pub name: String,
    pub total_minor: i64,
}

pub fn breakdown_all_time_impl(conn: &Connection) -> Result<Vec<BreakdownRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT expense_categories.name, COALESCE(SUM(expenses.amount_minor), 0) AS totalMinor
             FROM expense_categories
             LEFT JOIN expenses ON expenses.category_id = expense_categories.id
             WHERE expense_categories.is_active = 1
             GROUP BY expense_categories.id
             ORDER BY totalMinor DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(BreakdownRow {
                name: row.get(0)?,
                total_minor: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn get_by_id(conn: &Connection, id: i64) -> Result<ExpenseRecord, String> {
    conn.query_row(
        "SELECT id, category_id, amount_minor, description, date, created_at, updated_at
         FROM expenses WHERE id = ?1",
        params![id],
        |row| {
            Ok(ExpenseRecord {
                id: row.get(0)?,
                category_id: row.get(1)?,
                amount_minor: row.get(2)?,
                description: row.get(3)?,
                date: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn expenses_list_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_categories_impl(&conn)
}

#[tauri::command]
pub fn expenses_list_for_month(
    state: State<DbState>,
    month: String,
) -> Result<Vec<CategoryWithTotals>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_for_month_impl(&conn, &month)
}

#[tauri::command]
pub fn expenses_create(
    state: State<DbState>,
    payload: ExpensePayload,
) -> Result<ExpenseRecord, String> {
    validate(&payload)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO expenses (category_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4)",
        params![
            payload.category_id.unwrap(),
            payload.amount_minor.unwrap(),
            payload.description.unwrap_or_default(),
            payload.date.unwrap()
        ],
    )
    .map_err(|e| e.to_string())?;
    get_by_id(&conn, conn.last_insert_rowid())
}

/// Fixed categories have a single value per month: this upserts that
/// month's row instead of appending, exactly like the original
/// setFixedForMonth in database/expenses.js.
#[tauri::command]
pub fn expenses_set_fixed_for_month(
    state: State<DbState>,
    payload: SetFixedPayload,
) -> Result<Option<ExpenseRecord>, String> {
    if payload.amount_minor < 0 {
        return Err("Amount must be zero or greater.".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let date = format!("{}-01", payload.month);
    let amount_minor = payload.amount_minor;

    let existing_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM expenses WHERE category_id = ?1 AND substr(date, 1, 7) = ?2",
            params![payload.category_id, payload.month],
            |row| row.get(0),
        )
        .ok();

    if amount_minor == 0 {
        if let Some(id) = existing_id {
            conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
        }
        return Ok(None);
    }

    if let Some(id) = existing_id {
        conn.execute(
            "UPDATE expenses SET amount_minor = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![amount_minor, id],
        )
        .map_err(|e| e.to_string())?;
        return Ok(Some(get_by_id(&conn, id)?));
    }

    conn.execute(
        "INSERT INTO expenses (category_id, amount_minor, description, date) VALUES (?1, ?2, '', ?3)",
        params![payload.category_id, amount_minor, date],
    )
    .map_err(|e| e.to_string())?;
    Ok(Some(get_by_id(&conn, conn.last_insert_rowid())?))
}

#[tauri::command]
pub fn expenses_update(
    state: State<DbState>,
    id: i64,
    payload: ExpensePayload,
) -> Result<ExpenseRecord, String> {
    validate(&payload)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE expenses SET category_id = ?1, amount_minor = ?2, description = ?3, date = ?4,
         updated_at = datetime('now') WHERE id = ?5",
        params![
            payload.category_id.unwrap(),
            payload.amount_minor.unwrap(),
            payload.description.unwrap_or_default(),
            payload.date.unwrap(),
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    get_by_id(&conn, id)
}

#[derive(Serialize)]
pub struct DeleteResult {
    pub id: i64,
}

#[tauri::command]
pub fn expenses_delete(state: State<DbState>, id: i64) -> Result<DeleteResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(DeleteResult { id })
}
