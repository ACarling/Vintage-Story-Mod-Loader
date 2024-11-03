const { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut  } = require('electron') 
const { createModPack, downloadModForPack, removeModFromPack, importModPack, deletePack } = require("./src/managers/downloadManager.js")
const { launchPack, listPacks, editPack, getDBmods, openInFileExplorer } = require("./src/managers/launcherManager.js")
const path = require("node:path")

const fs = require('fs')
const { __appDir } = require('./src/managers/globals.js')


// launch server
// open file location
// download streams in background

// TODO: work out tag sorting 
// TODO: default user settings loaded into every new pack (keybinds)
// TODO: import from file 
// TODO: download all dependencies
// TODO: finish linux and mac installs

const ispackaged = app.isPackaged;

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

    var preferences = {preload: path.join(__dirname, '/src/preload.js')}
    if(ispackaged) {
        preferences =     {
            ...preferences,
            preload: path.join(__dirname, '/src/preload.js'),
            devTools: false,
            spellcheck: false,
        }
    }

    const window = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: preferences,
        icon: path.join(__dirname, 'assets/icons/png/32x32.png')
    });

    window.loadFile('frontend/index.html');
    
    if(!ispackaged) {
        window.webContents.openDevTools() // TODO: REMOVE
    }

    window.on("ready-to-show", () => {
        window.webContents.send('get:appversion', `${app.getVersion()}`);
    });
}


app.whenReady().then(() => {
    // Electron api
    ipcMain.on("alert", alert)
    ipcMain.on("copyToClipboard", copyToClipboard)
    ipcMain.on("openInBrowser", openInBrowser)

    console.log(app.getPath("exe"))
    console.log(app.getPath("userData"))
    console.log(__appDir)

    // Downloader api
    ipcMain.handle('create:modPack', createModPack)
    ipcMain.handle('download:modForPack', downloadModForPack)
    ipcMain.handle('delete:modFromPack', removeModFromPack)
    ipcMain.handle('delete:pack', deletePack)
    ipcMain.handle('import:modPack', importModPack)

    // launcher api
    ipcMain.on("launchPack", launchPack)
    // ipcMain.on("launchPackServer", launchPackServer)
    ipcMain.on("openInFileExplorer", openInFileExplorer)
    ipcMain.on("editPack", editPack)
    ipcMain.handle("list:modPacks", listPacks)
    ipcMain.handle("list:modDBList", getDBmods)

    if(!fs.existsSync(`${__appDir}/packs`)) {
        fs.mkdirSync(`${__appDir}/packs`)
        console.log(`created ${__appDir}/packs`)
    }
    if(!fs.existsSync(`${__appDir}/installercache`)) {
        fs.mkdirSync(`${__appDir}/installercache`)  
        console.log(`created ${__appDir}/installercache`)
    }
    console.log(`found ${__appDir}/installercache`)
    console.log(`found ${__appDir}/packs`)

    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });


    if(ispackaged) {
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
    }
})


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})