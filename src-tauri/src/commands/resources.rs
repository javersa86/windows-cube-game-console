// Ports the `electron` preload namespace from electron/preload.js:
//   readDirectory, readGameTitle, quit
// (getResourcesPath was dropped — pictures/sounds are bundled static assets
// now served by Vite/Tauri's frontend bundle directly; see src/utils/assets.js)

use std::path::PathBuf;
use tauri::Manager;

// Windows-native replacement for the Pi version's fixed /media/picube USB mount:
// a local folder under the user's home directory, created on first use. Shared
// by get_games_root (below) and games::launch_game, which both need the same
// root to agree on where `covers/<game>/...` and `games/<game>/<game>.py` live.
pub fn games_root_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let home = app.path().home_dir().map_err(|e| e.to_string())?;
    let root = home.join("PiCubeGames");
    std::fs::create_dir_all(root.join("covers")).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(root.join("games")).map_err(|e| e.to_string())?;
    Ok(root)
}

#[tauri::command]
pub fn get_games_root(app: tauri::AppHandle) -> Result<String, String> {
    let mut base = games_root_dir(&app)?.to_string_lossy().to_string();
    if !base.ends_with(std::path::MAIN_SEPARATOR) {
        base.push(std::path::MAIN_SEPARATOR);
    }
    Ok(base)
}

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

#[tauri::command]
pub fn app_quit(app: tauri::AppHandle) {
    app.exit(0);
}
