const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function serveFrontend(app, dist) {
  const index = path.join(dist, 'index.html');
  if (!fs.existsSync(index)) return;
  app.use(express.static(dist, {
    setHeaders(res, file) {
      // Vite assets have content hashes. HTML must refresh after deployment.
      res.setHeader('Cache-Control', file.startsWith(path.join(dist, 'assets') + path.sep)
        ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
  app.get('*', (req, res, next) => {
    // Missing API/media paths must stay 404s, never become HTML responses.
    if (/^\/(api|uploads|products|assets)(\/|$)/.test(req.path) || path.extname(req.path)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(index);
  });
};
