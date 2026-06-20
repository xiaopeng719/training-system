const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { v4: uuidv4 } = require('uuid');
const { initDatabase, queryAll, queryOne, runSql } = require('./database');

// JWT_SECRET 从环境变量读取，fallback 为随机生成
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET 未设置，使用随机密钥（重启后 token 失效）');
}

const SOFFICE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';

// JWT认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: '登录已过期' });
  }
};

// 转换锁，防止多个LibreOffice实例冲突
let converting = false;
const convertQueue = [];

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 静态文件服务 - 解码中文文件名
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 文件上传配置 - 保留原始中文文件名
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // 使用UUID避免文件名冲突，原始文件名存数据库
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.mp4', '.webm', '.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  }
});

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const map = { '.pdf': 'pdf', '.ppt': 'ppt', '.pptx': 'ppt', '.doc': 'word', '.docx': 'word', '.mp4': 'video', '.webm': 'video', '.ogg': 'video' };
  return map[ext] || 'unknown';
}

// 用LibreOffice将PPT/Word转为PDF（带锁+重试）
async function convertToPdf(filePath) {
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const pdfPath = path.join(dir, baseName + '.pdf');
  const pdfRelPath = 'uploads/' + baseName + '.pdf';

  if (fs.existsSync(pdfPath)) return pdfRelPath;

  // 等待锁
  while (converting) await new Promise(r => setTimeout(r, 500));
  converting = true;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // 杀残留进程
      try { await execFileAsync('taskkill', ['/F', '/IM', 'soffice.exe']); } catch(e) {}
      await new Promise(r => setTimeout(r, 2000));

      await execFileAsync(SOFFICE_PATH, [
        '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, filePath
      ], { timeout: 60000 });

      if (fs.existsSync(pdfPath)) {
        converting = false;
        return pdfRelPath;
      }
    } catch (err) {
      console.error(`转换尝试 ${attempt + 1} 失败:`, err.message);
    }
  }
  converting = false;
  return null;
}

// ============ 课件 API ============

app.get('/api/courses', async (req, res) => {
  try {
    const { department_id } = req.query;
    let sql = 'SELECT c.*, d.name as department_name FROM courses c LEFT JOIN departments d ON c.department_id = d.id';
    const params = [];
    if (department_id) {
      sql += ' WHERE c.department_id = ?';
      params.push(department_id);
    }
    sql += ' ORDER BY c.created_at DESC';
    const rows = await queryAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('获取课件失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const row = await queryOne(
      'SELECT c.*, d.name as department_name FROM courses c LEFT JOIN departments d ON c.department_id = d.id WHERE c.id = ?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: '课件不存在' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { title, description, department_id } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: '请上传文件' });

    const fileType = getFileType(file.originalname);
    const id = uuidv4();
    const filePath = `uploads/${file.filename}`;
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // PPT/Word 自动转 PDF 用于在线预览
    let previewPath = null;
    if (fileType === 'ppt' || fileType === 'word') {
      console.log(`正在将 ${originalName} 转换为 PDF...`);
      previewPath = await convertToPdf(path.join(__dirname, filePath));
      if (previewPath) {
        console.log(`转换成功: ${previewPath}`);
      } else {
        console.log('转换失败，将只提供下载');
      }
    }

    await runSql(
      'INSERT INTO courses (id, title, description, file_path, file_type, file_name, preview_path, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title || '', description || '', filePath, fileType, originalName, previewPath, department_id || '']
    );

    res.json({ id, title, description, file_path: filePath, file_type: fileType, file_name: originalName, preview_path: previewPath, department_id });
  } catch (err) {
    console.error('上传课件失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', authMiddleware, async (req, res) => {
  try {
    const row = await queryOne('SELECT file_path FROM courses WHERE id = ?', [req.params.id]);
    if (row && row.file_path) {
      const fullPath = path.join(__dirname, row.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await runSql('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 考题 API ============

app.get('/api/questions', async (req, res) => {
  try {
    const { course_id } = req.query;
    let sql = 'SELECT * FROM questions';
    const params = [];
    if (course_id) {
      sql += ' WHERE course_id = ?';
      params.push(course_id);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await queryAll(sql, params);
    res.json(rows.map(r => ({ ...r, options: JSON.parse(r.options || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions', authMiddleware, async (req, res) => {
  try {
    const { course_id, type, content, options, answer, explanation } = req.body;
    const id = uuidv4();
    await runSql(
      'INSERT INTO questions (id, course_id, type, content, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, course_id, type, content, JSON.stringify(options || []), answer, explanation || '']
    );
    res.json({ id, course_id, type, content, options, answer, explanation });
  } catch (err) {
    console.error('创建考题失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 批量创建考题
app.post('/api/questions/batch', authMiddleware, async (req, res) => {
  try {
    const { course_id, questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: '请提供考题列表' });
    }
    const results = [];
    for (const q of questions) {
      const id = uuidv4();
      await runSql(
        'INSERT INTO questions (id, course_id, type, content, options, answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, course_id, q.type, q.content, JSON.stringify(q.options || []), q.answer, q.explanation || '']
      );
      results.push({ id, ...q });
    }
    res.json({ success: true, count: results.length, questions: results });
  } catch (err) {
    console.error('批量创建考题失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/questions/:id', authMiddleware, async (req, res) => {
  try {
    const { course_id, type, content, options, answer, explanation } = req.body;
    await runSql(
      'UPDATE questions SET course_id=?, type=?, content=?, options=?, answer=?, explanation=? WHERE id=?',
      [course_id, type, content, JSON.stringify(options || []), answer, explanation || '', req.params.id]
    );
    res.json({ id: req.params.id, course_id, type, content, options, answer, explanation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', authMiddleware, async (req, res) => {
  try {
    await runSql('DELETE FROM questions WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 部门 API ============

app.get('/api/departments', async (req, res) => {
  try {
    const rows = await queryAll('SELECT * FROM departments ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('获取部门失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }
    const id = uuidv4();
    await runSql(
      'INSERT INTO departments (id, name, description) VALUES (?, ?, ?)',
      [id, name.trim(), description || '']
    );
    res.json({ id, name: name.trim(), description });
  } catch (err) {
    console.error('创建部门失败:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      res.status(400).json({ error: '部门名称已存在' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/departments/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }
    await runSql(
      'UPDATE departments SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description || '', req.params.id]
    );
    res.json({ id: req.params.id, name: name.trim(), description });
  } catch (err) {
    console.error('更新部门失败:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      res.status(400).json({ error: '部门名称已存在' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete('/api/departments/:id', authMiddleware, async (req, res) => {
  try {
    await runSql('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除部门失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 员工 API ============

app.get('/api/employees', async (req, res) => {
  try {
    const { department_id } = req.query;
    let sql = 'SELECT e.*, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id';
    const params = [];
    if (department_id) {
      sql += ' WHERE e.department_id = ?';
      params.push(department_id);
    }
    sql += ' ORDER BY e.created_at DESC';
    const rows = await queryAll(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', authMiddleware, async (req, res) => {
  try {
    const { name, department_id, position, phone, email } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '姓名不能为空' });
    if (!department_id) return res.status(400).json({ error: '请选择部门' });
    const id = uuidv4();
    await runSql(
      'INSERT INTO employees (id, name, department_id, position, phone, email) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), department_id, position || '', phone || '', email || '']
    );
    // 自动创建登录账号，用户名=姓名拼音或姓名，密码=123456
    const username = name.trim();
    const hashedPwd = hashPassword('123456');
    const userId = uuidv4();
    try {
      await runSql(
        'INSERT INTO users (id, username, password, name, role, employee_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, hashedPwd, name.trim(), 'user', id]
      );
    } catch (e) {
      // 用户名重复则跳过
    }
    res.json({ id, name: name.trim(), department_id, position, phone, email });
  } catch (err) {
    console.error('创建员工失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', authMiddleware, async (req, res) => {
  try {
    const { name, department_id, position, phone, email } = req.body;
    await runSql(
      'UPDATE employees SET name=?, department_id=?, position=?, phone=?, email=? WHERE id=?',
      [name, department_id, position || '', phone || '', email || '', req.params.id]
    );
    res.json({ id: req.params.id, name, department_id, position, phone, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', authMiddleware, async (req, res) => {
  try {
    await runSql('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 培训 API ============

app.get('/api/trainings', async (req, res) => {
  try {
    const rows = await queryAll(
      'SELECT t.*, c.title as course_title, d.name as department_name FROM trainings t LEFT JOIN courses c ON t.course_id = c.id LEFT JOIN departments d ON t.department_id = d.id ORDER BY t.created_at DESC'
    );
    // 为每个培训添加完成统计
    for (const training of rows) {
      const stats = await queryOne(
        'SELECT COUNT(*) as completed_count FROM training_progress WHERE training_id = ?',
        [training.id]
      );
      training.completed_count = stats ? stats.completed_count : 0;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trainings', authMiddleware, async (req, res) => {
  try {
    const { course_id, department_id, title, description, deadline, employee_ids, time_limit, question_ids, min_study_time } = req.body;
    const id = uuidv4();
    await runSql(
      'INSERT INTO trainings (id, course_id, department_id, title, description, deadline, time_limit, min_study_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, course_id, department_id, title, description || '', deadline || '', time_limit || 0, min_study_time || 0]
    );
    // 如果指定了考题
    if (question_ids && question_ids.length > 0) {
      for (const qId of question_ids) {
        await runSql('INSERT INTO training_questions (training_id, question_id) VALUES (?, ?)', [id, qId]);
      }
    }
    // 如果指定了员工，创建分配记录
    if (employee_ids && employee_ids.length > 0) {
      for (const empId of employee_ids) {
        await runSql(
          'INSERT INTO training_progress (id, training_id, user_name, score, answers) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), id, empId, 0, '{}']
        );
      }
    }
    res.json({ id, course_id, department_id, title, description, deadline });
  } catch (err) {
    console.error('创建培训失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trainings/:id', async (req, res) => {
  try {
    const training = await queryOne(
      'SELECT t.*, c.title as course_title, d.name as department_name FROM trainings t LEFT JOIN courses c ON t.course_id = c.id LEFT JOIN departments d ON t.department_id = d.id WHERE t.id = ?',
      [req.params.id]
    );
    if (!training) return res.status(404).json({ error: '培训任务不存在' });

    // 优先使用指定的考题，否则使用课件下所有考题
    const tq = await queryAll('SELECT question_id FROM training_questions WHERE training_id = ?', [req.params.id]);
    let questions;
    if (tq.length > 0) {
      const ids = tq.map(r => r.question_id);
      const placeholders = ids.map(() => '?').join(',');
      questions = await queryAll(`SELECT * FROM questions WHERE id IN (${placeholders})`, ids);
    } else {
      questions = await queryAll('SELECT * FROM questions WHERE course_id = ?', [training.course_id]);
    }
    training.questions = questions.map(q => ({ ...q, options: JSON.parse(q.options || '[]') }));

    // 完成人数/总人数统计
    const progressStats = await queryOne(
      'SELECT COUNT(*) as completed_count, AVG(score) as avg_score FROM training_progress WHERE training_id = ?',
      [req.params.id]
    );
    training.completed_count = progressStats ? progressStats.completed_count : 0;
    training.avg_score = progressStats && progressStats.avg_score ? Math.round(progressStats.avg_score) : 0;

    res.json(training);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trainings/:id', authMiddleware, async (req, res) => {
  try {
    await runSql('DELETE FROM trainings WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 进度 API ============

app.post('/api/progress', authMiddleware, async (req, res) => {
  try {
    const { training_id, user_name, employee_id, score, answers } = req.body;
    
    // 验证：必须提供员工ID
    if (!employee_id) {
      return res.status(400).json({ error: '缺少员工信息，请重新登录' });
    }
    
    // 验证：检查学习时长是否满足要求
    const training = await queryOne('SELECT min_study_time, course_id FROM trainings WHERE id = ?', [training_id]);
    if (training && training.min_study_time > 0) {
      const studyRecord = await queryOne(
        'SELECT duration FROM study_records WHERE employee_id = ? AND course_id = ?',
        [employee_id, training.course_id]
      );
      const studyDuration = studyRecord ? studyRecord.duration : 0;
      if (studyDuration < training.min_study_time) {
        const needMinutes = Math.ceil((training.min_study_time - studyDuration) / 60);
        return res.status(400).json({ 
          error: `学习时长不足，还需学习约 ${needMinutes} 分钟`,
          study_duration: studyDuration,
          min_required: training.min_study_time
        });
      }
    }
    
    // 检查是否已经提交过（同一员工同一培训只保留最新成绩）
    const existing = await queryOne(
      'SELECT id FROM training_progress WHERE training_id = ? AND employee_id = ?',
      [training_id, employee_id]
    );
    
    if (existing) {
      // 更新已有记录
      await runSql(
        "UPDATE training_progress SET user_name = ?, score = ?, answers = ?, completed_at = datetime('now') WHERE id = ?",
        [user_name, score, JSON.stringify(answers || {}), existing.id]
      );
      res.json({ id: existing.id, training_id, user_name, score, updated: true });
    } else {
      const id = uuidv4();
      await runSql(
        "INSERT INTO training_progress (id, training_id, employee_id, user_name, score, answers, completed_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
        [id, training_id, employee_id, user_name, score, JSON.stringify(answers || {})]
      );
      res.json({ id, training_id, user_name, score });
    }
  } catch (err) {
    console.error('提交进度失败:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/progress/:training_id', async (req, res) => {
  try {
    const rows = await queryAll(
      'SELECT p.*, e.name as employee_name FROM training_progress p LEFT JOIN employees e ON p.user_name = e.id WHERE p.training_id = ? ORDER BY p.completed_at DESC',
      [req.params.training_id]
    );
    res.json(rows.map(r => ({ ...r, answers: JSON.parse(r.answers || '{}') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取所有进度记录
app.get('/api/progress', async (req, res) => {
  try {
    const rows = await queryAll('SELECT * FROM training_progress ORDER BY completed_at DESC');
    res.json(rows.map(r => ({ ...r, answers: JSON.parse(r.answers || '{}') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 统计 API ============

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const c = await queryOne('SELECT COUNT(*) as count FROM courses');
    const q = await queryOne('SELECT COUNT(*) as count FROM questions');
    const d = await queryOne('SELECT COUNT(*) as count FROM departments');
    const e = await queryOne('SELECT COUNT(*) as count FROM employees');
    const t = await queryOne('SELECT COUNT(*) as count FROM trainings');
    res.json({
      courses: c ? c.count : 0,
      questions: q ? q.count : 0,
      departments: d ? d.count : 0,
      employees: e ? e.count : 0,
      trainings: t ? t.count : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 登录 API ============

// 密码哈希工具函数（pbkdf2）
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  // 兼容旧的 SHA256 截断格式（20位hex无冒号）
  if (!stored.includes(':')) {
    const oldHash = crypto.createHash('sha256').update(password).digest('hex').substring(0, 20);
    return oldHash === stored;
  }
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return hash === verify;
}

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    // 如果是旧格式密码，升级为新格式
    if (!user.password.includes(':')) {
      const newPwd = hashPassword(password);
      await runSql('UPDATE users SET password = ? WHERE id = ?', [newPwd, user.id]);
    }
    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/info', authMiddleware, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 学习记录 API ============

app.post('/api/study-records', authMiddleware, async (req, res) => {
  try {
    const { employee_id, course_id, duration, last_position, completed } = req.body;
    const existing = await queryOne('SELECT id FROM study_records WHERE employee_id = ? AND course_id = ?', [employee_id, course_id]);
    if (existing) {
      await runSql(
        "UPDATE study_records SET duration = ?, last_position = ?, completed = ?, updated_at = datetime('now') WHERE id = ?",
        [duration || 0, last_position || 0, completed ? 1 : 0, existing.id]
      );
    } else {
      await runSql(
        'INSERT INTO study_records (id, employee_id, course_id, duration, last_position, completed) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), employee_id, course_id, duration || 0, last_position || 0, completed ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study-records', async (req, res) => {
  try {
    const { employee_id, course_id } = req.query;
    let sql = 'SELECT sr.*, e.name as employee_name, c.title as course_title FROM study_records sr LEFT JOIN employees e ON sr.employee_id = e.id LEFT JOIN courses c ON sr.course_id = c.id WHERE 1=1';
    const params = [];
    if (employee_id) { sql += ' AND sr.employee_id = ?'; params.push(employee_id); }
    if (course_id) { sql += ' AND sr.course_id = ?'; params.push(course_id); }
    const rows = await queryAll(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 数据导出 API ============

app.get('/api/export/training/:id', async (req, res) => {
  try {
    const training = await queryOne(
      'SELECT t.*, c.title as course_title, d.name as department_name FROM trainings t LEFT JOIN courses c ON t.course_id = c.id LEFT JOIN departments d ON t.department_id = d.id WHERE t.id = ?',
      [req.params.id]
    );
    if (!training) return res.status(404).json({ error: '培训不存在' });

    const progress = await queryAll(
      'SELECT p.*, e.name as employee_name, e.position FROM training_progress p LEFT JOIN employees e ON p.user_name = e.id WHERE p.training_id = ? ORDER BY p.completed_at DESC',
      [req.params.id]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('培训报告');

    sheet.columns = [
      { header: '姓名', key: 'name', width: 15 },
      { header: '职位', key: 'position', width: 15 },
      { header: '得分', key: 'score', width: 10 },
      { header: '是否通过', key: 'passed', width: 10 },
      { header: '完成时间', key: 'completed_at', width: 20 }
    ];

    sheet.insertRow(1, ['培训名称', training.title]);
    sheet.insertRow(2, ['课件', training.course_title]);
    sheet.insertRow(3, ['部门', training.department_name]);
    sheet.insertRow(4, []);

    progress.forEach(p => {
      sheet.addRow({
        name: p.employee_name || p.user_name,
        position: p.position || '',
        score: p.score,
        passed: p.score >= 60 ? '是' : '否',
        completed_at: p.completed_at || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=training-report.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ 用户管理 API ============

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }
    const rows = await queryAll('SELECT id, username, name, role, employee_id, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }
    const { name, role, password } = req.body;
    const existing = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '用户不存在' });

    if (password) {
      const hashedPwd = hashPassword(password);
      await runSql('UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?', [name || existing.name, role || existing.role, hashedPwd, req.params.id]);
    } else {
      await runSql('UPDATE users SET name = ?, role = ? WHERE id = ?', [name || existing.name, role || existing.role, req.params.id]);
    }
    res.json({ id: req.params.id, name: name || existing.name, role: role || existing.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: '不能删除自己' });
    }
    await runSql('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 最近完成记录 API ============

app.get('/api/recent-completions', async (req, res) => {
  try {
    const rows = await queryAll(
      `SELECT p.*, e.name as employee_name, t.title as training_title
       FROM training_progress p
       LEFT JOIN employees e ON p.user_name = e.id
       LEFT JOIN trainings t ON p.training_id = t.id
       ORDER BY p.completed_at DESC LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 启动
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`培训系统后端运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
