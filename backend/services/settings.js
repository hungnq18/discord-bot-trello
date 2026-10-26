const crypto = require('crypto');
const { promisify } = require('util');
const db = require('./db');

const scrypt = promisify(crypto.scrypt);
const col = () => db.col('settings');
let secret;

const hash = async (pw) => {
  const salt = crypto.randomBytes(16);
  return `${salt.toString('hex')}:${(await scrypt(pw, salt, 64)).toString('hex')}`;
};

// Create the auth doc and a persistent session-signing secret (so sessions survive restarts).
// Returns whether a portal password has been set.
async function init() {
  await col().updateOne({ _id: 'auth' }, { $setOnInsert: { created_at: new Date() } }, { upsert: true });
  await col().updateOne({ _id: 'auth', secret: { $exists: false } }, { $set: { secret: crypto.randomBytes(32).toString('hex') } });
  const s = await col().findOne({ _id: 'auth' });
  secret = s.secret;
  return !!s.password_hash;
}

async function verifyPassword(pw) {
  const s = await col().findOne({ _id: 'auth' });
  if (!s?.password_hash) return false;
  const [salt, key] = s.password_hash.split(':');
  const got = await scrypt(String(pw), Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(got, Buffer.from(key, 'hex'));
}

async function setPassword(pw) {
  if (String(pw).length < 8) throw Object.assign(new Error('Mật khẩu tối thiểu 8 ký tự'), { status: 400 });
  await col().updateOne({ _id: 'auth' }, { $set: { password_hash: await hash(String(pw)), password_updated_at: new Date() } }, { upsert: true });
}

module.exports = { init, verifyPassword, setPassword, getSecret: () => secret };
