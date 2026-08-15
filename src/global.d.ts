export {};

declare global {
    interface Window {
        electron: {
            getResourcesPath: () => Promise<string>;
            readDirectory: (dirPath: string) => Promise<string[]>;
            readGameTitle: (filePath: string) => Promise<string | null>;
            quit: () => Promise<void>;
        };
        brightness: {
            get: () => Promise<number>;
            set: (value: number) => Promise<number>;
        };
        volume: {
            get: () => Promise<number>;
            set: (level: number) => Promise<number>;
            toggle: () => Promise<boolean>;
        };
        games: {
            launch: (gameId: string) => Promise<{ success: boolean }>;
            kill: () => Promise<void>;
            onClosed: (callback: (...args: unknown[]) => void) => void;
            offClosed: (callback: (...args: unknown[]) => void) => void;
        };
    }
}
