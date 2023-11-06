const { dirname } = require('path');
const __appDir = dirname(require.main.filename);

const {OSdata, getOSString} = require("./globals.js")
const fs = require("fs")
const axios = require('axios');
const https = require("https")

const { exec } = require('child_process');
const {CreateRes} = require("./common.js");
const { loadedMods, getDBmods } = require('./launcherManager.js');



//https://cdn.vintagestory.at/gamefiles/stable/vs_install_win-x64_1.18.15.exe
//https://cdn.vintagestory.at/gamefiles/stable/vs_client_osx-x64_1.18.15.tar.gz
//https://cdn.vintagestory.at/gamefiles/stable/vs_client_linux-x64_1.18.15.tar.gz

//https://cdn.vintagestory.at/gamefiles/stable/vs_install_1.18.1.exe
//https://cdn.vintagestory.at/gamefiles/stable/vs_mac_1.9.14.tar.gz
//https://cdn.vintagestory.at/gamefiles/stable/vs_archive_1.9.14.tar.gz
/**
 * 
 * @param {string} versionName 
 * @returns 
 */
function getVSDownloadURL(versionName) {
    if(parseInt(versionName.replaceAll(".", "")) >= 1188) {
        if(OSdata.isWindows) {
            return  `https://cdn.vintagestory.at/gamefiles/stable/vs_install_win-x64_${versionName}.exe`
        } else if(OSdata.isMac) {
            return  `https://cdn.vintagestory.at/gamefiles/stable/vs_client_osx-x64_${versionName}.tar.gz`
        } else if(OSdata.isLinux) {
            return  `https://cdn.vintagestory.at/gamefiles/stable/vs_client_linux-x64_${versionName}.tar.gz`
        }
    } else {
        if(OSdata.isWindows) {
            return  `https://cdn.vintagestory.at/gamefiles/stable/vs_install_${versionName}.exe`
        } else if(OSdata.isMac) {
            return  `https://cdn.vintagestory.at/gamefiles/stable/vs_mac_${versionName}.tar.gz`
        } else if(OSdata.isLinux) {
            return  `https://cdn.vintagestory.at/gamefiles/stable/vs_archive${versionName}.tar.gz`
        }    
    }
}






/**
 * 
 * @param {Object} outfile - Needs to be fs.WriteStream 
 * @param {string} downloadURL - Download url 
 * @returns {Object} - {code, data}
 */
function downloadFile(event, outfile, downloadURL, downloadDest) {
    const fileName = outfile.path.split("/")[outfile.path.split("/").length-1];
    event.sender.send('downloadStreamNotifier', `start:${fileName}`); // used to send download info to frontend

    return new Promise((res, rej) => {
        const request = https.get(downloadURL, (response) => {
            response.pipe(outfile);
    
            var cur = 0;
            var len = parseInt(response.headers['content-length'], 10);
            var total = len / 1048576; //1048576 - bytes in  1Megabyte
            
            console.log(`found download server: ${downloadURL} now downloading to: ${outfile.path}`)
    
            response.on("data", function(chunk) {
                cur += chunk.length;
                event.sender.send('downloadStreamNotifier', `update:${fileName}:${(100.0 * cur / len).toFixed(2)},${(cur / 1048576).toFixed(2)},${total.toFixed(2)}`);
                console.log("Downloading " + (100.0 * cur / len).toFixed(2) + "% " + (cur / 1048576).toFixed(2) + " Total size: " + total.toFixed(2) + " mb");
            });
    
            outfile.on("finish", () => {
                outfile.close();
                event.sender.send('downloadStreamNotifier', `stop:${fileName}`);
                res(CreateRes(200, "OK"))
            })
        }).on("error", (err) => {
            event.sender.send('downloadStreamNotifier', `stop:${fileName}`);
            rej(CreateRes(404, "Download error"))
        })    
    })
}


function installVSVersion(installerDest, packName) {
    return new Promise(async (res, rej) => {
        if(OSdata.isWindows) {
            console.log("starting install")
            exec(`${installerDest} /COMPONENTS="!*" /DIR="${__appDir}/packs/${packName}/Game" `, async (err, stdout, stderr) => {
                if (err) {
                    console.error(`exec error: ${err}`);
                    rej(CreateRes(500, err));
                }
                console.log("done")
                // await firstTimeSetup(`${__appDir}/packs/${packName}`);
                res(CreateRes(200, "Pack Sucessfully created"));
            })
        }
        else if (OSdata.isLinux) {
            console.log("not supported linux")
        }
        else if (OSdata.isMac) {
            console.log("not supported on mac")
        }
    })
}


async function downloadVSVersion(event, versionName, packName) {
    console.log("Downloading: " + versionName + " " + packName)
    const installerDest = `${__appDir}/installercache/${versionName}installer.exe`
    if(!fs.existsSync(`${__appDir}/installercache/${versionName}installer.exe`)) {
        var file = await fs.createWriteStream(installerDest);
    
        const downloadRes = await downloadFile(event, file, getVSDownloadURL(versionName), installerDest)
        if(downloadRes.code != 200) {
            return downloadRes;
        }    
    }

    return await installVSVersion(installerDest, packName)
}


module.exports = {


    /**
     * 
     * @param {*} event 
     * @param {Object} data - data from DOM
     * @param {string} data.version - Vintage story version for pack (without v prefix)
     * @param {string} data.name - Modpack name
     * @param {string} data.description - Modpack description
     * @param {string} data.author - Modpack author
     * @param {boolean} data.imported - is the pack imported or not
     * @returns {Object} - return CreateRes(code, data)
     */
    async createModPack(event, data) {
        const requestedVersion = data.version;
        const packName = data.name;
        const packDescription = data.description;
        const packAuthor = data.author;

        const isImported = data.imported ? true : false

        let regex = /^[a-zA-Z1-9]+$/; 
        if(!regex.test(packName)) {
            return CreateRes(400, "Pack name includes illegal characters, Must be exclusivley letters and numbers, no spaces")
        }
        if(packName.length < 3) {
            return CreateRes(400, "Pack name is too short")
        }

        
        console.log("want to download " + requestedVersion + " on " + getOSString())
        
        // Validate version exists
        const res = await axios.get("https://mods.vintagestory.at/api/gameversions");
        var realVersionName = res.data.gameversions.find(version => {
            return version.name == 'v' + requestedVersion;
        });
        if(realVersionName && realVersionName.name) {
            var realVersionName = realVersionName.name.substring(1);
        } else {
            return CreateRes(400, `Version ${requestedVersion} does not exist`)
        }


        // download and install version
        if (realVersionName) {
            if(fs.existsSync(`${__appDir}/packs/${packName}`)) {
                return CreateRes(400, "pack of name already exists")
            } else {
                fs.mkdirSync(`${__appDir}/packs/${packName}`);
                fs.writeFileSync(`${__appDir}/packs/${packName}/meta.json`, 
                    JSON.stringify({
                        name: packName,
                        author: packAuthor ? packAuthor : "someone",
                        description: packDescription ? packDescription : "...",
                        version: realVersionName,
                        imported: isImported,
                        mods : []
                    })
                );
                fs.mkdirSync(`${__appDir}/packs/${packName}/GameData`);
                fs.mkdirSync(`${__appDir}/packs/${packName}/GameData/Mods`);
                fs.mkdirSync(`${__appDir}/packs/${packName}/Game`);

            }

            return await downloadVSVersion(event, realVersionName, packName);
        }

        return CreateRes(400, "want to download " + realVersionName + " on " + getOSString() + ": version does not exist")
    },


    /**
     * 
     * @param {*} event 
     * @param {Object} data
     * @param {String} data.modID
     * @param {String} data.modFileID
     * @param {String} data.modFileName
     * @param {String} data.packName
     */
    async downloadModForPack(event, data) {
    
        // TODO: validate if existing modfileid
        // TODO: if different version of same mod, delete old zip, download new zip
        // const res = await axios.get(`https://mods.vintagestory.at/api/mod${data.modID}`);
        // console.log(data);


        const downloadURL = `https://mods.vintagestory.at/download?fileid=${data.modFileID}`
        const downloadDest = `${__appDir}/packs/${data.packName}/GameData/Mods/${data.modFileName}`;
        var file = await fs.createWriteStream(downloadDest);
    
        const downloadRes = await downloadFile(event, file, downloadURL, downloadDest)    
        if(downloadRes.code == 200) {
            const meta = JSON.parse(fs.readFileSync(`${__appDir}/packs/${data.packName}/meta.json`));

            const modDB = await getDBmods();

            const databaseModInfo = modDB.data.find(u => u.modid == data.modID);
            // console.log(databaseModInfo)
            
            meta.mods.push({...databaseModInfo, fileID:data.modFileID, fileName: data.modFileName});

            // console.log(meta.mods);
            fs.writeFileSync(`${__appDir}/packs/${data.packName}/meta.json`, JSON.stringify(meta))
            // update meta file
        }
        return downloadRes;
    },


    /**
     * 
     * @param {*} event 
     * @param {Object} data
     * @param {String} data.modID
     * @param {String} data.modFileName
     * @param {String} data.packName
     */
    async removeModFromPack(event, data) {

        fs.unlink(`${__appDir}/packs/${data.packName}/GameData/Mods/${data.modFileName}`, (err) => {
            if (err) {
                console.log(err);
            }
        })

        //remove mod from meta.json
        const meta = JSON.parse(fs.readFileSync(`${__appDir}/packs/${data.packName}/meta.json`));
        meta.mods.splice(meta.mods.findIndex(mod => mod.modid == data.modID), 1);
        fs.writeFileSync(`${__appDir}/packs/${data.packName}/meta.json`, JSON.stringify(meta))
        return CreateRes(200, `deleted mod ${data.modID}`)
    },


    async deletePack(event, packName) {
        if(fs.existsSync(`${__appDir}/packs/${packName}`)) {
            fs.rmSync(`${__appDir}/packs/${packName}`, { recursive: true, force: true })
        }
        return CreateRes(200, "deleted file")
    },


    /**
     * 
     * @param {*} event 
     * @param {Object} data
     * @param {string} data.name
     * @param {string} data.author
     * @param {string} data.description
     * @param {string} data.version 
     * @param {array} mods - mod files ids: need to look up rest of info
     */
    async importModPack(event, data) {

        return new Promise(async (resolve, reject) => {
            const packName = data.name;
            const packMods = data.mods;
    
    
    
            console.log("creating new profile")
            const createMPRes = await module.exports.createModPack(event, {...data, imported: true});
            if(createMPRes.code != 200) {
                // TODO: cleanup on fail    
                resolve(createMPRes);
                return;
            }
    
            console.log("cleaning mod folder")
            // REMOVE ALL EXISTING MODS DOWNLOADED HERE
            const meta = JSON.parse(fs.readFileSync(`${__appDir}/packs/${packName}/meta.json`));
            meta.mods = [];
            fs.writeFileSync(`${__appDir}/packs/${packName}/meta.json`, JSON.stringify(meta))
    
            fs.readdirSync(`${__appDir}/packs/${packName}/GameData/Mods/`).forEach(mod => {
                if(fs.existsSync(`${__appDir}/packs/${packName}/GameData/Mods/${mod}`)) {
                    fs.unlinkSync(`${__appDir}/packs/${packName}/GameData/Mods/${mod}`)
                }   
            })
            
            console.log("downloading mods")

            // DOWNLOAD EACH SPECIFIED MOD
            var modDownloadNum = 0;
            for (let i = 0; i < packMods.length; i++) {
                const modDownloadInfo = packMods[i];
                module.exports.downloadModForPack(event, {
                    modID: modDownloadInfo.modid,
                    modFileID: modDownloadInfo.fileID,
                    modFileName: modDownloadInfo.fileName,
                    packName: packName
                }).then(downloadRes => {
                    if(downloadRes.code != 200) {
                        // TODO cleanup on fail
                        reject(downloadRes);
                    }
                    modDownloadNum++;
                    if(modDownloadNum == packMods.length) {
                        resolve(CreateRes(200, "created modpack"))
                    }
                });
            }
        
        })


    }

}



