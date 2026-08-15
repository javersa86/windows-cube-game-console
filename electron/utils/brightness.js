// Placeholder: original used ddcutil (Linux/DDC-CI), which doesn't exist on Windows.
// Swap this out for a real Windows brightness backend when ready.

let placeholderBrightness = 1.0;

function detectDisplay() {
  console.log('[brightness] placeholder backend active (no real display control)');
  return 'placeholder-display';
}

function applyBrightness(value) {
  placeholderBrightness = value;
  console.log(`[brightness] placeholder: pretending to set brightness to ${Math.round(value * 100)}%`);
  return true;
}

function loadBrightness() {
  return placeholderBrightness;
}

module.exports = { applyBrightness, loadBrightness, detectDisplay };
