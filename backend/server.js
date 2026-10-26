const config = require('./config');
const app = require('./app');
const discord = require('./services/discord');
const trello = require('./services/trello');
const scheduler = require('./services/scheduler');
const logger = require('./services/logger');
const db = require('./services/db');
const settings = require('./services/settings');

(async () => {
  await db.connect();
  if (!(await settings.init())) logger.warn('system', 'auth', 'Chưa có mật khẩu portal. Chạy: node scripts/set-password.js <mật khẩu>');
  await discord.start();
  await new Promise((r) => app.listen(config.port, r));
  logger.info('system', 'start', `Listening on :${config.port}`);
  if (await trello.ensureWebhook()) logger.info('system', 'webhook', 'Trello webhook registered'); // needs the server up
  scheduler.start();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
