const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const trelloRoutes = require('./routes/trello');
const portalRoutes = require('./routes/portal');

const app = express();
app.use(helmet());
// keep raw body for Trello signature verification
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.get('/health', (_req, res) => res.send('ok'));
app.use('/webhook', trelloRoutes);
app.use('/api', portalRoutes);

// Serve the built React portal (frontend/dist) when present; in dev run the frontend dev server.
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|webhook).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

module.exports = app;
