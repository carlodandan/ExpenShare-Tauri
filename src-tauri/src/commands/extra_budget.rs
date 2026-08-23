use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonthEntry {
    pub month: String,
    pub gross_minor: i64,
    pub expenses_minor: i64,
    pub net_minor: i64,
    pub withdrawals_minor: i64,
    pub adjustments_minor: i64,
    pub shortfall_minor: i64,
    pub running_balance_minor: i64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct History {
    pub balance_minor: i64,
    pub monthly: Vec<MonthEntry>,
}

/// Extra Budget balance is never stored directly - it's recomputed from
/// income/expense/extra-budget transaction history, walking every active
/// month chronologically. Mirrors database/extraBudget.js `computeHistory`
/// exactly, including the "floors at 0, reports shortfall separately" rule.
pub fn compute_history_impl(conn: &Connection) -> Result<History, String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT month FROM (
               SELECT substr(date, 1, 7) AS month FROM income
               UNION
               SELECT substr(date, 1, 7) AS month FROM expenses
               UNION
               SELECT month FROM extra_budget_transactions
             ) ORDER BY month ASC",
        )
        .map_err(|e| e.to_string())?;
    let months: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut balance: i64 = 0;
    let mut monthly = Vec::with_capacity(months.len());

    for month in months {
        let gross: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM income WHERE substr(date, 1, 7) = ?1",
                params![month],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        let expenses_total: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM expenses WHERE substr(date, 1, 7) = ?1",
                params![month],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        let withdrawals_minor: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM extra_budget_transactions
                 WHERE type = 'withdrawal' AND month = ?1",
                params![month],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        let adjustments_minor: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_minor), 0) FROM extra_budget_transactions
                 WHERE type = 'adjustment' AND month = ?1",
                params![month],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;

        let net_minor = gross - expenses_total;
        let before_floor = balance + net_minor + adjustments_minor - withdrawals_minor;
        let shortfall_minor = if before_floor < 0 { -before_floor } else { 0 };
        balance = before_floor.max(0);

        monthly.push(MonthEntry {
            month,
            gross_minor: gross,
            expenses_minor: expenses_total,
            net_minor,
            withdrawals_minor,
            adjustments_minor,
            shortfall_minor,
            running_balance_minor: balance,
        });
    }

    Ok(History {
        balance_minor: balance,
        monthly,
    })
}

pub fn get_balance_impl(conn: &Connection) -> Result<i64, String> {
    Ok(compute_history_impl(conn)?.balance_minor)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WithdrawalRow {
    pub id: i64,
    pub amount_minor: i64,
    pub description: String,
    pub month: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WithdrawPayload {
    pub amount_minor: Option<i64>,
    pub description: Option<String>,
    pub month: Option<String>,
    pub date: Option<String>,
}

fn is_valid_month(month: &str) -> bool {
    let bytes = month.as_bytes();
    bytes.len() == 7
        && bytes[4] == b'-'
        && bytes[0..4].iter().all(|b| b.is_ascii_digit())
        && bytes[5..7].iter().all(|b| b.is_ascii_digit())
}

#[tauri::command]
pub fn extra_budget_get_history(state: State<DbState>) -> Result<History, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    compute_history_impl(&conn)
}

#[tauri::command]
pub fn extra_budget_list_withdrawals(state: State<DbState>) -> Result<Vec<WithdrawalRow>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, amount_minor, description, month, date, created_at
             FROM extra_budget_transactions WHERE type = 'withdrawal'
             ORDER BY date DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(WithdrawalRow {
                id: row.get(0)?,
                amount_minor: row.get(1)?,
                description: row.get(2)?,
                month: row.get(3)?,
                date: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn extra_budget_withdraw(
    state: State<DbState>,
    payload: WithdrawPayload,
) -> Result<WithdrawalRow, String> {
    let amount_minor = match payload.amount_minor {
        Some(v) if v > 0 => v,
        _ => return Err("Amount must be greater than zero.".into()),
    };
    let month = payload.month.clone().unwrap_or_default();
    if !is_valid_month(&month) {
        return Err("A valid month is required.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let available = get_balance_impl(&conn)?;
    if amount_minor > available {
        return Err("Amount cannot exceed the available Extra Budget.".into());
    }

    let date = payload.date.unwrap_or_else(|| format!("{}-01", month));
    let description = payload.description.unwrap_or_default();

    conn.execute(
        "INSERT INTO extra_budget_transactions (type, amount_minor, description, month, date)
         VALUES ('withdrawal', ?1, ?2, ?3, ?4)",
        params![amount_minor, description, month, date],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, amount_minor, description, month, date, created_at
         FROM extra_budget_transactions WHERE id = ?1",
        params![id],
        |row| {
            Ok(WithdrawalRow {
                id: row.get(0)?,
                amount_minor: row.get(1)?,
                description: row.get(2)?,
                month: row.get(3)?,
                date: row.get(4)?,
                created_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct DeleteResult {
    pub id: i64,
}

#[tauri::command]
pub fn extra_budget_delete_withdrawal(
    state: State<DbState>,
    id: i64,
) -> Result<DeleteResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM extra_budget_transactions WHERE id = ?1 AND type = 'withdrawal'",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(DeleteResult { id })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WithdrawAndExpensePayload {
    pub category_id: i64,
    pub amount_minor: i64,
    pub description: Option<String>,
    pub month: String,
    pub date: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WithdrawAndExpenseResult {
    pub expense_id: i64,
    pub withdrawal_id: i64,
}

/// Combined withdrawal + expense creation, run atomically - mirrors the
/// hand-rolled BEGIN/COMMIT/ROLLBACK block in extraBudget.ipc.js exactly
/// (balance check happens inside the same transaction as the inserts).
#[tauri::command]
pub fn extra_budget_withdraw_and_expense(
    state: State<DbState>,
    payload: WithdrawAndExpensePayload,
) -> Result<WithdrawAndExpenseResult, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let description = payload.description.unwrap_or_default();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let balance = get_balance_impl(&tx)?;
    if payload.amount_minor > balance {
        return Err("Insufficient Extra Budget balance.".into());
    }

    tx.execute(
        "INSERT INTO expenses (category_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4)",
        params![payload.category_id, payload.amount_minor, description, payload.date],
    )
    .map_err(|e| e.to_string())?;
    let expense_id = tx.last_insert_rowid();

    tx.execute(
        "INSERT INTO extra_budget_transactions (type, amount_minor, description, month, date)
         VALUES ('withdrawal', ?1, ?2, ?3, ?4)",
        params![
            payload.amount_minor,
            description,
            payload.month,
            payload.date
        ],
    )
    .map_err(|e| e.to_string())?;
    let withdrawal_id = tx.last_insert_rowid();

    tx.commit().map_err(|e| e.to_string())?;

    Ok(WithdrawAndExpenseResult {
        expense_id,
        withdrawal_id,
    })
}
