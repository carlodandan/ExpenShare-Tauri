use crate::db::DbState;
use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::{Map, Value};
use tauri::{AppHandle, State};

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct Person {
    pub id: i64,
    pub name: String,
    pub sort_order: i64,
}

pub fn list_people(conn: &Connection) -> Result<Vec<Person>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, sort_order FROM people ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Person {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub fn rename_person_impl(conn: &Connection, id: i64, name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Name cannot be empty.".into());
    }
    conn.execute(
        "UPDATE people SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![trimmed, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn add_person_impl(conn: &Connection, name: &str) -> Result<Person, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Name cannot be empty.".into());
    }
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM people", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count >= 3 {
        return Err("Maximum of 3 people allowed.".into());
    }
    let max_sort: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), 0) FROM people", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let next_sort = max_sort + 1;
    conn.execute(
        "INSERT INTO people (name, sort_order) VALUES (?1, ?2)",
        params![trimmed, next_sort],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(Person {
        id,
        name: trimmed.to_string(),
        sort_order: next_sort,
    })
}

pub fn delete_person_impl(conn: &Connection, id: i64) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM people", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count <= 1 {
        return Err("Cannot delete the only person.".into());
    }
    let income_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM income WHERE person_id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if income_count > 0 {
        return Err("Cannot delete person with existing income records. Delete or reassign their income first.".into());
    }
    conn.execute("DELETE FROM people WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Returns every row in `settings` as a flat object plus a `people` array,
/// exactly matching database/settings.js `getAll` (which spreads key/value
/// settings rows and appends `people`).
pub fn get_all_impl(conn: &Connection) -> Result<Value, String> {
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut map = Map::new();
    for r in rows {
        let (k, v) = r.map_err(|e| e.to_string())?;
        map.insert(k, Value::String(v));
    }

    let people = list_people(conn)?;
    map.insert(
        "people".into(),
        serde_json::to_value(people).map_err(|e| e.to_string())?,
    );

    Ok(Value::Object(map))
}

#[tauri::command]
pub fn settings_get_all(state: State<DbState>) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    get_all_impl(&conn)
}

#[tauri::command]
pub fn settings_set(state: State<DbState>, key: String, value: String) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    get_all_impl(&conn)
}

#[tauri::command]
pub fn settings_rename_person(
    state: State<DbState>,
    id: i64,
    name: String,
) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    rename_person_impl(&conn, id, &name)?;
    get_all_impl(&conn)
}

#[tauri::command]
pub fn settings_add_person(state: State<DbState>, name: String) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    add_person_impl(&conn, &name)?;
    get_all_impl(&conn)
}

#[tauri::command]
pub fn settings_delete_person(state: State<DbState>, id: i64) -> Result<Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    delete_person_impl(&conn, id)?;
    get_all_impl(&conn)
}

#[derive(Serialize)]
pub struct VersionInfo {
    pub app: String,
}

#[tauri::command]
pub fn settings_get_version(app: AppHandle) -> VersionInfo {
    VersionInfo {
        app: app.package_info().version.to_string(),
    }
}

/// The original preload exposed `appInfo.getVersion()` calling an
/// `ipcMain.handle('get-app-info', ...)` channel, but main.js never actually
/// registered that handler (a latent bug in the source app - the call would
/// have rejected at runtime). This gives it a real, working implementation.
#[tauri::command]
pub fn get_app_info(app: AppHandle) -> VersionInfo {
    VersionInfo {
        app: app.package_info().version.to_string(),
    }
}
