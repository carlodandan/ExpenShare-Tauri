# Database Documentation

## Overview
ExpenShare relies on a local **SQLite** database to store all application data. The database file (`budget-tracker.db`) is stored in the application's standard AppData directory, ensuring data persists across updates. 

The application uses `rusqlite` bundled with SQLite, operating in `WAL` (Write-Ahead Logging) mode with `foreign_keys = ON` for performance and data integrity.

## Schema Design

### 1. `people`
Stores the household members (up to 3).
- `id` (INTEGER, PK): Unique identifier.
- `name` (TEXT): Name of the person.
- `sort_order` (INTEGER): For UI sorting.

### 2. `income`
Records all income transactions.
- `id` (INTEGER, PK): Unique identifier.
- `person_id` (INTEGER, FK): References `people(id)`.
- `amount_minor` (INTEGER): Amount stored in minor units (e.g., cents) to prevent floating-point precision issues.
- `description` (TEXT): Optional note.
- `date` (TEXT): ISO 8601 date string.

### 3. `expense_categories`
Defines categories for expenses.
- `id` (INTEGER, PK): Unique identifier.
- `name` (TEXT): Category name (UNIQUE).
- `type` (TEXT): Either `'fixed'` or `'repeatable'`.
- `is_active` (INTEGER): Boolean flag (1/0) for soft deletion.

### 4. `expenses`
Records individual expense transactions.
- `id` (INTEGER, PK): Unique identifier.
- `category_id` (INTEGER, FK): References `expense_categories(id)`.
- `amount_minor` (INTEGER): Amount in minor units.
- `description` (TEXT): Note or detail.
- `date` (TEXT): ISO 8601 date string.

### 5. `extra_budget_transactions`
Tracks movements in the extra budget/savings pool.
- `id` (INTEGER, PK): Unique identifier.
- `type` (TEXT): `'withdrawal'` or `'adjustment'`.
- `amount_minor` (INTEGER): Amount in minor units.
- `description` (TEXT): Reason for transaction.
- `month` (TEXT): Associated billing month.
- `date` (TEXT): ISO 8601 date string.

### 6. `goals`
Tracks financial targets.
- `id` (INTEGER, PK): Unique identifier.
- `name` (TEXT): Goal name.
- `target_amount_minor` (INTEGER): Target amount in minor units.

### 7. `goal_contributions`
Records funds allocated to specific goals.
- `id` (INTEGER, PK): Unique identifier.
- `goal_id` (INTEGER, FK): References `goals(id)` with `ON DELETE CASCADE`.
- `expense_id` (INTEGER, FK, Nullable): Optional reference if the contribution was categorized as an expense.
- `amount_minor` (INTEGER): Amount contributed.

### 8. `settings`
Key-value store for application preferences.
- `key` (TEXT, PK): Setting identifier (e.g., `'currency'`, `'currency_symbol'`).
- `value` (TEXT): Setting value.

### 9. `schema_migrations`
Tracks applied database migrations to ensure idempotency on startup.
- `version` (INTEGER, PK): Migration version number.
- `name` (TEXT): Migration description.

## Migrations System
Migrations are handled purely in Rust (`src/db.rs`). On application startup, the `open_and_migrate` function checks the `schema_migrations` table and applies any missing sequential migrations inside a transaction. If a migration fails, the transaction is rolled back, preventing corrupted schema states.
