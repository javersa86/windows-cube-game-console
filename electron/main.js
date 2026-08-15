const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs');
const { spawn } = require('child_process');
const { fileURLToPath } = require('url');
const { detectDisplay, applyBrightness, loadBrightness } = require('./utils/brightness.js');
const { getVolume, setVolume, toggleMute } = require('./utils/volume');

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const isDev = !app.isPackaged

let gameProcess = null;
let currentBrightness = 1.0;

function createWindow() {
  const displays = screen.getAllDisplays()

    // Use second display if available, otherwise fall back to primary
  const targetDisplay = displays[0] ?? displays[0]

  const win = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: true,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false  // ← add this
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Temporarily open DevTools in all modes to debug
  // win.webContents.openDevTools()
}

ipcMain.handle('get-resources-path', () => {
    return app.getAppPath().replace('app.asar', '');
});

ipcMain.handle('read-directory', async (event, dirPath) => {
    try {
        const files = fs.readdirSync(dirPath);
        return files;
    } catch (err) {
        console.error('Error reading directory:', err);
        return [];
    }
});

ipcMain.handle('read-game-title', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data.trim();
    } catch (err) {
        console.error('Error reading file:', err);
        return null;
    }
});

ipcMain.handle('brightness:get', () => currentBrightness);

ipcMain.handle('brightness:set', async (_, value) => {
    const clamped = Math.min(1.0, Math.max(0.1, value));
    applyBrightness(clamped);
    currentBrightness = clamped;
    return currentBrightness;
});

ipcMain.handle('get-volume', async () => {
  return await getVolume();
});

ipcMain.handle('set-volume', async (event, level) => {
  return await setVolume(level);
});

ipcMain.handle('toggle-mute', async () => {
  return await toggleMute();
});

ipcMain.handle('launch-game', (event, gameId) => {
  return new Promise((resolve, reject) => {
    if (gameProcess) {
      return reject(new Error('A game is already running'));
    }

    const gamePath = `/media/picube/games/${gameId}/${gameId}.py`;

    gameProcess = spawn('python3', [gamePath], {
        detached: false,
        stdio: 'pipe',
        env: { ...process.env, DISPLAY: ':0' }
    });

    gameProcess.stdout.on('data', (data) => {
        console.log(`Game stdout: ${data}`);
    });

    gameProcess.stderr.on('data', (data) => {
        console.error(`Game stderr: ${data}`);
    });

    gameProcess.on('spawn', () => {
        console.log(`Game launched: ${gameId}`);
        resolve({ success: true });
    });

    gameProcess.on('close', (code) => {
        console.log(`Game exited with code: ${code}`);
        gameProcess = null;
        event.sender.send('game-closed');
    });

    gameProcess.on('error', (err) => {
        gameProcess = null;
        reject(err);
    });
  });
});

ipcMain.handle('kill-game', async () => {
    if (gameProcess) {
        gameProcess.kill();
        gameProcess = null;
    }
});

ipcMain.handle('app:quit', () => {
    app.quit();
});

app.whenReady().then(async () => {
  try {
    const display = await detectDisplay();

    if (!display) {
      console.warn('No DDC/CI display detected, brightness control unavailable');
    } else {
      currentBrightness = loadBrightness();
      applyBrightness(currentBrightness);
    }
  } catch (err) {
    console.error('Brightness init failed:', err.message);
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});