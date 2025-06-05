// backend/db.js
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, // Set to true if using Azure
    trustServerCertificate: true // For local dev
  }
};

async function connect() {
  try {
    if (!sql.pool) {
      await sql.connect(config);
    }
    return sql;
  } catch (err) {
    throw err;
  }
}

module.exports = { connect };
