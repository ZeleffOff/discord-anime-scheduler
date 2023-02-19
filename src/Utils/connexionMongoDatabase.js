const mongoose = require("mongoose");
const _error = require("./error");

async function connexionMongoDatabase(uri, logStatus) {
    if (!uri) _error("Aucune URI MongoDB n'a été fournie dans les options. Veuillez fournir un URI MongoDB valide pour établir une connexion.", 'ARGUMENT_MISSING');

    mongoose.set('strictQuery', true);
    mongoose.connect(uri).catch((e) => {
        _error(`Connexion avec MongoDB impossible :\n ${e}`, 'MONGO_ERROR');
    });

    mongoose.connection.once("open", () => {
        if (logStatus) console.log("[Sheduler] Connexion à la database MongoDB réussie !");
    })
    return;

}

module.exports = connexionMongoDatabase;