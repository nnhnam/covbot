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
        await axios.get('https://api.covid19api.com/summary')
            .then(async (response) => {
                let data;
                let countryName;
                if (country.toLowerCase() === 'global') {
                    data = response.data.Global;
                    countryName = 'Global';
                }
                else {
                    const countriesList = [];
                    for (let i = 0; i < response.data.Countries.length; ++i) {
                        countriesList.push(response.data.Countries[i].Slug);
                        countriesList.push(response.data.Countries[i].CountryCode);
                    }
                    const fset = FuzzySet(countriesList);
                    const c = fset.get(country);
                    // Check if there is any matching country
                    if (c && c.length > 0) {
                        for (let i = 0; i < response.data.Countries.length; ++i) {
                            if (response.data.Countries[i].Slug === c[0][1] || response.data.Countries[i].CountryCode === c[0][1]) {
                                data = response.data.Countries[i];
                                countryName = response.data.Countries[i].Country;
                                break;
                            }
                        }
                    }
                    // If not set country to Global
                    else {
                        data = response.data.Global;
                        countryName = 'Global';
                    }
                }

                const canvasRenderService = new CanvasRenderService(500, 500);
                const image = await canvasRenderService.renderToBuffer({
                    type: 'doughnut',
                    data: {
                        datasets: [{
                            data: [data.TotalConfirmed - data.TotalDeaths - data.TotalRecovered, data.TotalDeaths, data.TotalRecovered],
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
                    .setDescription(`${data.CountryCode ? ':flag_' + data.CountryCode.toLowerCase() + ':' : '🌐'}  ${countryName}`)
                    .setTitle(`Active: ${data.TotalConfirmed - data.TotalDeaths - data.TotalRecovered}`)
                    .addFields(
                        { name: '😷 Confirmed', value: `Total: ${data.TotalConfirmed} \n New: ${data.NewConfirmed}`, inline: true },
                        { name: '💀 Deaths', value: `Total: ${data.TotalDeaths} \n New: ${data.NewDeaths}`, inline: true },
                        { name: '💪 Recovered', value: `Total: ${data.TotalRecovered} \n New: ${data.NewRecovered}`, inline: true },
                    )
                    .setFooter('Last updated : ')
                    .attachFiles([attachment])
                    .setImage('attachment://stats.png')
                    .setTimestamp(response.data.Date);
            },
            )
            .catch(error => {
                messageEmbed
                    .setTitle('Error occured while getting data');
                console.error(error);
            });
        return message.embed(messageEmbed);
    }
};