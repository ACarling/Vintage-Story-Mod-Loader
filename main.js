const { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut  } = require('electron') 
const { createModPack, downloadModForPack, removeModFromPack, importModPack, deletePack } = require("./src/managers/downloadManager.js")
const { launchPack, listPacks, editPack, getDBmods } = require("./src/managers/launcherManager.js")
const path = require("node:path")

const { dirname } = require('path');
const __appDir = dirname(app.getPath("exe"));
const fs = require('fs')


// TODO: work out tag sorting 
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
            preload: path.join(__dirname, '/src/preload.js'),
            // TODO: find a way to inject these on make
            devTools: false,
            spellcheck: false,
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

    console.log(`${__appDir}`)
    if(!fs.existsSync(`${__appDir}/packs`)) {
        fs.mkdirSync(`${__appDir}/packs`)        
    }
    if(!fs.existsSync(`${__appDir}/installercache`)) {
        fs.mkdirSync(`${__appDir}/installercache`)        
    }

    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });


    // stop page reloading
    // find a way to only do this on make
    app.on('browser-window-focus', function () {
        globalShortcut.register("CommandOrControl+R", () => {
            console.log("CommandOrControl+R is pressed: Shortcut Disabled");
        });
        globalShortcut.register("F5", () => {
            console.log("F5 is pressed: Shortcut Disabled");
        });
    });
    app.on('browser-window-blur', function () {
        globalShortcut.unregister('CommandOrControl+R');
        globalShortcut.unregister('F5');
    });
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})