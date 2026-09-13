# Windows Cube Game Console
A custom game console menu built with React, TypeScript, and Vite — a Windows port of [pi-cube-game-console](https://github.com/Brickhouse4U/pi-cube-game-console), targeting desktop Windows instead of a Raspberry Pi / embedded Linux. **The desktop shell has migrated from Electron to [Tauri](https://tauri.app/)** — see [Tauri Migration](#tauri-migration) below.

> ⚠️ This project is currently in active development. Several features are still placeholders — see [Current State](#current-state).

---

## Table of Contents
1. [Overview](#overview)
2. [Relationship to pi-cube-game-console](#relationship-to-pi-cube-game-console)
3. [Tauri Migration](#tauri-migration)
4. [Current State](#current-state)
5. [Planned / Windows Adaptation Work](#planned--windows-adaptation-work)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Getting Started](#getting-started)
9. [Building the Installer](#building-the-installer)
10. [Roadmap](#roadmap)

---

## Overview

Windows Cube Game Console is a fullscreen desktop application that serves as a game console-style menu UI, running as a normal desktop app on Windows rather than booting as the embedded OS on a Raspberry Pi.

| Property | Value |
|---|---|
| Target Platform | Windows 10/11 (x64) |
| UI Framework | React 19 + TypeScript + Vite 8 |
| Desktop Shell | Tauri 2 (Rust + WebView2) |
| Display | Fullscreen, frameless, sized to the primary monitor |

---

## Relationship to pi-cube-game-console

This is a separate git project, not a fork — the UI (pages, components, styles) was carried over from `pi-cube-game-console` and rewritten in TypeScript, then adapted where Windows requires a different approach (no ALSA, no DDC/CI, no X11 display env, no AppImage packaging). `pi-cube-game-console` and `meta-game-console` remain the Raspberry Pi build and are unaffected by this project.

---

## Tauri Migration

The desktop shell has moved from Electron to Tauri. Reasoning and outcome:

- **What Electron was doing here**: bundling Chromium + Node.js so the React UI could run outside a browser, with a Node "main process" providing the OS access a sandboxed web page can't have (spawning game processes, reading external drives, controlling system volume/brightness) — bridged to the UI via a preload script and `contextBridge`.
- **Why move off it**: that main-process/preload bridge was real complexity, and on this Windows port it surfaced a reproducible bug — `vite-plugin-electron`'s dev-mode auto-restart (triggered on every `main.js` edit) had a Windows-specific race that corrupted the sandboxed preload's startup data, breaking `window.electron`/`window.volume`/etc. on an unpredictable subset of restarts. That was tooling flakiness, not a fundamental flaw in the app design, but it made Windows-side iteration unreliable.
- **Why Tauri instead of dropping the native shell entirely**: the app genuinely needs OS-level access (game-process launching, real system volume, external-drive file access), which a plain browser page can't provide. Tauri keeps the same "web frontend + native backend" shape as Electron, but uses Windows' built-in WebView2 runtime instead of bundling Chromium, and its Rust-based command/IPC model doesn't share Electron's sandboxed-preload machinery — so the specific class of bug above doesn't apply. The tradeoff: backend code (`electron/utils/*.js`) was rewritten in Rust as Tauri commands (`src-tauri/src/commands/`).

**Status: complete.** The migration was done in stages, keeping Electron working until each piece was verified: a toolchain/IPC spike, porting every IPC handler to a Rust command one at a time, a thin frontend adapter (`src/platform.ts`) replacing `window.electron`/`brightness`/`volume`/`games`, window parity (fullscreen/frameless/primary-monitor positioning, ported from `electron/main.js`'s `createWindow()`), a real Windows installer (new capability — the project had none before), a validation pass, and finally removing `electron/`, `vite-plugin-electron`, and `vite-plugin-electron-renderer` entirely. The dev-mode edit/reload cycle that motivated this migration was re-verified clean across the whole process — no recurrence of the preload-corruption bug.

`electron/utils/gamepad.js` and `sound.js` needed no backend changes (pure browser APIs) and now live at `src/utils/` alongside `assets.js`, since they were always renderer-side code, not Electron-main code.

---

## Current State

### Already working
- **Full TypeScript conversion** — every page and component under `src/` is `.tsx`.
- **Tauri desktop shell** — fullscreen, frameless, positioned to the primary monitor; see [Tauri Migration](#tauri-migration).
- **Gamepad support** — `src/utils/gamepad.js` polls the browser Gamepad API and is wired into every page (D-pad navigation, A/B button handling on MainMenu, Games, Options, and Quit). Confirmed working with a physical controller under Tauri/WebView2.
- **Sound effects** — `src/utils/sound.js` preloads and plays UI sound effects (hover/click/rollover), served as static files from `public/assets/sounds/` via Vite. (Previously broken under Tauri: `getSoundPath`/`getPicturePath` resolved a raw Windows filesystem path for `<audio>`/`<img>` `src` — worked under Electron's `webSecurity:false`, silently failed to load under WebView2, which is also why the Games page's Up/Down arrow icons rendered blank. Confirmed fixed — audio audible with a real playthrough.)
- **Page navigation** — MainMenu, Games, Options, and Quit pages, routed with `react-router-dom` (`HashRouter`).
- **Windows installer** — `npm run tauri build` produces both an MSI and an NSIS setup executable; see [Building the Installer](#building-the-installer).
- **Windows-native game paths + launching** — games live under `%USERPROFILE%\PiCubeGames\{covers,games}` (created automatically on first run), resolved via the `get_games_root` Tauri command. `launch_game` spawns `python <game>.py` (no `DISPLAY` env var — there's no X11 on Windows). Verified end-to-end with a real pygame test game.

### Placeholder / not yet real
- **Volume** (`src-tauri/src/commands/volume.rs`) — in-memory placeholder only; the Pi version's ALSA (`amixer`) approach doesn't apply on Windows and hasn't been replaced yet.

### Carried over from the Pi version but not yet adapted
- **Branding** — the MainMenu page header still literally reads "Pi Cube" (`src/pages/MainMenu.tsx`), left over from the source project and not yet renamed.

### Games directory layout
```
%USERPROFILE%\PiCubeGames\
├── covers\
│   └── <game-id>\
│       ├── title.txt       # display name shown on the Games page
│       └── preview.mp4     # optional preview clip
└── games\
    └── <game-id>\
        └── <game-id>.py    # entry point, launched via `python <game-id>.py`
```
Requires Python 3 with `pygame` installed and on `PATH` (`pip install pygame`) — games are plain pygame scripts, same format as the Pi version, so the same game code can in principle run on both platforms.

---

## Planned / Windows Adaptation Work

1. Implement a real Windows volume backend (feasible via the Windows Core Audio API, e.g. `IAudioEndpointVolume`, reachable from Rust via the `windows` crate).
2. Rename in-app branding ("Pi Cube" → project's actual name) once decided.
3. Re-integrate any remaining Pi-version features not yet ported (external device manager, dedicated game launcher window) — see the Pi version's own roadmap for what's implemented there.

Note: brightness control was dropped from scope — not a feature this project needs.

---

## Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.8 | UI framework |
| `react-dom` | ^19.2.8 | React DOM rendering |
| `react-router-dom` | ^7.18.2 | Page routing / navigation |
| `lodash` | ^4.18.1 | Debouncing (e.g. Options sliders) |
| `@tauri-apps/api` | ^2.11.1 | JS bindings for invoking Rust commands / listening for events |

### Build Tools
| Package | Version | Purpose |
|---|---|---|
| `typescript` | ~6.0.2 | Type checking / compilation |
| `vite` | ^8.2.0 | Frontend bundler / dev server |
| `@vitejs/plugin-react` | ^6.0.4 | React support for Vite |
| `oxlint` | ^1.75.0 | Linting |
| `@tauri-apps/cli` | ^2.11.4 | Tauri dev/build CLI |

### Desktop (Rust — `src-tauri/`)
| Crate | Purpose |
|---|---|
| `tauri` | Desktop app shell — window management, IPC, bundler |
| `tauri-plugin-log` | Debug-build logging |
| `serde` / `serde_json` | IPC payload (de)serialization |

---

## Project Structure

```
windows-cube-game-console/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── lib.rs              # App builder: window creation, command registration, state
│   │   └── commands/
│   │       ├── resources.rs    # get_games_root, read_directory, read_game_title, app_quit
│   │       ├── volume.rs       # get_volume/set_volume/toggle_mute (placeholder)
│   │       └── games.rs        # launch_game/kill_game + game-closed event
│   └── tauri.conf.json         # App identity, dev/build commands, bundler (MSI/NSIS) config
├── src/
│   ├── platform.ts             # Thin wrapper around Tauri's invoke()/listen(), replacing the old window.electron/brightness/volume/games bridge
│   ├── utils/
│   │   ├── assets.js           # Picture/sound paths (served from public/ via Vite) + game-cover paths (Windows-native PiCubeGames root)
│   │   ├── gamepad.js          # Gamepad API polling + event bus
│   │   └── sound.js            # UI sound effect preload/playback
│   ├── components/
│   │   ├── Buttons/            # CancelButton, DownButton, MenuOption, UpButton
│   │   ├── GamesPageComponents/ # GameSelectionsView, GameSnippet
│   │   ├── OptionsPageComponents/ # CustomSlider
│   │   └── CubeLayout.tsx
│   ├── pages/
│   │   ├── MainMenu.tsx        # Main menu / landing page
│   │   ├── Games.tsx           # Games browser page
│   │   ├── Options.tsx         # Volume settings page
│   │   └── Quit.tsx            # Quit confirmation page
│   ├── styles/                 # CSS module styles
│   ├── App.tsx                 # Root component + router setup
│   └── main.tsx                # React entry point
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust (stable, **MSVC** toolchain — `rustup default stable-x86_64-pc-windows-msvc`) with the Visual Studio C++ Build Tools workload
- WebView2 Runtime (preinstalled on Windows 10/11)

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run tauri dev
```
Starts the Vite dev server and a Tauri/WebView2 window together, with hot reload on the frontend and automatic rebuild-and-restart on Rust changes.

`npm run dev` alone still works as a plain Vite dev server (frontend-only, no native window) if that's all you need.

### Build the frontend only
```bash
npm run build
```
Runs `tsc -b` followed by `vite build`. This does not produce an installable Windows package — see [Building the Installer](#building-the-installer).

### Lint
```bash
npm run lint
```

---

## Building the Installer

```bash
npm run tauri build
```
Produces both a Windows installer under `src-tauri/target/release/bundle/`:
- `msi/Windows Cube Game Console_<version>_x64_en-US.msi`
- `nsis/Windows Cube Game Console_<version>_x64-setup.exe`

First run downloads WiX (for MSI) and NSIS (for the setup exe) automatically. Icons are still the generic Tauri scaffold defaults — swap `src-tauri/icons/` for real branding when available.

---

## Roadmap

```
✅ Phase 0 — Project bootstrap from pi-cube-game-console, TypeScript conversion
✅ Phase 1 — Page navigation (MainMenu, Games, Options, Quit) + gamepad support
✅ Phase 2 — Migrate desktop shell from Electron to Tauri
✅ Phase 3 — Windows-native game paths + game launching (replace /media/picube + python3/DISPLAY)
⬜ Phase 4 — Real Windows volume backend (Tauri command, Core Audio API via the `windows` crate)
⬜ Phase 5 — Rebranding (drop "Pi Cube" leftovers)
✅ Phase 6 — Windows packaging (Tauri bundler — MSI/NSIS)
⬜ Phase 7 — Re-integrate remaining Pi-version features (external device manager, game launcher window)

(Brightness control — previously Phase 4 — was dropped from scope.)
```

---

## Notes
This project was developed for personal/educational purposes, as a Windows-targeted sibling to `pi-cube-game-console`. Initial project structure and documentation were developed with the assistance of Claude (Anthropic).
