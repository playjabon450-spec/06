const express = require('express');
module.exports = (client, port) => {
  const app = express();
  app.get('/health', (_q, r) => r.status(client.isReady() ? 200 : 503).json({ ok: client.isReady(), ping: client.ws.ping }));
  app.listen(port, () => console.log('health on :' + port));
};
