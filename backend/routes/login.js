const express = require('express');
const router = express.Router();
const { connect } = require('../db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login request received:', { username, password });

  try {
    const pool = await connect();

    const trimmedUsername = username ? username.trim() : '';
    const trimmedPassword = password ? password.trim() : '';

    console.log('Trimmed credentials:', { username: trimmedUsername, password: trimmedPassword });

    const result = await pool.request()
      .input('username', trimmedUsername)
      .input('password', trimmedPassword)
      .query('SELECT * FROM Users WHERE username = @username AND password = @password');

    console.log('Query result:', result.recordset);

    if (result.recordset.length > 0) {
      console.log('Login successful for user:', result.recordset[0]);
      req.session.user = result.recordset[0]; // Save user info in session
      res.json({ success: true, user: result.recordset[0] });
    } else {
      console.log('Login failed: Invalid username or password.');
      res.json({ success: false, message: 'Invalid username or password.' });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
