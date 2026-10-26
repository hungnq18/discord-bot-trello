const config = require('../config');

const BASE = 'https://api.trello.com/1';
const auth = () => `key=${config.trello.key}&token=${config.trello.token}`;

async function api(path, { method = 'GET', query = '' } = {}) {
  const res = await fetch(`${BASE}${path}?${auth()}${query}`, { method });
  if (!res.ok) throw new Error(`Trello ${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const callbackURL = () => `${config.publicUrl}/webhook/trello`;
const enc = encodeURIComponent;

// Create the board webhook if it doesn't exist yet.
async function ensureWebhook() {
  const hooks = await api(`/tokens/${config.trello.token}/webhooks`);
  const exists = hooks.some((h) => h.idModel === config.trello.boardId && h.callbackURL === callbackURL());
  if (exists) return false;
  await api('/webhooks', {
    method: 'POST',
    query: `&callbackURL=${enc(callbackURL())}&idModel=${config.trello.boardId}`,
  });
  return true;
}

// Open cards on the board, with members.
function getBoardCards() {
  return api(`/boards/${config.trello.boardId}/cards`, {
    query: '&filter=open&fields=name,due,dueComplete,url,idList,idMembers,dateLastActivity&members=true&member_fields=fullName',
  });
}

function getBoardLists() {
  return api(`/boards/${config.trello.boardId}/lists`, { query: '&fields=name' });
}

function getBoardMembers() {
  return api(`/boards/${config.trello.boardId}/members`, { query: '&fields=fullName,username' });
}

async function findListId(name) {
  const lists = await getBoardLists();
  return lists.find((l) => l.name.toLowerCase() === name.toLowerCase())?.id;
}

// Quick-create a card. opts: { name, desc, listId, due (ISO), memberIds[] }
function createCard({ name, desc, listId, due, memberIds = [] }) {
  let q = `&idList=${listId}&name=${enc(name)}`;
  if (desc) q += `&desc=${enc(desc)}`;
  if (due) q += `&due=${enc(due)}`;
  if (memberIds.length) q += `&idMembers=${memberIds.join(',')}`;
  return api('/cards', { method: 'POST', query: q });
}

function setDueComplete(cardId, complete = true) {
  return api(`/cards/${cardId}`, { method: 'PUT', query: `&dueComplete=${complete}` });
}

module.exports = {
  ensureWebhook, getBoardCards, getBoardLists, getBoardMembers,
  findListId, createCard, setDueComplete, callbackURL,
};
