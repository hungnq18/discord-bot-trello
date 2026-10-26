const crypto = require('crypto');
const config = require('../config');
const { callbackURL } = require('../services/trello');

// Trello signs: base64(HMAC-SHA1(secret, rawBody + callbackURL))
module.exports = (req, res, next) => {
  const expected = crypto
    .createHmac('sha1', config.trello.secret)
    .update(req.rawBody + callbackURL())
    .digest('base64');
  const got = req.get('x-trello-webhook') || '';
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.sendStatus(401);
  next();
};
