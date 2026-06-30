const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { db } = require('./db');
const { parseSourceFile, generateOutline, buildPptxFile, analyzeDocumentType } = require('./services/ppt-utils');

const app = express();
const PORT = 3001;
const GOAL_OPTIONS = ['考研', '升本', '考公', '考证', '英语四六级', '普通话'];
const PPT_UPLOAD_DIR = path.join(__dirname, 'uploads', 'ppt');
const PPT_OUTPUT_DIR = path.join(__dirname, 'outputs', 'ppt');
fs.mkdirSync(PPT_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PPT_OUTPUT_DIR, { recursive: true });
const pptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PPT_UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});
const pptUpload = multer({ storage: pptStorage, limits: { fileSize: 50 * 1024 * 1024 } });
const GOAL_PRESETS = {
  考研: {
    subjects: ['高等数学', '考研英语', '政治', '专业课'],
    metrics: { studyTime: '2.5h', daysText: '距离考研天数', days: 87, mastery: '78%' },
    sections: [
      { name: '极限与连续', status: '已掌握', percent: '92%', children: [{ name: '极限定义与性质', percent: '95%' }, { name: '洛必达法则', percent: '88%' }] },
      { name: '导数与微分', status: '学习中', percent: '78%', children: [{ name: '导数定义与几何意义', percent: '90%' }, { name: '复合函数求导', percent: '72%' }] },
      { name: '积分学', status: '需加强', percent: '62%', children: [{ name: '不定积分基本公式', percent: '75%' }, { name: '换元积分法', percent: '48%' }] },
      { name: '微分方程', status: '薄弱', percent: '45%', children: [] }
    ],
    plan: [
      { index: '1', title: '换元积分法 · 重点突破', desc: '建议时长 60 分钟 · 考研高频考点', tag: '待开始' },
      { index: '2', title: '数据结构：二叉树遍历', desc: '建议时长 45 分钟 · 错题重练', tag: '待开始' },
      { index: '✓', title: '极限定理与性质 · 已复习', desc: '今日上午完成 · 耗时 50 分钟', tag: '已完成' }
    ],
    advice: '距离考研还有 87 天，数学掌握度不足。建议今天优先学习导数与积分，并把错题加入复习清单。'
  },
  升本: {
    subjects: ['高等数学', '英语基础', '计算机基础', '专业综合'],
    metrics: { studyTime: '3.0h', daysText: '距离升本天数', days: 120, mastery: '66%' },
    sections: [
      { name: '函数与极限', status: '已掌握', percent: '90%', children: [{ name: '函数性质', percent: '92%' }, { name: '极限基础', percent: '86%' }] },
      { name: '导数基础', status: '学习中', percent: '74%', children: [{ name: '导数概念', percent: '80%' }, { name: '求导法则', percent: '70%' }] },
      { name: '英语阅读', status: '需加强', percent: '58%', children: [{ name: '长难句分析', percent: '63%' }, { name: '核心词汇', percent: '54%' }] },
      { name: '专业综合', status: '薄弱', percent: '41%', children: [] }
    ],
    plan: [
      { index: '1', title: '高数函数与极限复盘', desc: '建议时长 50 分钟 · 升本基础题型', tag: '待开始' },
      { index: '2', title: '英语阅读理解训练', desc: '建议时长 40 分钟 · 升本必练', tag: '待开始' },
      { index: '✓', title: '计算机基础概念 · 已复习', desc: '今日上午完成 · 耗时 35 分钟', tag: '已完成' }
    ],
    advice: '距离升本还有 120 天，基础内容要尽快补齐。今天建议先抓高数函数、英语阅读和专业综合。'
  },
  考公: {
    subjects: ['行测', '申论', '常识判断', '数量关系'],
    metrics: { studyTime: '2.2h', daysText: '距离考公天数', days: 96, mastery: '71%' },
    sections: [],
    plan: [],
    advice: '距离考公还有 96 天，建议优先练行测速度和申论表达。'
  }
};

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      return originalJson(payload);
    }

    if (res.statusCode >= 400) {
      const message = payload?.error?.message || payload?.message || 'Request failed';
      const code = payload?.error?.code || (res.statusCode === 401 ? 'UNAUTHORIZED' : res.statusCode === 404 ? 'NOT_FOUND' : 'ERROR');
      return originalJson({ success: false, error: { code, message } });
    }

    return originalJson({ success: true, data: payload });
  };

  next();
});

// 导入简历优化路由
const resumeRoutes = require('./routes/resume');
app.use('/api/resume', resumeRoutes);

// 请求日志
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.originalUrl}`);
  next();
});

function createId() {
  return crypto.randomUUID();
}

function normalizeFilename(name) {
  const raw = String(name || '').trim();
  if (!raw) return '未命名文档';
  try {
    const fixed = Buffer.from(raw, 'latin1').toString('utf8');
    if (fixed && !fixed.includes('�')) return fixed;
  } catch {}
  return raw;
}

function now() {
  return new Date().toISOString();
}

function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toJsonString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseAiJson(content) {
  if (!content) return null;

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function generateVerifyCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createMailer() {
  const provider = (process.env.MAIL_PROVIDER || 'qq').toLowerCase();
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  const presets = {
    qq: { host: 'smtp.qq.com', port: 465, secure: true },
    gmail: { host: 'smtp.gmail.com', port: 465, secure: true }
  };

  const preset = presets[provider];
  if (!preset || !user || !pass) {
    throw new Error('MAIL_PROVIDER / MAIL_USER / MAIL_PASS are required in .env');
  }

  return nodemailer.createTransport({
    host: preset.host,
    port: preset.port,
    secure: preset.secure,
    auth: { user, pass }
  });
}

function ensureDemoUser() {
  // removed demo fallback user
}

function getGoalContext(goal, targetDate) {
  const rawGoal = String(goal || '').trim();
  const normalized = GOAL_OPTIONS.includes(rawGoal) ? rawGoal : '';
  if (!normalized) {
    return {
      subjects: [],
      metrics: { studyTime: '0h', daysText: '', days: 0, mastery: '0%' },
      advice: ''
    };
  }
  const base = GOAL_PRESETS[normalized] || GOAL_PRESETS['考研'];
  const nextDays = targetDate ? Math.max(0, Math.ceil((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  return {
    ...base,
    metrics: { ...base.metrics, days: nextDays, daysText: `距离${normalized}天数` },
    advice: targetDate ? `距离${normalized}还有 ${nextDays} 天，请根据真实日期安排今日学习重点。` : ''
  };
}

async function callDeepSeek(messages, options = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
  const timeoutMs = options.timeoutMs ?? 90000;
  const enableThinking = options.enableThinking ?? true;
  const reasoningEffort = options.reasoning_effort || options.reasoningEffort || 'high';

  console.log('Calling LLM...');
  console.log('provider:', 'deepseek');
  console.log('model:', model);
  console.log(apiKey ? 'API KEY OK' : 'API KEY MISSING');

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is missing in .env');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2000,
        reasoning_effort: reasoningEffort,
        extra_body: enableThinking ? { thinking: { type: 'enabled' } } : undefined
      })
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error('LLM response error status:', response.status);
    console.error('LLM response error message:', text);
    console.error('LLM response error response.data:', text);
    throw new Error(`DeepSeek API error: ${response.status} ${text}`);
  }

  return response.json();
}

async function callPptAi(messages, options = {}) {
  return callDeepSeek(messages, { ...options, temperature: options.temperature ?? 0.4, max_tokens: options.max_tokens ?? 2500, timeoutMs: options.timeoutMs ?? 90000, enableThinking: true, reasoning_effort: 'high' });
}

/* =========================================
   基础健康检查
========================================= */
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' });
});

ensureDemoUser();

/* =========================================
   邮箱验证码 / 注册
========================================= */
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const code = generateVerifyCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO email_verification_codes (id, email, code, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(createId(), email, code, expiresAt, now());

    console.log('[SEND CODE CREATED]', { email, code });
    res.json({ message: '验证码已生成', email });

    try {
      const mailer = createMailer();
      const from = process.env.MAIL_FROM || process.env.MAIL_USER;
      await mailer.sendMail({
        from,
        to: email,
        subject: 'Workspace 验证码',
        text: `你的验证码是：${code}，10 分钟内有效。`,
        html: `<p>你的验证码是：<strong style="font-size:24px;letter-spacing:2px;">${code}</strong></p><p>10 分钟内有效。</p>`
      });
      console.log('[SEND CODE MAIL SUCCESS]', { email });
    } catch (mailError) {
      console.error('[SEND CODE MAIL FAILED]', { email, message: mailError.message, code: mailError.code });
    }
  } catch (error) {
    console.error('[SEND CODE FAILED]', {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const code = String(req.body.code || '').trim();

    console.log('[REGISTER REQUEST]', { name, email, codePresent: Boolean(code) });

    if (!name || !email || !password || !code) {
      return res.status(400).json({ message: 'name, email, password, code are required' });
    }

    const record = db.prepare(`
      SELECT * FROM email_verification_codes
      WHERE email = ? AND code = ? AND used = 0
      ORDER BY created_at DESC
      LIMIT 1
    `).get(email, code);

    console.log('[REGISTER VERIFY]', {
      found: Boolean(record),
      email,
      code,
      recordCode: record?.code,
      expiresAt: record?.expires_at,
      used: record?.used
    });

    if (!record) {
      return res.status(400).json({ message: '验证码错误或不存在' });
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: '验证码已过期' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已注册' });
    }

    const id = createId();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, avatar, role, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, NULL, 'user', ?, ?)
    `).run(id, name, email, passwordHash, now(), now());

    db.prepare('UPDATE email_verification_codes SET used = 1 WHERE id = ?').run(record.id);

    const user = db.prepare('SELECT id, name, email, avatar, role, created_at, updated_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ message: '注册成功', user });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

/* =========================================
   认证接口
========================================= */
app.post('/api/auth/login', (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({ message: 'account and password are required' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const user = db.prepare(`
      SELECT id, name, email, avatar, role, created_at, updated_at
      FROM users
      WHERE (email = ? OR phone = ?) AND password_hash = ?
      LIMIT 1
    `).get(account, account, passwordHash);

    if (!user) {
      return res.status(401).json({ message: '账号或密码错误' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const loginResponse = {
      message: '登录成功',
      token,
      user
    };
    console.log('[LOGIN RESPONSE]', loginResponse);
    res.json(loginResponse);
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

/* =========================================
   用户接口
========================================= */
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

function serializeUser(user) {
  if (!user) {
    return {
      id: '',
      name: '',
      nickname: '',
      email: '',
      phone: '',
      avatar: '',
      identity: '',
      profession: '',
      school: '',
      region: '',
      goal: '',
      goal_target_date: '',
      role: 'user',
      created_at: '',
      updated_at: ''
    };
  }

  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    identity: user.identity,
    profession: user.profession,
    school: user.school,
    region: user.region,
    goal: user.goal,
    goal_target_date: user.goal_target_date,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

function updateUserProfile(id, body) {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!existing) {
    return null;
  }

  const nextGoal = typeof body.goal === 'string' ? body.goal.trim() : existing.goal;
  const next = {
    name: body.name ?? existing.name,
    nickname: body.nickname ?? existing.nickname ?? body.name ?? existing.name,
    avatar: body.avatar ?? existing.avatar,
    identity: body.identity ?? existing.identity,
    profession: body.profession ?? existing.profession,
    school: body.school ?? existing.school,
    region: body.region ?? existing.region,
    email: body.email ?? existing.email,
    phone: body.phone ?? existing.phone,
    goal: nextGoal || existing.goal,
    goal_target_date: body.goal_target_date ?? existing.goal_target_date
  };

  db.prepare(`
    UPDATE users
    SET name = ?, nickname = ?, avatar = ?, identity = ?, profession = ?, school = ?, region = ?, email = ?, phone = ?, goal = ?, goal_target_date = ?, updated_at = ?
    WHERE id = ?
  `).run(next.name, next.nickname, next.avatar, next.identity, next.profession, next.school, next.region, next.email, next.phone, next.goal, next.goal_target_date, now(), id);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function buildProfileEngine(user, userId) {
  const knowledgeBases = db.prepare('SELECT * FROM knowledge_bases WHERE user_id = ?').all(userId);
  const knowledgeDocuments = db.prepare('SELECT * FROM knowledge_documents WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const learningRecords = db.prepare('SELECT * FROM learning_records WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const pptProjects = db.prepare('SELECT * FROM ppt_projects WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const meetingNotes = db.prepare('SELECT * FROM meeting_notes WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const resume = getResumeAnalytics(userId);
  const analytics = getAnalyticsStats(userId);
  const goalContext = getGoalContext(user?.goal, user?.goal_target_date);
  const progress = tasks.length ? Math.min(1, Math.max(0, Number(tasks.filter((item) => ['done', 'completed', 'finished'].includes(String(item.status || '').toLowerCase())).length) / tasks.length)) : 0;
  const completionRate = tasks.length ? Math.round(progress * 100) : 0;
  const state = !user?.goal && !user?.goal_target_date
    ? 'uninitialized'
    : !tasks.length && !learningRecords.length
      ? 'initializing'
      : (learningRecords.length >= 7 || (tasks.length >= 5 && progress >= 0.5))
        ? 'growth'
        : 'active';
  const phase = progress < 0.3 ? 'init' : progress < 0.6 ? 'strength' : progress < 0.85 ? 'sprint' : 'final';
  const deadline = user?.goal_target_date || '';
  const daysLeft = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const studyMinutes = learningRecords.reduce((sum, item) => {
    try {
      const extra = typeof item.note === 'string' ? JSON.parse(item.note) : item.note;
      return sum + Number(extra?.study_minutes || 0);
    } catch {
      return sum;
    }
  }, 0);
  const recentTopics = learningRecords.slice(0, 5).map((item) => item.topic || item.subject).filter(Boolean);
  const recentDocs = knowledgeDocuments.slice(0, 5).map((item) => item.display_name || item.original_name).filter(Boolean);
  const recentActions = [
    ...tasks.slice(0, 3).map((item) => item.title),
    ...pptProjects.slice(0, 2).map((item) => item.title),
    ...meetingNotes.slice(0, 2).map((item) => item.title),
    ...(resume.latest ? ['简历优化'] : [])
  ].filter(Boolean).slice(0, 6);
  const userStudyStyle = recentTopics.length > 2 || recentDocs.length > 2 ? 'structured' : 'structured';
  const cognitivePreference = knowledgeBases.length ? ['知识库检索', '任务驱动学习', '持续复盘'] : ['目标驱动', '结构化笔记'];

  return {
    user: serializeUser(user),
    aiIdentity: {
      name: user?.nickname || user?.name || '未登录用户',
      role: 'AI Learning Operator',
      level: `Lv.${Math.max(1, Math.min(10, Math.floor((tasks.length + learningRecords.length) / 4) + 1))} Explorer`,
      domain: user?.profession || user?.school || 'AI Workspace',
      status: state === 'growth' ? 'learning' : state === 'initializing' ? 'idle' : 'active'
    },
    stateEngine: {
      state,
      studyMode: 'deep learning',
      focus: user?.goal || user?.profession || 'AI 学习',
      intensity: tasks.length > 4 || learningRecords.length > 8 ? 'medium-high' : 'medium'
    },
    goalEngine: {
      primaryGoal: user?.goal || '',
      deadline,
      progress,
      phase,
      daysLeft
    },
    memory: {
      learningMemory: {
        recentTopics,
        recentDocs
      },
      actionMemory: {
        recentActions
      },
      cognitiveProfile: {
        learningStyle: userStudyStyle,
        preference: cognitivePreference,
        pace: learningRecords.length > 8 ? 'fast' : learningRecords.length > 3 ? 'medium' : 'slow'
      }
    },
    workspaceSync: {
      knowledge: {
        baseCount: knowledgeBases.length,
        documentCount: knowledgeDocuments.length,
        chunkCount: knowledgeDocuments.reduce((sum, item) => sum + Number(item.chunkCount || 0), 0)
      },
      learning: {
        planCount: db.prepare('SELECT COUNT(*) as count FROM study_plans WHERE user_id = ?').get(userId)?.count || 0,
        taskCount: tasks.length,
        todayTaskCount: tasks.filter((item) => String(item.status || '').toLowerCase() === 'active').length,
        completionRate
      },
      resume: {
        optimizationCount: resume.optimizeCount
      },
      analytics: {
        analysisCount: analytics.analysisCount
      },
      ppt: {
        generationCount: pptProjects.length
      },
      meeting: {
        noteCount: meetingNotes.length
      }
    },
    goalContext
  };
}

app.get('/api/profile/:id', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(buildProfileEngine(user, id));
});

app.put('/api/profile/:id', (req, res) => {
  const updated = updateUserProfile(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'User not found' });
  res.json(buildProfileEngine(updated, req.params.id));
});

app.patch('/api/profile/:id', (req, res) => {
  const updated = updateUserProfile(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'User not found' });
  res.json(buildProfileEngine(updated, req.params.id));
});

app.get('/api/profile/:id/context', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(buildProfileEngine(user, id));
});

app.get('/api/profile', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ message: 'userId is required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(buildProfileEngine(user, userId));
});

app.get('/api/learning-coach/context', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ message: 'userId is required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const goalContext = getGoalContext(user?.goal, user?.goal_target_date);
  res.json({ user: serializeUser(user), goalContext });
});

app.get('/api/learning', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ message: 'userId is required' });
  }
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const learningRecords = db.prepare('SELECT * FROM learning_records WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const totalStudyMinutes = learningRecords.reduce((sum, item) => {
    try {
      const extra = typeof item.note === 'string' ? JSON.parse(item.note) : item.note;
      return sum + Number(extra?.study_minutes || 0);
    } catch {
      return sum;
    }
  }, 0);
  res.json({
    tasks,
    records: learningRecords,
    summary: {
      studyMinutes: totalStudyMinutes,
      taskCount: tasks.length,
      recordCount: learningRecords.length
    }
  });
});

app.get('/api/knowledge', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ message: 'userId is required' });
  }
  const bases = db.prepare('SELECT * FROM knowledge_bases WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const documents = db.prepare('SELECT * FROM knowledge_documents WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const chunkCount = documents.reduce((sum, item) => sum + Number(item.chunkCount || 0), 0);
  res.json({
    bases,
    documents,
    stats: {
      baseCount: bases.length,
      documentCount: documents.length,
      chunkCount
    }
  });
});

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const code = generateVerifyCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO email_verification_codes (id, email, code, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(createId(), email, code, expiresAt, now());

    console.log('[SEND CODE CREATED]', { email, code });
    res.json({ message: '验证码已生成', email });

    try {
      const mailer = createMailer();
      const from = process.env.MAIL_FROM || process.env.MAIL_USER;
      await mailer.sendMail({
        from,
        to: email,
        subject: 'Workspace 验证码',
        text: `你的验证码是：${code}，10 分钟内有效。`,
        html: `<p>你的验证码是：<strong style="font-size:24px;letter-spacing:2px;">${code}</strong></p><p>10 分钟内有效。</p>`
      });
      console.log('[SEND CODE MAIL SUCCESS]', { email });
    } catch (mailError) {
      console.error('[SEND CODE MAIL FAILED]', { email, message: mailError.message, code: mailError.code });
    }
  } catch (error) {
    console.error('Send code error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, code } = req.body;

    if (!name || !email || !password || !code) {
      return res.status(400).json({ message: 'name, email, password, code are required' });
    }

    const verification = db.prepare(`
      SELECT * FROM email_verification_codes
      WHERE email = ? AND code = ? AND used = 0
      ORDER BY created_at DESC
      LIMIT 1
    `).get(email, code);

    if (!verification) {
      return res.status(400).json({ message: '验证码错误或不存在' });
    }

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: '验证码已过期' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已注册' });
    }

    const id = createId();
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, avatar, role, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, NULL, 'user', ?, ?)
    `).run(id, name, email, passwordHash, now(), now());

    db.prepare('UPDATE email_verification_codes SET used = 1 WHERE id = ?').run(verification.id);

    const user = db.prepare('SELECT id, name, email, avatar, role, created_at, updated_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ message: '注册成功', user });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', (req, res) => {
  const { name, email = null, phone = null, password_hash = null, avatar = null, role = 'user' } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  const id = createId();

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, avatar, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, phone, password_hash, avatar, role, now(), now());

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ message: 'User not found' });
  }

  const next = {
    name: req.body.name ?? existing.name,
    email: req.body.email ?? existing.email,
    phone: req.body.phone ?? existing.phone,
    password_hash: req.body.password_hash ?? existing.password_hash,
    avatar: req.body.avatar ?? existing.avatar,
    identity: req.body.identity ?? existing.identity,
    profession: req.body.profession ?? existing.profession,
    goal: GOAL_OPTIONS.includes(req.body.goal) ? req.body.goal : existing.goal,
    goal_target_date: req.body.goal_target_date ?? existing.goal_target_date,
    role: req.body.role ?? existing.role
  };

  try {
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, phone = ?, password_hash = ?, avatar = ?, identity = ?, profession = ?, goal = ?, goal_target_date = ?, role = ?, updated_at = ?
      WHERE id = ?
    `).run(next.name, next.email, next.phone, next.password_hash, next.avatar, next.identity, next.profession, next.goal, next.goal_target_date, next.role, now(), id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/* =========================================
   长期记忆接口
========================================= */
app.get('/api/memory', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM user_memory
    WHERE user_id = ?
    ORDER BY importance DESC, created_at DESC
  `).all(userId);

  res.json(list);
});

app.post('/api/memory', (req, res) => {
  const { user_id, type, content, source = null, importance = 1 } = req.body;

  if (!user_id || !type || !content) {
    return res.status(400).json({ message: 'user_id, type, content are required' });
  }

  const id = createId();
  db.prepare(`
    INSERT INTO user_memory (id, user_id, type, content, source, importance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user_id, type, content, source, importance, now(), now());

  const record = db.prepare('SELECT * FROM user_memory WHERE id = ?').get(id);
  res.status(201).json(record);
});

/* =========================================
   知识库接口
========================================= */
app.get('/api/knowledge-bases', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM knowledge_bases
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json(list);
});

app.post('/api/knowledge-bases', (req, res) => {
  const { user_id, name, description = null } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ message: 'user_id and name are required' });
  }

  const id = createId();
  db.prepare(`
    INSERT INTO knowledge_bases (id, user_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, user_id, name, description, now(), now());

  const record = db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(id);
  res.status(201).json(record);
});

app.get('/api/knowledge-bases/:id/files', (req, res) => {
  const { id } = req.params;

  const files = db.prepare(`
    SELECT * FROM knowledge_documents
    WHERE knowledge_base_id = ?
    ORDER BY created_at DESC
  `).all(id);

  res.json(files.map((file) => ({
    ...file,
    tags: safeJsonParse(file.tags, [])
  })));
});

const knowledgeUpload = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads', 'knowledge')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
}), limits: { fileSize: 50 * 1024 * 1024 } });
fs.mkdirSync(path.join(__dirname, 'uploads', 'knowledge'), { recursive: true });

app.post('/api/knowledge-upload', knowledgeUpload.single('file'), async (req, res) => {
  try {
    const { knowledge_base_id, user_id } = req.body;
    if (!req.file) return res.status(400).json({ message: 'file is required' });
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });

    let baseId = knowledge_base_id;
    let baseName = req.body.knowledge_base_name || '';
    const parsed = await parseSourceFile(req.file.path);
    const analysis = analyzeDocumentType(parsed);
    if (!baseId) {
      baseName = baseName || req.file.originalname.replace(/\.[^.]+$/, '').slice(0, 24) || analysis.documentType;
      const exists = db.prepare('SELECT id FROM knowledge_bases WHERE user_id = ? AND name = ?').get(user_id, baseName);
      if (exists) {
        baseId = exists.id;
      } else {
        baseId = createId();
        db.prepare(`
          INSERT INTO knowledge_bases (id, user_id, name, description, source_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(baseId, user_id, baseName, '由文件自动创建', 'auto', now(), now());
      }
    }

    const id = createId();
    db.prepare(`
      INSERT INTO knowledge_documents (
        id, knowledge_base_id, user_id, file_name, original_name, display_name, file_type, file_path, content, summary, tags, source_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      baseId,
      user_id,
      req.file.filename,
      req.file.originalname,
      (req.body.display_name || req.body.knowledge_base_name || '').trim() || null,
      path.extname(req.file.originalname).replace('.', '').toLowerCase(),
      req.file.path,
      parsed.text,
      parsed.summary,
      toJsonString([...(parsed.keywords || []), analysis.documentType, ...(analysis.matchedKeywords || [])]),
      null,
      now(),
      now()
    );

    const record = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(id);
    const base = db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(baseId);
    res.status(201).json({ ...record, original_name: normalizeFilename(record.original_name), display_name: normalizeFilename(record.display_name || record.original_name), file_name: normalizeFilename(record.file_name), tags: safeJsonParse(record.tags, []), analysis, knowledge_base: base });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/knowledge-bases/:id/documents', (req, res) => {
  const list = db.prepare(`
    SELECT * FROM knowledge_documents
    WHERE knowledge_base_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id);
  res.json(list.map((item) => ({ ...item, tags: safeJsonParse(item.tags, []) })));
});

app.get('/api/knowledge-documents/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ message: 'document not found' });
  res.json({ ...record, tags: safeJsonParse(record.tags, []) });
});

app.delete('/api/knowledge-documents/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ message: 'document not found' });
  db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(req.params.id);
  try { if (record.file_path && fs.existsSync(record.file_path)) fs.unlinkSync(record.file_path); } catch {}
  res.json({ message: 'deleted', id: req.params.id });
});

/* =========================================
   任务接口
========================================= */
app.get('/api/tasks', (req, res) => {
  const { userId, status } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  let sql = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [userId];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const list = db.prepare(sql).all(...params);
  res.json(list);
});

app.post('/api/tasks', (req, res) => {
  const {
    user_id,
    title,
    description = null,
    status = 'pending',
    priority = 'medium',
    due_date = null,
    source = null
  } = req.body;

  if (!user_id || !title) {
    return res.status(400).json({ message: 'user_id and title are required' });
  }

  const id = createId();
  db.prepare(`
    INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user_id, title, description, status, priority, due_date, source, now(), now());

  const record = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(record);
});

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const next = {
    title: req.body.title ?? existing.title,
    description: req.body.description ?? existing.description,
    status: req.body.status ?? existing.status,
    priority: req.body.priority ?? existing.priority,
    due_date: req.body.due_date ?? existing.due_date,
    source: req.body.source ?? existing.source
  };

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, source = ?, updated_at = ?
    WHERE id = ?
  `).run(next.title, next.description, next.status, next.priority, next.due_date, next.source, now(), id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

/* =========================================
   学习计划 / 学习记录
========================================= */
app.get('/api/study-plans', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM study_plans
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json(list);
});

app.post('/api/study-plans', (req, res) => {
  const { user_id, title, content, status = 'active' } = req.body;

  if (!user_id || !title || !content) {
    return res.status(400).json({ message: 'user_id, title, content are required' });
  }

  const id = createId();
  db.prepare(`
    INSERT INTO study_plans (id, user_id, title, content, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, user_id, title, content, status, now(), now());

  const record = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id);
  res.status(201).json(record);
});

app.get('/api/learning-records', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM learning_records
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json(list);
});

app.post('/api/learning-records', (req, res) => {
  const { user_id, subject, topic, mastery = 0, note = null, study_minutes = 0, record_type = 'study' } = req.body;

  if (!user_id || !subject || !topic) {
    return res.status(400).json({ message: 'user_id, subject, topic are required' });
  }

  const id = createId();
  const payload = JSON.stringify({ study_minutes, record_type });
  db.prepare(`
    INSERT INTO learning_records (id, user_id, subject, topic, mastery, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user_id, subject, topic, mastery, payload || note, now(), now());

  const record = db.prepare('SELECT * FROM learning_records WHERE id = ?').get(id);
  res.status(201).json(record);
});

function getResumeAnalytics(userId) {
  const analyses = db.prepare(`
    SELECT * FROM resume_analyses
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
  const optimizeCount = analyses.length;
  const avgAtsScore = analyses.length
    ? Math.round(analyses.reduce((sum, item) => sum + Number(item.ats_score || 0), 0) / analyses.length)
    : 0;
  return { optimizeCount, avgAtsScore, latest: analyses[0] || null };
}

function getAnalyticsStats(userId) {
  const runs = db.prepare(`
    SELECT * FROM analytics_runs
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);
  return {
    analysisCount: runs.length,
    lastAnalysisTime: runs[0]?.created_at || '',
    runs
  };
}

function getDashboardSummary(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const learningRecords = db.prepare('SELECT * FROM learning_records WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const knowledgeBases = db.prepare('SELECT * FROM knowledge_bases WHERE user_id = ?').all(userId);
  const knowledgeDocuments = db.prepare('SELECT * FROM knowledge_documents WHERE user_id = ?').all(userId);
  const resume = getResumeAnalytics(userId);
  const analytics = getAnalyticsStats(userId);
  const taskSummary = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN lower(status) IN ('done', 'completed', 'finished') THEN 1 ELSE 0 END) as doneCount,
      SUM(CASE WHEN lower(status) NOT IN ('done', 'completed', 'finished') THEN 1 ELSE 0 END) as pendingCount,
      SUM(CASE WHEN lower(status) = 'active' THEN 1 ELSE 0 END) as todayCount
    FROM tasks
    WHERE user_id = ?
  `).get(userId);
  const knowledgeChunkCount = db.prepare('SELECT COUNT(*) as count FROM knowledge_documents WHERE user_id = ?').get(userId)?.count || 0;
  const learningMinutes = learningRecords.reduce((sum, item) => {
    try {
      const extra = typeof item.note === 'string' ? JSON.parse(item.note) : item.note;
      return sum + Number(extra?.study_minutes || 0);
    } catch {
      return sum;
    }
  }, 0);
  const goalContext = getGoalContext(user?.goal, user?.goal_target_date);
  const totalTasks = Number(taskSummary?.total || 0);
  const completionRate = totalTasks ? Math.round((Number(taskSummary?.doneCount || 0) / totalTasks) * 100) : 0;
  const streak = learningRecords.length ? Math.max(1, Math.min(365, learningRecords.length)) : 0;

  return {
    userId,
    profile: {
      userId: user?.id || userId,
      name: user?.name || '',
      nickname: user?.nickname || user?.name || '',
      avatar: user?.avatar || '',
      identity: user?.identity || '',
      profession: user?.profession || '',
      goal: user?.goal || '',
      goalDate: user?.goal_target_date || '',
      goalTargetDate: user?.goal_target_date || '',
      currentPhase: goalContext.advice,
      createdAt: user?.created_at || '',
      updatedAt: user?.updated_at || ''
    },
    learning: {
      studyHours: Math.round((learningMinutes / 60) * 10) / 10,
      todayTasks: Number(taskSummary?.todayCount || 0),
      completionRate,
      streak,
      pendingTasks: Number(taskSummary?.pendingCount || 0)
    },
    knowledge: {
      baseCount: knowledgeBases.length,
      documentCount: knowledgeDocuments.length,
      chunkCount: knowledgeChunkCount
    },
    resume: {
      optimizeCount: resume.optimizeCount,
      avgAtsScore: resume.avgAtsScore
    },
    analytics: {
      analysisCount: analytics.analysisCount,
      lastAnalysisTime: analytics.lastAnalysisTime
    }
  };
}

app.get('/api/dashboard/summary', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    res.json(getDashboardSummary(userId));
  } catch (error) {
    console.error('[dashboard/summary] error:', error);
    res.json({
      userId: String(req.query.userId || ''),
      profile: { userId: String(req.query.userId || ''), name: '', nickname: '', avatar: '', identity: '', profession: '', goal: '', goalDate: '', goalTargetDate: '', currentPhase: '', createdAt: '', updatedAt: '' },
      learning: { studyHours: 0, todayTasks: 0, completionRate: 0, streak: 0, pendingTasks: 0 },
      knowledge: { baseCount: 0, documentCount: 0, chunkCount: 0 },
      resume: { optimizeCount: 0, avgAtsScore: 0 },
      analytics: { analysisCount: 0, lastAnalysisTime: '' }
    });
  }
});

app.get('/api/dashboard', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    res.json(getDashboardSummary(userId));
  } catch (error) {
    console.error('[dashboard] error:', error);
    res.json({
      userId: String(req.query.userId || ''),
      profile: { userId: String(req.query.userId || ''), name: '', nickname: '', avatar: '', identity: '', profession: '', goal: '', goalDate: '', goalTargetDate: '', currentPhase: '', createdAt: '', updatedAt: '' },
      learning: { studyHours: 0, todayTasks: 0, completionRate: 0, streak: 0, pendingTasks: 0 },
      knowledge: { baseCount: 0, documentCount: 0, chunkCount: 0 },
      resume: { optimizeCount: 0, avgAtsScore: 0 },
      analytics: { analysisCount: 0, lastAnalysisTime: '' }
    });
  }
});

/* =========================================
   会议纪要
========================================= */
app.get('/api/meeting-notes', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM meeting_notes
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json(list);
});

app.post('/api/meeting-notes', (req, res) => {
  const { user_id, title, transcript = null, summary = null, action_items = null } = req.body;

  if (!user_id || !title) {
    return res.status(400).json({ message: 'user_id and title are required' });
  }

  const id = createId();
  db.prepare(`
    INSERT INTO meeting_notes (id, user_id, title, transcript, summary, action_items, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user_id, title, transcript, summary, action_items, now(), now());

  const record = db.prepare('SELECT * FROM meeting_notes WHERE id = ?').get(id);
  res.status(201).json(record);
});

app.post('/api/meeting-notes/analyze', async (req, res) => {
  try {
    const { userId } = req.body;
    const text = req.body.text || '';
    const file = req.files?.audio;

    if (!text && !file) {
      return res.status(400).json({ message: '请上传录音或输入会议文字' });
    }

    let meetingText = text;

    if (file) {
      console.log(`处理音频文件: ${file.name}`);
    }

    const id = createId();
    const summary = `${meetingText.slice(0, 100)}...`;
    const keyPoints = '- 核心内容点1\n- 核心内容点2\n- 核心内容点3';
    const actionItems = '[ ] 待办事项1 - 负责人\n[ ] 待办事项2 - 负责人';
    const teamMembers = '产品经理: 张三\n技术主管: 李四\n设计师: 王五';
    const timeline = '2024-01-20: 方案初稿\n2024-01-25: 评审\n2024-02-01: 上线';
    const suggestions = '1. 建议优先处理高优先级任务\n2. 定期同步进度\n3. 及时沟通风险';

    db.prepare(`
      INSERT INTO meeting_notes (id, user_id, title, transcript, summary, action_items, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      '会议纪要',
      meetingText,
      summary,
      actionItems,
      now(),
      now()
    );

    res.json({
      summary,
      keyPoints,
      actionItems,
      teamMembers,
      timeline,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message || '分析失败' });
  }
});
/* =========================================
   PPT 工坊
========================================= */
app.get('/api/ppt-projects', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM ppt_projects
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  res.json(list);
});

app.post('/api/ppt-projects', (req, res) => {
  const {
    user_id,
    title,
    ppt_type = null,
    template_name = null,
    slide_count = 0,
    outline = null
  } = req.body;

  if (!user_id || !title) {
    return res.status(400).json({ message: 'user_id and title are required' });
  }

  const id = createId();
  db.prepare(`
    INSERT INTO ppt_projects (id, user_id, title, ppt_type, template_name, slide_count, outline, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user_id, title, ppt_type, template_name, slide_count, outline, now(), now());

  const record = db.prepare('SELECT * FROM ppt_projects WHERE id = ?').get(id);
  res.status(201).json(record);
});

/* =========================================
   聊天接口
========================================= */
app.get('/api/chat/messages', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const list = db.prepare(`
    SELECT * FROM chat_messages
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(userId);

  res.json(list);
});

app.post('/api/chat/messages', (req, res) => {
  console.log('===== CHAT ROUTE =====');
  console.log(req.originalUrl);
  console.log(req.body);
  console.log('======================');

  try {
    console.log('[1] Request');
    const { user_id, role, content } = req.body;
    const userId = user_id || req.body.userId || req.headers['x-user-id'] || req.user?.id || req.authUser?.id || '';

    console.log('[2] Auth');
    console.log('userId:', userId);

    if (!role || !content) {
      return res.status(400).json({ success: false, message: 'user_id, role, content are required' });
    }

    if (!userId) {
      console.log('[6] Save Message');
      console.log('userId missing, skip persist');
      console.log('[7] Return Response');
      return res.status(200).json({ success: true, skipped: true, message: 'userId missing, message not persisted' });
    }

    console.log('[6] Save Message');
    console.log('chatId:', 'pending');
    console.log('userId:', userId);
    console.log('message:', content);

    const id = createId();
    db.prepare(`
      INSERT INTO chat_messages (id, user_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, role, content, now());

    const record = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);
    console.log('[7] Return Response');
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('CHAT ERROR');
    console.error(error);
    console.error(error.stack);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});

/* =========================================
   AI 接口
========================================= */
app.post('/api/ai/study-plan', async (req, res) => {
  try {
    const { userId, topic } = req.body;

    if (!userId || !topic) {
      return res.status(400).json({ message: 'userId and topic are required' });
    }

    const prompt = `你是一个学习教练，请根据主题“${topic}”生成一个适合大学生/考研用户的学习计划。请输出 JSON，格式如下：
{
  "title": "xxx",
  "items": ["任务1","任务2","任务3","任务4"]
}
只输出 JSON，不要解释。`;

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个严谨、简洁的学习教练。' },
      { role: 'user', content: prompt }
    ]);

    const content = result?.choices?.[0]?.message?.content || '';
    const parsed = parseAiJson(content);
    res.json({
      raw: content,
      data: parsed,
      parsed: Boolean(parsed)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ai/summarize-document', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'text is required' });
    }

    const prompt = `请把下面文档总结成：1) 一段摘要 2) 5 个关键词 3) 3 条重点结论。请只输出 JSON，格式如下：
{
  "summary": "xxx",
  "keywords": ["a","b","c","d","e"],
  "highlights": ["x","y","z"]
}
文档内容：
${text}`;

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个擅长文档总结的助手。' },
      { role: 'user', content: prompt }
    ]);

    const content = result?.choices?.[0]?.message?.content || '';
    const parsed = parseAiJson(content);
    res.json({
      raw: content,
      data: parsed,
      parsed: Boolean(parsed)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ai/extract-actions', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ message: 'transcript is required' });
    }

    const prompt = `请从下面会议记录中提炼：1) 摘要 2) 行动项数组 3) 负责人建议。请只输出 JSON，格式如下：
{
  "summary": "xxx",
  "actions": [
    { "title": "xxx", "owner": "xxx", "dueDate": "2026-06-24" }
  ]
}
会议记录：
${transcript}`;

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个擅长提炼会议纪要和行动项的助手。' },
      { role: 'user', content: prompt }
    ]);

    const content = result?.choices?.[0]?.message?.content || '';
    const parsed = parseAiJson(content);
    res.json({
      raw: content,
      data: parsed,
      parsed: Boolean(parsed)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ai/generate-ppt-outline', async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ message: 'topic is required' });
    }

    const prompt = `请根据主题“${topic}”生成一份 PPT 大纲，适合大学生答辩/汇报使用。请只输出 JSON，格式如下：
{
  "title": "xxx",
  "slides": ["封面", "背景与问题", "方案设计", "核心内容", "结果展示", "总结"]
}
只输出 JSON，不要解释。`;

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个擅长生成 PPT 大纲的助手。' },
      { role: 'user', content: prompt }
    ]);

    const content = result?.choices?.[0]?.message?.content || '';
    const parsed = parseAiJson(content);
    res.json({
      raw: content,
      data: parsed,
      parsed: Boolean(parsed)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ppt/upload', pptUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'file is required' });
    res.json({
      fileId: req.file.filename,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).replace('.', '').toLowerCase(),
      fileSize: req.file.size,
      originalName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ppt/parse', async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ message: 'fileId is required' });
    const filePath = path.join(PPT_UPLOAD_DIR, fileId);
    const parsed = await parseSourceFile(filePath);
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ppt/generate-outline', async (req, res) => {
  try {
    const { fileId, pptType, template, slideCount } = req.body;
    if (!fileId) return res.status(400).json({ message: 'fileId is required' });
    const filePath = path.join(PPT_UPLOAD_DIR, fileId);
    const parsed = await parseSourceFile(filePath);
    const analysis = analyzeDocumentType(parsed);
    const documentType = analysis.documentType;
    const outline = await generateOutline({ aiCall: callPptAi, content: parsed.text, summary: parsed.summary, sections: parsed.sections, paragraphs: parsed.paragraphs, keywords: parsed.keywords, pptType, template, slideCount, documentType });
    res.json({ ...outline, documentType, analysis, sourceFileName: db.prepare('SELECT original_name FROM files WHERE stored_name = ?').get(fileId)?.original_name || fileId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/ppt/export', async (req, res) => {
  try {
    const { outline, template, pptType, userId, sourceFileId = null } = req.body;
    if (!userId) return res.status(401).json({ message: 'userId is required' });
    if (!outline) return res.status(400).json({ message: 'outline is required' });
    const output = await buildPptxFile({ outline, template, pptType, outputDir: PPT_OUTPUT_DIR, sourceFileName: req.body.sourceFileName || outline.title || 'AI 生成PPT', documentType: req.body.documentType || '教程' });
    const projectId = createId();
    const title = outline.title || 'AI 生成 PPT';
    db.prepare(`
      INSERT INTO ppt_projects (id, user_id, title, ppt_type, template_name, slide_count, outline, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, userId, title, pptType || null, template || null, Array.isArray(outline.slides) ? outline.slides.length : 0, JSON.stringify({ ...outline, pptxFileId: output.fileId, sourceFileId }), now(), now());
    res.json({ fileId: output.fileId, fileName: output.fileName, downloadUrl: `/api/ppt/download/${output.fileId}`, projectId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/ppt-projects/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM ppt_projects WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ message: 'project not found' });
  res.json({ ...record, outline: safeJsonParse(record.outline, null) });
});

app.patch('/api/ppt-projects/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM ppt_projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'project not found' });
  const next = {
    title: req.body.title ?? existing.title,
    ppt_type: req.body.ppt_type ?? existing.ppt_type,
    template_name: req.body.template_name ?? existing.template_name,
    slide_count: req.body.slide_count ?? existing.slide_count,
    outline: req.body.outline ?? existing.outline
  };
  db.prepare(`UPDATE ppt_projects SET title = ?, ppt_type = ?, template_name = ?, slide_count = ?, outline = ?, updated_at = ? WHERE id = ?`).run(next.title, next.ppt_type, next.template_name, next.slide_count, typeof next.outline === 'string' ? next.outline : JSON.stringify(next.outline), now(), req.params.id);
  const updated = db.prepare('SELECT * FROM ppt_projects WHERE id = ?').get(req.params.id);
  res.json({ ...updated, outline: safeJsonParse(updated.outline, null) });
});

app.post('/api/ppt-projects/:id/duplicate', (req, res) => {
  const existing = db.prepare('SELECT * FROM ppt_projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'project not found' });
  const id = createId();
  db.prepare(`INSERT INTO ppt_projects (id, user_id, title, ppt_type, template_name, slide_count, outline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, existing.user_id, `${existing.title}（副本）`, existing.ppt_type, existing.template_name, existing.slide_count, existing.outline, now(), now());
  const record = db.prepare('SELECT * FROM ppt_projects WHERE id = ?').get(id);
  res.status(201).json({ ...record, outline: safeJsonParse(record.outline, null) });
});

app.get('/api/ppt/download/:fileId', (req, res) => {
  const filePath = path.join(PPT_OUTPUT_DIR, req.params.fileId);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'file not found' });
  res.download(filePath);
});

app.post('/api/ai/chat', async (req, res) => {
  console.log('===== CHAT ROUTE =====');
  console.log(req.originalUrl);
  console.log(req.body);
  console.log('======================');

  console.log('[1] Request');
  console.log('Request Received');

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    const userId = req.body.userId || req.body.user_id || req.query?.userId || req.headers['x-user-id'] || req.user?.id || req.authUser?.id || '';

    console.log('[2] Auth');
    console.log('userId:', userId);

    console.log('[3] Knowledge');
    const documentCount = userId ? db.prepare('SELECT COUNT(*) as count FROM knowledge_documents WHERE user_id = ?').get(userId)?.count ?? 0 : 0;
    const chunkCount = userId ? db.prepare('SELECT COUNT(*) as count FROM knowledge_documents WHERE user_id = ?').get(userId)?.count ?? 0 : 0;
    console.log('Knowledge Search');
    console.log(userId);
    console.log(documentCount);
    console.log(chunkCount);
    const results = [];
    console.log('results', results);

    console.log('[4] Call LLM');
    const result = await callDeepSeek([
      { role: 'system', content: '你是一个中文学习办公助手，回答要简洁清晰。' },
      { role: 'user', content: message }
    ], {
      temperature: 0.7,
      max_tokens: 1500
    });

    console.log('[5] LLM Success');
    const content = result?.choices?.[0]?.message?.content || '';

    console.log('[6] Save Message');
    const chatId = createId();
    console.log('chatId:', chatId);
    console.log('userId:', userId);
    console.log('message:', message);
    if (userId) {
      db.prepare(`
        INSERT INTO chat_messages (id, user_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(chatId, userId, 'assistant', content, now());
    }

    console.log('[7] Return Response');
    res.json({ success: true, data: { reply: content } });
  } catch (error) {
    console.error('CHAT ERROR');
    console.error(error);
    console.error(error.stack);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
});

/* =========================================
   启动服务
========================================= */
app.listen(PORT, () => {
  console.log('Server running on 3001');
});