const { CommandoClient } = require('discord.js-commando');
const config = require('./config.js');
const path = require('path');

const client = new CommandoClient({
    commandPrefix: 'cov',
    owner: '254913097754476544',
    unknownCommandResponse: false,
    // invite: '',
});

client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['covid', 'COVID-19'],
    ])
    .registerDefaultGroups()
    .registerDefaultCommands()
    .registerCommandsIn(path.join(__dirname, 'commands'));

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag} ! (${client.user.id})`);
    client.user.setActivity('Prefix: cov');
});

client.on('error', console.error);

client.login(config.token);