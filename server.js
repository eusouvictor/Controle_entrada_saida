const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const dbDir = path.join(__dirname, 'database');
const dbPath = path.join(dbDir, 'app.db');

fs.mkdirSync(dbDir, { recursive: true });

app.use(express.json());
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

let db;

async function loadDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  return SQL;
}

function persistDatabase() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.run(...params);
      stmt.free();
      persistDatabase();
      resolve({ id: 0, changes: db.getRowsModified() });
    } catch (error) {
      reject(error);
    }
  });
}

function getRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
}

async function initializeDatabase() {
  await loadDatabase();

  await runQuery(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT 'domain'
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS supervisors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER,
      email TEXT,
      active INTEGER DEFAULT 1,
      FOREIGN KEY(department_id) REFERENCES departments(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cpf TEXT UNIQUE,
      department_id INTEGER,
      supervisor_id INTEGER,
      status TEXT DEFAULT 'ativo',
      FOREIGN KEY(department_id) REFERENCES departments(id),
      FOREIGN KEY(supervisor_id) REFERENCES supervisors(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS authorizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      supervisor_name TEXT NOT NULL,
      department_name TEXT NOT NULL,
      work_schedule TEXT,
      authorization_date TEXT,
      release_time TEXT,
      released_by TEXT,
      signature TEXT,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`INSERT OR IGNORE INTO departments (name, icon) VALUES ('Produção', 'domain')`);
  await runQuery(`INSERT OR IGNORE INTO departments (name, icon) VALUES ('Logística', 'warehouse')`);
  await runQuery(`INSERT OR IGNORE INTO departments (name, icon) VALUES ('Recursos Humanos', 'manage_accounts')`);

  await runQuery(`INSERT OR IGNORE INTO supervisors (name, department_id, email) VALUES ('Ricardo Lima', 1, 'ricardo@oggi.com')`);
  await runQuery(`INSERT OR IGNORE INTO supervisors (name, department_id, email) VALUES ('Ana Silva', 2, 'ana@oggi.com')`);

  await runQuery(`INSERT OR IGNORE INTO employees (name, cpf, department_id, supervisor_id, status) VALUES ('Ana Paula Silva', '111.111.111-11', 3, 1, 'ativo')`);
  await runQuery(`INSERT OR IGNORE INTO employees (name, cpf, department_id, supervisor_id, status) VALUES ('Marcos Oliveira', '222.222.222-22', 2, 2, 'ativo')`);
}

async function startServer() {
  await initializeDatabase();

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: dbPath });
  });

  app.get('/api/departments', async (req, res) => {
    try {
      const rows = await getRows('SELECT id, name, icon FROM departments ORDER BY name');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/departments', async (req, res) => {
    try {
      const { name, icon = 'domain' } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }
      const result = await runQuery('INSERT INTO departments (name, icon) VALUES (?, ?)', [name, icon]);
      res.status(201).json({ id: result.id, name, icon });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/supervisors', async (req, res) => {
    try {
      const rows = await getRows(`
        SELECT s.id, s.name, s.email, s.active, d.name as department_name
        FROM supervisors s
        LEFT JOIN departments d ON d.id = s.department_id
        ORDER BY s.name
      `);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/supervisors', async (req, res) => {
    try {
      const { name, departmentId, email } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }
      const result = await runQuery('INSERT INTO supervisors (name, department_id, email) VALUES (?, ?, ?)', [name, departmentId || null, email || '']);
      res.status(201).json({ id: result.id, name, departmentId, email });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/employees', async (req, res) => {
    try {
      const rows = await getRows(`
        SELECT e.id, e.name, e.cpf, e.status, d.name AS department_name, s.name AS supervisor_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        LEFT JOIN supervisors s ON s.id = e.supervisor_id
        ORDER BY e.name
      `);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/employees', async (req, res) => {
    try {
      const { name, cpf, departmentId, supervisorId, status = 'ativo' } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }
      const result = await runQuery('INSERT INTO employees (name, cpf, department_id, supervisor_id, status) VALUES (?, ?, ?, ?, ?)', [name, cpf || '', departmentId || null, supervisorId || null, status]);
      res.status(201).json({ id: result.id, name, cpf, departmentId, supervisorId, status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/authorizations', async (req, res) => {
    try {
      const rows = await getRows('SELECT * FROM authorizations ORDER BY created_at DESC');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/authorizations', async (req, res) => {
    try {
      const { type, employeeName, supervisorName, departmentName, workSchedule, authorizationDate, releaseTime, releasedBy, signature, reason } = req.body;
      if (!employeeName || !supervisorName || !departmentName) {
        return res.status(400).json({ error: 'Nome do funcionário, supervisor e departamento são obrigatórios' });
      }

      const result = await runQuery(`
        INSERT INTO authorizations (type, employee_name, supervisor_name, department_name, work_schedule, authorization_date, release_time, released_by, signature, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [type || 'entrada', employeeName, supervisorName, departmentName, workSchedule || '', authorizationDate || '', releaseTime || '', releasedBy || '', signature || '', reason || '']);

      res.status(201).json({ id: result.id, message: 'Autorização criada com sucesso' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Formulario.html'));
  });

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Erro ao iniciar servidor:', error.message);
  process.exit(1);
});
