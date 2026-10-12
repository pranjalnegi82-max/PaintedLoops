const mysql = require('mysql2/promise');
require('dotenv').config();
const dbOptions = require('./dbOptions');

const pool = mysql.createPool(dbOptions());

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    // Aggregate connection errors can have an empty message. Log codes, never credentials.
    const codes = [err.code, ...(err.errors || []).map(error => error.code)].filter(Boolean);
    console.error('❌ MySQL connection failed:', [...new Set(codes)].join(', ') || err.name || 'Unknown error');
    console.error('Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME and, for Aiven, DB_SSL / DB_SSL_CA.');
    process.exit(1);
  });

module.exports = pool;
