let resourcesPath = null;

export async function getResourcesPath() {
    if (resourcesPath) return resourcesPath;
    resourcesPath = await window.electron.getResourcesPath();
    return resourcesPath;
}

export async function getPicturePath(filename) {
    const base = await getResourcesPath();
    return `${base}pictures/${filename}`;
}

export async function getSoundPath(filename) {
    const base = await getResourcesPath();
    return `${base}sounds/${filename}`;
}

export async function getGamePreview(game) {
    const base = `/media/picube/covers/${game}/preview.mp4`;
    return base;
}

export async function getGameTitleFile(game) {
    return `/media/picube/covers/${game}/title.txt`;
}

export async function availableGameCovers() {
    const covers = "/media/picube/covers";
    const files = await window.electron.readDirectory(covers);
    return files;
}