async function _checkUpdate() {
    if (!require("node-fetch")) return;
    const packageData = await require("node-fetch")(`https://registry.npmjs.com/discord-anime-scheduler`).then((text) => text.json());
    if (require("../../package.json").version !== packageData["dist-tags"].latest) {
        console.log("\x1b[31m [Scheduler]", "\x1b[0m Une nouvelle version de \x1b[34mdiscord-anime-scheduler\x1b[0m est disponible ! Pour l'installer, faites ", "\x1b[36mnpm i discord-anime-scheduler@latest");
    }
}

module.exports = _checkUpdate;