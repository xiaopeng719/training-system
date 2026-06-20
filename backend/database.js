const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'training.db');

let db = null;

const initDatabase = async () => {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      preview_path TEXT,
      department_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      options TEXT DEFAULT '[]',
      answer TEXT NOT NULL,
      explanation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS trainings (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deadline DATETIME,
      time_limit INTEGER DEFAULT 0,
      min_study_time INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS training_progress (
      id TEXT PRIMARY KEY,
      training_id TEXT NOT NULL,
      employee_id TEXT,
      user_name TEXT NOT NULL,
      score INTEGER,
      answers TEXT DEFAULT '{}',
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      department_id TEXT NOT NULL,
      position TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      employee_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      last_position INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS training_questions (
      training_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      PRIMARY KEY (training_id, question_id)
    )
  `);

  // 插入示例部门数据
  const deptResult = db.exec('SELECT COUNT(*) as count FROM departments');
  if (deptResult[0] && deptResult[0].values[0][0] === 0) {
    db.run("INSERT INTO departments (id, name, description) VALUES ('dept-1', '技术部', '负责技术研发')");
    db.run("INSERT INTO departments (id, name, description) VALUES ('dept-2', '产品部', '负责产品设计和规划')");
    db.run("INSERT INTO departments (id, name, description) VALUES ('dept-3', '市场部', '负责市场推广')");
    db.run("INSERT INTO departments (id, name, description) VALUES ('dept-4', '人力资源部', '负责人员招聘和培训')");
    console.log('示例部门数据已插入');
  }

  // 创建默认管理员账号
  const userResult = db.exec('SELECT COUNT(*) as count FROM users');
  if (userResult[0] && userResult[0].values[0][0] === 0) {
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('admin123', salt, 10000, 32, 'sha256').toString('hex');
    const hashedPwd = `${salt}:${hash}`;
    db.run("INSERT INTO users (id, username, password, name, role) VALUES ('admin-1', 'admin', '"+hashedPwd+"', '系统管理员', 'admin')");
    console.log('默认管理员已创建: admin / admin123');
  }

  saveDatabase();
  return db;
};

const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// 查询多条记录
const queryAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

// 查询单条记录
const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      resolve(row);
    } catch (err) {
      reject(err);
    }
  });
};

// 执行SQL（INSERT/UPDATE/DELETE）
const runSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      db.run(sql, params);
      saveDatabase();
      resolve({ success: true });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { initDatabase, saveDatabase, queryAll, queryOne, runSql };
