# SEOSiri Task Sentinel (`employees-tasks-desktop`)

[![Release](https://img.shields.io/github/v/release/SEOSiri-Official/employees-tasks-desktop?color=10b981&label=Release)](https://github.com/SEOSiri-Official/employees-tasks-desktop/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/SEOSiri-Official/employees-tasks-desktop/blob/main/LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-Tauri%20v2%20%2B%20Rust-purple.svg)](https://tauri.app/)
[![Gateway](https://img.shields.io/badge/Gateway-tasks.seosiri.com-emerald.svg)](https://tasks.seosiri.com/health)

> 📖 **Official Portals:** [Command Board (board.seosiri.com)](https://board.seosiri.com/) | [Developer Portal](https://developers.seosiri.com/) | [SEOSiri Ecosystem Hub](https://www.seosiri.com/2026/07/seosiri-mcp-servers.html)

**SEOSiri Task Sentinel** is an ultra-lightweight, memory-safe desktop daemon and system tray sentinel engineered in **Tauri v2 and Rust**. It connects workstations directly to the global SEOSiri edge network (`tasks.seosiri.com`) with sub-15MB RAM consumption, zero bundled Chromium overhead, and native Windows, macOS, and Linux tray integration.

---

## 🚀 Key Enterprise Architectural Highlights

- **Memory-Safe Rust Core:** Built using Tokio async runtimes and Tauri v2. Consumes `<15MB RAM` and `<0.05% CPU` (CISA / NSA memory-safety compliance).
- **Native OS Tray & HUD:** System tray sentinel with a dark-mode Heads-Up Display (HUD) popover powered by the host OS native WebView (`WebView2` on Windows, `WebKit` on macOS).
- **Real-Time Task Polling:** Asynchronously queries edge tasks and alerts team members of high-priority assignments via native OS notifications.
- **Zero-Spyware Guarantee:** Tracks only task lifecycle events (In Progress → Blocker → Complete). Zero keystroke logging, zero screen capturing, 100% EU GDPR and German Works Council (*Betriebsrat*) compliant.
- **Silent Fleet Deployment (MDM):** Ready for automated distribution across enterprise fleets via Microsoft Intune, SCCM, GPO, and Jamf Pro.

---

## 📦 Download Official Release Binaries (v2.0.0)

Download the pre-compiled native installers directly from the [Official v2.0.0 Release Page](https://github.com/SEOSiri-Official/employees-tasks-desktop/releases/latest):

| Operating System | Package Type | Direct Download Link | Deployment Target |
| :--- | :--- | :--- | :--- |
| **Windows (64-bit)** | `.msi` Installer | [Download MSI Installer](https://github.com/SEOSiri-Official/employees-tasks-desktop/releases/latest) | Microsoft Intune / Group Policy (GPO) |
| **Windows (64-bit)** | `.exe` Setup | [Download EXE Setup](https://github.com/SEOSiri-Official/employees-tasks-desktop/releases/latest) | Self-Serve SME 1-Click Install |
| **macOS (Apple Silicon & Intel)** | `.dmg` Package | [Download DMG Package](https://github.com/SEOSiri-Official/employees-tasks-desktop/releases/latest) | Jamf Pro / Native Menu Bar |
| **Linux (Ubuntu / Debian)** | `.deb` Package | [Download DEB Package](https://github.com/SEOSiri-Official/employees-tasks-desktop/releases/latest) | `dpkg -i` / Corporate DevOps Fleet |

---

## 🛠️ Silent Enterprise Mass Deployment (Microsoft Intune / GPO)

To silently deploy the agent across thousands of Windows workstations with zero user clicks:

```cmd
msiexec /i SEOSiriTaskSentinel_2.0.0_x64_en-US.msi /quiet /qn
```

## ⚙️ Development & Local Compilation

### Prerequisites

- Node.js v20+
- Rust Toolchain (rustup default stable)
- C++ Build Tools (Windows MSVC / Xcode CLI tools / Linux webkit2gtk)

```bash
# Clone the repository
git clone https://github.com/SEOSiri-Official/employees-tasks-desktop.git
cd employees-tasks-desktop

# Install CLI dependencies
npm install

# Run native development mode
npm run dev

# Compile release bundles locally
npm run build
```

## 📄 License & Attribution

Distributed under the [MIT License](https://github.com/SEOSiri-Official/employees-tasks-desktop/blob/main/LICENSE).

Architected and engineered by [Momenul Ahmad](https://www.seosiri.com/p/about.html) under [SEOSiri Enterprise Labs](https://seosiri.com/).
