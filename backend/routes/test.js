const express = require('express');
const router = express.Router();
const { connect } = require('../db');

router.get('/testconnection', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT 1 AS test');
    res.json({ success: true, message: 'Database connection successful', result: result.recordset });
  } catch (err) {
    console.error('Database connection test failed:', err);
    res.status(500).json({ success: false, message: 'Database connection failed', error: err.message });
  }
});

module.exports = router;