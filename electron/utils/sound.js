import { getSoundPath } from './assets.js';

const sounds = {};

export async function preload(name) {
    const path = await getSoundPath(`${name}.wav`);
    sounds[name] = new Audio(path);
}

export function play(name) {
    const sound = sounds[name];
    if (!sound) return;
    const clone = sound.cloneNode();
    clone.volume = 0.5;
    clone.play().catch(() => {});
}