const os = require('os');
const isMac = os.platform() === "darwin";
const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

module.exports = {
    OSdata: {
        isMac,
        isWindows,
        isLinux,
    },
    getOSString: () => {
        if (isMac) return "MacOS";
        if (isWindows) return "Windows"
        if (isLinux) return "Linux"
    }
};