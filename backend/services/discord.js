const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const COLORS = { assigned: 0x2ecc71, created: 0x3498db, review: 0x9b59b6, dueSoon: 0xf39c12, overdue: 0xe74c3c };

async function start() {
  await client.login(config.discord.token);
  await new Promise((r) => (client.isReady() ? r() : client.once('clientReady', r)));
  console.log(`Discord bot logged in as ${client.user.tag}`);
}

async function send({ type, title, card, description, fields = [] }) {
  const channel = await client.channels.fetch(config.discord.channelId);
  const embed = new EmbedBuilder()
    .setColor(COLORS[type])
    .setTitle(`${title}: ${card.name}`.slice(0, 256))
    .setURL(card.url || card.shortUrl || null)
    .setTimestamp();
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  await channel.send({ embeds: [embed] });
}

async function sendText(content, channelId = config.discord.channelId) {
  const channel = await client.channels.fetch(channelId);
  return channel.send({ content });
}

// Weekly meeting as a Discord Scheduled Event (external, so no voice channel needed).
async function createMeetingEvent({ name, description, start, end, location }) {
  const guild = await client.guilds.fetch(config.guildId);
  const ev = await guild.scheduledEvents.create({
    name: name.slice(0, 100),
    description: description.slice(0, 1000),
    scheduledStartTime: start,
    scheduledEndTime: end,
    privacyLevel: 2, // GUILD_ONLY
    entityType: 3, // EXTERNAL
    entityMetadata: { location: location.slice(0, 100) },
  });
  return ev;
}

function guildMembers() {
  return client.guilds.fetch(config.guildId).then((g) => g.members.fetch());
}

module.exports = { client, start, send, sendText, createMeetingEvent, guildMembers };
