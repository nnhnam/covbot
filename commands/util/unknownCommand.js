const { Command } = require('discord.js-commando');

module.exports = class UnknownCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'unknown-command',
			group: 'util',
			memberName: 'unknown-command',
			description: 'Displays help information for when an unknown command is used.',
			unknown: true,
			hidden: true,
		});
	}

	run(message) {
		// return message.reply(
		// 	`Unknown command. Please use ${message.anyUsage('help', message.guild ? undefined : null, message.guild ? undefined : null)} to view the command list.`,
		// );
	}
};