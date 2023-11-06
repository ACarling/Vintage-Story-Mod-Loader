const {app} = require("electron")

const { dirname } = require('path');
const __appDir = dirname(app.getPath("exe"));

const {CreateRes} = require("./common.js")
const fs = require('fs')
const { spawn } = require('child_process');
const axios = require('axios');

var loadedMods = new Promise(async (res,rej) => {
    const response = await axios.get("https://mods.vintagestory.at/api/mods");
    loadedMods = response.data.mods

    res(loadedMods)
})


module.exports = {


    /**
     * spawn pack with the correct data path note: must close launcher to relenquish control over pack files
     * @param {*} event 
     * @param {string} packName 
     * @returns 
     */
    launchPack(event, packName) {
        console.log(packName)
        console.log("launching " + packName)
        return new Promise((res, rej) => {
            var child = spawn(`${__appDir}/packs/${packName}/Game/Vintagestory.exe`, 
                ["--dataPath", `${__appDir}/packs/${packName}/GameData`], 
                {detached: true})
            child.unref();
            res("Launching pack")
            process.exit(0);
        })
    },

    /**
     * list all packs in the /packs folder and return their meta.json to the frontend
     * @returns {code:string, packs:[meta.json]}
     */
    listPacks() {
        return new Promise((res, rej) => {
            var packJsonList = []
            // get all packs in the /packs/ folder
            fs.readdir(`${__appDir}/packs/`, (err, files) => {
                if(err) {
                    console.log(err)
                    rej(err)
                }
                // get the meta.json for each pack folder
                files.forEach(file => {
                    if(fs.existsSync(`${__appDir}/packs/${file}/meta.json`)) {
                        const meta = fs.readFileSync(`${__appDir}/packs/${file}/meta.json`);

                        // TODO: check for changes here
                        // const newList = buildModList(file);
                        // if (meta.mods != newList) {
                        //     console.log(meta.mods)
                        //     console.log(newList)
                        // }
                        // save changes
                        // fs.writeFileSync()

                        packJsonList.push(JSON.parse(meta));
                    } else {
                        console.log(`ERR: Pack at: ${__appDir}/packs/${file} missing meta file`)
                    }
                    res(CreateRes(200, packJsonList))
                });
                res(CreateRes(200, []))
            })
        });
    },


    /**
     * Does the api calls to build the meta.json mods: [] array
     * @param {string} packName 
     * @returns {array[mods]}
     */
    buildModList(packName) {
        //TODO: this will need to unzip and scan mod folders maybe not necessary rn
        // can use this https://mods.vintagestory.at/api/mod/1676
    },


    editPack(event, data) {
        fs.writeFileSync(`${__appDir}/packs/${data.name}/meta.json`, JSON.stringify(data));
    },


    async getDBmods() {
        return CreateRes(200, (await loadedMods));
    }
}

