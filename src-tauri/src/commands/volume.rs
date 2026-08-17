// Ports electron/utils/volume.js — still a placeholder on Windows (no Core Audio API
// backend wired up yet; that's roadmap Phase 5, not this shell migration).

use std::sync::Mutex;

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

#[tauri::command]
pub fn set_volume(level: f64, state: tauri::State<VolumeState>) -> Result<f64, String> {
    if !(0.0..=1.0).contains(&level) {
        return Err("Volume must be between 0.0 and 1.0".into());
    }
    println!(
        "[volume] placeholder: pretending to set volume to {}%",
        (level * 100.0).round()
    );
    *state.level.lock().unwrap() = level;
    Ok(level)
}

#[tauri::command]
pub fn toggle_mute(state: tauri::State<VolumeState>) -> bool {
    let mut muted = state.muted.lock().unwrap();
    *muted = !*muted;
    println!(
        "[volume] placeholder: pretending to {}",
        if *muted { "mute" } else { "unmute" }
    );
    *muted
}
