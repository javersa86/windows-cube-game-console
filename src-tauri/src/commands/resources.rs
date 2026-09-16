//! Games-folder access and misc app resources.
//!
//! Ports the `electron` preload namespace from electron/preload.js:
//! `readDirectory`, `readGameTitle`, `quit`. (`getResourcesPath` was dropped —
//! pictures/sounds are bundled static assets now served by Vite/Tauri's frontend
//! bundle directly; see `src/utils/assets.js`.)

use std::path::PathBuf;
use tauri::Manager;

/// Resolves (and ensures on disk) the local games folder, `~/PiCubeGames`.
///
/// Windows-native replacement for the Pi version's fixed `/media/picube` USB mount. 
/// 
/// Creates `covers/` and `games/` under it on first use. 
/// 
/// This is shared by [`get_games_root`] and [`super::games::launch_game`], which both need to agree on the same root so that `covers/<game>/...` and `games/<game>/<game>.py` resolve consistently.
///
/// # Errors
/// Returns `Err` if the home directory can't be resolved, or if the `covers`/ `games` subdirectories can't be created (e.g. permissions).
pub fn games_root_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let home = app.path().home_dir().map_err(|e| e.to_string())?;
    let root = home.join("PiCubeGames");
    std::fs::create_dir_all(root.join("covers")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(root.join("games")).map_err(|e| e.to_string())?;
    Ok(root)
}

/// Returns the games root as a string, with a guaranteed trailing path separator (so the frontend can safely do `root + "covers/" + gameId` without checking for one itself).
///
/// # Errors
/// Same as [`games_root_dir`].
#[tauri::command]
pub fn get_games_root(app: tauri::AppHandle) -> Result<String, String> {
    let mut base = games_root_dir(&app)?.to_string_lossy().to_string();
    if !base.ends_with(std::path::MAIN_SEPARATOR) {
        base.push(std::path::MAIN_SEPARATOR);
    }
    Ok(base)
}

/// Lists file/folder names directly under `dir_path` (non-recursive).
///
/// Never fails outward: an unreadable directory or unreadable entry is logged to stderr and treated as empty/skipped rather than surfaced as an error, 
/// so the Games page always gets *some* list back instead of an error to handle.
#[tauri::command]
pub fn read_directory(dir_path: String) -> Vec<String> {
    match std::fs::read_dir(&dir_path) {
        Ok(entries) => entries
            .filter_map(|e| e.ok().map(|e| e.file_name().to_string_lossy().to_string()))
            .collect(),
        Err(err) => {
            eprintln!("Error reading directory: {}", err);
            Vec::new()
        }
    }
}

/// Reads a game's `title.txt` and returns its trimmed contents as the display name shown on the Games page.
///
/// Returns `None` (rather than an error) if the file is missing or unreadable — same "degrade gracefully" behavior as [`read_directory`], 
/// since a missing title shouldn't block the rest of the game list from rendering.
#[tauri::command]
pub fn read_game_title(file_path: String) -> Option<String> {
    match std::fs::read_to_string(&file_path) {
        Ok(data) => Some(data.trim().to_string()),
        Err(err) => {
            eprintln!("Error reading file: {}", err);
            None
        }
    }
}

/// Exits the app immediately with status code 0. Backs the Quit page's confirm action.
#[tauri::command]
pub fn app_quit(app: tauri::AppHandle) {
    app.exit(0);
}
