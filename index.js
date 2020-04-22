const { CommandoClient } = require('discord.js-commando');
const path = require('path');
require('dotenv').config();

const client = new CommandoClient({
    commandPrefix: 'cov',
    owner: '254913097754476544',
    invite: 'https://discord.gg/4sAgszu',
});

client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['covid', 'COVID-19'],
    ])
    .registerDefaultGroups()
    .registerDefaultCommands({
        unknownCommand: false,
    })
    .registerCommandsIn(path.join(__dirname, 'commands'));

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag} ! (${client.user.id})`);
    client.user.setActivity('Prefix: cov');
});

client.on('error', console.error);

client.login(process.env.token);