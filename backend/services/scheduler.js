const config = require('../config');
const trello = require('./trello');
const discord = require('./discord');
const report = require('./report');
const db = require('./db');
const logger = require('./logger');
const { say } = require('./messages');

const HOUR = 3600 * 1000;
const people = (c) => (c.members?.length ? c.members.map((m) => m.fullName).join(', ') : 'Chưa ai nhận');
const dueTag = (d) => `<t:${Math.floor(new Date(d).getTime() / 1000)}:R>`;

// Atomically claim a dedupe key: true only for the first caller (unique _id makes a repeat insert fail).
async function claim(key) {
  try {
    await db.col('notified').insertOne({ _id: key, ts: new Date() });
    return true;
  } catch (e) {
    if (e.code === 11000) return false;
    throw e;
  }
}

async function checkDue() {
  const [cards, lists] = await Promise.all([trello.getBoardCards(), trello.getBoardLists()]);
  const reviewIds = new Set(lists.filter((l) => l.name.toLowerCase() === config.reviewListName).map((l) => l.id));
  const doneIds = new Set(lists.filter((l) => l.name.toLowerCase() === config.doneListName).map((l) => l.id));
  const now = Date.now();
  let sent = 0;

  for (const card of cards) {
    if (!card.due || card.dueComplete || doneIds.has(card.idList)) continue;
    const left = new Date(card.due).getTime() - now;
    const kind = left < 0 ? 'overdue' : left <= config.dueSoonHours * HOUR ? 'dueSoon' : null;
    if (!kind) continue;
    const key = `${card.id}|${card.due}|${kind}`;
    if (!(await claim(key))) continue;
    await discord.send({ type: kind, card, ...say(kind, { due: dueTag(card.due), people: people(card) }) });
    logger.info('cron', kind, card.name, { cardId: card.id });
    sent++;
  }

  const day = new Date().toISOString().slice(0, 10);
  const pending = cards.filter((c) => reviewIds.has(c.idList));
  const dkey = `review|${day}`;
  if (pending.length && (await claim(dkey))) {
    await discord.send({
      type: 'review',
      title: say('reviewDigest', { n: pending.length }).title,
      card: { name: 'Danh sách', url: `https://trello.com/b/${config.trello.boardId}` },
      description: pending.map((c) => `• [${c.name}](${c.url}) — ${people(c)}`).join('\n').slice(0, 4000),
    });
    logger.info('cron', 'review-digest', `${pending.length} task chờ review`);
    sent++;
  }
  return sent;
}

const safe = (name, fn) => () =>
  fn().catch((e) => logger.error('cron', name, e.message));

function start() {
  const due = safe('check-due', checkDue);
  due();
  setInterval(due, config.checkIntervalMin * 60 * 1000);

  // Tick Done cards hourly.
  const tick = safe('tick-done', report.tickDoneCards);
  setInterval(tick, HOUR);

  // Weekly report: check every 10 min whether the meeting slot's eve has come (once per ISO week).
  const weekly = safe('weekly', async () => {
    const n = new Date();
    if (n.getDay() !== config.meetingDay || n.getHours() < config.meetingHour - 1) return;
    const key = `weekly|${n.toISOString().slice(0, 10)}`;
    if (!(await claim(key))) return;
    await report.runWeekly();
  });
  setInterval(weekly, 10 * 60 * 1000);
  logger.info('cron', 'start', 'Schedulers started');
}

module.exports = { start, checkDue };
