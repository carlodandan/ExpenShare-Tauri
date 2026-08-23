use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// Shared, mutex-guarded connection - mirrors the single module-level `db`
/// singleton in the original database.js (`getDatabase()` returns the same
/// connection on every call).
pub struct DbState(pub Mutex<Connection>);

pub fn db_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).expect("failed to create app data dir");
    }
    dir.join("budget-tracker.db")
}

pub fn open_and_migrate(app: &AppHandle) -> Connection {
    let path = db_path(app);
    let conn = Connection::open(&path).expect("failed to open sqlite database");

    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
        .expect("failed to set pragmas");

    run_migrations(&conn);
    conn
}

struct Migration {
    version: i64,
    name: &'static str,
    up: fn(&Connection),
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial_schema",
        up: migration_1_initial_schema,
    },
    Migration {
        version: 2,
        name: "seed_defaults",
        up: migration_2_seed_defaults,
    },
];

fn migration_1_initial_schema(conn: &Connection) {
    conn.execute_batch(
        r#"
        CREATE TABLE people (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE income (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          description TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_income_date ON income(date);
        CREATE INDEX idx_income_person_id ON income(person_id);

        CREATE TABLE expense_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL CHECK (type IN ('fixed', 'repeatable')),
          is_active INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          description TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_expenses_date ON expenses(date);
        CREATE INDEX idx_expenses_category_id ON expenses(category_id);

        CREATE TABLE extra_budget_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('withdrawal', 'adjustment')),
          amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
          description TEXT NOT NULL DEFAULT '',
          month TEXT NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_extra_budget_date ON extra_budget_transactions(date);
        CREATE INDEX idx_extra_budget_month ON extra_budget_transactions(month);

        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        "#,
    )
    .expect("migration 1 failed");
}

fn migration_2_seed_defaults(conn: &Connection) {
    conn.execute(
        "INSERT INTO people (name, sort_order) VALUES (?1, ?2)",
        rusqlite::params!["P1", 1],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO people (name, sort_order) VALUES (?1, ?2)",
        rusqlite::params!["P2", 2],
    )
    .unwrap();

    let defaults: &[(&str, &str)] = &[
        ("Electricity", "fixed"),
        ("Water", "fixed"),
        ("Internet", "fixed"),
        ("Savings", "fixed"),
        ("Groceries", "repeatable"),
        ("Miscellaneous", "repeatable"),
    ];
    for (i, (name, kind)) in defaults.iter().enumerate() {
        conn.execute(
            "INSERT INTO expense_categories (name, type, sort_order) VALUES (?1, ?2, ?3)",
            rusqlite::params![name, kind, (i as i64) + 1],
        )
        .unwrap();
    }

    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('currency', 'PHP')",
        [],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('currency_symbol', '₱')",
        [],
    )
    .unwrap();
}

fn run_migrations(conn: &Connection) {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )
    .expect("failed to create schema_migrations table");

    let mut applied: std::collections::HashSet<i64> = std::collections::HashSet::new();
    {
        let mut stmt = conn
            .prepare("SELECT version FROM schema_migrations")
            .unwrap();
        let rows = stmt.query_map([], |row| row.get::<_, i64>(0)).unwrap();
        for r in rows {
            applied.insert(r.unwrap());
        }
    }

    for migration in MIGRATIONS {
        if applied.contains(&migration.version) {
            continue;
        }

        conn.execute_batch("BEGIN").unwrap();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            (migration.up)(conn);
            conn.execute(
                "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
                rusqlite::params![migration.version, migration.name],
            )
            .unwrap();
        }));

        match result {
            Ok(_) => conn.execute_batch("COMMIT").unwrap(),
            Err(e) => {
                conn.execute_batch("ROLLBACK").unwrap();
                std::panic::resume_unwind(e);
            }
        }
    }
}
