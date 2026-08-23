use crate::db::DbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomeRow {
    pub id: i64,
    pub person_id: i64,
    pub person_name: String,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomeRecord {
    pub id: i64,
    pub person_id: i64,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomePayload {
    pub person_id: Option<i64>,
    pub amount_minor: Option<i64>,
    pub description: Option<String>,
    pub date: Option<String>,
}

fn validate(payload: &IncomePayload) -> Result<(), String> {
    if payload.person_id.is_none() {
        return Err("Person is required.".into());
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

pub fn list_for_month_impl(
    conn: &rusqlite::Connection,
    month: &str,
) -> Result<Vec<IncomeRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT income.id, income.person_id, people.name, income.amount_minor,
                    income.description, income.date, income.created_at
             FROM income
             JOIN people ON people.id = income.person_id
             WHERE substr(income.date, 1, 7) = ?1
             ORDER BY income.date ASC, income.id ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![month], |row| {
            Ok(IncomeRow {
                id: row.get(0)?,
                person_id: row.get(1)?,
                person_name: row.get(2)?,
                amount_minor: row.get(3)?,
                description: row.get(4)?,
                date: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub fn total_for_month_impl(conn: &rusqlite::Connection, month: &str) -> Result<i64, String> {
    conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM income WHERE substr(date, 1, 7) = ?1",
        params![month],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

pub fn total_all_time_impl(conn: &rusqlite::Connection) -> Result<i64, String> {
    conn.query_row(
        "SELECT COALESCE(SUM(amount_minor), 0) FROM income",
        [],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

fn get_by_id(conn: &rusqlite::Connection, id: i64) -> Result<IncomeRecord, String> {
    conn.query_row(
        "SELECT id, person_id, amount_minor, description, date, created_at, updated_at
         FROM income WHERE id = ?1",
        params![id],
        |row| {
            Ok(IncomeRecord {
                id: row.get(0)?,
                person_id: row.get(1)?,
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
pub fn income_list_for_month(
    state: State<DbState>,
    month: String,
) -> Result<Vec<IncomeRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    list_for_month_impl(&conn, &month)
}

#[tauri::command]
pub fn income_create(
    state: State<DbState>,
    payload: IncomePayload,
) -> Result<IncomeRecord, String> {
    validate(&payload)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO income (person_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4)",
        params![
            payload.person_id.unwrap(),
            payload.amount_minor.unwrap(),
            payload.description.unwrap_or_default(),
            payload.date.unwrap()
        ],
    )
    .map_err(|e| e.to_string())?;
    get_by_id(&conn, conn.last_insert_rowid())
}

#[tauri::command]
pub fn income_update(
    state: State<DbState>,
    id: i64,
    payload: IncomePayload,
) -> Result<IncomeRecord, String> {
    validate(&payload)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE income SET person_id = ?1, amount_minor = ?2, description = ?3, date = ?4,
         updated_at = datetime('now') WHERE id = ?5",
        params![
            payload.person_id.unwrap(),
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
pub fn income_delete(state: State<DbState>, id: i64) -> Result<DeleteResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM income WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(DeleteResult { id })
}
