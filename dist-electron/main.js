import { createRequire } from "node:module";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region electron/utils/brightness.js
var require_brightness = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var placeholderBrightness = 1;
	function detectDisplay() {
		console.log("[brightness] placeholder backend active (no real display control)");
		return "placeholder-display";
	}
	function applyBrightness(value) {
		placeholderBrightness = value;
		console.log(`[brightness] placeholder: pretending to set brightness to ${Math.round(value * 100)}%`);
		return true;
	}
	function loadBrightness() {
		return placeholderBrightness;
	}
	module.exports = {
		applyBrightness,
		loadBrightness,
		detectDisplay
	};
}));
//#endregion
//#region electron/utils/volume.js
var require_volume = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { execFile } = __require("child_process");
	var AUDIO_TYPE = `
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
    int NotImpl1();
    int NotImpl2();
    int GetChannelCount(out int pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, Guid pguidEventContext);
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, Guid pguidEventContext);
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
    int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
    int VolumeStepUp(Guid pguidEventContext);
    int VolumeStepDown(Guid pguidEventContext);
    int QueryHardwareSupport(out uint pdwHardwareSupportMask);
    int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }

public class WinAudio {
    static IAudioEndpointVolume Vol() {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev;
        Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(/* eRender */ 0, /* eMultimedia */ 1, out dev));
        var iid = typeof(IAudioEndpointVolume).GUID;
        object epv;
        Marshal.ThrowExceptionForHR(dev.Activate(ref iid, /* CLSCTX_ALL */ 23, IntPtr.Zero, out epv));
        return (IAudioEndpointVolume)epv;
    }

    public static bool GetMute() {
        bool muted;
        Marshal.ThrowExceptionForHR(Vol().GetMute(out muted));
        return muted;
    }

    public static float GetVolume() {
        if (GetMute()) return 0f;
        float level;
        Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out level));
        return level;
    }

    public static void SetVolume(float level) {
        Marshal.ThrowExceptionForHR(Vol().SetMasterVolumeLevelScalar(level, Guid.Empty));
    }

    public static bool ToggleMute() {
        bool muted = !GetMute();
        Marshal.ThrowExceptionForHR(Vol().SetMute(muted, Guid.Empty));
        return muted;
    }
}
`;
	function runScript(action) {
		const script = `
$ErrorActionPreference = 'Stop'
try {
    Add-Type -TypeDefinition @'
${AUDIO_TYPE}
'@
    ${action}
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
`;
		return new Promise((resolve, reject) => {
			execFile("powershell.exe", [
				"-NoProfile",
				"-NonInteractive",
				"-Command",
				script
			], (err, stdout, stderr) => {
				if (err) return reject(new Error(stderr.trim() || err.message));
				resolve(stdout.trim());
			});
		});
	}
	function getVolume() {
		return runScript("[WinAudio]::GetVolume()").then((out) => parseFloat(out));
	}
	function setVolume(level) {
		if (level < 0 || level > 1) return Promise.reject(/* @__PURE__ */ new Error("Volume must be between 0.0 and 1.0"));
		return runScript(`[WinAudio]::SetVolume(${level})`).then(() => level);
	}
	function toggleMute() {
		return runScript("[WinAudio]::ToggleMute()").then((out) => out.toLowerCase() === "true");
	}
	module.exports = {
		getVolume,
		setVolume,
		toggleMute
	};
}));
//#endregion
//#region electron/main.js
var { app, BrowserWindow, screen, ipcMain } = __require("electron");
var path = __require("path");
var fs = __require("fs");
var { spawn } = __require("child_process");
var { fileURLToPath } = __require("url");
var { detectDisplay, applyBrightness, loadBrightness } = require_brightness();
var { getVolume, setVolume, toggleMute } = require_volume();
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var isDev = !app.isPackaged;
var gameProcess = null;
var currentBrightness = 1;
function createWindow() {
	const displays = screen.getAllDisplays();
	const targetDisplay = displays[0] ?? displays[0];
	const win = new BrowserWindow({
		x: targetDisplay.bounds.x,
		y: targetDisplay.bounds.y,
		width: targetDisplay.bounds.width,
		height: targetDisplay.bounds.height,
		fullscreen: true,
		autoHideMenuBar: true,
		frame: false,
		backgroundColor: "#000000",
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			contextIsolation: true,
			nodeIntegration: false,
			webSecurity: false
		}
	});
	if (isDev) win.loadURL("http://localhost:5173");
	else win.loadFile(path.join(__dirname, "../dist/index.html"));
}
ipcMain.handle("get-resources-path", () => {
	return app.getAppPath().replace("app.asar", "");
});
ipcMain.handle("read-directory", async (event, dirPath) => {
	try {
		return fs.readdirSync(dirPath);
	} catch (err) {
		console.error("Error reading directory:", err);
		return [];
	}
});
ipcMain.handle("read-game-title", async (event, filePath) => {
	try {
		return fs.readFileSync(filePath, "utf-8").trim();
	} catch (err) {
		console.error("Error reading file:", err);
		return null;
	}
});
ipcMain.handle("brightness:get", () => currentBrightness);
ipcMain.handle("brightness:set", async (_, value) => {
	const clamped = Math.min(1, Math.max(.1, value));
	applyBrightness(clamped);
	currentBrightness = clamped;
	return currentBrightness;
});
ipcMain.handle("get-volume", async () => {
	return await getVolume();
});
ipcMain.handle("set-volume", async (event, level) => {
	return await setVolume(level);
});
ipcMain.handle("toggle-mute", async () => {
	return await toggleMute();
});
ipcMain.handle("launch-game", (event, gameId) => {
	return new Promise((resolve, reject) => {
		if (gameProcess) return reject(/* @__PURE__ */ new Error("A game is already running"));
		gameProcess = spawn("python3", [`/media/picube/games/${gameId}/${gameId}.py`], {
			detached: false,
			stdio: "pipe",
			env: {
				...process.env,
				DISPLAY: ":0"
			}
		});
		gameProcess.stdout.on("data", (data) => {
			console.log(`Game stdout: ${data}`);
		});
		gameProcess.stderr.on("data", (data) => {
			console.error(`Game stderr: ${data}`);
		});
		gameProcess.on("spawn", () => {
			console.log(`Game launched: ${gameId}`);
			resolve({ success: true });
		});
		gameProcess.on("close", (code) => {
			console.log(`Game exited with code: ${code}`);
			gameProcess = null;
			event.sender.send("game-closed");
		});
		gameProcess.on("error", (err) => {
			gameProcess = null;
			reject(err);
		});
	});
});
ipcMain.handle("kill-game", async () => {
	if (gameProcess) {
		gameProcess.kill();
		gameProcess = null;
	}
});
ipcMain.handle("app:quit", () => {
	app.quit();
});
app.whenReady().then(async () => {
	try {
		if (!await detectDisplay()) console.warn("No DDC/CI display detected, brightness control unavailable");
		else {
			currentBrightness = loadBrightness();
			applyBrightness(currentBrightness);
		}
	} catch (err) {
		console.error("Brightness init failed:", err.message);
	}
	createWindow();
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
//#endregion
export {};
