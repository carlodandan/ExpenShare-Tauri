# ExpenShare: Product Documentation

## Overview
ExpenShare is a local, offline-first desktop and mobile application designed to help households track and manage their shared budget. Born from a personal need for a simple, ad-free, and lightweight financial tool, ExpenShare focuses on clear, no-nonsense budget tracking without relying on external servers or cloud syncing.

## Core Value Proposition
- **Privacy-First & Offline:** All financial data is stored locally on the user's device using SQLite. No data is sent to external servers.
- **Shared Household Focus:** Designed specifically for households, allowing up to 3 people to track their combined income and share expenses.
- **Lightweight & Fast:** Built with Tauri v2 and Rust, ensuring minimal memory footprint and fast startup times compared to traditional Electron apps.

## Key Features

### 1. Monthly Dashboard
- Navigate through different months to view historical data.
- **Gross & Net Cards:** Instantly view the total household income and the remaining net balance after expenses.
- **Income Tracking:** Add, edit, and delete income entries, categorized by household member.
- **Expense Tracking:** Manage expenses across customizable "Fixed" and "Repeatable" categories. 

### 2. Total Dashboard
- **All-Time Stats:** View cumulative Gross, Expenses, Net, and Savings across all recorded months.
- **Visual Breakdown:** A donut chart visualizes expense distribution across categories.
- **Performance Table:** A sortable table comparing month-over-month performance.
- **Insights:** Simple analytics highlighting averages, highest income/expense months, and the largest expense categories.

### 3. Extra Budget
- A dedicated system for managing surplus funds (Savings/Extra Budget) that roll over month-to-month.
- **Running Balance:** Track the total accumulated extra budget.
- **Withdrawals & Adjustments:** Record withdrawals from the extra budget or directly use the extra budget to pay for a repeatable expense (e.g., Groceries) without affecting the current month's net income.
- **Deficit Handling:** Accurately reflects shortfalls if expenses exceed income in a given month.

### 4. Goals
- Set financial targets for future purchases (e.g., Cars, Vacations, House).
- Track contributions towards each goal over time.
- Visual progress indicators to motivate saving.

### 5. Settings & Customization
- **Household Members:** Add up to 3 people and rename them.
- **Currency:** Change the display currency and symbol.
- **Theme:** Toggle between Light, Dark, or System themes.
- **Data Portability:** Export (backup) the entire database and restore it when needed.

### 6. Reports
- Export monthly summaries to PDF and CSV formats for external record-keeping or sharing.

### 7. Auto-Updater
- Integrated Tauri updater provides seamless, passive background updates on Windows via GitHub Releases.

## Target Audience
Couples, roommates, or small families who want a simple, private way to pool their income and track shared expenses without the bloat of enterprise financial software.
