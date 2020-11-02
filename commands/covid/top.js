const { Command } = require('discord.js-commando');
const Discord = require('discord.js');
const axios = require('axios').default;

const { CanvasRenderService } = require('chartjs-node-canvas');

module.exports = class Top extends Command {
    constructor(client) {
        super(client, {
            name: 'top',
            aliases: ['t'],
            group: 'covid',
            memberName: 'top',
            description: 'List of top 9 countries: [active, confirmed, deaths, recovered]',
            throttling: {
                usages: 1,
                duration: 3,
            },
        });
        this.compare = {
            'active': (a, b) => (b.TotalConfirmed - b.TotalDeaths - b.TotalRecovered) - (a.TotalConfirmed - a.TotalDeaths - a.TotalRecovered),
            'confirmed': (a, b) => (b.TotalConfirmed) - (a.TotalConfirmed),
            'deaths': (a, b) => (b.TotalDeaths) - (a.TotalDeaths),
            'recovered': (a, b) => (b.TotalRecovered) - (a.TotalRecovered),
        };
    }

    getValue(country, type) {
        switch (type) {
            case 'active': return (country.TotalConfirmed - country.TotalDeaths - country.TotalRecovered);
            case 'confirmed': return country.TotalConfirmed;
            case 'deaths': return country.TotalDeaths;
            case 'recovered': return country.TotalRecovered;
        }
    }

    async run(message) {
        let type;
        let messageEmbed = new Discord.MessageEmbed().setColor('#DC143C');
        try {
            messageEmbed
                .setAuthor('COVID-19')
                .setTitle('List of top 9 countries')
                .setDescription('React to this message to choose the list you want')
                .addFields(
                    [
                        { name: '🅰', value: 'Active', inline: true },
                        { name: '😷', value: 'Confirmed', inline: true },
                        { name: '💀', value: 'Deaths', inline: true },
                        { name: '💪', value: 'Recovered', inline: true },
                    ]);
            const m = await message.channel.send(messageEmbed);
            m.react('🅰').then(() => m.react('😷')).then(() => m.react('💀')).then(() => m.react('💪'));
            const filter = (reaction, user) => {
                return (reaction.emoji.name === '🅰' || reaction.emoji.name === '😷' || reaction.emoji.name === '💀' || reaction.emoji.name === '💪') && user.id === message.author.id;
            };
            const collector = m.createReactionCollector(filter, { time: 20000 });
            collector.on('end', (collected, reason) => {
                if (reason !== 'Reaction collected') m.delete();
            });
            collector.on('collect', async (reaction, reactionCollector) => {
                try {
                    if (reaction.emoji.name === '🅰') {
                        type = 'active';
                    }
                    else if (reaction.emoji.name === '😷') {
                        type = 'confirmed';
                    }
                    else if (reaction.emoji.name === '💀') {
                        type = 'deaths';
                    }
                    else if (reaction.emoji.name === '💪') {
                        type = 'recovered';
                    }
                    else {
                        return;
                    }
                    collector.stop('Reaction collected');
                    // Modify embeds message to display top list;
                    const response = await axios.get('https://api.covid19api.com/summary');
                    const data = Object.values(response.data.Countries).sort(this.compare[type]).slice(0, 9);
                    const fields = [];
                    data.forEach((country, index) => {
                        fields.push({
                            name: `${index + 1}. :flag_${country.CountryCode.toLowerCase()}: ${country.Country}`,
                            value: this.getValue(country, type).toLocaleString(),
                            inline: true,
                        });
                    });

                    const canvasRenderService = new CanvasRenderService(500, 500);
                    const image = await canvasRenderService.renderToBuffer({
                        type: 'bar',
                        data: {
                            datasets: [{
                                label: type,
                                data: data.map(country => this.getValue(country, type)),
                                backgroundColor: [
                                    '#d70206',
                                    '#db1b1f',
                                    '#df3538',
                                    '#e34e51',
                                    '#e7676a',
                                    '#eb8183',
                                    '#ef9a9b',
                                    '#f3b3b4',
                                    '#f7cccd',
                                    '#fbe6e6',
                                ],
                                borderWidth: 0,
                            }],
                            labels: data.map(country => country.CountryCode),
                        },
                        options: {
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
                                }],
                                xAxes: [{
                                    ticks: {
                                        fontColor: '#988e99',
                                        fontSize: 18,
                                    },
                                }],
                            },
                        },
                    });
                    messageEmbed = new Discord.MessageEmbed().setColor('#DC143C');
                    const attachment = new Discord.MessageAttachment(image, 'top.png');
                    messageEmbed
                        .setAuthor('COVID-19')
                        .setTitle(`📊 Top 9 countries (${type.toLowerCase()})`)
                        .addFields(fields)
                        .setFooter('Last updated : ')
                        .attachFiles([attachment])
                        .setImage('attachment://top.png')
                        .setTimestamp(response.data.Date);
                    await m.delete();
                    await message.channel.send(messageEmbed);
                }
                catch (error) {
                    messageEmbed.setTitle('Error occured while getting data');
                    console.error(error);
                    await message.channel.send(messageEmbed);
                }
            });
        }
        catch (error) {
            messageEmbed.setTitle('Error occured while getting data');
            console.error(error);
            await message.channel.send(messageEmbed);
        }
    }
};