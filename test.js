const scheduler = require('./src/Scheduler');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] })

const test = new scheduler(client, { 
    log: false, 
    mongoUri: 'mongodb+srv://Karma:Dofus9744212+2@justpubc.qfrpo.mongodb.net/?retryWrites=true&w=majority',
    autoPost: true
});
test.init();

client.login('MTA2MDU3MDQ1MTA1MjU5MzE5Mw.Gi-AHP.1grLRTIqvPfoqOxv3XFzTLyztmguUJzT5KWD5c');
client.on('ready', async () => {
    
const added = await test.setChannel(client.guilds.cache.get('999016918382034944'), "ozaeazne azeapieceazeae");
console.log(added)
})