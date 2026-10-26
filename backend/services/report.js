const config = require('../config');
const trello = require('./trello');
const discord = require('./discord');
const db = require('./db');
const logger = require('./logger');

const DAY = 24 * 3600 * 1000;
const bar = (pct) => '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));

// Tick dueComplete on cards sitting in Done that still show as incomplete.
async function tickDoneCards() {
  const [cards, doneId] = await Promise.all([trello.getBoardCards(), trello.findListId(config.doneListName)]);
  if (!doneId) {
    logger.warn('cron', 'tick-done', `List "${config.doneListName}" not found`);
    return [];
  }
  const todo = cards.filter((c) => c.idList === doneId && c.due && !c.dueComplete);
  for (const c of todo) {
    await trello.setDueComplete(c.id, true);
    logger.info('cron', 'tick-done', `Ticked complete: ${c.name}`, { cardId: c.id });
  }
  return todo;
}

// Build progress for the week ending now.
async function buildReport() {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * DAY);
  const [cards, lists] = await Promise.all([trello.getBoardCards(), trello.getBoardLists()]);
  const doneId = lists.find((l) => l.name.toLowerCase() === config.doneListName)?.id;
  const listName = Object.fromEntries(lists.map((l) => [l.id, l.name]));
  const tracked = cards.filter((c) => listName[c.idList] !== 'Trello Starter Guide');
  const done = tracked.filter((c) => c.idList === doneId);
  const doneThisWeek = done.filter((c) => new Date(c.dateLastActivity) >= weekStart);
  const overdue = tracked.filter((c) => c.idList !== doneId && c.due && !c.dueComplete && new Date(c.due) < now);
  const progress = tracked.length ? Math.round((done.length / tracked.length) * 100) : 0;

  const byList = lists
    .map((l) => ({ name: l.name, n: tracked.filter((c) => c.idList === l.id).length }))
    .filter((x) => x.n);

  const lines = [
    `Tiến độ tổng: ${bar(progress)} ${progress}% (${done.length}/${tracked.length} task)`,
    '',
    `Hoàn thành tuần qua (${doneThisWeek.length}):`,
    ...(doneThisWeek.length ? doneThisWeek.map((c) => `- ${c.name}`) : ['- (chưa có)']),
    '',
    `Quá hạn (${overdue.length}):`,
    ...(overdue.length ? overdue.map((c) => `- ${c.name}`) : ['- (không có)']),
    '',
    `Phân bố: ${byList.map((x) => `${x.name} ${x.n}`).join(' | ')}`,
  ];
  return { weekStart, weekEnd: now, progress, summary: lines.join('\n') };
}

// Next meeting slot in local time.
function nextMeeting() {
  const d = new Date();
  d.setHours(config.meetingHour, 0, 0, 0);
  let add = (config.meetingDay - d.getDay() + 7) % 7;
  if (add === 0 && d <= new Date()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

// Run the full weekly flow: tick Done cards, build report, post it, schedule the meeting.
async function runWeekly() {
  const ticked = await tickDoneCards();
  const r = await buildReport();
  const start = nextMeeting();
  const end = new Date(start.getTime() + 3600 * 1000);

  let eventId = null;
  if (config.guildId) {
    try {
      const ev = await discord.createMeetingEvent({
        name: `Họp tiến độ tuần - ${r.progress}%`,
        description: r.summary,
        start, end,
        location: 'Discord / họp nhóm',
      });
      eventId = ev.id;
    } catch (e) {
      logger.error('report', 'meeting-event', e.message);
    }
  }

  await db.col('reports').insertOne({
    week_start: r.weekStart, week_end: r.weekEnd, summary: r.summary, progress: r.progress, event_id: eventId, created_at: new Date(),
  });
  await discord.sendText(`**Báo cáo tiến độ tuần**\n\`\`\`\n${r.summary}\n\`\`\`\nLịch họp: <t:${Math.floor(start / 1000)}:F>`);
  logger.info('report', 'weekly', `Report posted, progress ${r.progress}%`, { ticked: ticked.length, eventId });
  return { ...r, ticked: ticked.length, eventId, meeting: start };
}

module.exports = { tickDoneCards, buildReport, runWeekly, nextMeeting };
