const router = require('express').Router();
const verify = require('../middlewares/verifyTrello');
const ctrl = require('../controllers/trelloController');

// Trello sends HEAD to validate the callback URL when creating a webhook.
router.head('/trello', (req, res) => res.sendStatus(200));
router.post('/trello', verify, ctrl.webhook);

module.exports = router;
