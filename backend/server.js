// Only require nodemailer and crypto once at the top of the file
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory as Buffer

// Utility to decrypt password (simple AES for demonstration)
function decryptPassword(encrypted, key) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.alloc(16, 0));
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- Express app and middleware setup (only once, at the top) ---
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connect } = require('./db');
const sql = require('mssql');



require('dotenv').config();
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

app.get('/testconnection', async (req, res) => {
  try {
    const pool = await connect();
    const result = await pool.request().query('SELECT 1 AS test');
    res.json({ success: true, message: 'Database connection successful', result: result.recordset });
  } catch (err) {
    console.error('Database connection test failed:', err);
    res.status(500).json({ success: false, message: 'Database connection failed', error: err.message });
  }
});

// API to send checklist PDF to tenant
app.post('/api/send-report', async (req, res) => {
  // Debug log for incoming request body
  // console.log('POST /api/send-report body:', req.body);
  const pdfBase64 = req.body.pdfBase64;
  const contractId = req.body.contractId;
  const subject = req.body.subject;
  const text = req.body.text;

  // console.log(contractId)
  if (!pdfBase64 || typeof pdfBase64 !== 'string' || !pdfBase64.trim()) {
    return res.status(400).json({ success: false, error: 'Missing or invalid PDF data', received: req.body });
  }
  if (!contractId) {
    return res.status(400).json({ success: false, error: 'Missing contractId', received: req.body });
  }
  let pdfBuffer;
  try {
    pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error('Invalid PDF buffer');
    }
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Failed to decode PDF base64 data' });
  }
  try {
    await connect();
    // Get tenant email from contract and tenant master
    // const result = await sql.query`
    //   SELECT t.email
    //   FROM Contracts c
    //   JOIN Tenants t ON c.tenant_id = t.id
    //   WHERE c.id = ${contractId}
    // `;
    // if (!result.recordset.length || !result.recordset[0].email) {
    //   return res.status(400).json({ success: false, error: 'Tenant email not found for contract' });
    // }
    // const tenantEmail = result.recordset[0].email;
    // Store the encrypted password and key in env for security
    const user = process.env.MAIL_USER;
    const reciever = process.env.MAIL_USER_RECIEVER;
    const encryptedPass = process.env.MAIL_PASS_ENC;
    const key = process.env.MAIL_KEY;
    // console.log('MAIL_PASS_ENC:', encryptedPass, 'length:', encryptedPass ? encryptedPass.length : 0);
    // console.log('MAIL_KEY:', key, 'length:', key ? key.length : 0);
    try {
      const keyBuffer = Buffer.from(key, 'hex');
      // console.log('Buffer.from(key, "hex") length:', keyBuffer.length);
      const password = decryptPassword(encryptedPass, key);
      // continue as normal
      const transporter = nodemailer.createTransport({
        host: 'binshabibgroup.ae',
        port: 587,
        secure: false, // SSL
        auth: {
          user: user,
          pass: password
        }
      });
      await transporter.sendMail({
        from: user,
        to: reciever,
        subject: subject || 'Checklist Report',
        text: text || 'Please find attached your checklist report.',
        attachments: [
          {
            filename: 'Checklist_Report.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      res.json({ success: true });
      return;
    } catch (e) {
      console.log('MAIL_USER:', process.env.MAIL_USER);
      console.log('MAIL_PASS_ENC:', process.env.MAIL_PASS_ENC);
      console.log('MAIL_KEY:', process.env.MAIL_KEY);
      console.error('Decryption or mail config error:', e);
      return res.status(500).json({ success: false, error: 'Decryption or mail config error: ' + e.message });
    }
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get tenant and contract details for a unit
app.get('/api/unit-details', async (req, res) => {
  const { unit_id } = req.query;
  // console.log('Requested unit_id:', unit_id);
  try {
    await connect();
    // Get unit info and join to contract and tenant in one query
    const result = await sql.query`
      SELECT u.*, c.id AS contract_id, c.contract_no contract_number, c.start_date, c.end_date, c.tenant_id,
             t.id AS tenant_id, t.full_name, t.email, t.phone
      FROM Units u
      LEFT JOIN Contracts c ON u.flat_no = c.unit_id
      LEFT JOIN Tenants t ON c.tenant_id = t.id
      WHERE u.flat_no = ${unit_id}
    `;
    if (!result.recordset.length) return res.json({ tenant: null, contract: null });
    const row = result.recordset[0];
    // Compose contract and tenant objects for frontend
    let contract = null, tenant = null;
    if (row.contract_id) {
      contract = {
        id: row.contract_id,
        contract_number: row.contract_number,
        start_date: row.start_date,
        end_date: row.end_date,
        tenant_id: row.tenant_id
      };
    }
    if (row.tenant_id) {
      tenant = {
        id: row.tenant_id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone
      };
    }
    res.json({ tenant, contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get equipment master list
app.get('/api/equipment', async (req, res) => {
  const { buildingId, unitId } = req.query;
  if (!buildingId || !unitId) {
    return res.status(400).json({ success: false, error: 'Missing buildingId or unitId' });
  }
  try {
    await connect();
    const result = await sql.query`
      SELECT c.usec_name, b.susec_name
      FROM units a
      INNER JOIN SubUnitSection b ON a.purpose_type = b.code
      INNER JOIN UnitSection c ON b.usec_code = c.usec_code
      WHERE a.building_id = ${buildingId} AND a.flat_no = ${unitId}
    `;
    // Return both usec_name and susec_name for each equipment
    res.json({ success: true, equipment: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all buildings
app.get('/api/buildings', async (req, res) => {
  try {
    await connect();
    const result = await sql.query`SELECT id, name FROM Buildings ORDER BY name`;
    res.json({ success: true, buildings: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get units for a building
app.get('/api/units', async (req, res) => {
  // Accept both building_id and buildingId for compatibility
  const building_id = req.query.building_id || req.query.buildingId;
  // console.log('Requested building_id:', building_id);
  try {
    await connect();
    // Use correct column name for unit/flat number (now using 'flat_no')
    const result = await sql.query`
      SELECT flat_no
      FROM Units
      where building_id = ${building_id}
    `;
    res.json({ success: true, units: result.recordset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Get tenant and contract details for a unit (for checklist autofill)
app.get('/api/tenant', async (req, res) => {
  const unitId = req.query.unitId;
  const buildingId = req.query.buildingId;
  if (!unitId) return res.json({ success: false, error: 'Missing unitId' });
  // console.log('Requested building_id:', unitId);
  try {
    await connect();
    // Join all relevant tables and filter by unit and (optionally) building
    let result;
    if (buildingId) {
      result = await sql.query`
        SELECT 
          b.id AS building_id, b.name AS building_name, 
          u.flat_no AS unit_id,
          c.contract_no contract_number, c.start_date, c.end_date, 
          t.full_name AS tenant_name
        FROM Units u
        JOIN Buildings b ON u.building_id = b.id
        LEFT JOIN Contracts c ON u.flat_no = c.unit_id
        LEFT JOIN Tenants t ON c.tenant_id = t.id
        WHERE u.flat_no = ${unitId} AND b.id = ${buildingId}
      `;
    } else {
      result = await sql.query`
        SELECT 
          b.id AS building_id, b.name AS building_name, 
          u.flat_no AS unit_id,
          c.contract_no contract_number, c.start_date, c.end_date, 
          t.full_name AS tenant_name
        FROM Units u
        JOIN Buildings b ON u.building_id = b.id
        LEFT JOIN Contracts c ON u.flat_no = c.unit_id
        LEFT JOIN Tenants t ON c.tenant_id = t.id
        WHERE u.flat_no = ${unitId}
      `;
    }
    // console.log('API /api/tenant result:', result.recordset);
    if (!result.recordset.length) {
      return res.json({ success: false, error: 'No contract found for this unit/building' });
    }
    const { contract_number, contract_no, start_date, end_date, tenant_name } = result.recordset[0];
    res.json({
      success: true,
      tenantName: tenant_name || '',
      contractNo: contract_number || contract_no || '',
      startDate: start_date || '',
      endDate: end_date || ''
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Login endpoint using Users table
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  // console.log('Login request received:', { username, password });

  try {
    await connect();
    const trimmedUsername = username ? username.trim() : '';
    const trimmedPassword = password ? password.trim() : '';

    // Step 1: Authenticate user
    const userResult = await sql.query`
      SELECT * FROM tbluser 
      WHERE uname = ${trimmedUsername} AND 
      CAST(DECRYPTBYPASSPHRASE('I CANT TELL YOU', password) AS VARCHAR(8000)) = ${trimmedPassword}
    `;

    if (userResult.recordset.length === 0) {
      // console.log('Login failed: Invalid username or password.');
      return res.json({ success: false, message: 'Invalid username or password.' });
    }

    const user = userResult.recordset[0];
    // console.log('Login successful for user:', user);
    // console.log('Logged‑in user record:', user);
    // Step 2: Get module access based on roleid
    const accessResult = await sql.query`
      SELECT distinct(m.App_id)
      FROM role2 r2
      JOIN module m ON r2.module = m.module
      WHERE r2.roleid = ${user.roleid}
    `;

    const accessKeys = accessResult.recordset.map(row => row.App_id); // Example: ['MNT', 'TNT']

    // Step 3: Create JWT token
    const tokenPayload = {
      username: user.Uname,
      role: user.roleid,
      access: accessKeys,
    };
    //Expire account after 1 hour of inactivity then logs out automatically
    // const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
    const token = jwt.sign(tokenPayload, JWT_SECRET);

    // Step 4: Return response
    res.json({ success: true, token, username: user.Uname, role: user.roleid, access: accessKeys });

  } catch (err) {
    // console.error('Error during login:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/checklist', upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'videos', maxCount: 5 }
]), async (req, res) => {
  const { contract, visitType, equipment, tenantsignature, techniciansignature, date } = req.body;
  try {
    await connect();
    // Insert checklist and get its ID
    const checklistResult = await sql.query`
      INSERT INTO checklists (contract_id, visitType, equipment, techsignature, tenantsignature, created_at)
      OUTPUT INSERTED.checklistid
      VALUES (${contract}, ${visitType}, ${equipment}, ${techniciansignature}, ${tenantsignature}, ${date})
    `;
    const checklistId = checklistResult.recordset[0].checklistid;

    // Save files in checklist_files table
    const files = [
      ...(req.files.images || []).map(f => ({ ...f, type: 'image' })),
      ...(req.files.videos || []).map(f => ({ ...f, type: 'video' }))
    ];
    for (const file of files) {
      await sql.query`
        INSERT INTO checklist_files (checklist_id, file_data, file_mime, file_name, file_type)
        VALUES (${checklistId}, ${file.buffer}, ${file.mimetype}, ${file.originalname}, ${file.type})
      `;
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate a professional report for a checklist
app.get('/api/report', async (req, res) => {
  const { checklist_id } = req.query;
  try {
    await connect();
    // Fetch checklist details
    const checklistResult = await sql.query`
        SELECT c.checklistid, b.name AS building_name, u.flat_no AS unit_name, t.full_name AS tenant_name,
       ct.contract_no AS contract_number, ct.start_date, ct.end_date, c.visitType, c.equipment, c.techsignature, c.tenantsignature, c.created_at date
FROM checklists c
JOIN Contracts ct ON c.contract_id = ct.id
JOIN Units u ON ct.unit_id = u.id
JOIN Buildings b ON u.building_id = b.id
LEFT JOIN Tenants t ON ct.tenant_id = t.id
      WHERE c.checklistid = ${checklist_id}
    `;

    if (!checklistResult.recordset.length) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const checklist = checklistResult.recordset[0];
    res.json({ checklist });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: err.message });
  }
});



// // Serve static files from the React app
// app.use(express.static(path.join(__dirname, '../test-app/dist')));

// // // Catch-all handler: for any request that doesn't match an API route, send back React's index.html
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../test-app/dist', 'index.html'));
// });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running`));
//  on port ${PORT}

