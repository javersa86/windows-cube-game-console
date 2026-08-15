# Windows Cube Game Console
A custom game console menu built with Electron, React, TypeScript, and Vite — a Windows port of [pi-cube-game-console](https://github.com/Brickhouse4U/pi-cube-game-console), targeting desktop Windows instead of a Raspberry Pi / embedded Linux.

> ⚠️ This project is currently in active development. It was bootstrapped from the Pi version's UI and is being reworked feature-by-feature for Windows.

---

## Table of Contents
1. [Overview](#overview)
2. [Relationship to pi-cube-game-console](#relationship-to-pi-cube-game-console)
3. [Current State](#current-state)
4. [Planned / Windows Adaptation Work](#planned--windows-adaptation-work)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Roadmap](#roadmap)

---

## Overview

Windows Cube Game Console is a fullscreen Electron application that serves as a game console-style menu UI, running as a normal desktop app on Windows rather than booting as the embedded OS on a Raspberry Pi.

| Property | Value |
|---|---|
| Target Platform | Windows 10/11 (x64) |
| App Framework | Electron 43 + React 19 + TypeScript + Vite 8 |
| Display | Windowed/fullscreen Electron `BrowserWindow` (no X.Org/systemd dependency) |

---

## Relationship to pi-cube-game-console

This is a separate git project, not a fork — the UI (pages, components, styles) was carried over from `pi-cube-game-console` and rewritten in TypeScript, then adapted where Windows requires a different approach (no ALSA, no DDC/CI, no X11 display env, no AppImage packaging). `pi-cube-game-console` and `meta-game-console` remain the Raspberry Pi build and are unaffected by this project.

---

## Current State

### Already working
- **Full TypeScript conversion** — every page and component under `src/` is already `.tsx` (`App.tsx`, `MainMenu.tsx`, `Games.tsx`, `Options.tsx`, `Quit.tsx`, and all of `src/components/`). The `.jsx` → `.tsx` rewrite described in the Pi version's roadmap is done here.
- **Gamepad support** — `electron/utils/gamepad.js` polls the browser Gamepad API and is already wired into every page (D-pad navigation, A/B button handling on MainMenu, Games, Options, and Quit).
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

1. Rename in-app branding ("Pi Cube" → project's actual name) once decided.
2. Replace `/media/picube/...` path assumptions in `assets.js`/`main.js` with a Windows-appropriate games directory (configurable path or a bundled folder), and adjust `Games.tsx` accordingly.
3. Replace the `python3` + X11 `DISPLAY` game-launch logic in `main.js` with a Windows-native process launch.
4. Implement a real Windows brightness backend (no direct OS equivalent to DDC/CI without additional tooling — needs research, not a drop-in swap).
5. Implement a real Windows volume backend (feasible via the Windows Core Audio API, e.g. `IAudioEndpointVolume`, reachable from Node without native dependencies).
6. Add Windows packaging (`electron-builder` config + build script) — nothing is configured yet; today there's no equivalent to the Pi version's `package:local`/`package:pi` scripts.
7. Re-integrate any remaining Pi-version features not yet ported (external device manager, dedicated game launcher window) — see the Pi version's own roadmap for what's implemented there.

---

## Tech Stack

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
| `vite-plugin-electron` | ^1.1.1 | Runs/builds the Electron main + preload alongside Vite |
| `vite-plugin-electron-renderer` | ^1.0.0 | Node/Electron API support in the renderer |
| `oxlint` | ^1.75.0 | Linting |

### Desktop
| Package | Version | Purpose |
|---|---|---|
| `electron` | ^43.4.0 | Desktop app wrapper |

> Note: no packaging tool (e.g. `electron-builder`) is configured yet — see [Planned / Windows Adaptation Work](#planned--windows-adaptation-work).

---

## Project Structure

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

---

## Getting Started

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
⬜ Phase 2 — Windows-native game paths + game launching (replace /media/picube + python3/DISPLAY)
⬜ Phase 3 — Real Windows brightness backend
⬜ Phase 4 — Real Windows volume backend (Core Audio API)
⬜ Phase 5 — Rebranding (drop "Pi Cube" leftovers)
⬜ Phase 6 — Windows packaging (electron-builder, installer/portable build)
⬜ Phase 7 — Re-integrate remaining Pi-version features (external device manager, game launcher window)
```

---

## Notes
This project was developed for personal/educational purposes, as a Windows-targeted sibling to `pi-cube-game-console`. Initial project structure and documentation were developed with the assistance of Claude (Anthropic).
