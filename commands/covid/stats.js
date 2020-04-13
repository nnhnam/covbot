const { Command } = require('discord.js-commando');
const Discord = require('discord.js');
const axios = require('axios').default;
const FuzzySet = require('fuzzyset.js');

module.exports = class Stats extends Command {
	constructor(client) {
		super(client, {
			name: 'stats',
			aliases: ['stats'],
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
        .then((response) => {
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
                messageEmbed
                    .setTitle('COVID-19 stats')
                    .setDescription(`${data.CountryCode ? ':flag_' + data.CountryCode.toLowerCase() + ':' : ':united_nations:'}  ${countryName}`)
                    .addFields(
                        { name: 'Total Confirmed', value: `${data.TotalConfirmed}`, inline: true },
                        { name: 'Total Deaths', value: `${data.TotalDeaths}`, inline: true },
                        { name: 'Total Recovered', value: `${data.TotalRecovered}`, inline: true },
                        { name: 'New Confirmed', value: `${data.NewConfirmed}`, inline: true },
                        { name: 'New Deaths', value: `${data.NewDeaths}`, inline: true },
                        { name: 'New Recovered', value: `${data.NewRecovered}`, inline: true },
                    )
                    .setFooter('Last updated : ')
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