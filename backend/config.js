const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const required = ['MONGODB_URI', 'TRELLO_KEY', 'TRELLO_TOKEN', 'TRELLO_SECRET', 'TRELLO_BOARD_ID', 'DISCORD_TOKEN', 'DISCORD_CHANNEL_ID', 'PUBLIC_URL'];
for (const k of required) {
  if (!process.env[k]) throw new Error(`Missing env var ${k} (see .env.example)`);
}


module.exports = {
  mongo: { uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB || 'trello_bot' },
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS) || 90,
  meetingDay: Number(process.env.MEETING_DAY ?? 1), // 0=Sun..6=Sat
  meetingHour: Number(process.env.MEETING_HOUR ?? 9), // local time
  doneListName: (process.env.DONE_LIST_NAME || 'Done').toLowerCase(),
  guildId: process.env.DISCORD_GUILD_ID || '',
  docsChannelId: process.env.DOCS_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID,
  port: Number(process.env.PORT) || 3000,
  trello: {
    key: process.env.TRELLO_KEY,
    token: process.env.TRELLO_TOKEN,
    secret: process.env.TRELLO_SECRET,
    boardId: process.env.TRELLO_BOARD_ID,
  },
  publicUrl: process.env.PUBLIC_URL.replace(/\/$/, ''),
  reviewListName: (process.env.REVIEW_LIST_NAME || 'Review').toLowerCase(),
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
  },
  dueSoonHours: Number(process.env.DUE_SOON_HOURS) || 24,
  checkIntervalMin: Number(process.env.CHECK_INTERVAL_MIN) || 30,
};
