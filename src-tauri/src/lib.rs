//! App entry point: builds the Tauri app, registers managed state and commands, and creates the fullscreen main window.

mod commands;

use commands::games::GameState;
use commands::volume::VolumeState;
use tauri::window::Color;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Builds and runs the Tauri application. Called from `main.rs`.
///
/// Registers `VolumeState` and `GameState` as managed state, wires up every `#[tauri::command]` the frontend can invoke, 
/// and in `setup()` restores persisted volume and creates the single fullscreen window sized to the primary monitor.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(VolumeState::default())
    .manage(GameState::default())
    .invoke_handler(tauri::generate_handler![
      commands::resources::get_games_root,
      commands::resources::read_directory,
      commands::resources::read_game_title,
      commands::resources::app_quit,
      commands::volume::get_volume,
      commands::volume::set_volume,
      commands::volume::toggle_mute,
      commands::games::launch_game,
      commands::games::kill_game,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      commands::volume::load_persisted_volume(&app.handle(), app.state::<VolumeState>().inner());

      // Mirrors electron/main.js's createWindow(): fullscreen, frameless, black background, sized/positioned to fully cover a display. 
      // 
      // The original read `displays[0] ?? displays[0]` (always the primary display - dead fallback logic left over from the Pi version's dual-display code), 
      // so this targets primary_monitor() directly instead of porting that dead expression.
      //
      // (autoHideMenuBar has no Tauri equivalent needed: unlike Electron, Tauri shows no native menu bar at all unless one is explicitly built.)
      let monitor = app.primary_monitor()?.expect("no primary monitor detected");
      let scale = monitor.scale_factor();
      let logical_pos = monitor.position().to_logical::<f64>(scale);
      let logical_size = monitor.size().to_logical::<f64>(scale);

      WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("Windows Cube Launcher")
        .position(logical_pos.x, logical_pos.y)
        .inner_size(logical_size.width, logical_size.height)
        .fullscreen(true)
        .decorations(false)
        .background_color(Color(0, 0, 0, 255))
        .build()?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
