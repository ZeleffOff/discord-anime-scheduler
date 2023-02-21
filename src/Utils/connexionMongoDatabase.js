const mongoose = require("mongoose");

async function connexionMongoDatabase(uri, logStatus) {
    mongoose.set('strictQuery', true);
    mongoose.connect(uri).catch(e => {
        console.log('[Scheduler] Connexion to database error : ', e);
    });

    mongoose.connection.once("open", () => {
        if (logStatus) console.log("[Sheduler] Connected to Database !");
    }); 
}

module.exports = connexionMongoDatabase;
