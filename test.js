const { Client, GatewayIntentBits } = require('discord.js');
const Scheduler = require('./src/Scheduler');
const client = new Client({ intents: [GatewayIntentBits.Guilds]});
const s = new Scheduler(client, { mongoUri: 'mongodb+srv://Karma:Dofus9744212+2@justpubc.qfrpo.mongodb.net/?retryWrites=true&w=majority' });

client.on('ready', () => {
    s.init();

    s.list(('999016918382034944')).then(res => console.log(res)).catch(e => console.log(e))
});

client.login('MTA2MDU3MDQ1MTA1MjU5MzE5Mw.GdqpKu.gGvYKqLdgVoeND8gajX7cIRtOKegvN3V5fc4UA');