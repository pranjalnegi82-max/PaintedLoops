const test = require('node:test');
const assert = require('node:assert/strict');
const dbOptions = require('../config/dbOptions');

test('local MySQL remains usable without SSL', () => {
  const options = dbOptions({DB_HOST:'localhost',DB_PASSWORD:' a password '});
  assert.equal(options.ssl,undefined);
  assert.equal(options.port,3306);
  assert.equal(options.password,' a password ');
});
test('Aiven uses the provided port and verifies the CA and hostname', () => {
  const options = dbOptions({DB_HOST:'example.aivencloud.com',DB_PORT:'10761',DB_USER:'avnadmin',DB_NAME:'defaultdb',DB_SSL:'true',DB_SSL_CA:'line1\\nline2'});
  assert.equal(options.host,'example.aivencloud.com');
  assert.equal(options.port,10761);
  assert.deepEqual(options.ssl,{ca:'line1\nline2',rejectUnauthorized:true,verifyIdentity:true});
});
test('a configured CA cannot silently fall back to plaintext', () => {
  assert.equal(dbOptions({DB_SSL_CA:'certificate',DB_SSL:'false'}).ssl.rejectUnauthorized,true);
});
test('bad ports, misspelled SSL flags and missing CA fail early', () => {
  for (const value of ['bad','0','65536','3.5']) assert.throws(()=>dbOptions({DB_PORT:value}),/DB_PORT/);
  assert.throws(()=>dbOptions({DB_SSL:'required'}),/DB_SSL/);
  assert.throws(()=>dbOptions({DB_SSL:'true'}),/DB_SSL_CA/);
});
