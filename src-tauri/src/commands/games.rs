// Ports electron/main.js's launch-game/kill-game handlers + the game-closed event.
// Windows-native: games live under the local PiCubeGames folder resolved by
// games_root_dir() (see resources.rs) instead of the Pi's /media/picube USB mount,
// launched via the `python` interpreter with no DISPLAY env var (no X11 on Windows).

use super::resources::games_root_dir;
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[derive(Clone, Default)]
pub struct GameState(pub Arc<Mutex<Option<Child>>>);

#[derive(Serialize)]
pub struct LaunchResult {
    success: bool,
}

#[tauri::command]
pub fn launch_game(
    game_id: String,
    app: AppHandle,
    state: State<GameState>,
) -> Result<LaunchResult, String> {
    let mut guard = state.0.lock().unwrap();
    if guard.is_some() {
        return Err("A game is already running".into());
    }

    let game_path = games_root_dir(&app)?
        .join("games")
        .join(&game_id)
        .join(format!("{game_id}.py"));

    let mut child = Command::new("python")
        .arg(&game_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| err.to_string())?;

    println!("Game launched: {game_id}");

    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().flatten() {
                println!("Game stdout: {line}");
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(stderr).lines().flatten() {
                eprintln!("Game stderr: {line}");
            }
        });
    }

    *guard = Some(child);
    drop(guard);

    // Poll with try_wait() (rather than a blocking wait()) so kill_game can still
    // take the lock and signal the same Child concurrently.
    let watch_state = state.0.clone();
    let app_handle = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(std::time::Duration::from_millis(200));
        let mut guard = watch_state.lock().unwrap();
        match guard.as_mut() {
            Some(child) => match child.try_wait() {
                Ok(Some(status)) => {
                    println!("Game exited with code: {:?}", status.code());
                    *guard = None;
                    drop(guard);
                    let _ = app_handle.emit("game-closed", ());
                    break;
                }
                Ok(None) => {} // still running
                Err(err) => {
                    eprintln!("Error waiting for game process: {err}");
                    *guard = None;
                    break;
                }
            },
            None => break, // already cleared (e.g. kill_game raced us)
        }
    });

    Ok(LaunchResult { success: true })
}

#[tauri::command]
pub fn kill_game(state: State<GameState>) {
    let mut guard = state.0.lock().unwrap();
    if let Some(child) = guard.as_mut() {
        let _ = child.kill();
    }
    // Don't clear the slot here — the watcher thread spawned in launch_game detects
    // the exit via try_wait() and emits game-closed, matching the Node version where
    // .kill() is fire-and-forget and the 'close' event does the cleanup.
}
