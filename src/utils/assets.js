import { electron } from '../platform';

let gamesRoot = null;

// Windows-native: a local PiCubeGames folder (created on first use by the
// get_games_root Rust command) instead of the Pi's fixed /media/picube USB mount.
async function getGamesRoot() {
    if (gamesRoot) return gamesRoot;
    gamesRoot = await electron.getGamesRoot();
    return gamesRoot;
}

// Pictures/sounds ship inside the app itself (public/assets/...), so they're
// served directly by Vite/Tauri's frontend bundle at these paths in both dev
// and packaged builds — no native IPC round-trip needed. (This used to go
// through a get_resources_path Tauri command + a raw filesystem path as the
// <img>/<audio> src, which worked under Electron's webSecurity:false but is
// not a valid src under Tauri's WebView2 — that's why the arrow icons on the
// Games page were rendering blank.)
export async function getPicturePath(filename) {
    return `/assets/pictures/${filename}`;
}

export async function getSoundPath(filename) {
    return `/assets/sounds/${filename}`;
}

export async function getGamePreview(game) {
    const base = await getGamesRoot();
    return `${base}covers/${game}/preview.mp4`;
}

export async function getGameTitleFile(game) {
    const base = await getGamesRoot();
    return `${base}covers/${game}/title.txt`;
}

export async function availableGameCovers() {
    const base = await getGamesRoot();
    const files = await electron.readDirectory(`${base}covers`);
    return files;
}