// Usage: node scripts/set-password.js <password>
// Stores a hashed portal password in MongoDB (no env var needed).
const db = require('../services/db');
const settings = require('../services/settings');

(async () => {
  const pw = process.argv[2];
  if (!pw) { console.error('Usage: node scripts/set-password.js <password>'); process.exit(1); }
  await db.connect();
  await settings.init();
  await settings.setPassword(pw);
  console.log('Portal password updated.');
  await db.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
