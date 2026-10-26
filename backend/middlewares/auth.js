const crypto = require('crypto');
const settings = require('../services/settings');

const COOKIE = 'portal_session';
const sign = (v) => crypto.createHmac('sha256', settings.getSecret()).update(v).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]));
}

function isAuthed(req) {
  const tok = parseCookies(req)[COOKIE];
  if (!tok) return false;
  const [exp, sig] = tok.split('.');
  return !!sig && Number(exp) > Date.now() && safeEq(sig, sign(exp));
}

async function login(req, res) {
  if (!(await settings.verifyPassword(req.body?.password || ''))) return false;
  const exp = String(Date.now() + 12 * 3600 * 1000);
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`);
  return true;
}

const logout = (res) => res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);

const requireAuth = (req, res, next) => (isAuthed(req) ? next() : res.status(401).json({ error: 'unauthorized' }));

module.exports = { login, logout, isAuthed, requireAuth };
