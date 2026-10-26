const multer = require('multer');
const router = require('express').Router();
const config = require('../config');
const db = require('../services/db');
const logger = require('../services/logger');
const trello = require('../services/trello');
const discord = require('../services/discord');
const report = require('../services/report');
const scheduler = require('../services/scheduler');
const docs = require('../services/docs');
const auth = require('../middlewares/auth');
const settings = require('../services/settings');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  if (e.status) return res.status(e.status).json({ error: e.message });
  logger.error('portal', req.method + ' ' + req.path, e.message);
  res.status(500).json({ error: e.message });
});

router.post('/login', wrap(async (req, res) => {
  if (!(await auth.login(req, res))) {
    logger.warn('portal', 'login-failed', `from ${req.ip}`);
    return res.status(401).json({ error: 'Sai mật khẩu' });
  }
  logger.info('portal', 'login', `from ${req.ip}`);
  res.json({ ok: true });
}));
router.post('/logout', (_req, res) => { auth.logout(res); res.json({ ok: true }); });
router.get('/session', (req, res) => res.json({ authed: auth.isAuthed(req) }));

router.use(auth.requireAuth);

router.post('/password', wrap(async (req, res) => {
  const { current, next } = req.body || {};
  if (!(await settings.verifyPassword(current || ''))) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
  await settings.setPassword(next || '');
  logger.warn('portal', 'password-changed', `from ${req.ip}`);
  res.json({ ok: true });
}));

// ---- Overview
router.get('/overview', wrap(async (_req, res) => {
  const [cards, lists] = await Promise.all([trello.getBoardCards(), trello.getBoardLists()]);
  const doneId = lists.find((l) => l.name.toLowerCase() === config.doneListName)?.id;
  const reviewId = lists.find((l) => l.name.toLowerCase() === config.reviewListName)?.id;
  const now = Date.now();
  const tracked = cards.filter((c) => lists.find((l) => l.id === c.idList)?.name !== 'Trello Starter Guide');
  const done = tracked.filter((c) => c.idList === doneId).length;
  res.json({
    total: tracked.length, done,
    review: tracked.filter((c) => c.idList === reviewId).length,
    overdue: tracked.filter((c) => c.idList !== doneId && c.due && !c.dueComplete && new Date(c.due) < now).length,
    progress: tracked.length ? Math.round((done / tracked.length) * 100) : 0,
    lists: lists.map((l) => ({ name: l.name, count: tracked.filter((c) => c.idList === l.id).length })),
    errors24h: await db.col('logs').countDocuments({ level: 'error', ts: { $gt: new Date(Date.now() - 86400000) } }),
  });
}));

// ---- Quick task
router.get('/meta', wrap(async (_req, res) => {
  const [lists, members] = await Promise.all([trello.getBoardLists(), trello.getBoardMembers()]);
  res.json({ lists, members });
}));
router.post('/tasks', wrap(async (req, res) => {
  const { name, desc, listId, due, memberIds } = req.body || {};
  if (!name?.trim() || !listId) return res.status(400).json({ error: 'Cần tên task và list' });
  const card = await trello.createCard({
    name: name.trim(), desc, listId, memberIds: memberIds || [],
    due: due ? new Date(due).toISOString() : undefined,
  });
  logger.info('portal', 'create-task', card.name, { cardId: card.id });
  res.json({ id: card.id, url: card.shortUrl });
}));

// ---- Logs
router.get('/logs', wrap(async (req, res) => {
  const { level, source, q, limit = 200, before } = req.query;
  const f = {};
  if (level) f.level = String(level);
  if (source) f.source = String(source);
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = [{ message: rx }, { event: rx }];
  }
  const oid = before && db.toObjectId(before);
  if (oid) f._id = { $lt: oid };
  const rows = await db.col('logs').find(f).sort({ _id: -1 }).limit(Math.min(Number(limit) || 200, 500)).toArray();
  res.json(rows.map(db.out));
}));
router.get('/logs/sources', wrap(async (_req, res) => res.json((await db.col('logs').distinct('source')).sort())));

// ---- Reports / actions
router.get('/reports', wrap(async (_req, res) => res.json((await db.col('reports').find().sort({ _id: -1 }).limit(20).toArray()).map(db.out))));
router.post('/actions/weekly-report', wrap(async (_req, res) => {
  logger.info('portal', 'action', 'weekly-report triggered manually');
  const r = await report.runWeekly();
  res.json({ progress: r.progress, ticked: r.ticked, eventId: r.eventId });
}));
router.post('/actions/tick-done', wrap(async (_req, res) => {
  const t = await report.tickDoneCards();
  res.json({ ticked: t.length });
}));
router.post('/actions/check-due', wrap(async (_req, res) => {
  res.json({ sent: await scheduler.checkDue() });
}));

// ---- Documents
router.get('/documents', wrap(async (_req, res) => res.json(await docs.listDocs())));
router.get('/documents/:id', wrap(async (req, res) => {
  const doc = await docs.getDoc(req.params.id);
  if (!doc) return res.sendStatus(404);
  res.json(doc);
}));
router.post('/documents', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Thiếu file' });
  const { docId, title, description, uploader, note } = req.body;
  res.json(await docs.saveUpload({ docId, title, description, file: req.file, uploader, note }));
}));
router.get('/documents/:id/download/:version', wrap(async (req, res) => {
  const v = await docs.getVersion(req.params.id, req.params.version);
  if (!v) return res.sendStatus(404);
  res.setHeader('Content-Type', v.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(v.filename)}`);
  docs.openDownload(v).on('error', () => res.destroy()).pipe(res);
}));
router.delete('/documents/:id', wrap(async (req, res) => {
  if (!(await docs.removeDoc(req.params.id))) return res.sendStatus(404);
  res.json({ ok: true });
}));

module.exports = router;
