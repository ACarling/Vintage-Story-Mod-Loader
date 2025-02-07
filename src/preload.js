const { contextBridge, ipcRenderer } = require('electron')

// Exposed protected methods in the render process
contextBridge.exposeInMainWorld(
    'electronAPI', {
        alert: (alertText) => ipcRenderer.send("alert", alertText),
        copyToClipboard: (textToCopy) => ipcRenderer.send("copyToClipboard", textToCopy),
        openInBrowser: (url) => ipcRenderer.send("openInBrowser", url)
    }
);

contextBridge.exposeInMainWorld(
    'downloadAPI', {
        createModPack: (data) => ipcRenderer.invoke('create:modPack', data),
        downloadModForPack: (data) => ipcRenderer.invoke('download:modForPack', data),
        removeModFromPack: (data) => ipcRenderer.invoke('delete:modFromPack', data),
        deletePack: (packName) => ipcRenderer.invoke('delete:pack', packName),
        importModPack: (data) => ipcRenderer.invoke('import:modPack', data),
        downloadStreamNotifier: (listener) => ipcRenderer.on('downloadStreamNotifier', listener),
    }
);

contextBridge.exposeInMainWorld(
    'launcherAPI', {
        launchPack: (packName) => ipcRenderer.send('launchPack', packName),
        // launchPackServer: (packName) => ipcRenderer.send('launchPackServer', packName),
        openInFileExplorer: (packName) => ipcRenderer.send('openInFileExplorer', packName),
        editPack: (editedPack) => ipcRenderer.send('editPack', editedPack),
        getPackList: () => ipcRenderer.invoke('list:modPacks'),
        getDBmods: () => ipcRenderer.invoke('list:modDBList'),
        appVersionNotifier: (listener) => ipcRenderer.on('get:appversion', listener),
    }
);