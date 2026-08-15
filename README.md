# Windows Cube Game Console
A custom game console menu built with React, TypeScript, and Vite — a Windows port of [pi-cube-game-console](https://github.com/Brickhouse4U/pi-cube-game-console), targeting desktop Windows instead of a Raspberry Pi / embedded Linux. **The desktop shell is migrating from Electron to [Tauri](https://tauri.app/)** — see [Migrating to Tauri](#migrating-to-tauri) below.

> ⚠️ This project is currently in active development. The code today is still Electron-based (unchanged from the original Pi port); the Tauri migration is a decided direction, not yet implemented.

---

## Table of Contents
1. [Overview](#overview)
2. [Relationship to pi-cube-game-console](#relationship-to-pi-cube-game-console)
3. [Migrating to Tauri](#migrating-to-tauri)
4. [Current State](#current-state)
5. [Planned / Windows Adaptation Work](#planned--windows-adaptation-work)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Getting Started](#getting-started)
9. [Roadmap](#roadmap)

---

## Overview

Windows Cube Game Console is a fullscreen desktop application that serves as a game console-style menu UI, running as a normal desktop app on Windows rather than booting as the embedded OS on a Raspberry Pi.

| Property | Value |
|---|---|
| Target Platform | Windows 10/11 (x64) |
| UI Framework | React 19 + TypeScript + Vite 8 |
| Desktop Shell | Electron 43 today → migrating to Tauri |
| Display | Windowed/fullscreen native window (no X.Org/systemd dependency) |

---

## Relationship to pi-cube-game-console

This is a separate git project, not a fork — the UI (pages, components, styles) was carried over from `pi-cube-game-console` and rewritten in TypeScript, then adapted where Windows requires a different approach (no ALSA, no DDC/CI, no X11 display env, no AppImage packaging). `pi-cube-game-console` and `meta-game-console` remain the Raspberry Pi build and are unaffected by this project.

---

## Migrating to Tauri

The desktop shell is moving from Electron to Tauri. Reasoning:

- **What Electron was doing here**: bundling Chromium + Node.js so the React UI could run outside a browser, with a Node "main process" providing the OS access a sandboxed web page can't have (spawning game processes, reading external drives, controlling system volume/brightness) — bridged to the UI via a preload script and `contextBridge`.
- **Why move off it**: that main-process/preload bridge is real complexity, and on this Windows port it surfaced a reproducible bug — `vite-plugin-electron`'s dev-mode auto-restart (triggered on every `main.js` edit) has a Windows-specific race that corrupts the sandboxed preload's startup data, breaking `window.electron`/`window.volume`/etc. on an unpredictable subset of restarts. That's tooling flakiness, not a fundamental flaw in the app design, but it made Windows-side iteration unreliable.
- **Why Tauri instead of dropping the native shell entirely**: the app genuinely needs OS-level access (game-process launching, real system volume/brightness, external-drive file access), which a plain browser page can't provide. Tauri keeps the same "web frontend + native backend" shape as Electron, but uses the OS's built-in WebView2 runtime instead of bundling Chromium, and its Rust-based command/IPC model doesn't share Electron's sandboxed-preload machinery — meaning the specific class of bug above doesn't apply. The tradeoff: backend code (today's `electron/utils/*.js`) gets rewritten in Rust as Tauri commands, not Node/JavaScript.

**Status**: not yet started. `package.json`, `vite.config.ts`, and the `electron/` directory are all still the original Electron setup. Migration will involve scaffolding a `src-tauri/` Rust backend, removing `electron`/`vite-plugin-electron`/`vite-plugin-electron-renderer`, and porting each `electron/utils/*.js` module to a Tauri command. This README will be updated with real package versions and project structure once that scaffolding exists — nothing below is invented ahead of the actual migration.

---

## Current State

*(Reflects the code as it exists today — still Electron, pre-migration.)*

### Already working
- **Full TypeScript conversion** — every page and component under `src/` is already `.tsx` (`App.tsx`, `MainMenu.tsx`, `Games.tsx`, `Options.tsx`, `Quit.tsx`, and all of `src/components/`). The `.jsx` → `.tsx` rewrite described in the Pi version's roadmap is done here.
- **Gamepad support** — `electron/utils/gamepad.js` polls the browser Gamepad API and is already wired into every page (D-pad navigation, A/B button handling on MainMenu, Games, Options, and Quit). This logic is UI-side (browser Gamepad API) and should port to Tauri largely unchanged.
- **Sound effects** — `electron/utils/sound.js` preloads and plays UI sound effects (hover/click/rollover), already in use across pages.
- **Page navigation** — MainMenu, Games, Options, and Quit pages, routed with `react-router-dom` (`HashRouter`).

### Placeholder / not yet real
- **Brightness** (`electron/utils/brightness.js`) — in-memory placeholder only; the Pi version's DDC/CI (`ddcutil`) approach doesn't apply on Windows and hasn't been replaced yet.
- **Volume** (`electron/utils/volume.js`) — in-memory placeholder only; the Pi version's ALSA (`amixer`) approach doesn't apply on Windows and hasn't been replaced yet.

### Carried over from the Pi version but not yet adapted
- **Game paths** — `electron/utils/assets.js` and the Games page still hardcode Pi-specific mount paths (`/media/picube/covers/...`), which won't resolve on Windows.
- **Game launching** — `electron/main.js`'s `launch-game` handler still spawns `python3 <path>` with a Linux `DISPLAY=:0` environment variable; this needs a Windows-appropriate process launch.
- **Branding** — the MainMenu page header still literally reads "Pi Cube" (`src/pages/MainMenu.tsx`), left over from the source project and not yet renamed.

---

## Planned / Windows Adaptation Work

These are the same underlying gaps as before, now targeted at landing on Tauri rather than patched into the Electron main process:

1. Scaffold the Tauri project (`src-tauri/`) and wire the existing Vite/React frontend into it.
2. Port `electron/utils/*.js` to Tauri commands (Rust), one module at a time, rather than porting them to more Electron/Node code first.
3. Rename in-app branding ("Pi Cube" → project's actual name) once decided.
4. Replace `/media/picube/...` path assumptions with a Windows-appropriate games directory (configurable path or a bundled folder), and adjust `Games.tsx` accordingly.
5. Replace the `python3` + X11 `DISPLAY` game-launch logic with a Windows-native process launch (Rust `std::process::Command` in a Tauri command).
6. Implement a real Windows brightness backend (no direct OS equivalent to DDC/CI without additional tooling — needs research either way, Electron or Tauri).
7. Implement a real Windows volume backend (feasible via the Windows Core Audio API, e.g. `IAudioEndpointVolume`, reachable from Rust via the `windows` crate).
8. Add Windows packaging — Tauri's own bundler (MSI/NSIS) replaces the Pi version's `electron-builder`/AppImage setup.
9. Re-integrate any remaining Pi-version features not yet ported (external device manager, dedicated game launcher window) — see the Pi version's own roadmap for what's implemented there.

---

## Tech Stack

*(Current, as of today — still the Electron setup. Will be updated once the Tauri scaffold replaces it; see [Migrating to Tauri](#migrating-to-tauri).)*

### Frontend
| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.8 | UI framework |
| `react-dom` | ^19.2.8 | React DOM rendering |
| `react-router-dom` | ^7.18.2 | Page routing / navigation |
| `lodash` | ^4.18.1 | Debouncing (e.g. Options sliders) |

### Build Tools
| Package | Version | Purpose |
|---|---|---|
| `typescript` | ~6.0.2 | Type checking / compilation |
| `vite` | ^8.2.0 | Frontend bundler / dev server |
| `@vitejs/plugin-react` | ^6.0.4 | React support for Vite |
| `vite-plugin-electron` | ^1.1.1 | Runs/builds the Electron main + preload alongside Vite — to be removed during migration |
| `vite-plugin-electron-renderer` | ^1.0.0 | Node/Electron API support in the renderer — to be removed during migration |
| `oxlint` | ^1.75.0 | Linting |

### Desktop (current — Electron)
| Package | Version | Purpose |
|---|---|---|
| `electron` | ^43.4.0 | Desktop app wrapper — being replaced by Tauri |

---

## Project Structure

*(Current, as of today.)*

```
windows-cube-game-console/
├── electron/
│   ├── main.js               # Electron main process — window creation, IPC handlers
│   ├── preload.js             # contextBridge — exposes window.electron/brightness/volume/games
│   └── utils/
│       ├── assets.js          # Resource/game-cover path resolution (still Pi-path based)
│       ├── brightness.js      # Placeholder brightness backend
│       ├── gamepad.js         # Gamepad API polling + event bus
│       ├── sound.js           # UI sound effect preload/playback
│       └── volume.js          # Placeholder volume backend
├── src/
│   ├── components/
│   │   ├── Buttons/            # CancelButton, DownButton, MenuOption, UpButton
│   │   ├── GamesPageComponents/ # GameSelectionsView, GameSnippet
│   │   ├── OptionsPageComponents/ # CustomSlider
│   │   └── CubeLayout.tsx
│   ├── pages/
│   │   ├── MainMenu.tsx        # Main menu / landing page
│   │   ├── Games.tsx           # Games browser page
│   │   ├── Options.tsx         # Brightness/volume settings page
│   │   └── Quit.tsx            # Quit confirmation page
│   ├── styles/                 # CSS module styles
│   ├── App.tsx                 # Root component + router setup
│   ├── main.tsx                 # React entry point
│   └── global.d.ts             # Ambient types for window.electron/brightness/volume/games
├── index.html                  # Electron renderer entry point
├── vite.config.ts              # Vite + vite-plugin-electron configuration
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── package.json
```

Once the Tauri migration lands, `electron/` will be replaced by a `src-tauri/` Rust crate, and this tree will be updated to match — not before.

---

## Getting Started

*(Current — Electron-based dev workflow. Will change once Tauri is scaffolded.)*

### Prerequisites
- Node.js 18+
- npm

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run dev
```
`vite-plugin-electron` launches Electron automatically alongside the Vite dev server — there's no separate `concurrently`-based start script like the Pi version has.

> Known issue: editing `electron/main.js` while `npm run dev` is running triggers a full process restart that can intermittently fail to reload the preload script correctly on Windows (see [Migrating to Tauri](#migrating-to-tauri)). If the app shows `window.electron` as `undefined`, fully stop and restart `npm run dev` rather than relying on the auto-restart.

### Build the renderer + main/preload
```bash
npm run build
```
Runs `tsc -b` followed by `vite build`. This does not produce an installable Windows package — see [Planned / Windows Adaptation Work](#planned--windows-adaptation-work) for packaging.

### Lint
```bash
npm run lint
```

---

## Roadmap

```
✅ Phase 0 — Project bootstrap from pi-cube-game-console, TypeScript conversion
✅ Phase 1 — Page navigation (MainMenu, Games, Options, Quit) + gamepad support
⬜ Phase 2 — Migrate desktop shell from Electron to Tauri
⬜ Phase 3 — Windows-native game paths + game launching (replace /media/picube + python3/DISPLAY)
⬜ Phase 4 — Real Windows brightness backend (Tauri command)
⬜ Phase 5 — Real Windows volume backend (Tauri command, Core Audio API via the `windows` crate)
⬜ Phase 6 — Rebranding (drop "Pi Cube" leftovers)
⬜ Phase 7 — Windows packaging (Tauri bundler — MSI/NSIS)
⬜ Phase 8 — Re-integrate remaining Pi-version features (external device manager, game launcher window)
```

---

## Notes
This project was developed for personal/educational purposes, as a Windows-targeted sibling to `pi-cube-game-console`. Initial project structure and documentation were developed with the assistance of Claude (Anthropic).
