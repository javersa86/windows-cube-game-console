// Placeholder: original used amixer (Linux/ALSA), which doesn't exist on Windows.
// Swap this out for a real Windows volume backend when ready.

let placeholderVolume = 1.0;
let placeholderMuted = false;

function getVolume() {
    console.log('[volume] placeholder backend active (no real volume control)');
    return Promise.resolve(placeholderMuted ? 0 : placeholderVolume);
}

function setVolume(level) {
    if (level < 0 || level > 1) return Promise.reject(new Error('Volume must be between 0.0 and 1.0'));
    placeholderVolume = level;
    console.log(`[volume] placeholder: pretending to set volume to ${Math.round(level * 100)}%`);
    return Promise.resolve(level);
}

function toggleMute() {
    placeholderMuted = !placeholderMuted;
    console.log(`[volume] placeholder: pretending to ${placeholderMuted ? 'mute' : 'unmute'}`);
    return Promise.resolve(placeholderMuted);
}

module.exports = { getVolume, setVolume, toggleMute };
