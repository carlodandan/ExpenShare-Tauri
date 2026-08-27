use crate::commands::dashboard::{self};
use crate::commands::settings;
use crate::db::DbState;
use crate::money::to_major_units;
use printpdf::*;
use rusqlite::Connection;
use serde_json::{json, Value};
use std::io::BufWriter;
use std::path::Path;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

fn money(minor: i64, symbol: &str) -> String {
    // en-PH-style grouping with 2 decimals, e.g. "₱1,234.56".
    let major = to_major_units(minor);
    let formatted = format_with_commas(major);
    format!("{}{}", symbol, formatted)
}

fn format_with_commas(value: f64) -> String {
    let negative = value < 0.0;
    let abs = value.abs();
    let cents = (abs * 100.0).round() as i64;
    let whole = cents / 100;
    let frac = cents % 100;

    let whole_str = whole.to_string();
    let mut grouped = String::new();
    for (i, c) in whole_str.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(c);
    }
    let grouped: String = grouped.chars().rev().collect();

    format!("{}{}.{:02}", if negative { "-" } else { "" }, grouped, frac)
}

fn month_label(month: &str) -> String {
    let parts: Vec<&str> = month.split('-').collect();
    if parts.len() != 2 {
        return month.to_string();
    }
    let (y, m) = (parts[0], parts[1]);
    let months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    let idx: usize = m.parse::<usize>().unwrap_or(1).saturating_sub(1).min(11);
    format!("{} {}", months[idx], y)
}

fn csv_safe(value: &str) -> String {
    if value.contains(',') || value.contains('"') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

pub fn build_csv(conn: &Connection, month: &str, _symbol: &str) -> Result<String, String> {
    let data = dashboard::get_monthly_impl(conn, month)?;
    let mut lines: Vec<String> = Vec::new();

    lines.push(format!("Budget Report,{}", month_label(month)));
    lines.push(String::new());
    lines.push("INCOME".into());
    lines.push("Person,Description,Date,Amount".into());
    for tx in &data.income {
        lines.push(format!(
            "{},{},{},{}",
            csv_safe(&tx.person_name),
            csv_safe(&tx.description),
            tx.date,
            to_major_units(tx.amount_minor)
        ));
    }
    lines.push(format!(
        ",,TOTAL GROSS,{}",
        to_major_units(data.gross_minor)
    ));
    lines.push(String::new());
    lines.push("EXPENSES".into());
    lines.push("Category,Description,Date,Amount".into());
    for cat in &data.expense_categories {
        if cat.category.kind == "fixed" {
            lines.push(format!(
                "{},,,{}",
                csv_safe(&cat.category.name),
                to_major_units(cat.total_minor)
            ));
        } else {
            for tx in &cat.transactions {
                lines.push(format!(
                    "{},{},{},{}",
                    csv_safe(&cat.category.name),
                    csv_safe(&tx.description),
                    tx.date,
                    to_major_units(tx.amount_minor)
                ));
            }
            if cat.transactions.is_empty() {
                lines.push(format!("{},,,0", csv_safe(&cat.category.name)));
            }
        }
    }
    lines.push(format!(
        ",,TOTAL EXPENSES,{}",
        to_major_units(data.expenses_minor)
    ));
    lines.push(String::new());
    lines.push(format!(",,NET,{}", to_major_units(data.net_minor)));
    lines.push(String::new());
    lines.push("EXTRA BUDGET".into());
    lines.push(format!(
        ",,Used this month,{}",
        to_major_units(data.extra_budget.used_minor)
    ));
    lines.push(format!(
        ",,Remaining balance,{}",
        to_major_units(data.extra_budget.running_balance_minor)
    ));
    if data.extra_budget.shortfall_minor > 0 {
        lines.push(format!(
            ",,Shortfall,{}",
            to_major_units(data.extra_budget.shortfall_minor)
        ));
    }

    Ok(lines.join("\n"))
}

// --- PDF -------------------------------------------------------------
//
// Recreates src/main/reports.js `buildPdf` section-by-section (same
// headings, same order, same emphasis) using printpdf's built-in Helvetica
// fonts, so no font files need to be vendored into the app. pdfkit lays
// text out with automatic flow/wrapping and implicit page breaks; printpdf
// is a lower-level drawing API, so this file tracks a manual "cursor" (page,
// y-position) and breaks to a new page itself when the cursor nears the
// bottom margin, closely mirroring pdfkit's own margin/pagination
// behavior for this report's fairly simple, non-wrapping line layout.

const PAGE_W_MM: f64 = 215.9; // US Letter, matching pdfkit's default page size
const PAGE_H_MM: f64 = 279.4;
const MARGIN_MM: f64 = 17.64; // ~50pt, matching `new PDFDocument({ margin: 50 })`

struct PdfCursor<'a> {
    doc: &'a PdfDocumentReference,
    layer: PdfLayerReference,
    y: f64,
    font: IndirectFontRef,
}

impl<'a> PdfCursor<'a> {
    fn advance(&mut self, font_size: f64) {
        // Approximate pdfkit's implicit single-line advance (~1.4x font size).
        self.y -= font_size * 1.4 * 0.3528; // pt -> mm
    }

    fn ensure_room(&mut self, font_size: f64) {
        if self.y - (font_size * 1.4 * 0.3528) < MARGIN_MM {
            let (page, layer) =
                self.doc
                    .add_page(Mm(PAGE_W_MM as f32), Mm(PAGE_H_MM as f32), "Layer 1");
            self.layer = self.doc.get_page(page).get_layer(layer);
            self.y = PAGE_H_MM - MARGIN_MM;
        }
    }

    fn text(&mut self, s: &str, font_size: f64, color: (f64, f64, f64)) {
        self.ensure_room(font_size);
        self.layer.set_fill_color(Color::Rgb(Rgb::new(
            color.0 as f32,
            color.1 as f32,
            color.2 as f32,
            None,
        )));
        self.layer.use_text(
            s,
            font_size as f32,
            Mm(MARGIN_MM as f32),
            Mm(self.y as f32),
            &self.font,
        );
        self.advance(font_size);
    }

    fn move_down(&mut self, font_size: f64, factor: f64) {
        self.y -= font_size * 1.4 * 0.3528 * factor;
    }

    /// Draws a thin rule under the given text, approximating pdfkit's
    /// `{ underline: true }` text option (printpdf has no native underline).
    fn underline_last(&mut self, text: &str, font_size: f64) {
        let width_mm = (text.len() as f64) * font_size * 0.24; // rough Helvetica avg width
        let line_y = self.y + font_size * 1.4 * 0.3528 - 1.0;
        let line = Line {
            points: vec![
                (Point::new(Mm(MARGIN_MM as f32), Mm(line_y as f32)), false),
                (
                    Point::new(Mm((MARGIN_MM + width_mm) as f32), Mm(line_y as f32)),
                    false,
                ),
            ],
            is_closed: false,
        };
        self.layer
            .set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
        self.layer.set_outline_thickness(0.3);
        self.layer.add_line(line);
    }
}

const BLACK: (f64, f64, f64) = (0.0, 0.0, 0.0);
const GRAY: (f64, f64, f64) = (0.4, 0.4, 0.4);
const DARK_GRAY: (f64, f64, f64) = (0.2, 0.2, 0.2);
const RED: (f64, f64, f64) = (0.725, 0.106, 0.145); // #b91c1c

pub fn build_pdf_bytes(
    conn: &Connection,
    month: &str,
    symbol: &str,
) -> Result<Vec<u8>, String> {
    let data = dashboard::get_monthly_impl(conn, month)?;

    let (doc, page1, layer1) = PdfDocument::new(
        "Budget Report",
        Mm(PAGE_W_MM as f32),
        Mm(PAGE_H_MM as f32),
        "Layer 1",
    );
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| e.to_string())?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| e.to_string())?;

    let mut cur = PdfCursor {
        doc: &doc,
        layer: doc.get_page(page1).get_layer(layer1),
        y: PAGE_H_MM - MARGIN_MM,
        font: font.clone(),
    };

    cur.text("Budget Report", 18.0, BLACK);
    cur.text(&month_label(month), 12.0, GRAY);
    cur.move_down(12.0, 1.0);

    // Income
    cur.font = font_bold.clone();
    cur.text("Income", 14.0, BLACK);
    cur.font = font.clone();
    cur.move_down(14.0, 0.3);

    // Group income by person, preserving first-seen order (matches the
    // JS `byPerson` object accumulation, which iterates in insertion order).
    let mut order: Vec<String> = Vec::new();
    let mut grouped: std::collections::HashMap<String, Vec<&crate::commands::income::IncomeRow>> =
        std::collections::HashMap::new();
    for tx in &data.income {
        if !grouped.contains_key(&tx.person_name) {
            order.push(tx.person_name.clone());
        }
        grouped.entry(tx.person_name.clone()).or_default().push(tx);
    }

    for person in &order {
        cur.text(person, 11.0, BLACK);
        for tx in &grouped[person] {
            let desc = if tx.description.is_empty() {
                "Income"
            } else {
                &tx.description
            };
            cur.text(
                &format!(
                    "  {} — {}  ({})",
                    desc,
                    money(tx.amount_minor, symbol),
                    tx.date
                ),
                10.0,
                DARK_GRAY,
            );
        }
    }
    cur.move_down(11.0, 0.3);
    let gross_line = format!("TOTAL GROSS: {}", money(data.gross_minor, symbol));
    cur.text(&gross_line, 12.0, BLACK);
    cur.underline_last(&gross_line, 12.0);
    cur.move_down(12.0, 1.0);

    // Expenses
    cur.font = font_bold.clone();
    cur.text("Expenses", 14.0, BLACK);
    cur.font = font.clone();
    cur.move_down(14.0, 0.3);

    for cat in &data.expense_categories {
        cur.text(
            &format!("{}: {}", cat.category.name, money(cat.total_minor, symbol)),
            11.0,
            BLACK,
        );
        if cat.category.kind == "repeatable" {
            for tx in &cat.transactions {
                let desc = if tx.description.is_empty() {
                    "Expense"
                } else {
                    &tx.description
                };
                cur.text(
                    &format!(
                        "  {} — {}  ({})",
                        desc,
                        money(tx.amount_minor, symbol),
                        tx.date
                    ),
                    10.0,
                    DARK_GRAY,
                );
            }
        }
    }
    cur.move_down(11.0, 0.3);
    let expenses_line = format!("TOTAL EXPENSES: {}", money(data.expenses_minor, symbol));
    cur.text(&expenses_line, 12.0, BLACK);
    cur.underline_last(&expenses_line, 12.0);
    cur.move_down(12.0, 1.0);

    // Net
    cur.text(
        &format!("NET: {}", money(data.net_minor, symbol)),
        14.0,
        BLACK,
    );
    cur.move_down(14.0, 1.0);

    // Extra budget
    cur.font = font_bold.clone();
    cur.text("Extra Budget", 14.0, BLACK);
    cur.font = font.clone();
    cur.text(
        &format!(
            "Used this month: {}",
            money(data.extra_budget.used_minor, symbol)
        ),
        11.0,
        BLACK,
    );
    cur.text(
        &format!(
            "Remaining balance: {}",
            money(data.extra_budget.running_balance_minor, symbol)
        ),
        11.0,
        BLACK,
    );
    if data.extra_budget.shortfall_minor > 0 {
        cur.text(
            &format!(
                "Shortfall: {}",
                money(data.extra_budget.shortfall_minor, symbol)
            ),
            11.0,
            RED,
        );
    }

    let mut buf = Vec::new();
    doc.save(&mut BufWriter::new(&mut buf))
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

pub fn build_pdf(
    conn: &Connection,
    month: &str,
    symbol: &str,
    output_path: &Path,
) -> Result<(), String> {
    let pdf_bytes = build_pdf_bytes(conn, month, symbol)?;
    std::fs::write(output_path, pdf_bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reports_export(
    app: AppHandle,
    state: State<'_, DbState>,
    month: String,
    format: String,
) -> Result<Value, String> {
    let extension = if format == "pdf" { "pdf" } else { "csv" };
    let default_name = format!("budget-report-{}.{}", month, extension);

    let mut dialog = app
        .dialog()
        .file()
        .set_title("Export Budget Report")
        .set_file_name(&default_name);
    dialog = if format == "pdf" {
        dialog.add_filter("PDF", &["pdf"])
    } else {
        dialog.add_filter("CSV", &["csv"])
    };

    let picked = dialog.blocking_save_file();
    let Some(picked) = picked else {
        return Ok(json!({ "canceled": true }));
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_settings = settings::get_all_impl(&conn)?;
    let symbol = current_settings
        .get("currency_symbol")
        .and_then(|v| v.as_str())
        .unwrap_or("₱")
        .to_string();

    let data_bytes = if format == "pdf" {
        build_pdf_bytes(&conn, &month, &symbol)?
    } else {
        let csv = build_csv(&conn, &month, &symbol)?;
        csv.into_bytes()
    };

    let file_path = crate::file_utils::write_file_path(&app, &picked, &data_bytes)?;

    Ok(json!({ "canceled": false, "filePath": file_path }))
}
