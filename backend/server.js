const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { connect } = require('./db');
const sql = require('mssql');
const app = express();

app.use(cors());
app.use(express.json());
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Get all buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT id, name FROM buildings ORDER BY name');
    res.json({ success: true, buildings: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get units by building id
app.get('/api/units', async (req, res) => {
  const buildingId = req.query.buildingId;
  if (!buildingId) return res.status(400).json({ success: false, error: 'Missing buildingId' });
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('buildingId', sql.Int, buildingId)
      .query('SELECT id, flat_no FROM units WHERE building_id = @buildingId ORDER BY flat_no');
    res.json({ success: true, units: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get tenant name, contract no, start date, and end date by unit id (from contracts table)
app.get('/api/tenant', async (req, res) => {
  const unitId = req.query.unitId;
  if (!unitId) return res.status(400).json({ success: false, error: 'Missing unitId' });
  try {
    const pool = await connect();
    // Get the latest contract for the unit (assuming latest by start_date)
    const result = await pool.request()
      .input('unitId', sql.Int, unitId)
      .query(`
        SELECT TOP 1 tenant_name, contract_no, start_date, end_date
        FROM contracts
        WHERE unit_id = @unitId
        ORDER BY start_date DESC, id DESC
      `);
    if (result.recordset.length > 0) {
      const c = result.recordset[0];
      res.json({
        success: true,
        tenantName: c.tenant_name,
        contractNo: c.contract_no,
        startDate: c.start_date,
        endDate: c.end_date
      });
    } else {
      res.json({ success: false, tenantName: '', contractNo: '', startDate: '', endDate: '' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test endpoint
app.get('/test', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT name FROM sys.tables');
    const tableNames = result.recordset.map(row => row.name);
    res.json({
      success: true,
      message: 'Database connection successful',
      tables: tableNames
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .input('password', sql.NVarChar(50), password)
      .query('SELECT * FROM users WHERE username=@username AND password=@password');
    if (result.recordset.length > 0) res.json({ success: true });
    else res.json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get equipment list from master table
app.get('/api/equipment', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT id, name FROM equipment_master ORDER BY id');
    res.json({ success: true, equipment: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit checklist
// Submit checklist with dynamic equipment
app.post('/api/submit-checklist', async (req, res) => {
  const { unitId, tenantName, contractNo, startDate, endDate, visitType, equipment, signature } = req.body;
  try {
    const pool = await connect();
    // Store equipment as JSON string
    await pool.request()
      .input('unitId', sql.Int, unitId)
      .input('tenantName', sql.NVarChar(100), tenantName)
      .input('contractNo', sql.NVarChar(50), contractNo)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .input('visitType', sql.NVarChar(50), visitType)
      .input('equipment', sql.NVarChar(sql.MAX), JSON.stringify(equipment))
      .input('signature', sql.NVarChar(sql.MAX), signature)
      .query(`INSERT INTO checklists (unitId, tenantName, contractNo, startDate, endDate, visitType, equipment, signature)
        VALUES (@unitId, @tenantName, @contractNo, @startDate, @endDate, @visitType, @equipment, @signature)`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//app.listen(5000, () => console.log('Server running on port 5000'));
// db.serialize(() => {

// Create tables if not exist (run once at server start)
// async function ensureTables() {
//   const pool = await connect();
//   // Users table
//   await pool.request().query(`
//     IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
//     CREATE TABLE users (
//       id INT IDENTITY(1,1) PRIMARY KEY,
//       username NVARCHAR(50) NOT NULL UNIQUE,
//       password NVARCHAR(50) NOT NULL
//     )
//   `);
//   // Insert default user if not exists
//   await pool.request().query(`
//     IF NOT EXISTS (SELECT * FROM users WHERE username = 'tech1')
//     INSERT INTO users (username, password) VALUES ('tech1', '1234')
//   `);
//   // Checklists table
//   await pool.request().query(`
//     IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='checklists' AND xtype='U')
//     CREATE TABLE checklists (
//       id INT IDENTITY(1,1) PRIMARY KEY,
//       flatNo NVARCHAR(50) NOT NULL,
//       tenantName NVARCHAR(100) NOT NULL,
//       visitType NVARCHAR(50) NOT NULL,
//       ac NVARCHAR(10) NOT NULL,
//       lights NVARCHAR(10) NOT NULL,
//       heater NVARCHAR(10) NOT NULL,
//       signature NVARCHAR(MAX) NOT NULL,
//       created_at DATETIME DEFAULT GETDATE()
//     )
//   `);
// }

// ensureTables().catch(console.error);


// Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await connect();
    const result = await pool.request()
      .input('username', sql.NVarChar(50), username)
      .input('password', sql.NVarChar(50), password)
      .query('SELECT * FROM users WHERE username=@username AND password=@password');
    if (result.recordset.length > 0) res.json({ success: true });
    else res.json({ success: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit checklist
// Submit checklist with dynamic equipment
app.post('/api/submit-checklist', async (req, res) => {
  const { unitId, tenantName, contractNo, startDate, endDate, visitType, equipment, signature } = req.body;
  try {
    const pool = await connect();
    // Store equipment as JSON string
    await pool.request()
      .input('unitId', sql.Int, unitId)
      .input('tenantName', sql.NVarChar(100), tenantName)
      .input('contractNo', sql.NVarChar(50), contractNo)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .input('visitType', sql.NVarChar(50), visitType)
      .input('equipment', sql.NVarChar(sql.MAX), JSON.stringify(equipment))
      .input('signature', sql.NVarChar(sql.MAX), signature)
      .query(`INSERT INTO checklists (unitId, tenantName, contractNo, startDate, endDate, visitType, equipment, signature)
        VALUES (@unitId, @tenantName, @contractNo, @startDate, @endDate, @visitType, @equipment, @signature)`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, '0.0.0.0', () => console.log('Server running on port 0.0.0.0:5000'));
