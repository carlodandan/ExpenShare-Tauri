# ExpenShare

An offline desktop (for Windows) budget tracker for two people sharing a household budget. This is just a simple tracker that lets you supervise your gross, net, savings, expenses and your extra budget from current and previous months.

## Features
- Monthly Dashboard: month navigation, Gross/Net cards, income by person,
fixed + repeatable expense categories, add/edit/delete for every
transaction with confirmation on delete, empty states

- Total Dashboard: all-time Gross/Expenses/Net/Savings, expense breakdown donut
chart, sortable monthly performance table, simple analysis (averages,
highest income/expense month, largest expense category)

- Extra Budget: running balance, monthly contribution history, withdrawal
history with delete, deficit/shortfall handling that never hides a
negative month, plus the ability to use Extra Budget directly as an
expense in a repeatable category (Groceries, Miscellaneous, etc.)

- Settings: Can rename, change currency, backup/restore the database file

- Monthly report export to PDF and CSV

- Financial-logic test suite covering gross/expenses/net/extra-budget
accumulation, withdrawal validation, negative-net shortfall handling,
CRUD, and month filtering

## Tech Stack

- Tauri 2.0 (ported from Electron-Forge)
- Vite (for Development)
- ReactJS (for Components and other functions)
- Tailwind CSS v4 (for UI designs)
- Rust (for Backend connection and compiling)

## Sample Images

<details>
<summary>Monthly</summary>
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/images/monthly.png" alt="Monthly" width="1200">
</details>

<details>
<summary>Total</summary>
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/images/total.png" alt="Total" width="1200">
</details>

<details>
<summary>Extra Budget</summary>
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/images/extrabudget.png" alt="Extra Budget" width="1200">
</details>

<details>
<summary>Settings</summary>
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/images/settings.png" alt="Settings" width="1200">
</details>

## How To's

If you wanna compile it on your own please visit this <a href="https://github.com/carlodandan/ExpenShare-Tauri/blob/main/loading/GUIDE.md">guides</a> or visit Tauri's <a href="https://tauri.app/start">documentation</a> for more information.

### Notes

This is just a simple budget tracker that I made—nothing really extravagant, and not even a real-life solution (I think). My partner and I decided to build an app that we could use to track our own budget, with simple customization, no ads or suspicious plugins, and to keep it as lightweight as possible. This is also the same reason why I ported it from Electron Forge to Tauri.

I published it under the <a href="https://github.com/carlodandan/ExpenShare-Tauri/blob/main/LICENSE">MIT License</a>, so feel free to share your suggestions, make improvements, or even create your own version of it.

I hope you guys like it, if you ever happen to stumble upon this repository.

