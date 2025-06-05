-- SQLite version of your schema for reference (not executable by Node, but for DB tools)

-- Technician login table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Insert a technician
INSERT INTO users (username, password) VALUES ('tech1', '1234');


-- Maintenance checklist records (updated for full-stack app)
CREATE TABLE checklists (
  checklistId INT IDENTITY(1,1) PRIMARY KEY, -- Unique checklist ID
  unitId INT,
  tenantName NVARCHAR(100),
  contractNo NVARCHAR(50),
  startDate DATE,
  endDate DATE,
  visitType NVARCHAR(50),
  equipment NVARCHAR(MAX),
  signature NVARCHAR(MAX),
  created_at DATETIME DEFAULT GETDATE()
);
