const db = require('./db');

function log(level, source, event, message, meta) {
  console[level === 'error' ? 'error' : 'log'](`[${level}] ${source}/${event} ${message || ''}`);
  // Fire-and-forget: logging must never break the caller.
  Promise.resolve()
    .then(() => db.col('logs').insertOne({ ts: new Date(), level, source, event, message: message ?? null, meta: meta ?? null }))
    .catch((e) => console.error('log write failed:', e.message));
}

module.exports = {
  info: (s, e, m, meta) => log('info', s, e, m, meta),
  warn: (s, e, m, meta) => log('warn', s, e, m, meta),
  error: (s, e, m, meta) => log('error', s, e, m, meta),
};
