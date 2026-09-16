//! Game process launching and lifecycle.
//!
//! Ports electron/main.js's launch-game/kill-game handlers + the game-closed event.
//!
//! Windows-native: games live under the local PiCubeGames folder resolved by [`games_root_dir`](super::resources::games_root_dir) instead of the Pi's `/media/picube` USB mount, 
//! launched via the `python` interpreter with no `DISPLAY` env var (no X11 on Windows).

use super::resources::games_root_dir;
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

/// Tracks the currently-running game process, if any.
///
/// `Some(child)` means a game is running; `None` means the slot is free. 
/// 
/// Shared (via `Arc<Mutex<_>>`) between [`launch_game`]'s caller thread, its background watcher thread, and [`kill_game`], all of which can touch the same `Child` from different threads.
#[derive(Clone, Default)]
pub struct GameState(pub Arc<Mutex<Option<Child>>>);

/// Return value of [`launch_game`], serialized to JS as `{ success: bool }`.
#[derive(Serialize)]
pub struct LaunchResult {
    success: bool,
}

/// Spawns `python <game_id>.py` from the games root and starts tracking it in [`GameState`].
///
/// Stdout/stderr are piped to separate reader threads that log each line (`Game stdout: ...` / `Game stderr: ...`) rather than being propagated to the caller. 
/// A third background thread polls the child with `try_wait()` every 200ms; when the process exits it clears the state slot and emits a `game-closed` event to the frontend. 
/// 
/// Polling (rather than a blocking `wait()`) is what lets [`kill_game`] take the same lock and signal the process concurrently without deadlocking against this watcher.
///
/// # Errors
/// Returns `Err` if a game is already running (one game at a time), or if the `python` process fails to spawn (e.g. `python` isn't on `PATH`, or the script doesn't exist).
#[tauri::command]
pub fn launch_game(
    game_id: String,
    app: AppHandle,
    state: State<GameState>,
) -> Result<LaunchResult, String> {

    // Take the lock first and hold it through the "is one already running?" 
    // check so two near-simultaneous launch_game calls can't both see an empty slot and both spawn a process — 
    // the mutex is what makes this atomic.
    let mut guard = state.0.lock().unwrap();
    if guard.is_some() {
        return Err("An app is already running".into());
    }

    // Build the on-disk script path: ~/PiCubeGames/games/<game_id>/<game_id>.py.
    // 
    // games_root_dir() is the same helper get_games_root (resources.rs) calls, so this always agrees with whatever path the frontend showed the user.
    let game_path = games_root_dir(&app)?
        .join("games")
        .join(&game_id)
        .join(format!("{game_id}.py"));

    // Spawn `python <script>` as a child process. 
    // 
    // stdout/stderr are piped (rather than inherited) so we can capture and log them ourselves below, instead of letting them print straight to this app's own console.
    let mut child = Command::new("python")
        .arg(&game_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|err| err.to_string())?;

    println!("App launched: {game_id}");

    // Drain stdout/stderr on their own threads. 
    // 
    // This is required, not just nice-to-have: a piped stream fills its OS buffer if nothing reads it, which would eventually stall the child process. 
    // One thread per stream since read_line-style iteration blocks until a line is available.
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().flatten() {
                println!("App stdout: {line}");
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            for line in BufReader::new(stderr).lines().flatten() {
                eprintln!("App stderr: {line}");
            }
        });
    }

    // Record the running child in the shared slot, then release the lock immediately — 
    // everything after this point (the watcher thread, and any concurrent kill_game call) needs to be able to re-acquire it.
    *guard = Some(child);
    drop(guard);

    // Spawn a watcher thread that owns detecting when the game exits.
    // 
    // Clone the Arc<Mutex<..>> (cheap, just bumps a refcount) and the AppHandle (also cheap) so this thread has its own handles independent of the ones this function is about to return without.
    //
    // Poll with try_wait() (rather than a blocking wait()) so kill_game can still take the lock and signal the same Child concurrently.
    let watch_state = state.0.clone();
    let app_handle = app.clone();
    std::thread::spawn(move || loop {

        // 200ms is a compromise: frequent enough that the UI notices an exit promptly, infrequent enough not to spin the CPU just polling.
        std::thread::sleep(std::time::Duration::from_millis(200));

        let mut guard = watch_state.lock().unwrap();
        match guard.as_mut() {
            Some(child) => match child.try_wait() {

                // Process has exited on its own (or was killed) — clear the slot so the next launch_game call is allowed through, 
                // then tell the frontend via the game-closed event so it can return to the Games page.
                Ok(Some(status)) => {
                    println!("App exited with code: {:?}", status.code());
                    *guard = None;
                    drop(guard);
                    let _ = app_handle.emit("game-closed", ());
                    break;
                }

                // Still running — release the lock (end of match arm drops `guard`) and loop back around to sleep/poll again.
                Ok(None) => {} // still running

                // try_wait() itself failed (rare — e.g. OS-level error inspecting the process). 
                // Treat it the same as an exit so this thread doesn't loop forever on a broken handle.
                Err(err) => {
                    eprintln!("Error waiting for app process: {err}");
                    *guard = None;
                    break;
                }
            },

            // The slot was already cleared before we got the lock — most likely kill_game() raced us and something else is handling cleanup. 
            // Nothing left for this watcher to do.
            None => break, // already cleared (e.g. kill_game raced us)
        }
    });

    // Return immediately — the caller (JS side) doesn't wait for the game to finish; 
    // it just gets confirmation the process started, 
    // and later finds out about the exit via the game-closed event emitted above.
    Ok(LaunchResult { success: true })
}

/// Signals the running game's process to terminate, if one is running.
///
/// Deliberately does *not* clear the [`GameState`] slot itself: the watcher thread spawned in [`launch_game`] detects the exit via `try_wait()` and emits `game-closed`, 
/// which is what actually clears the slot. 
/// 
/// This matches the original Node version, where `.kill()` was fire-and-forget and the `'close'` event handler did the cleanup.
#[tauri::command]
pub fn kill_game(state: State<GameState>) {
    let mut guard = state.0.lock().unwrap();
    if let Some(child) = guard.as_mut() {
        let _ = child.kill();
    }
}
