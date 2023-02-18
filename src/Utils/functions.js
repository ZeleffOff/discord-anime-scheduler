const fetch = require('node-fetch');

/**
 * Fetch anime data
 * @param {string} query recherche via GraphQl
 * @param {object} variables options de recherche
 * @returns {Promise<data>}
 */
async function fetchAnime(query, variables) {
    return fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ query, variables })
    })
    .then(res => res.json())
    .catch(err => err);
}

/**
 * Converti les secondes en une date précise. Rpris sur stackoverflow
 * @param {number} time Temps en seconde à convertir
 * @returns {string}
 */
function convertTime(time) {
    time = Number(time);
    var d = Math.floor(time / (3600*24));
    var h = Math.floor(time % (3600*24) / 3600);
    var m = Math.floor(time % 3600 / 60);
    var s = Math.floor(time % 60);
    
    var dDisplay = d > 0 ? d + (d == 1 ? " jour, " : " jours, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " heure, " : " heures, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " seconde" : " secondes") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

async function _checkUpdate() {
    if (!require("node-fetch")) return;
    const packageData = await require("node-fetch")(`https://registry.npmjs.com/discord-anime-scheduler`).then((text) => text.json());
    if (require("../../package.json").version !== packageData["dist-tags"].latest) {
        console.log("\x1b[31m [Scheduler]", "\x1b[0m Une nouvelle version de \x1b[34mdiscord-anime-scheduler\x1b[0m est disponible ! Pour l'installer, faites ", "\x1b[36mnpm i discord-anime-scheduler@latest");
    }
}

module.exports = { fetchAnime, convertTime, _checkUpdate };