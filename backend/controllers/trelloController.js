const config = require('../config');
const discord = require('../services/discord');
const { say } = require('../services/messages');
const logger = require('../services/logger');

const fmtDue = (d) => `<t:${Math.floor(new Date(d).getTime() / 1000)}:F>`;

async function handle(action) {
  const { type, data, memberCreator } = action;
  const by = memberCreator?.fullName || 'Ai đó';
  const card = data.card && { ...data.card, url: `https://trello.com/c/${data.card.shortLink}` };
  if (card) logger.info('trello', type, `${card.name} (by ${by})`, { cardId: card.id });

  switch (type) {
    case 'createCard':
      return discord.send({ type: 'created', card, ...say('created', { by, list: data.list?.name }) });

    case 'addMemberToCard':
      return discord.send({
        type: 'assigned', card,
        ...say('assigned', { by, who: action.member?.fullName || 'Một thành viên' }),
      });

    case 'updateCard':
      // Moved into the review list
      if (data.listAfter && data.listAfter.name.toLowerCase() === config.reviewListName) {
        return discord.send({
          type: 'review', card,
          ...say('review', { by, from: data.listBefore?.name, to: data.listAfter.name }),
        });
      }
      // Due date changed
      if (data.old && 'due' in data.old && data.card.due) {
        return discord.send({
          type: 'dueSoon', card,
          ...say('dueChanged', { by, due: fmtDue(data.card.due) }),
        });
      }
  }
}

exports.webhook = (req, res) => {
  res.sendStatus(200); // ack fast; Trello retries on slow replies
  const action = req.body?.action;
  if (!action) return;
  handle(action).catch((e) => logger.error('trello', 'webhook', e.message));
};
