# ExpenShare

An offline desktop (for Windows and Android) budget tracker for sharing a household budget. This is just a simple tracker that lets you supervise your gross, net, savings, expenses and your extra budget from current and previous months.

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

- Set Goals: it is designed for setting targets or goals for future usage or for something that you are saving up for like Cars, House and Lot or even your retirement.

- Settings: Can rename, add up to maximum of 3 person, change currency, backup/restore the database file

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
<summary>Set Goals</summary>
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/images/setgoals.png" alt="Set Goals" width="1200">
</details>

<details>
<summary>Settings</summary>
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/images/settings.png" alt="Settings" width="1200">
</details>

## How To's

If you wanna compile it on your own please check out the build guides for <a href="https://github.com/carlodandan/ExpenShare-Tauri/blob/main/guides/WIN_GUIDE.md">Windows</a> and <a href="https://github.com/carlodandan/ExpenShare-Tauri/blob/main/guides/APK_GUIDE.md">Android</a>, or visit Tauri's <a href="https://tauri.app/start">documentation</a> for more information.

### Notes

This is just a simple budget tracker that I made—nothing really extravagant, and not even a real-life solution (I think). My partner and I decided to build an app that we could use to track our own budget, with simple customization, no ads or suspicious plugins, and to keep it as lightweight as possible. This is also the same reason why I ported it from Electron Forge to Tauri.

I published it under the <a href="https://github.com/carlodandan/ExpenShare-Tauri/blob/main/LICENSE">MIT License</a>, so feel free to share your suggestions, make improvements, or even create your own version of it.

I hope you guys like it, if you ever happen to stumble upon this repository.

### Release

To download the latest update, visit the "[release](https://github.com/carlodandan/ExpenShare-Tauri/releases)" page. In downloading the file, please try to ignore the warning regarding it being dangerous as it is just a false alarm, it is a known issue in Tauri community - even with EV/OV certificate.
- For Android, download the .apk file.
- For Windows, download either the .exe or .msi file.
> *In Windows, sometimes it block by Windows Defender Smartscreen, you can just submit the file as safe, they will review it, then after few hours it will now let you download and install it. Or allow it in your virus protection system. Now, if you still doubt all of this, you can review the source code and build it yourself.*
