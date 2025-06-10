// backend/db.js
require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // Set to true if using Azure
    trustServerCertificate: true // For local dev
  }
};

async function connect() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('SQL Connection Error:', err.message);
    throw err;
  }
}

module.exports = { connect };
