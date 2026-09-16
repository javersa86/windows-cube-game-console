//! Tauri commands invoked from the frontend via `invoke()` (see `src/platform.ts`),
//! one module per feature area. Registered in `lib.rs`'s `invoke_handler!`.

pub mod games;
pub mod resources;
pub mod volume;
