const nodemailer = require('nodemailer');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('mssql');
const app = express();
const session = require('express-session');

require('dotenv').config();

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(session({
  secret: 'your-secret-key', // Change this to a strong secret in .env in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if your app uses HTTPS
}));

// Import routes
const authRoutes = require('./routes/auth');
const loginRoutes = require('./routes/login');
const testRoutes = require('./routes/test');


// Use routes with a prefix
app.use('/api/auth', authRoutes);
app.use('/api/login', loginRoutes);
app.use('/api/test', testRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
