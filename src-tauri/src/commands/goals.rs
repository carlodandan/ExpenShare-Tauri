use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: i64,
    pub name: String,
    pub target_amount_minor: i64,
    pub current_amount_minor: i64,
    pub remaining_amount_minor: i64,
    pub progress_percent: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GoalContribution {
    pub id: i64,
    pub goal_id: i64,
    pub expense_id: Option<i64>,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateGoalPayload {
    pub name: String,
    pub target_amount_minor: i64,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGoalPayload {
    pub name: Option<String>,
    pub target_amount_minor: Option<i64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AddFundsPayload {
    pub goal_id: i64,
    pub amount_minor: i64,
    pub description: Option<String>,
    pub date: Option<String>,
}

pub fn get_goal_impl(conn: &Connection, goal_id: i64) -> Result<Goal, String> {
    let (name, target_amount_minor, created_at, updated_at): (String, i64, String, String) = conn
        .query_row(
            "SELECT name, target_amount_minor, created_at, updated_at FROM goals WHERE id = ?1",
            params![goal_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| format!("Goal not found: {e}"))?;

    let current_amount_minor: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_minor), 0) FROM goal_contributions WHERE goal_id = ?1",
            params![goal_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let remaining_amount_minor = (target_amount_minor - current_amount_minor).max(0);
    let progress_percent = if target_amount_minor > 0 {
        ((current_amount_minor as f64 / target_amount_minor as f64) * 100.0).min(100.0)
    } else {
        0.0
    };

    Ok(Goal {
        id: goal_id,
        name,
        target_amount_minor,
        current_amount_minor,
        remaining_amount_minor,
        progress_percent,
        created_at,
        updated_at,
    })
}

#[tauri::command]
pub fn goals_list(state: State<DbState>) -> Result<Vec<Goal>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT g.id, g.name, g.target_amount_minor, g.created_at, g.updated_at,
                    COALESCE(SUM(gc.amount_minor), 0) AS current_amount_minor
             FROM goals g
             LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
             GROUP BY g.id
             ORDER BY g.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let target_amount_minor: i64 = row.get(2)?;
            let created_at: String = row.get(3)?;
            let updated_at: String = row.get(4)?;
            let current_amount_minor: i64 = row.get(5)?;

            let remaining_amount_minor = (target_amount_minor - current_amount_minor).max(0);
            let progress_percent = if target_amount_minor > 0 {
                ((current_amount_minor as f64 / target_amount_minor as f64) * 100.0).min(100.0)
            } else {
                0.0
            };

            Ok(Goal {
                id,
                name,
                target_amount_minor,
                current_amount_minor,
                remaining_amount_minor,
                progress_percent,
                created_at,
                updated_at,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

#[tauri::command]
pub fn goals_create(state: State<DbState>, payload: CreateGoalPayload) -> Result<Goal, String> {
    let trimmed_name = payload.name.trim();
    if trimmed_name.is_empty() {
        return Err("Goal name is required.".into());
    }
    if payload.target_amount_minor <= 0 {
        return Err("Target amount must be greater than zero.".into());
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO goals (name, target_amount_minor) VALUES (?1, ?2)",
        params![trimmed_name, payload.target_amount_minor],
    )
    .map_err(|e| e.to_string())?;

    let goal_id = conn.last_insert_rowid();
    get_goal_impl(&conn, goal_id)
}

#[tauri::command]
pub fn goals_update(
    state: State<DbState>,
    id: i64,
    payload: UpdateGoalPayload,
) -> Result<Goal, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(name) = payload.name {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err("Goal name cannot be empty.".into());
        }
        conn.execute(
            "UPDATE goals SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![trimmed, id],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(target) = payload.target_amount_minor {
        if target <= 0 {
            return Err("Target amount must be greater than zero.".into());
        }
        conn.execute(
            "UPDATE goals SET target_amount_minor = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![target, id],
        )
        .map_err(|e| e.to_string())?;
    }

    get_goal_impl(&conn, id)
}

#[tauri::command]
pub fn goals_delete(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM goals WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn goals_add_funds(
    state: State<DbState>,
    payload: AddFundsPayload,
) -> Result<GoalContribution, String> {
    if payload.amount_minor <= 0 {
        return Err("Amount must be greater than zero.".into());
    }

    let mut conn = state.0.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Fetch Goal name
    let goal_name: String = tx
        .query_row(
            "SELECT name FROM goals WHERE id = ?1",
            params![payload.goal_id],
            |row| row.get(0),
        )
        .map_err(|_| "Goal not found.".to_string())?;

    // 2. Find Miscellaneous category ID in expense_categories
    let misc_cat_id: i64 = tx
        .query_row(
            "SELECT id FROM expense_categories WHERE name = 'Miscellaneous' LIMIT 1",
            [],
            |row| row.get(0),
        )
        .or_else(|_| {
            // Fallback to any active repeatable category
            tx.query_row(
                "SELECT id FROM expense_categories WHERE type = 'repeatable' AND is_active = 1 LIMIT 1",
                [],
                |row| row.get(0),
            )
        })
        .map_err(|_| "Could not find an expense category for Miscellaneous.".to_string())?;

    // 3. Resolve date
    let date = match payload.date {
        Some(d) if !d.trim().is_empty() => d.trim().to_string(),
        _ => chrono::Local::now().format("%Y-%m-%d").to_string(),
    };

    // 4. Construct description for the expense
    let note = payload.description.unwrap_or_default().trim().to_string();
    let expense_desc = if note.is_empty() {
        format!("Goal: {}", goal_name)
    } else {
        format!("Goal: {} ({})", goal_name, note)
    };

    // 5. Insert expense into expenses table
    tx.execute(
        "INSERT INTO expenses (category_id, amount_minor, description, date) VALUES (?1, ?2, ?3, ?4)",
        params![misc_cat_id, payload.amount_minor, expense_desc, date],
    )
    .map_err(|e| format!("Failed to record expense: {e}"))?;
    let expense_id = tx.last_insert_rowid();

    // 6. Insert goal contribution
    let contrib_desc = if note.is_empty() {
        "Added funds".to_string()
    } else {
        note
    };
    tx.execute(
        "INSERT INTO goal_contributions (goal_id, expense_id, amount_minor, description, date)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![payload.goal_id, expense_id, payload.amount_minor, contrib_desc, date],
    )
    .map_err(|e| format!("Failed to record goal contribution: {e}"))?;
    let contrib_id = tx.last_insert_rowid();

    tx.commit().map_err(|e| e.to_string())?;

    // Fetch the created contribution
    let contrib = conn
        .query_row(
            "SELECT id, goal_id, expense_id, amount_minor, description, date, created_at
             FROM goal_contributions WHERE id = ?1",
            params![contrib_id],
            |row| {
                Ok(GoalContribution {
                    id: row.get(0)?,
                    goal_id: row.get(1)?,
                    expense_id: row.get(2)?,
                    amount_minor: row.get(3)?,
                    description: row.get(4)?,
                    date: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(contrib)
}

#[tauri::command]
pub fn goals_list_contributions(
    state: State<DbState>,
    goal_id: i64,
) -> Result<Vec<GoalContribution>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, goal_id, expense_id, amount_minor, description, date, created_at
             FROM goal_contributions
             WHERE goal_id = ?1
             ORDER BY date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![goal_id], |row| {
            Ok(GoalContribution {
                id: row.get(0)?,
                goal_id: row.get(1)?,
                expense_id: row.get(2)?,
                amount_minor: row.get(3)?,
                description: row.get(4)?,
                date: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }

    Ok(list)
}

#[tauri::command]
pub fn goals_delete_contribution(state: State<DbState>, id: i64) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let expense_id: Option<i64> = tx
        .query_row(
            "SELECT expense_id FROM goal_contributions WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Contribution not found: {e}"))?;

    if let Some(eid) = expense_id {
        let _ = tx.execute("DELETE FROM expenses WHERE id = ?1", params![eid]);
    }

    tx.execute("DELETE FROM goal_contributions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
