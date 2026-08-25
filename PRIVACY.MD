# Privacy Policy for ExpenShare

*Last updated: August 2026*

This privacy policy describes how **ExpenShare** handles your personal data.

**ExpenShare is an offline desktop application.** It does not require an internet connection to function, and it never sends any data over the network. All information you enter—income, expenses, people, categories, settings, and any other records—remains **solely on your local device**.

## Data collection and storage

- **No data is collected, transmitted, or stored by us.**  
  The application does not phone home, send analytics, or communicate with any external servers or services.

- **All data lives in a local rusqlite database file.**  
  This file is stored in Rust’s standard sqlite database. It is only available in local machine.

- **No cloud sync, no third-party APIs.**  
  There are no integrations with cloud storage, authentication providers, or analytics platforms. The app does not embed any trackers, cookies, or telemetry.

## Your control over the data

- **Full local control.** You can view, edit, or delete any record directly within the application.

- **Backup and restore.** The app provides built‑in tools to export and import the entire database file through the Settings page. You can also copy the `.db` file manually using your file system.

- **No account required.** There is no sign‑up, login, or user identifier.

## Data security

Because the data never leaves your machine, it is subject to the physical security and access controls you apply to your own computer. We recommend that you:

- Keep your operating system up to date.
- Use disk encryption (e.g., FileVault, BitLocker) if you wish to protect the database file at rest.
- Regularly back up the database file to a safe location.

## Changes to this policy

This policy may be updated occasionally to reflect changes in the application. The latest version will always be included in the app’s source repository and distribution. Significant changes will be noted in the release notes.

## Contact

ExpenShare is an open‑source project. If you have questions about this privacy policy or the application’s data handling, please open an issue in the project repository.

---

**In short:** this app respects your privacy. Everything you enter stays on your machine, and nothing is sent anywhere—ever.