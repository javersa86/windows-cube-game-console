// Ports electron/utils/brightness.js — still a placeholder on Windows (no ddcutil
// equivalent wired up yet; that's roadmap Phase 4, not this shell migration).

use std::sync::Mutex;

pub struct BrightnessState(pub Mutex<f64>);

impl Default for BrightnessState {
    fn default() -> Self {
        BrightnessState(Mutex::new(1.0))
    }
}

#[tauri::command]
pub fn brightness_get(state: tauri::State<BrightnessState>) -> f64 {
    *state.0.lock().unwrap()
}

#[tauri::command]
pub fn brightness_set(value: f64, state: tauri::State<BrightnessState>) -> f64 {
    let clamped = value.max(0.1).min(1.0);
    println!(
        "[brightness] placeholder: pretending to set brightness to {}%",
        (clamped * 100.0).round()
    );
    *state.0.lock().unwrap() = clamped;
    clamped
}
