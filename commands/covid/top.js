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
            description: 'List of top 9 countries. Type must be one of [active, confirmed, deaths, recovered]',
            throttling: {
                usages: 1,
                duration: 3,
            },
            args: [
                {
                    key: 'type',
                    prompt: 'Specify one of the types : [active, confirmed, deaths, recovered]',
                    type: 'string',
                },
            ],
        });
        this.compare = {
            'active': (a, b) => (b.total_active_cases) - (a.total_active_cases),
            'confirmed': (a, b) => (b.total_cases) - (a.total_cases),
            'deaths': (a, b) => (b.total_deaths) - (a.total_deaths),
            'recovered': (a, b) => (b.total_recovered) - (a.total_recovered),
        };
    }

    getValue(country, type) {
        switch (type) {
            case 'active': return country.total_active_cases;
            case 'confirmed': return country.total_cases;
            case 'deaths': return country.total_deaths;
            case 'recovered': return country.total_recovered;
        }
    }

    async run(message, { type }) {
        if (['active', 'confirmed', 'deaths', 'recovered'].indexOf(type.toLowerCase()) === -1) type = 'active';
        else type = type.toLowerCase();
        const messageEmbed = new Discord.MessageEmbed().setColor('#DC143C');
        try {
            const response = await axios.get('https://api.thevirustracker.com/free-api?countryTotals=ALL');
            const data = Object.values(response.data.countryitems[0]).sort(this.compare[type]).slice(0, 9);
            const fields = [];
            data.forEach((country, index) => {
                fields.push({
                    name: `${index + 1}. :flag_${country.code.toLowerCase()}: ${country.title}`,
                    value: this.getValue(country, type),
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
                    labels: data.map(country => country.code),
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
            const attachment = new Discord.MessageAttachment(image, 'top.png');
            messageEmbed
                .setAuthor('COVID-19')
                .setTitle(`📊 Top 9 countries (${type.toLowerCase()})`)
                .addFields(fields)
                .setFooter('Last updated : ')
                .attachFiles([attachment])
                .setImage('attachment://top.png')
                .setTimestamp(response.data.Date);
        }
        catch (error) {
            messageEmbed.setTitle('Error occured while getting data');
            console.error(error);
        }
        return message.embed(messageEmbed);
    }
};