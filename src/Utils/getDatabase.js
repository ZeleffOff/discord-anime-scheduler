const Guild = require('../Models/Anime');

async function getDatabase(guildID, autoCreate) {
    let database = await Guild.findOne({ _id: guildID });
    if (!database && autoCreate) database = new Guild({ _id: guildID });

    return database;
}

module.exports = getDatabase;