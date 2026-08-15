//#region electron/preload.js
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electron", {
	getResourcesPath: () => ipcRenderer.invoke("get-resources-path"),
	readDirectory: (dirPath) => ipcRenderer.invoke("read-directory", dirPath),
	readGameTitle: (filePath) => ipcRenderer.invoke("read-game-title", filePath),
	quit: () => ipcRenderer.invoke("app:quit")
});
contextBridge.exposeInMainWorld("brightness", {
	get: () => ipcRenderer.invoke("brightness:get"),
	set: (value) => ipcRenderer.invoke("brightness:set", value)
});
contextBridge.exposeInMainWorld("volume", {
	get: () => ipcRenderer.invoke("get-volume"),
	set: (level) => ipcRenderer.invoke("set-volume", level),
	toggle: () => ipcRenderer.invoke("toggle-mute")
});
contextBridge.exposeInMainWorld("games", {
	launch: (gameId) => ipcRenderer.invoke("launch-game", gameId),
	kill: () => ipcRenderer.invoke("kill-game"),
	onClosed: (callback) => ipcRenderer.on("game-closed", callback),
	offClosed: (callback) => ipcRenderer.removeListener("game-closed", callback)
});
//#endregion
