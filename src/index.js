require('dotenv').config({ path: '../.env' });

const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const Discord = require('discord.js');
const TwitchAPI = require('twitch-api');
const fs = require('fs');
const { checkTwitchChannelStatus } = require('./twitch');
const { registerSlashCommands } = require('./register-commands.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});
// On message
client.on('ready', () => {
  console.log(`🟢 ${client.user.tag} is now online.`);
});

// Run the registration once immediately
registerSlashCommands();

// Run the registration once every hour (in milliseconds)
const interval = 60 * 60 * 1000; // 1 hour
setInterval(registerSlashCommands, interval);

//Slash interactions

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'setlivechannel') {
    const channel = interaction.options.getChannel('channel');
    const channelID = channel.id;

    const filePath = '../channelData.json';
    let channelData = {};

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      channelData = JSON.parse(fileContent);
    }

    channelData.channelID = channelID;

    fs.writeFileSync(filePath, JSON.stringify(channelData, null, 2));
    console.log(`Updated ${filePath}`);

    await interaction.reply(`Live announcements will now be sent to channel: <#${channelID}>`);
  }

  if (interaction.commandName === 'settwitchchannel') {
    const url = interaction.options.getString('url');

    // Validate URL format
    const urlRegex = /^(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/;
    if (!urlRegex.test(url)) {
      await interaction.reply('Invalid URL format. Please provide a valid URL.');
      return;
    }

    // URL is valid, perform further actions

    const filePath = '../channelData.json';
    let channelData = {};

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      channelData = JSON.parse(fileContent);
    }

    channelData.twitchURL = url;

    fs.writeFileSync(filePath, JSON.stringify(channelData, null, 2));
    console.log(`Updated ${filePath}`);

    await interaction.reply(`Twitch channel URL set to: ${url}`);
  }
});

// Check Twitch channel status every minute
let isChannelOnline = false;

setInterval(async () => {
  const stream = await checkTwitchChannelStatus();
  const channelDataPath = '../channelData.json';
  const channelData = JSON.parse(fs.readFileSync(channelDataPath, 'utf-8'));

  const channelId = channelData.channelID;
  const channel = client.channels.cache.get(channelId);

  if (channel) {
    console.log('Channel found:', channel.name);

    if (stream) {
      const { user_name, game_name, title, thumbnail_url } = stream;

      if (!isChannelOnline) {
        console.log(`${user_name} is live on Twitch for the first time.`);
        isChannelOnline = true;
      } else {
        console.log(`${user_name} is still live on Twitch.`);
        return; // Skip sending the message if the channel is already online
      }

      console.log('Current game:', game_name);
      console.log('Title:', title);
      console.log('Thumbnail URL:', thumbnail_url);

      console.log('Sending message to channel:', channel.name);

      const twitchURL = channelData.twitchURL;

      const embed = new Discord.EmbedBuilder()
        .setTitle(user_name)
        .setURL(twitchURL)
        .addFields(
          { name: 'Twitch URL', value: twitchURL },
          { name: 'Title', value: title },
          { name: 'Game', value: game_name }
        )
        .setImage(thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
        .setTimestamp();

      const message = `@everyone ${user_name} is now live on Twitch!\n`;

      channel
        .send({ content: message, embeds: [embed] })
        .then(() => console.log('Message sent successfully.'))
        .catch((error) => console.error('Error sending message:', error));
    } else {
      if (isChannelOnline) {
        console.log('Channel is now offline on Twitch.');
        isChannelOnline = false;
      } else {
        console.log('Channel is still offline on Twitch.');
      }
    }
  } else {
    console.log('Channel not found.');
  }
}, 60000);

// Start the Discord bot
client.login(process.env.TOKEN);
