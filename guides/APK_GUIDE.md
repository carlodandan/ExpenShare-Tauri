# How to Build

Follow these steps and you should be able to compile the Android APK from source.

## Prerequisites
- Windows, macOS, or Linux
- Rust
- Node.js (v18 or higher)
- PNPM (or npm/yarn)
- Java Development Kit (JDK 17 or 21)
- Android Studio (Android SDK & NDK)

---

### 1. Rust
Visit the official link to install rustup: <a href="https://www.rust-lang.org/tools/install">Rust</a>.

Alternatively on Windows, you can use `winget` in PowerShell:
```powershell
winget install --id Rustlang.Rustup
```

After installing Rust, add the Android target architectures via rustup:
```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```
> *Be sure to restart your Terminal for changes to take effect.*

---

### 2. PNPM
Install using the following command in PowerShell:
```powershell
Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
```
> *Alternatively, install via npm: `npm install -g pnpm`*

---

### 3. Java Development Kit (JDK)
Android build tools require JDK 17 or higher.
- Download and install **JDK 17** or **JDK 21** from <a href="https://adoptium.net/temurin/releases/">Eclipse Adoptium (Temurin)</a> or <a href="https://learn.microsoft.com/en-us/java/openjdk/download">Microsoft Build of OpenJDK</a>.
- Alternatively via `winget`:
```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

---

### 4. Android Studio & SDK / NDK
1. Download and install <a href="https://developer.android.com/studio">Android Studio</a>.
2. Open Android Studio, go to **Settings / Preferences** > **Languages & Frameworks** > **Android SDK** (or **SDK Manager**).
3. Under the **SDK Platforms** tab, install:
   - **Android 14 (API 34)** or **Android 15 (API 35)**
4. Under the **SDK Tools** tab, check **Show Package Details** and select:
   - **Android SDK Build-Tools**
   - **Android SDK Command-line Tools (latest)**
   - **Android SDK Platform-Tools**
   - **NDK (Side by side)** (e.g. version 26.x or 27.x)
   - **CMake**
5. Click **Apply** to install the selected packages.

---

### 5. Environment Variables
Make sure the following environment variables are set in your system:

- `JAVA_HOME`: Path to your JDK installation.
  - *Example (Windows):* `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`
- `ANDROID_HOME`: Path to your Android SDK.
  - *Example (Windows):* `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
- `NDK_HOME`: Path to your installed NDK directory.
  - *Example (Windows):* `C:\Users\<YourUsername>\AppData\Local\Android\Sdk\ndk\<version>`

#### Setting via PowerShell (User Variables):
```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[Environment]::SetEnvironmentVariable("NDK_HOME", "$env:LOCALAPPDATA\Android\Sdk\ndk\<version>", "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.x.x", "User")
```
> *Replace `<YourUsername>` and `<version>` with your actual directories, and restart your terminal.*

---

### 6. Start Development & Building

#### Clone the Repository:
```powershell
git clone --depth=1 https://github.com/carlodandan/ExpenShare-Tauri
```

#### Install Dependencies:
```powershell
pnpm install
```

#### Initialize Android (First Time Only):
If the `src-tauri/gen/android` folder is not yet initialized:
```powershell
pnpm tauri android init
```

#### For Live Development:
Connect your physical Android device (with USB Debugging enabled) or start an Android Virtual Device (AVD) emulator, then run:
```powershell
pnpm tauri android dev
```

#### For Compiling/Building APK:
To build universal and architecture-specific release APKs:
```powershell
pnpm tauri android build --apk
```

> **APK Output Location:**
> Once the build completes, your `.apk` files will be located in:
> `src-tauri/gen/android/app/build/outputs/apk/universal/release/` or `src-tauri/gen/android/app/build/outputs/apk/arm64-v8a/release/`

### CI/CD Github Action
Now, if you feel like it will be hard for you to build it locally, you can use **GitHub Actions** to automatically build and compile the application in the cloud:

1. **Fork** this repository to your own GitHub account.
2. Go to the **Actions** tab in your forked repository and enable workflows.
3. Select the **Build ExpenShare** workflow and click **Run workflow** (or push updates to trigger it).
4. GitHub Actions will handle setting up all dependencies, compiling the Windows installer/binary (`.exe` / `.msi`), and publishing the build artifacts.