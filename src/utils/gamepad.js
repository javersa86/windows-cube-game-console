/**
 * Xbox-controller input via the browser Gamepad API.
 *
 * File: `src/utils/gamepad.js`
 *
 * Polls `navigator.getGamepads()` on an animation-frame loop and fires callbacks on button press edges (not held state), matching the original `electron/utils/gamepad.js`. 
 * Consumed by every page under `src/pages/` (MainMenu, Games, Options, Quit) for D-pad navigation and A/B handling.
 *
 * No Rust/Tauri connection — this is pure browser API, unlike `sound.js` and `assets.js` in this same folder. 
 * It needed no backend changes during the Electron→Tauri migration (see `windows-cube-game-console/README.md`'s "Tauri Migration" section)
 * because a gamepad is exposed to any web page, sandboxed or not.
 */

/** Standard gamepad button indices (Xbox layout), per the Gamepad API spec. */
const BUTTONS = {
    A: 0,
    B: 1,
    X: 2,
    Y: 3,
    LB: 4,
    RB: 5,
    LT: 6,
    RT: 7,
    SELECT: 8,
    START: 9,
    DPAD_UP: 12,
    DPAD_DOWN: 13,
    DPAD_LEFT: 14,
    DPAD_RIGHT: 15,
};

/** 
 * Standard gamepad analog stick axis indices. 
 * 
 * Not currently wired to any page — D-pad is used for navigation instead — but kept for parity with the Pi version and in case analog navigation is added later. 
 */
const AXES = {
    LEFT_X: 0,
    LEFT_Y: 1,
    RIGHT_X: 2,
    RIGHT_Y: 3,
};

/** button index -> array of callbacks registered via {@link on}. */
const listeners = {};
let animationFrame = null;
/** 
 * button index -> was it pressed last poll, so {@link poll} can detect the press *edge* (just-pressed) instead of firing every frame while held. 
 */
const prevButtons = {};

/**
 * Registers `callback` to fire once on every "just pressed" edge of `button`.
 * 
 * @param {number} button - one of {@link BUTTONS}.
 * @param {() => void} callback
 */
function on(button, callback) {
    if (!listeners[button]) listeners[button] = [];
    listeners[button].push(callback);
}

/**
 * Unregisters a callback previously passed to {@link on}. 
 * Pages call this in their cleanup effect so listeners don't pile up across navigations.
 * 
 * @param {number} button - one of {@link BUTTONS}.
 * @param {() => void} callback
 */
function off(button, callback) {
    if (!listeners[button]) return;
    listeners[button] = listeners[button].filter(cb => cb !== callback);
}

/**
 * One polling tick: reads all connected gamepads, fires listeners for buttons that transitioned from unpressed to pressed since the last tick, 
 * then schedules itself again via `requestAnimationFrame`. 
 * 
 * Runs continuously once started by {@link start} until {@link stop} is called.
 */
function poll() {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
        if (!gp) continue;
        gp.buttons.forEach((btn, index) => {
            const wasPressed = prevButtons[index] || false;
            const isPressed = btn.pressed;
            if (isPressed && !wasPressed) {
                // Button just pressed
                if (listeners[index]) {
                    listeners[index].forEach(cb => cb());
                }
            }
            prevButtons[index] = isPressed;
        });
    }
    animationFrame = requestAnimationFrame(poll);
}

/**
 * Starts listening for controller connect/disconnect and begins {@link poll} once a gamepad connects. 
 * Safe to call once at app startup.
 */
function start() {
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        if (!animationFrame) poll();
    });
    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('Gamepad disconnected:', e.gamepad.id);
    });
}

/** Cancels the polling loop started by {@link start}/{@link poll}, if running. */
function stop() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

export { BUTTONS, AXES, on, off, start, stop };
