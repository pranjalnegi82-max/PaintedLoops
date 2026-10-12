// No network calls here: configuration can be validated before opening the pool.
module.exports = function dbOptions(env = process.env) {
  const port = Number(env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT must be an integer between 1 and 65535.');
  const options = {
    host: (env.DB_HOST || 'localhost').trim(),
    port,
    user: (env.DB_USER || 'root').trim(),
    password: env.DB_PASSWORD || '',
    database: (env.DB_NAME || 'paintedloops_db').trim(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000,
    timezone: '+05:30',
  };
  const ssl = (env.DB_SSL || '').trim().toLowerCase();
  if (ssl && !['true','false','1','0'].includes(ssl)) throw new Error('DB_SSL must be true or false.');
  const ca = (env.DB_SSL_CA || '').replace(/\\n/g, '\n').trim();
  if (ssl === 'true' || ssl === '1' || ca) {
    if (!ca) throw new Error('DB_SSL_CA is required when DB_SSL is enabled. Paste the full Aiven CA certificate.');
    options.ssl = { ca, rejectUnauthorized: true, verifyIdentity: true };
  }
  return options;
};
