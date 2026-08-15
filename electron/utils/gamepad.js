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

const AXES = {
    LEFT_X: 0,
    LEFT_Y: 1,
    RIGHT_X: 2,
    RIGHT_Y: 3,
};

const listeners = {};
let animationFrame = null;
const prevButtons = {};

function on(button, callback) {
    if (!listeners[button]) listeners[button] = [];
    listeners[button].push(callback);
}

function off(button, callback) {
    if (!listeners[button]) return;
    listeners[button] = listeners[button].filter(cb => cb !== callback);
}

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

function start() {
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        if (!animationFrame) poll();
    });
    window.addEventListener('gamepaddisconnected', (e) => {
        console.log('Gamepad disconnected:', e.gamepad.id);
    });
}

function stop() {
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}

export { BUTTONS, AXES, on, off, start, stop };