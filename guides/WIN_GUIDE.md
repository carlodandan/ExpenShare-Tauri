# How to Build

Follow these steps and you should be able to compile this from source.

## Prerequisites
- Windows (7 and up)
- Rust
- Node.js (for Javascript ecosystem)
> *Only if you intend to use a JavaScript frontend framework*
- Pnpm (as package manager, you can use Npm if you like)

### Windows
Tauri uses the Microsoft C++ Build Tools for development as well as Microsoft Edge WebView2. These are both required for development and compiling on Windows.
- Make sure to download and install <a href="https://visualstudio.microsoft.com/visual-cpp-build-tools">Microsoft C++ Build Tools</a>.
<img src="https://raw.githubusercontent.com/carlodandan/ExpenShare-Tauri/refs/heads/main/guides/visual-studio-build-tools-installer.webp" alt="Settings" width="1200">
- Next to install <a href="https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section">WebView2</a>. Download the “Evergreen Bootstrapper” and install it.
> *WebView 2 is already installed on Windows 10 (from version 1803 onward) and later versions of Windows. If you are developing on one of these versions then you can skip this step*

### Rust
Visit official link to install rustup: <a href="https://www.rust-lang.org/tools/install">Rust</a>.

Alternatively, you can use `winget` to install rustup using the following command in PowerShell:

```
winget install --id Rustlang.Rustup
```
> *Be sure to restart your Terminal (and in some cases your system) for the changes to take effect.*

### PNPM
Install using the following command in PowerShell:
```
Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
```
You can add pnpm to Microsoft Defender's list of excluded folders in a PowerShell window with administrator rights by executing:
```
Add-MpPreference -ExclusionPath $(pnpm store path)
```
> *Be sure to restart your Terminal (and in some cases your system) for the changes to take effect.*

### Start Development
Clone:
```
git clone --depth=1 https://github.com/carlodandan/ExpenShare-Tauri
```
Install Dependencies:
```
pnpm install
```
For Development:
```
pnpm tauri dev
```
For Compiling/Building:
```
pnpm tauri build
```