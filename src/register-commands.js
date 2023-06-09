const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'setlivechannel',
    description: 'Sets the channel where the Twitch live announcement will be made',
    options: [
      {
        name: 'channel',
        description: 'The channel to set as the live announcement channel',
        type: 7,
        required: true,
      },
    ],
  },
  {
    name: 'settwitchchannel',
    description: 'Twitch channel to announce, use full URL. EG. https://www.twitch.tv/you',
    options: [
      {
        name: 'url',
        description: 'The URL of the Twitch channel',
        type: 3,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerSlashCommands() {
  try {
    console.log('Registering slash commands.');

    await rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, process.env.GUILDID), { body: commands });

    console.log('Slash commands have been registered.');
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
}

module.exports = { registerSlashCommands };
