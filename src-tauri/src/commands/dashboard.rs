use crate::commands::expenses::{self, BreakdownRow, CategoryWithTotals};
use crate::commands::extra_budget;
use crate::commands::income;
use crate::db::DbState;
use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtraBudgetSummary {
    pub used_minor: i64,
    pub shortfall_minor: i64,
    pub running_balance_minor: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyDashboard {
    pub month: String,
    pub gross_minor: i64,
    pub expenses_minor: i64,
    pub net_minor: i64,
    pub income: Vec<income::IncomeRow>,
    pub expense_categories: Vec<CategoryWithTotals>,
    pub extra_budget: ExtraBudgetSummary,
}

pub fn get_monthly_impl(conn: &Connection, month: &str) -> Result<MonthlyDashboard, String> {
    let gross_minor = income::total_for_month_impl(conn, month)?;
    let expenses_minor = expenses::total_for_month_impl(conn, month)?;
    let net_minor = gross_minor - expenses_minor;

    let history = extra_budget::compute_history_impl(conn)?;
    let month_entry = history.monthly.iter().find(|m| m.month == month);

    let extra_budget_summary = match month_entry {
        Some(m) => ExtraBudgetSummary {
            used_minor: m.withdrawals_minor,
            shortfall_minor: m.shortfall_minor,
            running_balance_minor: m.running_balance_minor,
        },
        None => ExtraBudgetSummary {
            used_minor: 0,
            shortfall_minor: 0,
            running_balance_minor: history.balance_minor,
        },
    };

    Ok(MonthlyDashboard {
        month: month.to_string(),
        gross_minor,
        expenses_minor,
        net_minor,
        income: income::list_for_month_impl(conn, month)?,
        expense_categories: expenses::list_for_month_impl(conn, month)?,
        extra_budget: extra_budget_summary,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonthlyPerformance {
    pub month: String,
    pub gross_minor: i64,
    pub expenses_minor: i64,
    pub net_minor: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Analysis {
    pub avg_gross_minor: i64,
    pub avg_expenses_minor: i64,
    pub avg_net_minor: i64,
    pub highest_income_month: Option<String>,
    pub highest_expense_month: Option<String>,
    pub largest_expense_category: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TotalDashboard {
    pub gross_minor: i64,
    pub expenses_minor: i64,
    pub net_minor: i64,
    pub breakdown: Vec<BreakdownRow>,
    pub monthly_performance: Vec<MonthlyPerformance>,
    pub analysis: Analysis,
    pub extra_budget_balance_minor: i64,
}

fn build_analysis(months: &[extra_budget::MonthEntry], breakdown: &[BreakdownRow]) -> Analysis {
    if months.is_empty() {
        return Analysis {
            avg_gross_minor: 0,
            avg_expenses_minor: 0,
            avg_net_minor: 0,
            highest_income_month: None,
            highest_expense_month: None,
            largest_expense_category: None,
        };
    }

    let n = months.len() as i64;
    let sum_gross: i64 = months.iter().map(|m| m.gross_minor).sum();
    let sum_expenses: i64 = months.iter().map(|m| m.expenses_minor).sum();
    let sum_net: i64 = months.iter().map(|m| m.net_minor).sum();

    let highest_income_month = months
        .iter()
        .max_by_key(|m| m.gross_minor)
        .map(|m| m.month.clone());
    let highest_expense_month = months
        .iter()
        .max_by_key(|m| m.expenses_minor)
        .map(|m| m.month.clone());
    let largest_expense_category = breakdown
        .iter()
        .max_by_key(|b| b.total_minor)
        .map(|b| b.name.clone());

    Analysis {
        avg_gross_minor: (sum_gross as f64 / n as f64).round() as i64,
        avg_expenses_minor: (sum_expenses as f64 / n as f64).round() as i64,
        avg_net_minor: (sum_net as f64 / n as f64).round() as i64,
        highest_income_month,
        highest_expense_month,
        largest_expense_category,
    }
}

pub fn get_total_impl(conn: &Connection) -> Result<TotalDashboard, String> {
    let gross_minor = income::total_all_time_impl(conn)?;
    let expenses_minor = expenses::total_all_time_impl(conn)?;
    let net_minor = gross_minor - expenses_minor;
    let breakdown = expenses::breakdown_all_time_impl(conn)?;

    let history = extra_budget::compute_history_impl(conn)?;
    let monthly_performance = history
        .monthly
        .iter()
        .map(|m| MonthlyPerformance {
            month: m.month.clone(),
            gross_minor: m.gross_minor,
            expenses_minor: m.expenses_minor,
            net_minor: m.net_minor,
        })
        .collect();

    let analysis = build_analysis(&history.monthly, &breakdown);

    Ok(TotalDashboard {
        gross_minor,
        expenses_minor,
        net_minor,
        breakdown,
        monthly_performance,
        analysis,
        extra_budget_balance_minor: history.balance_minor,
    })
}

#[tauri::command]
pub fn dashboard_get_monthly(
    state: State<DbState>,
    month: String,
) -> Result<MonthlyDashboard, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    get_monthly_impl(&conn, &month)
}

#[tauri::command]
pub fn dashboard_get_total(state: State<DbState>) -> Result<TotalDashboard, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    get_total_impl(&conn)
}
