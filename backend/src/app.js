const express = require('express');
const cors    = require('cors');

const routes = require('./routes/index');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Todas las rutas centralizadas
app.use('/api', routes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = app;