const { Command } = require('discord.js-commando');
const Discord = require('discord.js');
const axios = require('axios').default;
const FuzzySet = require('fuzzyset.js');

const { CanvasRenderService } = require('chartjs-node-canvas');

module.exports = class Stats extends Command {
    constructor(client) {
        super(client, {
            name: 'stats',
            aliases: ['s'],
            group: 'covid',
            memberName: 'stats',
            description: 'A summary of new and total cases updated daily',
            throttling: {
                usages: 1,
                duration: 3,
            },
            args: [
                {
                    key: 'country',
                    prompt: 'Specify the country to display stats. Omit for global stats.',
                    type: 'string',
                    default: 'global',
                },
            ],
        });
    }

    async run(message, { country }) {
        const messageEmbed = new Discord.MessageEmbed().setColor('#DC143C');
        try {
            let data;
            let countryName;
            let countryCode;
            if (country.toLowerCase() === 'global') {
                countryCode = 'global';
                countryName = 'Global';
            }
            else {
                const response = await axios.get('https://api.thevirustracker.com/free-api?countryTotals=ALL');
                const countriesList = [];
                for (const key in response.data.countryitems[0]) {
                    if (response.data.countryitems[0][key].title && response.data.countryitems[0][key].code) {
                        countriesList.push(response.data.countryitems[0][key].title);
                        countriesList.push(response.data.countryitems[0][key].code);
                    }
                }
                const fset = FuzzySet(countriesList);
                const c = fset.get(country);
                // Check if there is any matching country
                if (c && c.length > 0) {
                    for (const key in response.data.countryitems[0]) {
                        if (response.data.countryitems[0][key].title === c[0][1] || response.data.countryitems[0][key].code === c[0][1]) {
                            countryCode = response.data.countryitems[0][key].code;
                            countryName = response.data.countryitems[0][key].title;
                            data = response.data.countryitems[0][key];
                        }
                    }
                }
                // If not set country to Global
                else {
                    countryCode = 'global';
                    countryName = 'Global';
                }
            }
            if (countryCode === 'global') {
                const response = await axios.get('https://api.thevirustracker.com/free-api?global=stats');
                data = response.data.results[0];
            }
            const canvasRenderService = new CanvasRenderService(500, 500);
            const image = await canvasRenderService.renderToBuffer({
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [data.total_active_cases, data.total_deaths, data.total_recovered],
                        backgroundColor: [
                            '#f4c63d',
                            '#d70206',
                            '#e6d7c1',
                        ],
                        borderWidth: 0,
                    }],
                    labels: ['Active', 'Deaths', 'Recovered'],
                },
                options: {
                    legend: {
                        labels: {
                            fontColor: '#988e99',
                            fontSize: 22,
                        },
                    },
                },
            });
            const attachment = new Discord.MessageAttachment(image, 'stats.png');
            messageEmbed
                .setAuthor('COVID-19 stats')
                .setDescription(`${countryCode !== 'global' ? ':flag_' + countryCode.toLowerCase() + ':' : '🌐'}  ${countryName}`)
                .setTitle(`Active: ${data.total_active_cases}`)
                .addFields(
                    { name: '😷 Confirmed', value: `${data.total_cases}`, inline: true },
                    { name: '💀 Deaths', value: `${data.total_deaths}`, inline: true },
                    { name: '💪 Recovered', value: `${data.total_recovered}`, inline: true },
                )
                .setFooter('')
                .attachFiles([attachment])
                .setImage('attachment://stats.png')
                .setTimestamp();
        }
        catch (error) {
            messageEmbed.setTitle('Error occured while getting data');
            console.error(error);
        }
        return message.embed(messageEmbed);
    }
};