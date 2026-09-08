import { getSoundPath } from './assets.js';

const sounds = {};
let currentVolume = 1.0;

export async function preload(name) {
    const path = await getSoundPath(`${name}.wav`);
    sounds[name] = new Audio(path);
}

export function setVolume(level) {
    currentVolume = Math.min(1.0, Math.max(0.0, level));
}

export function play(name) {
    const sound = sounds[name];
    if (!sound) return;
    const clone = sound.cloneNode();
    clone.volume = currentVolume;
    clone.play().catch(() => {});
}