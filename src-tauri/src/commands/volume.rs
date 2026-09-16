//! Volume state and persistence.
//!
//! Ports electron/utils/volume.js — still a placeholder on Windows (no Core Audio API backend wired up yet; that's a separate roadmap item, unrelated to persistence).
//!
//! Level/muted are persisted to a small JSON file under `app_config_dir()` so they survive across app sessions: loaded once in `lib.rs`'s `setup()`, 
//! saved on every [`set_volume`]/[`toggle_mute`] call. 
//!
//! Mirrors the pattern electron/utils/brightness.js already used on the Pi version (a state file written on every change, read back on load) — 
//! volume.js never needed it there since amixer/ALSA already persisted volume itself.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// In-memory volume state, managed by Tauri and shared across all volume commands for the app's lifetime.
pub struct VolumeState {
    pub level: Mutex<f64>,
    pub muted: Mutex<bool>,
}

impl Default for VolumeState {
    fn default() -> Self {
        VolumeState {
            level: Mutex::new(1.0),
            muted: Mutex::new(false),
        }
    }
}

/// On-disk shape of `volume.json` — just the two fields that need to survive a restart.
#[derive(Serialize, Deserialize)]
struct PersistedVolume {
    level: f64,
    muted: bool,
}

/// Path to the persisted-volume JSON file, creating its parent directory if needed.
///
/// # Errors
/// Returns `Err` if the app config directory can't be resolved or created.
fn state_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("volume.json"))
}

/// Overwrites the just-registered default [`VolumeState`] with whatever was last saved to disk, if anything was. 
/// 
/// Called once from `lib.rs`'s `setup()` after `.manage(VolumeState::default())` registers the default.
///
/// Every failure path (no config dir, no file yet, corrupt JSON) is silently ignored via `let ... else { return }` —
/// this is deliberate best-effort restore, not an oversight: a first run or a corrupted file should just fall
/// back to the registered default (full volume, unmuted) rather than blocking startup or surfacing an error the user can't act on.
pub fn load_persisted_volume(app: &tauri::AppHandle, state: &VolumeState) {
    let Ok(path) = state_file_path(app) else { return };
    let Ok(data) = std::fs::read_to_string(&path) else { return };
    let Ok(persisted) = serde_json::from_str::<PersistedVolume>(&data) else { return };
    *state.level.lock().unwrap() = persisted.level.clamp(0.0, 1.0);
    *state.muted.lock().unwrap() = persisted.muted;
}

/// Writes the current level/muted to `volume.json`. 
/// 
/// Best-effort, same as [`load_persisted_volume`]: a write failure is silently dropped rather than propagated, 
/// since losing a persisted-volume write isn't worth failing the command that triggered it.
fn save_volume(app: &tauri::AppHandle, level: f64, muted: bool) {
    let Ok(path) = state_file_path(app) else { return };
    if let Ok(json) = serde_json::to_string(&PersistedVolume { level, muted }) {
        let _ = std::fs::write(path, json);
    }
}

/// Returns the effective volume: `0.0` when muted, otherwise the stored level.
///
/// Note this means muting doesn't change `level` itself — [`toggle_mute`] flips a separate flag, so un-muting restores the previous level exactly.
#[tauri::command]
pub fn get_volume(state: tauri::State<VolumeState>) -> f64 {
    let muted = *state.muted.lock().unwrap();
    let level = *state.level.lock().unwrap();
    if muted {
        0.0
    } else {
        level
    }
}

/// Sets the volume level and persists it to disk.
///
/// # Errors
/// Returns `Err` if `level` is outside `0.0..=1.0`.
#[tauri::command]
pub fn set_volume(
    level: f64,
    app: tauri::AppHandle,
    state: tauri::State<VolumeState>,
) -> Result<f64, String> {
    if !(0.0..=1.0).contains(&level) {
        return Err("Volume must be between 0.0 and 1.0".into());
    }
    println!(
        "[volume] placeholder: pretending to set volume to {}%",
        (level * 100.0).round()
    );
    *state.level.lock().unwrap() = level;
    let muted = *state.muted.lock().unwrap();
    save_volume(&app, level, muted);
    Ok(level)
}

/// Flips the muted flag and persists it, returning the new muted state.
#[tauri::command]
pub fn toggle_mute(app: tauri::AppHandle, state: tauri::State<VolumeState>) -> bool {
    let mut muted = state.muted.lock().unwrap();
    *muted = !*muted;
    println!(
        "[volume] placeholder: pretending to {}",
        if *muted { "mute" } else { "unmute" }
    );
    let muted_val = *muted;
    drop(muted);
    let level = *state.level.lock().unwrap();
    save_volume(&app, level, muted_val);
    muted_val
}
