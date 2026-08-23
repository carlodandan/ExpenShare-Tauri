/// All monetary values are stored and passed to the frontend as integer
/// minor units (centavos for PHP: ₱1.00 = 100 minor units), exactly as in
/// the original app - the renderer never does float math on money.

pub fn to_major_units(minor: i64) -> f64 {
    (minor as f64) / 100.0
}

/// Returns the 'YYYY-MM' month key for a 'YYYY-MM-DD...' date string.
#[allow(dead_code)]
pub fn month_of(date: &str) -> String {
    date.chars().take(7).collect()
}
