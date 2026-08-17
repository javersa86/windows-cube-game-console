// Thin wrapper around the Tauri commands ported in src-tauri/src/commands/,
// replacing the old electron/preload.js contextBridge (window.electron/
// brightness/volume/games). Keeps the same namespaced call shape so page
// components barely change.

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export const electron = {
    getGamesRoot: (): Promise<string> => invoke('get_games_root'),
    readDirectory: (dirPath: string): Promise<string[]> => invoke('read_directory', { dirPath }),
    readGameTitle: (filePath: string): Promise<string | null> => invoke('read_game_title', { filePath }),
    quit: (): Promise<void> => invoke('app_quit'),
};

export const brightness = {
    get: (): Promise<number> => invoke('brightness_get'),
    set: (value: number): Promise<number> => invoke('brightness_set', { value }),
};

export const volume = {
    get: (): Promise<number> => invoke('get_volume'),
    set: (level: number): Promise<number> => invoke('set_volume', { level }),
    toggle: (): Promise<boolean> => invoke('toggle_mute'),
};

type ClosedCallback = (...args: unknown[]) => void;

// Tauri's listen() is async and returns its own unlisten function, but the
// original onClosed/offClosed pair (mirroring electron/utils/gamepad.js's
// on/off) is synchronous — track the mapping so offClosed can stay sync too.
const gameClosedUnlisteners = new Map<ClosedCallback, Promise<UnlistenFn>>();

export const games = {
    launch: (gameId: string): Promise<{ success: boolean }> => invoke('launch_game', { gameId }),
    kill: (): Promise<void> => invoke('kill_game'),
    onClosed: (callback: ClosedCallback) => {
        gameClosedUnlisteners.set(callback, listen('game-closed', () => callback()));
    },
    offClosed: (callback: ClosedCallback) => {
        const pending = gameClosedUnlisteners.get(callback);
        if (pending) {
            pending.then((unlisten) => unlisten());
            gameClosedUnlisteners.delete(callback);
        }
    },
};
