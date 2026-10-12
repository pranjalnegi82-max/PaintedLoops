const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const serveFrontend = require('../utils/serveFrontend');

test('production hosting preserves API 404s and serves React deep links', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paintedloops-hosting-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>PaintedLoops</title>');
  fs.writeFileSync(path.join(dir, 'assets', 'app-hash.js'), '/* build */');
  const app = express();
  app.get('/healthz', (_req,res) => res.json({success:true}));
  app.get('/api/products', (_req,res) => res.json({products:[]}));
  serveFrontend(app,dir);
  app.use((_req,res) => res.status(404).json({success:false}));
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/shop', '/product/lavender-crochet-bow-clip', '/account', '/orders/22']) {
      const result = await fetch(base+route);
      assert.equal(result.status,200);
      assert.match(result.headers.get('content-type'),/text\/html/);
      assert.equal(result.headers.get('cache-control'),'no-cache');
    }
    for (const route of ['/api/missing','/uploads/missing.jpg','/products/missing.jpg','/assets/missing.js']) {
      const result = await fetch(base+route);
      assert.equal(result.status,404,route);
      assert.equal((await result.json()).success,false);
    }
    assert.equal((await (await fetch(base+'/healthz')).json()).success,true);
    assert.deepEqual((await (await fetch(base+'/api/products')).json()).products,[]);
    assert.match((await fetch(base+'/assets/app-hash.js')).headers.get('cache-control'),/immutable/);
  } finally {await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});
