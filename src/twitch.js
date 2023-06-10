require('dotenv').config({ path: '../.env' });
const { getTwitchAccessToken } = require('@jlengstorf/get-twitch-oauth');
const fetch = require('node-fetch');
const fs = require('fs');

async function checkTwitchChannelStatus() {
  const { access_token } = await getTwitchAccessToken();

  const filePath = '../channelData.json';
  let channelData = {};

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    channelData = JSON.parse(fileContent);
  }

  if (!channelData.twitchURL) {
    console.log('Twitch URL not set in channelData.json.');
    return null;
  }

  const channelURL = channelData.twitchURL;
  const channelName = extractTwitchUsernameFromURL(channelURL);

  if (!channelName) {
    console.log('Invalid Twitch URL in channelData.json.');
    return null;
  }

  channelData.twitchName = channelName; // Store the Twitch username

  try {
    const userId = await getUserId(channelName, access_token);
    const stream = await getStreamByUserId(userId, access_token);

    if (stream) {
      console.log(`${stream.user_name} is live on Twitch.`);
      stream.profile_image_url = await getProfilePicture(userId, access_token);
      return stream; // Return the stream object if the channel is live
    } else {
      console.log(`${channelName} is not live on Twitch.`);
      return null; // Return null if the channel is not live
    }
  } catch (error) {
    console.error('Error checking Twitch channel status:', error);
    return null; // Return null if an error occurred
  } finally {
    fs.writeFileSync(filePath, JSON.stringify(channelData, null, 2)); // Update channelData.json with the Twitch username
    console.log(`Updated ${filePath}`);
  }
}

function extractTwitchUsernameFromURL(url) {
  const regex = /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getUserId(username, access_token) {
  const url = `https://api.twitch.tv/helix/users?login=${username}`;

  const response = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to retrieve Twitch user ID.');
  }

  if (data.data.length === 0) {
    throw new Error(`Twitch user not found: ${username}`);
  }

  return data.data[0].id;
}

async function getStreamByUserId(userId, access_token) {
  const url = `https://api.twitch.tv/helix/streams?user_id=${userId}`;

  const response = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to retrieve Twitch stream data.');
  }

  const streamData = data.data[0] || null;

  if (streamData) {
    const gameData = await getGameData(streamData.game_id, access_token);
    streamData.game_name = gameData.name || null;
  }

  return streamData;
}

async function getGameData(gameId, access_token) {
  const url = `https://api.twitch.tv/helix/games?id=${gameId}`;

  const response = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to retrieve Twitch game data.');
  }

  return data.data[0] || null;
}

async function getProfilePicture(userId, access_token) {
  const url = `https://api.twitch.tv/helix/users?id=${userId}`;

  const response = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to retrieve Twitch user data.');
  }

  return data.data[0].profile_image_url || null;
}

module.exports = { checkTwitchChannelStatus };
