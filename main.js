const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron') 
const { createModPack, downloadModForPack, removeModFromPack, importModPack, deletePack } = require("./src/downloadManager.js")
const { launchPack, listPacks, editPack, getDBmods } = require("./src/launcherManager.js")
const path = require("node:path")

// TODO: prompt to pick what version of mod to use
// TODO: prompt to delete pack


// TODO: default user settings loaded into every new pack (keybinds)
// TODO: import from file 
// TODO: download all dependencies
// TODO: finish linux and mac installs



function alert(event, alertText) {
    dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender), {message: alertText})
}

function copyToClipboard(event, textToCopy) {
    clipboard.writeText(textToCopy);
}

function openInBrowser(event, url) {
    require('electron').shell.openExternal(url);
}



const createWindow = () => {
    const window = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    window.loadFile('frontend/index.html');
    
    // window.webContents.openDevTools() // TODO: REMOVE

    window.on("ready-to-show", () => {
        window.webContents.send('appVersion', app.getVersion());
    });
}


app.whenReady().then(() => {
    // Electron api
    ipcMain.on("alert", alert)
    ipcMain.on("copyToClipboard", copyToClipboard)
    ipcMain.on("openInBrowser", openInBrowser)


    // Downloader api
    ipcMain.handle('create:modPack', createModPack)
    ipcMain.handle('download:modForPack', downloadModForPack)
    ipcMain.handle('delete:modFromPack', removeModFromPack)
    ipcMain.handle('delete:pack', deletePack)
    ipcMain.handle('import:modPack', importModPack)

    // launcher api
    ipcMain.on("launchPack", launchPack)
    ipcMain.on("editPack", editPack)
    ipcMain.handle("list:modPacks", listPacks)
    ipcMain.handle("list:modDBList", getDBmods)

    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})