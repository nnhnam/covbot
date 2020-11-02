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
            const response = await axios.get('https://api.covid19api.com/summary');
            if (country.toLowerCase() === 'global') {
                countryCode = 'global';
                countryName = 'Global';
            }
            else {
                const countriesList = [];
                for (const countryData of response.data.Countries) {
                    if (countryData.Country && countryData.CountryCode && countryData.Slug) {
                        countriesList.push(countryData.Country);
                        countriesList.push(countryData.CountryCode);
                        countriesList.push(countryData.Slug);
                    }
                }
                const fset = FuzzySet(countriesList);
                const c = fset.get(country);
                // Check if there is any matching country
                if (c && c.length > 0) {
                    for (const countryData of response.data.Countries) {
                        if (countryData.Country === c[0][1] || countryData.CountryCode === c[0][1] || countryData.Slug === c[0][1]) {
                            countryCode = countryData.CountryCode;
                            countryName = countryData.Country;
                            data = countryData;
                            break;
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
                data = response.data.Global;
            }
            const canvasRenderService = new CanvasRenderService(500, 500);
            const totalActive = data.TotalConfirmed - data.TotalDeaths - data.TotalRecovered;
            const totalConfirmed = data.TotalConfirmed;
            const totalDeaths = data.TotalDeaths;
            const totalRecovered = data.TotalRecovered;

            const image = await canvasRenderService.renderToBuffer({
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [totalActive, totalDeaths, totalRecovered],
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
                .setTitle(`Active: ${(totalActive).toLocaleString()}`)
                .addFields(
                    { name: '😷 Confirmed', value: `${totalConfirmed.toLocaleString()}`, inline: true },
                    { name: '💀 Deaths', value: `${totalDeaths.toLocaleString()}`, inline: true },
                    { name: '💪 Recovered', value: `${totalRecovered.toLocaleString()}`, inline: true },
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