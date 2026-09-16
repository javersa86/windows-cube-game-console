/**
 * Picture/sound/game-cover path resolution.
 *
 * File: `src/utils/assets.js`
 *
 * Two different asset sources, handled differently:
 * - Pictures/sounds ship bundled inside the app (`public/assets/...`) and are served as static Vite paths — no Rust involved.
 * - Game covers/previews live on the user's local disk under `~/PiCubeGames/covers/<game>/`, so resolving them requires asking the Rust backend where that folder is and what's in it.
 *
 * Rust connection, via `src/platform.ts`'s `electron` export (`invoke(...)` calls) → Tauri commands in `src-tauri/src/commands/resources.rs`:
 * - {@link getGamesRoot} → `electron.getGamesRoot()` → `invoke('get_games_root')` → `resources.rs`'s `get_games_root` (which wraps `games_root_dir()`).
 * - {@link availableGameCovers} → `electron.readDirectory()` → `invoke('read_directory')` → `resources.rs`'s `read_directory`.
 * - {@link getGameTitleFile} returns a path that callers (see `src/pages/Games.tsx`) pass to `electron.readGameTitle()` → `invoke('read_game_title')` → `resources.rs`'s `read_game_title`.
 *
 * `resources.rs`'s `games_root_dir()` is also the exact folder `src-tauri/src/commands/games.rs`'s `launch_game` reads `<gameId>.py` from —  
 * this module and that Rust command agree on the same root so a cover shown here corresponds to a launchable game there.
 */

import { electron } from '../platform';

let gamesRoot = null;

/**
 * Fetches (and caches for the session) the local games root path from Rust —
 * see the Rust connection note in the module doc above.
 *
 * Windows-native: a local `PiCubeGames` folder (created on first use by the `get_games_root` Rust command, `src-tauri/src/commands/resources.rs`) instead of the Pi version's fixed `/media/picube` USB mount.
 * @returns {Promise<string>} absolute path, trailing separator included (see
 *   `get_games_root`'s doc comment for why).
 */
async function getGamesRoot() {
    if (gamesRoot) return gamesRoot;
    gamesRoot = await electron.getGamesRoot();
    return gamesRoot;
}

/**
 * Resolves a bundled UI picture to its served Vite path. 
 * 
 * No Rust/IPC call — pictures ship inside the app itself (`public/assets/pictures/`) and are served directly by Vite/Tauri's frontend bundle in both dev and packaged builds.
 *
 * This used to go through a `get_resources_path` Tauri command and a raw filesystem path as the `<img>` `src`, 
 * which worked under Electron's `webSecurity: false` but is not a valid `src` under Tauri's WebView2 — 
 * that mismatch is why the Games page's arrow icons rendered blank before this was switched to a plain served path.
 * 
 * @param {string} filename - e.g. `"arrow-up.png"`.
 * @returns {Promise<string>}
 */
export async function getPicturePath(filename) {
    return `/assets/pictures/${filename}`;
}

/**
 * Resolves a bundled UI sound effect to its served Vite path. 
 * 
 * Same no-Rust-involved static-asset story as {@link getPicturePath}. 
 * Consumed by `src/utils/sound.js`'s `preload()`.
 * 
 * @param {string} filename - e.g. `"rollover.wav"`.
 * @returns {Promise<string>}
 */
export async function getSoundPath(filename) {
    return `/assets/sounds/${filename}`;
}

/**
 * Resolves a game's preview clip path under the Rust-provided games root (see {@link getGamesRoot} for the Rust connection).
 * 
 * @param {string} game - game id (folder name under `covers/`).
 * @returns {Promise<string>} path to `covers/<game>/preview.mp4`.
 */
export async function getGamePreview(game) {
    const base = await getGamesRoot();
    return `${base}covers/${game}/preview.mp4`;
}

/**
 * Resolves a game's title-file path under the Rust-provided games root. 
 * 
 * The path itself is built here with no IPC call, but callers then pass it to `electron.readGameTitle()` (→ `resources.rs`'s `read_game_title`) to actually read the display name off disk.
 * 
 * @param {string} game - game id (folder name under `covers/`).
 * @returns {Promise<string>} path to `covers/<game>/title.txt`.
 */
export async function getGameTitleFile(game) {
    const base = await getGamesRoot();
    return `${base}covers/${game}/title.txt`;
}

/**
 * Lists every game-cover folder name under the games root — i.e. every game available to show on the Games page. 
 * 
 * Delegates the actual directory read to Rust: `electron.readDirectory()` → `invoke('read_directory')` → `resources.rs`'s `read_directory`, 
 * which returns an empty list rather than an error if the folder can't be read.
 * 
 * @returns {Promise<string[]>} folder names under `covers/`, one per game.
 */
export async function availableGameCovers() {
    const base = await getGamesRoot();
    const files = await electron.readDirectory(`${base}covers`);
    return files;
}
