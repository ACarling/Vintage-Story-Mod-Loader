function buildVersionList() {
    fetch("https://mods.vintagestory.at/api/gameversions").then(res => res.json())
    .then((data) => {
        const gameVersionNames = data.gameversions.map( gversion => gversion.name.substring(1))
        const versionDropdownDatalist = document.getElementById("vs-versions");

        gameVersionNames.forEach(vname => {
            let optionEL = document.createElement("option");
            optionEL.value = vname;
            versionDropdownDatalist.appendChild(optionEL);
        });
    })
}




/**
 * <div class="container modpack">
 *      <p>pack name<p>
 *      <button value="pack name">Launch</button>
 * </div>
 */
function createPackEntry(packName, parent) {
    const packItemEl = document.createElement("div");
    packItemEl.classList.add("container", "modpack")
    
    const packItemTitle = document.createElement("p");
    packItemTitle.innerText = packName;
    packItemEl.appendChild(packItemTitle);
    
    const packLaunchButton = document.createElement("button");
    packLaunchButton.addEventListener("click", launchPack)
    packLaunchButton.value = packName;
    packLaunchButton.innerText = "Launch Pack"
    packItemEl.appendChild(packLaunchButton);

    parent.appendChild(packItemEl);
}



// IPC

function launchPack(event) {
    const packName = event.target.value;
    console.log(packName);
    window.launcherAPI.launchPack(packName)
}


async function buildPackList() {
    const packList = document.getElementById("pack-list")
    while(packList.children.length > 0) {
        packList.removeChild(0)
    }
    const res = await window.launcherAPI.getPackList();
    if(res.code == 200) {
        res.data.forEach(packName => {
            createPackEntry(packName, packList)
        })
    }
    console.log(res);
}





document.getElementById('version-download').addEventListener('click', async () => {
    const selectedVersion = document.getElementById("selected-version").value;
    const packName = document.getElementById("pack-name").value;

    const res = await window.downloadAPI.createModPack({version: selectedVersion, name: packName});
    console.log(res)
    if (res.code != 200) {
        window.electronAPI.alert(res.data)
    }
    buildPackList();
})


// onstart

window.ipcRenderer.getVersion((event, data) => {
    document.getElementById("vl-version-number").innerText = data;
})
buildVersionList();
buildPackList();