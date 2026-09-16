/**
 * UI sound-effect preload/playback (hover/click/rollover cues).
 *
 * File: `src/utils/sound.js`
 *
 * No direct Rust/Tauri connection — playback is pure browser `Audio`, and `currentVolume` here is a frontend-only multiplier applied to sound-effect clips. 
 * It is kept in sync with the *actual* system volume by `src/pages/Options.tsx`, 
 * which calls {@link setVolume} in lockstep with the Tauri-backed volume commands (`get_volume`/`set_volume` in `src-tauri/src/commands/volume.rs`, 
 * reached through `src/platform.ts`'s `volume` export) — so this module never talks to Rust itself, it just mirrors what the Rust-backed volume state reports.
 *
 * Sound file paths come from {@link getSoundPath} in `src/utils/assets.js`,
 * which serves them as static Vite assets (no native IPC either).
 */

import { getSoundPath } from './assets.js';

/** name -> preloaded `Audio` instance, populated by {@link preload}. */
const sounds = {};

/** 
 * Frontend-only playback volume multiplier, 0.0-1.0. Mirrors (but does not itself read/write) the Rust-backed volume state — see module doc above.
 */
let currentVolume = 1.0;

/**
 * Loads `${name}.wav` from `public/assets/sounds/` (via {@link getSoundPath}) into an `Audio` instance, cached under `name` for later {@link play} calls.
 * 
 * @param {string} name - sound name without extension, e.g. `"rollover"`.
 */
export async function preload(name) {
    const path = await getSoundPath(`${name}.wav`);
    sounds[name] = new Audio(path);
}

/**
 * Sets the multiplier applied to future {@link play} calls, clamped to `0.0..=1.0`. 
 * 
 * Called by `src/pages/Options.tsx` whenever the user adjusts the volume slider, alongside (not instead of) the Rust-backed volume commands.
 * 
 * @param {number} level
 */
export function setVolume(level) {
    currentVolume = Math.min(1.0, Math.max(0.0, level));
}

/**
 * Plays a previously {@link preload}ed sound. 
 * 
 * Clones the cached `Audio` node per call (rather than reusing/rewinding one instance) so rapid repeated plays — 
 * e.g. fast D-pad navigation — overlap instead of cutting each other off. 
 * 
 * Silently no-ops if `name` was never preloaded, or if the browser rejects the play (autoplay policy).
 * 
 * @param {string} name
 */
export function play(name) {
    const sound = sounds[name];
    if (!sound) return;
    const clone = sound.cloneNode();
    clone.volume = currentVolume;
    clone.play().catch(() => {});
}
