const { Command } = require('discord.js-commando');
const Discord = require('discord.js');
const axios = require('axios').default;
const FuzzySet = require('fuzzyset.js');

const { CanvasRenderService } = require('chartjs-node-canvas');

module.exports = class Graph extends Command {
    constructor(client) {
        super(client, {
            name: 'graph',
            aliases: ['g'],
            group: 'covid',
            memberName: 'graph',
            description: 'Graph the COVID-19 stats of a country',
            throttling: {
                usages: 1,
                duration: 10,
            },
            args: [
                {
                    key: 'country',
                    prompt: 'specify the country to display stats for.',
                    type: 'string',
                },
            ],
        });
    }

    async run(message, { country }) {
        let messageEmbed = new Discord.MessageEmbed().setColor('#DC143C');
        try {
            let countrySlug = 'N/A';
            let countryName = 'N/A';
            let response = await axios.get('https://api.covid19api.com/countries');
            const countriesList = [];
            for (const countryData of response.data) {
                if (countryData.Country && countryData.ISO2 && countryData.Slug) {
                    countriesList.push(countryData.Country);
                    countriesList.push(countryData.ISO2);
                    countriesList.push(countryData.Slug);
                }
            }
            const fset = FuzzySet(countriesList);
            const c = fset.get(country);
            // Check if there is any matching country
            if (c && c.length > 0) {
                for (const countryData of response.data) {
                    if (countryData.Country === c[0][1] || countryData.ISO2 === c[0][1] || countryData.Slug === c[0][1]) {
                        countrySlug = countryData.Slug;
                        countryName = countryData.Country;
                        break;
                    }
                }
            }
            if (countrySlug === 'N/A') {
                messageEmbed.setTitle('Country not found');
                await message.channel.send(messageEmbed);
                return;
            }
            response = await axios.get(`https://api.covid19api.com/total/dayone/country/${countrySlug}`);
            const dataActive = [];
            const dataDeaths = [];
            const dataRecovered = [];
            response.data.forEach((daily) => {
                dataActive.push({
                    x: new Date(daily.Date),
                    y: daily.Active,
                });
                dataDeaths.push({
                    x: new Date(daily.Date),
                    y: daily.Deaths,
                });
                dataRecovered.push({
                    x: new Date(daily.Date),
                    y: daily.Recovered,
                });
            });

            const canvasRenderService = new CanvasRenderService(800, 800);
            const image = await canvasRenderService.renderToBuffer({
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Active',
                        data: dataActive,
                        backgroundColor: '#f4c63d',
                        borderWidth: 0,
                        pointRadius: 0,
                    },
                    {
                        label: 'Deaths',
                        data: dataDeaths,
                        backgroundColor: '#d70206',
                        borderWidth: 0,
                        pointRadius: 0,
                    },
                    {
                        label: 'Recovered',
                        data: dataRecovered,
                        backgroundColor: '#e6d7c1',
                        borderWidth: 0,
                        pointRadius: 0,
                    },
                    ],
                },
                options: {
                    title: {
                        display: true,
                        text: countryName,
                        fontColor: '#988e99',
                        fontSize: 40,
                    },
                    legend: {
                        labels: {
                            fontColor: '#988e99',
                            fontSize: 30,
                        },
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: true,
                                fontColor: '#988e99',
                                fontSize: 18,
                            },
                            stacked: true,
                        }],
                        xAxes: [{
                            ticks: {
                                fontColor: '#988e99',
                                fontSize: 18,
                            },
                            type: 'time',
                            time: {
                                unit: 'day',
                            },
                        }],
                    },
                },
            });
            messageEmbed = new Discord.MessageEmbed().setColor('#DC143C');
            const attachment = new Discord.MessageAttachment(image, 'graph.png');
            messageEmbed
                .setAuthor('COVID-19 graph')
                .setTitle(`📈 Graph of COVID-19 stats in ${countryName}`)
                .attachFiles([attachment])
                .setImage('attachment://graph.png')
                .setTimestamp();
            await message.channel.send(messageEmbed);
        }
        catch (error) {
            messageEmbed.setTitle('Error occured while getting data');
            console.error(error);
            await message.channel.send(messageEmbed);
        }
    }
};