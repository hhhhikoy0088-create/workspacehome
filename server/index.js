const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const OpenAI = require('openai');
const { db, syncBack } = require('./db');
const pptRoutes = require('./routes/ppt');
const { generatePPT, normalizePPTDocument, fallbackDoc } = require('../ppt-engine/index.ts');
const { exportPDF } = require('../ppt/export/pdf.ts');

async function parseSourceFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  try {
    if (ext === '.docx') {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
      } catch {
        const JSZip = require('jszip');
        const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
        const xml = await zip.file('word/document.xml')?.async('text') || '';
        const matches = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        text = matches ? matches.map(t => t.replace(/<[^>]+>/g, '')).join('') : '';
      }
    } else if (ext === '.pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fs.readFileSync(filePath));
        text = data.text || '';
      } catch {
        const buffer = fs.readFileSync(filePath);
        text = buffer.toString('utf-8').replace(/[^\x20-\x7E\u4e00-\u9fa5\s]/g, ' ').trim();
      }
    } else if (ext === '.txt' || ext === '.md') {
      text = fs.readFileSync(filePath, 'utf-8');
    } else {
      text = `已上传文件：${fileName}`;
    }
  } catch (e) {
    text = `已上传文件：${fileName}（内容解析失败：${e.message}）`;
  }

  text = text.trim();
  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    text: text.slice(0, 8000),
    summary: text.slice(0, 1000),
    paragraphs: text.split(/\n\s*\n|\r\n\s*\r\n/).filter(p => p.trim().length > 10).slice(0, 30),
    sections: text.split(/\n\s*\n/).filter(p => p.trim().length > 10).slice(0, 15).map((p, i) => ({ title: `段落 ${i + 1}`, content: p.slice(0, 300) })),
    keywords: [...new Set((text.match(/[\u4e00-\u9fa5]{2,6}/g) || []))].slice(0, 15),
    fileName
  };
}

function analyzeDocumentType(parsed) {
  const text = String(parsed?.text || '');
  const documentType = /PPT|演示|汇报/i.test(text) ? '汇报' : '教程';
  return { documentType, matchedKeywords: parsed?.keywords || [] };
}

async function generateOutline({ content, summary, pptType, slideCount }) {
  const title = String(pptType || 'PPT大纲');
  const slides = Array.from({ length: Math.max(1, Number(slideCount) || 3) }, (_, i) => ({ index: String(i + 1), title: i === 0 ? title : `第 ${i + 1} 页`, type: i === 0 ? 'hero' : 'text', bullets: i === 0 ? [summary || content || ''] : [content || ''] }));
  return { title, subtitle: summary || '', slides };
}

async function buildPptxFile({ outline, outputDir, sourceFileName }) {
  const { exportPPTX } = require('../ppt/export/pptx.ts');
  const normalized = normalizePPTDocument(outline || fallbackDoc(), String(sourceFileName || 'PPT'));
  const buffer = await exportPPTX(normalized);
  const fileName = `${Date.now()}-${String(sourceFileName || outline?.title || 'output').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.pptx`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return { fileId: fileName, fileName };
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const GOAL_OPTIONS = ['考研', '升本', '考公', '考证', '英语四六级', '普通话'];
const PPT_UPLOAD_DIR = path.join(os.tmpdir(), 'ppt-uploads');
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
app.use('/api/ppt', pptRoutes);

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

function getTodayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function recordDailyActivity(userId, source = 'open_app') {
  if (!userId) return;
  const today = getTodayKey();
  const existing = db.prepare('SELECT id FROM user_daily_activity WHERE user_id = ? AND activity_date = ?').get(userId, today);
  if (!existing) {
    db.prepare(`
      INSERT INTO user_daily_activity (id, user_id, activity_date, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(createId(), userId, today, source, now(), now());
  }
}

function getStreakDays(userId) {
  if (!userId) return 0;
  const rows = db.prepare('SELECT activity_date FROM user_daily_activity WHERE user_id = ? ORDER BY activity_date DESC').all(userId);
  if (!rows.length) return 0;

  const user = db.prepare('SELECT created_at FROM users WHERE id = ?').get(userId);
  const createdAt = user?.created_at ? new Date(user.created_at) : new Date(0);

  const today = getTodayKey();
  const yesterday = getTodayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const latest = rows[0].activity_date;

  // 如果今天或昨天都没有活跃，则断掉
  if (latest !== today && latest !== yesterday) return 0;

  const dateSet = new Set(rows.map((r) => r.activity_date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // 只统计创建账号之后的日期
  while (cursor >= createdAt) {
    const key = getTodayKey(cursor);
    if (dateSet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return Math.min(365, streak);
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

function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }
  return obj;
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
    auth: { user, pass },
    connectionTimeout: 5000,
    socketTimeout: 5000,
    greetingTimeout: 5000
  });
}

// --- Resend (HTTP API, works in Railway) ---
let _resendClient = null;
function getResendClient() {
  if (_resendClient) return _resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  _resendClient = new Resend(apiKey);
  return _resendClient;
}

async function sendMailViaResend({ to, subject, text, html }) {
  const client = getResendClient();
  if (!client) throw new Error('RESEND_API_KEY not configured');
  const from = process.env.MAIL_FROM || 'onboarding@resend.dev';
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    text,
    html
  });
  if (error) throw error;
  return data;
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
        ...(options.tools ? { tools: options.tools } : {}),
        ...(options.tool_choice ? { tool_choice: options.tool_choice } : {}),
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
   AI 数据分析（后端路由）
========================================= */
let _openaiClient = null;
function getOpenAIClient() {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
    });
  }
  return _openaiClient;
}

function normalizeAnalyzeRows(rows) {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).trim()] = value;
    }
    return normalized;
  });
}

function buildDatasetSummary(rows) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row || {}))));
  return {
    rowCount: rows.length,
    columns: keys,
    sampleRows: rows.slice(0, 10)
  };
}

app.post('/api/analyze-data', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? normalizeAnalyzeRows(req.body.rows) : [];

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'rows is required' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'DEEPSEEK_API_KEY 未配置' });
    }

    const summary = buildDatasetSummary(rows);
    const prompt = `你是一个数据分析助手。请基于下面的 Excel JSON 数据，输出严格 JSON。
要求：
1. 只能基于输入数据分析，不允许编造
2. 返回数据概览、KPI指标、趋势分析、异常数据、风险点、建议
3. 如果无法判断某项，返回 null 或空数组
4. 输出必须包含 markdownSummary 字段，方便前端渲染

输出格式：
{
  "overview": {
    "rowCount": number,
    "columnCount": number,
    "keyFindings": string[]
  },
  "kpis": [
    { "label": string, "value": string, "delta": string }
  ],
  "trendAnalysis": string[],
  "anomalies": string[],
  "risks": string[],
  "suggestions": string[],
  "markdownSummary": string
}

数据样本：
${JSON.stringify(summary, null, 2)}`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      messages: [
        { role: 'system', content: '只输出严格 JSON，不要解释。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content || '';
    if (!content.trim()) {
      return res.status(502).json({ success: false, message: 'AI 返回空内容' });
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({
        success: false,
        message: 'AI 返回格式异常',
        rawContent: content.slice(0, 200)
      });
    }
    const parsed = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      analysis: parsed,
      summary,
      rows: summary.sampleRows
    });
  } catch (error) {
    console.error('[ANALYZE-DATA ERROR]', error?.message || error);
    return res.status(500).json({
      success: false,
      message: error?.message || '分析服务暂时不可用'
    });
  }
});

/* =========================================
   基础健康检查
========================================= */
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    version: '83e5baf-with-resend',
    resendConfigured: !!process.env.RESEND_API_KEY,
    smtpConfigured: !!(process.env.MAIL_USER && process.env.MAIL_PASS)
  });
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

    const resendConfigured = !!process.env.RESEND_API_KEY;
    const smtpConfigured = process.env.MAIL_USER && process.env.MAIL_PASS;
    let mailSent = false;
    let devCode = null;

    // 1. Try Resend (HTTP API, works in Railway containers)
    if (resendConfigured) {
      try {
        await sendMailViaResend({
          to: email,
          subject: 'Workspace 验证码',
          text: `你的验证码是：${code}，10 分钟内有效。`,
          html: `<p>你的验证码是：<strong style="font-size:24px;letter-spacing:2px;">${code}</strong></p><p>10 分钟内有效。</p>`
        });
        mailSent = true;
        console.log('[SEND CODE RESEND SUCCESS]', { email });
      } catch (resendError) {
        console.error('[SEND CODE RESEND FAILED]', { email, message: resendError.message });
      }
    }

    // 2. Fallback to SMTP (nodemailer) if Resend not configured or failed
    if (!mailSent && smtpConfigured) {
      try {
        const mailer = createMailer();
        const from = process.env.MAIL_FROM || process.env.MAIL_USER;
        const mailPromise = mailer.sendMail({
          from,
          to: email,
          subject: 'Workspace 验证码',
          text: `你的验证码是：${code}，10 分钟内有效。`,
          html: `<p>你的验证码是：<strong style="font-size:24px;letter-spacing:2px;">${code}</strong></p><p>10 分钟内有效。</p>`
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout after 6s')), 6000)
        );
        await Promise.race([mailPromise, timeoutPromise]);
        mailSent = true;
        console.log('[SEND CODE SMTP SUCCESS]', { email });
      } catch (mailError) {
        console.error('[SEND CODE SMTP FAILED]', { email, message: mailError.message, code: mailError.code });
      }
    }

    // If mail not configured or sending failed, return code directly for demo use
    if (!mailSent) {
      devCode = code;
      console.log('[SEND CODE DEV MODE]', { email, code });
    }

    res.json({ message: mailSent ? '验证码已发送至邮箱' : '验证码已生成', email, devCode });
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

/* =========================================
   学习教练 / Learning Coach
========================================= */

function normalizeText(text) {
  return String(text || '').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function splitIntoChunks(text, minLen = 300, maxLen = 600) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const sentences = normalized.split(/(?<=[。！？.!?])\s*/).filter((s) => s.trim().length > 0);
  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length > maxLen && current.length >= minLen) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [normalized.slice(0, maxLen)];
}

function titleFromChunk(content, index = 0) {
  const normalized = normalizeText(content);
  const firstSentence = normalized.split(/(?<=[。！？.!?])\s*/).find((s) => s.trim().length > 0) || '';
  const clean = firstSentence.replace(/[#*\-`\[\]()（）]/g, '').trim();
  if (clean.length >= 8 && clean.length <= 80) return clean;
  if (clean.length > 80) return clean.slice(0, 80);
  return `知识点 ${index + 1}`;
}

function difficultyFromContent(content) {
  const len = normalizeText(content).length;
  if (len < 120) return 'easy';
  if (len < 300) return 'medium';
  return 'hard';
}

function priorityFromContent(content, index = 0) {
  const len = normalizeText(content).length;
  const base = len < 120 ? 1 : len < 300 ? 3 : 5;
  return Math.max(1, Math.min(5, base + index));
}

function generateExerciseFromChunk(chunk, nodeId, knowledgePointId, planId, userId) {
  const content = chunk.content || '';
  const sentences = content.split(/(?<=[。！？.!?])\s*/).filter((s) => s.trim().length > 10);
  const firstSentence = sentences[0] || content.slice(0, 120);

  // 提取 2-6 字中文词作为选项素材
  const words = Array.from(new Set((content.match(/[\u4e00-\u9fa5]{2,6}/g) || []))).filter((w) => w.length >= 2 && w.length <= 6).slice(0, 8);

  const id = createId();
  if (words.length < 4) {
    return {
      id,
      userId,
      studyPlanId: planId,
      nodeId,
      knowledgePointId,
      sourceChunkId: chunk.id,
      question: `阅读材料后判断：以下哪一项描述与材料内容一致？`,
      options: ['描述与材料一致', '描述与材料不一致', '材料未提及', '无法判断'],
      correctAnswer: '描述与材料一致',
      explanation: `根据材料：${firstSentence}`,
      difficulty: 'easy'
    };
  }

  // 正确答案取第一个关键词，确保与问题相关
  const correctAnswer = words[0];
  const distractors = words.slice(1, 4);
  // 打乱选项顺序，但正确答案固定存在
  const options = [correctAnswer, ...distractors];

  return {
    id,
    userId,
    studyPlanId: planId,
    nodeId,
    knowledgePointId,
    sourceChunkId: chunk.id,
    question: `根据材料内容，下列哪一项是被明确提及的概念？`,
    options,
    correctAnswer,
    explanation: `材料中提到：${firstSentence}，其中明确包含「${correctAnswer}」。`,
    difficulty: 'medium'
  };
}

function buildPlanFromKnowledgeBase(userId, knowledgeBaseId, query = '') {
  const base = db.prepare('SELECT * FROM knowledge_bases WHERE id = ? AND user_id = ?').get(knowledgeBaseId, userId);
  if (!base) throw new Error('知识库不存在');

  const documents = db.prepare('SELECT * FROM knowledge_documents WHERE knowledge_base_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 30').all(knowledgeBaseId, userId);
  if (!documents.length) throw new Error('知识库中没有文档，请先上传文件');

  const planId = createId();
  const allExercises = [];

  const knowledgePoints = documents.slice(0, 8).map((doc, index) => {
    const content = normalizeText(doc.content || doc.summary || '');
    const chunks = splitIntoChunks(content, 300, 600);
    const title = titleFromChunk(content, index);
    const difficulty = difficultyFromContent(content);
    const priority = priorityFromContent(content, index);
    const pointId = createId();
    const nodeId = createId();
    const docChunks = chunks.length
      ? chunks.map((c, i) => ({ id: createId(), fileName: doc.original_name || doc.file_name, content: c, chunkIndex: i }))
      : [{ id: createId(), fileName: doc.original_name || doc.file_name, content: content.slice(0, 300), chunkIndex: 0 }];

    const rootNode = {
      id: nodeId,
      title,
      difficulty,
      mastery: 0,
      priority,
      status: index === 0 ? 'active' : 'pending',
      chunkIds: docChunks.map((c) => c.id),
      chunks: docChunks,
      sourceFiles: [doc.original_name || doc.file_name],
      children: docChunks.slice(1).map((c, i) => {
        const childId = createId();
        const childNode = {
          id: childId,
          title: titleFromChunk(c.content, i + 1),
          difficulty: difficultyFromContent(c.content),
          mastery: 0,
          priority: Math.max(1, Math.min(5, priority + i)),
          status: 'pending',
          chunkIds: [c.id],
          chunks: [c],
          sourceFiles: [c.fileName],
          children: []
        };
        // 为叶子节点生成练习题
        const ex = generateExerciseFromChunk(c, childId, pointId, planId, userId);
        allExercises.push(ex);
        return childNode;
      })
    };

    // 为根节点也生成一道综合题
    if (docChunks[0]) {
      const ex = generateExerciseFromChunk(docChunks[0], nodeId, pointId, planId, userId);
      allExercises.push(ex);
    }

    return {
      id: pointId,
      title,
      difficulty,
      mastery: 0,
      priority,
      status: 'pending',
      sourceFiles: [doc.original_name || doc.file_name],
      sourceChunkIds: docChunks.map((c) => c.id),
      chunkIds: docChunks.map((c) => c.id),
      createdAt: now(),
      tree: [rootNode]
    };
  });

  const titles = knowledgePoints.map((p) => p.title);
  const learningRoute = titles.slice(0, 6);
  const dailyPlan = titles.slice(0, 3).map((t) => `学习：${t}`);
  const reviewPlan = titles.slice(0, 4).map((t, i) => `第${i + 1}轮复习：${t}`);

  const tasks = knowledgePoints.map((point, index) => {
    const rootTitle = point.title;
    const dueDate = new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: createId(),
      userId,
      learningPlanId: planId,
      title: `学习并应用：${rootTitle}`,
      status: index === 0 ? 'active' : 'pending',
      order: index + 1,
      dueDate,
      sourceChunkId: point.sourceChunkIds[0],
      fileName: point.sourceFiles[0],
      knowledgePointId: point.id,
      knowledgePointTitle: rootTitle,
      sourceType: 'plan',
      queryText: query,
      createdAt: now()
    };
  });

  const pathRecommendation = knowledgePoints.map((point, index) => ({
    order: index + 1,
    pointId: point.id,
    title: point.title,
    difficulty: point.difficulty,
    mastery: point.mastery,
    sourceChunkIds: point.sourceChunkIds,
    recommendedReason: index === 0 ? '前置基础，优先掌握' : `基于 ${point.sourceFiles[0]} 推荐`
  }));

  const plan = {
    id: planId,
    userId,
    knowledgeBaseId,
    status: 'active',
    title: `基于「${base.name}」的学习计划`,
    knowledgePoints: knowledgePoints.map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      mastery: p.mastery,
      priority: p.priority,
      status: p.status,
      sourceFiles: p.sourceFiles,
      sourceChunkIds: p.sourceChunkIds,
      chunkIds: p.chunkIds,
      createdAt: p.createdAt,
      tree: p.tree
    })),
    learningRoute,
    dailyPlan,
    reviewPlan,
    exercises: allExercises
  };

  return { plan, tasks, pathRecommendation, knowledgePoints, exercises: allExercises };
}

function persistLearningPlan(userId, knowledgeBaseId, query = '') {
  const { plan, tasks, pathRecommendation, knowledgePoints, exercises } = buildPlanFromKnowledgeBase(userId, knowledgeBaseId, query);

  db.prepare(`
    INSERT INTO study_plans (id, user_id, title, content, status, knowledge_base_id, knowledge_points_json, learning_route_json, daily_plan_json, review_plan_json, exercises_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    plan.id,
    userId,
    plan.title,
    JSON.stringify(plan),
    plan.status,
    knowledgeBaseId,
    JSON.stringify(plan.knowledgePoints),
    JSON.stringify(plan.learningRoute),
    JSON.stringify(plan.dailyPlan),
    JSON.stringify(plan.reviewPlan),
    JSON.stringify(plan.exercises),
    now(),
    now()
  );

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, source, task_order, source_chunk_id, file_name, knowledge_point_id, knowledge_point_title, source_type, query_text, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const task of tasks) {
    insertTask.run(
      task.id,
      userId,
      task.title,
      JSON.stringify({ sourceType: task.sourceType, queryText: task.queryText }),
      task.status,
      'medium',
      task.dueDate,
      'learning-coach',
      task.order,
      task.sourceChunkId,
      task.fileName,
      task.knowledgePointId,
      task.knowledgePointTitle,
      task.sourceType,
      task.queryText,
      now(),
      now()
    );
  }

  const insertExercise = db.prepare(`
    INSERT INTO exercises (id, user_id, study_plan_id, node_id, knowledge_point_id, source_chunk_id, question, options, correct_answer, explanation, difficulty, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ex of exercises) {
    insertExercise.run(
      ex.id,
      ex.userId,
      ex.studyPlanId,
      ex.nodeId,
      ex.knowledgePointId,
      ex.sourceChunkId,
      ex.question,
      JSON.stringify(ex.options),
      ex.correctAnswer,
      ex.explanation,
      ex.difficulty,
      now(),
      now()
    );
  }

  return { plan, tasks, pathRecommendation, exercises };
}

function calculateNodeMastery(nodeId, totalExercises) {
  if (!totalExercises) return 0;
  const attempts = db.prepare('SELECT * FROM exercise_attempts WHERE exercise_id IN (SELECT id FROM exercises WHERE node_id = ?)').all(nodeId);
  if (!attempts.length) return 0;
  const correct = attempts.filter((a) => a.is_correct === 1).length;
  return Math.round((correct / attempts.length) * 100);
}

function buildCoachContext(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');

  const planRecord = db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
  const goalContext = getGoalContext(user?.goal, user?.goal_target_date);

  if (!planRecord) {
    return { user: serializeUser(user), goalContext, plan: null, tasks: [], progress: { learningProgress: 0, todayTasks: 0, completionRate: 0, streakDays: getStreakDays(userId) }, pathRecommendation: [], wrongAnswers: [] };
  }

  const knowledgePoints = safeJsonParse(planRecord.knowledge_points_json, []);
  const plan = {
    id: planRecord.id,
    userId: planRecord.user_id,
    knowledgeBaseId: planRecord.knowledge_base_id,
    status: planRecord.status,
    title: planRecord.title,
    knowledgePoints: Array.isArray(knowledgePoints) ? knowledgePoints : safeJsonParse(planRecord.content, {})?.knowledgePoints || [],
    learningRoute: safeJsonParse(planRecord.learning_route_json, []),
    dailyPlan: safeJsonParse(planRecord.daily_plan_json, []),
    reviewPlan: safeJsonParse(planRecord.review_plan_json, []),
    exercises: safeJsonParse(planRecord.exercises_json, [])
  };

  // 用答题记录计算每个节点的掌握度
  const exerciseRecords = db.prepare('SELECT * FROM exercises WHERE study_plan_id = ? AND user_id = ?').all(planRecord.id, userId);
  const exercisesByNode = {};
  for (const ex of exerciseRecords) {
    if (!exercisesByNode[ex.node_id]) exercisesByNode[ex.node_id] = [];
    exercisesByNode[ex.node_id].push(ex);
  }

  const walkTree = (nodes) => {
    for (const node of nodes || []) {
      node.mastery = calculateNodeMastery(node.id, (exercisesByNode[node.id] || []).length);
      if (node.children) walkTree(node.children);
    }
  };
  for (const point of plan.knowledgePoints || []) {
    walkTree(point.tree);
  }

  const pathRecommendation = (plan.knowledgePoints || []).map((point, index) => ({
    order: index + 1,
    pointId: point.id,
    title: point.title,
    difficulty: point.difficulty,
    mastery: point.mastery,
    sourceChunkIds: point.sourceChunkIds || point.chunkIds || [],
    recommendedReason: index === 0 ? '前置基础，优先掌握' : `基于 ${(point.sourceFiles || [])[0] || '知识库'} 推荐`
  }));

  const taskRecords = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND source = ? ORDER BY task_order ASC, created_at ASC').all(userId, 'learning-coach');
  const tasks = taskRecords.map((t) => ({
    id: t.id,
    userId: t.user_id,
    learningPlanId: planRecord.id,
    title: t.title,
    status: t.status,
    order: t.task_order,
    dueDate: t.due_date,
    sourceChunkId: t.source_chunk_id,
    fileName: t.file_name,
    knowledgePointId: t.knowledge_point_id,
    knowledgePointTitle: t.knowledge_point_title,
    sourceType: t.source_type,
    queryText: t.query_text,
    createdAt: t.created_at
  }));

  const doneCount = tasks.filter((t) => ['completed', 'done', 'finished'].includes(String(t.status).toLowerCase())).length;
  const total = tasks.length || 1;
  const completionRate = Math.round((doneCount / total) * 100);
  const todayTasks = tasks.filter((t) => String(t.status).toLowerCase() === 'active').length;
  const streakDays = getStreakDays(userId);
  const progress = {
    learningProgress: completionRate,
    todayTasks,
    completionRate,
    streakDays
  };

  const wrongAnswers = db.prepare(`
    SELECT a.*, e.question, e.options, e.correct_answer, e.explanation, e.node_id, e.difficulty
    FROM exercise_attempts a
    JOIN exercises e ON a.exercise_id = e.id
    WHERE a.user_id = ? AND a.is_correct = 0
    ORDER BY a.created_at DESC
    LIMIT 50
  `).all(userId);

  return { user: serializeUser(user), goalContext, plan, tasks, progress, pathRecommendation, wrongAnswers: wrongAnswers.map((w) => ({ ...w, options: safeJsonParse(w.options, []) })) };
}

app.get('/api/learning-coach/context', (req, res) => {
  try {
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    recordDailyActivity(userId);
    const context = buildCoachContext(userId);
    res.json({ success: true, data: context });
  } catch (error) {
    console.error('[learning-coach/context] error:', error);
    res.status(500).json({ message: error.message || '加载学习教练上下文失败' });
  }
});

app.post('/api/learning/coach', (req, res) => {
  try {
    const userId = String(req.body.userId || '').trim();
    const knowledgeBaseId = String(req.body.knowledgeBaseId || '').trim();
    const query = String(req.body.query || '').trim();

    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (!knowledgeBaseId) return res.status(400).json({ message: 'knowledgeBaseId is required' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 清除该用户旧的学习教练任务和计划（保持单一当前计划）
    db.prepare('DELETE FROM tasks WHERE user_id = ? AND source = ?').run(userId, 'learning-coach');
    db.prepare('DELETE FROM study_plans WHERE user_id = ? AND knowledge_base_id = ?').run(userId, knowledgeBaseId);
    db.prepare('DELETE FROM exercises WHERE user_id = ? AND study_plan_id IN (SELECT id FROM study_plans WHERE user_id = ?)').run(userId, userId);

    const { plan, tasks, pathRecommendation, exercises } = persistLearningPlan(userId, knowledgeBaseId, query);
    const progress = {
      learningProgress: 0,
      todayTasks: tasks.filter((t) => t.status === 'active').length,
      completionRate: 0,
      streakDays: getStreakDays(userId)
    };

    syncBack();
    res.json({ success: true, data: { plan, tasks, progress, pathRecommendation, exercises } });
  } catch (error) {
    console.error('[learning/coach] error:', error);
    res.status(500).json({ message: error.message || '生成学习计划失败' });
  }
});

app.patch('/api/learning/plans/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const validStatuses = ['active', 'paused', 'completed', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态' });
    }
    const existing = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Plan not found' });
    db.prepare('UPDATE study_plans SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
    syncBack();
    res.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error('[learning/plans/status] error:', error);
    res.status(500).json({ message: error.message || '更新计划状态失败' });
  }
});

app.patch('/api/learning/tasks/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const validStatuses = ['pending', 'active', 'paused', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态' });
    }
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Task not found' });
    const completedAt = status === 'completed' ? now() : null;
    db.prepare('UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run(status, completedAt, now(), id);
    syncBack();
    res.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error('[learning/tasks/status] error:', error);
    res.status(500).json({ message: error.message || '更新任务状态失败' });
  }
});

app.post('/api/learning/plans/:id/reschedule', (req, res) => {
  try {
    const { id } = req.params;
    const { title, learningRoute, dailyPlan, reviewPlan, exercises } = req.body || {};
    const existing = db.prepare('SELECT * FROM study_plans WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Plan not found' });

    const content = safeJsonParse(existing.content, {});
    const nextContent = {
      ...content,
      learningRoute: Array.isArray(learningRoute) ? learningRoute : content.learningRoute,
      dailyPlan: Array.isArray(dailyPlan) ? dailyPlan : content.dailyPlan,
      reviewPlan: Array.isArray(reviewPlan) ? reviewPlan : content.reviewPlan,
      exercises: Array.isArray(exercises) ? exercises : content.exercises
    };

    db.prepare(`
      UPDATE study_plans
      SET title = ?, content = ?, status = ?, learning_route_json = ?, daily_plan_json = ?, review_plan_json = ?, exercises_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title || existing.title,
      JSON.stringify(nextContent),
      'rescheduled',
      JSON.stringify(nextContent.learningRoute),
      JSON.stringify(nextContent.dailyPlan),
      JSON.stringify(nextContent.reviewPlan),
      JSON.stringify(nextContent.exercises),
      now(),
      id
    );

    db.prepare('UPDATE tasks SET status = ?, rescheduled_at = ?, updated_at = ? WHERE user_id = ? AND source = ? AND status != ?').run('pending', now(), now(), existing.user_id, 'learning-coach', 'completed');
    syncBack();
    res.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error('[learning/plans/reschedule] error:', error);
    res.status(500).json({ message: error.message || '重新安排计划失败' });
  }
});

function findNodeInPlans(userId, nodeId) {
  const plans = db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  for (const planRecord of plans) {
    const points = safeJsonParse(planRecord.knowledge_points_json, []);
    for (const point of points) {
      const walk = (nodes) => {
        for (const node of nodes || []) {
          if (node.id === nodeId) return { node, planRecord, point };
          if (node.children) {
            const found = walk(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const found = walk(point.tree);
      if (found) return found;
    }
  }
  return null;
}

app.get('/api/learning/nodes/:id/chunks', (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const found = findNodeInPlans(userId, id);
    if (!found) return res.status(404).json({ message: 'Node not found' });

    const chunks = (found.node.chunks || []).map((c, i) => ({
      id: c.id,
      fileName: c.fileName,
      content: c.content || '',
      chunkIndex: c.chunkIndex ?? i
    }));

    res.json({ success: true, data: { chunks } });
  } catch (error) {
    console.error('[learning/nodes/chunks] error:', error);
    res.status(500).json({ message: error.message || '获取节点 chunk 失败' });
  }
});

app.get('/api/learning/nodes/:id/exercises', (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const found = findNodeInPlans(userId, id);
    if (!found) return res.status(404).json({ message: 'Node not found' });

    const records = db.prepare('SELECT * FROM exercises WHERE node_id = ? AND user_id = ? ORDER BY created_at ASC').all(id, userId);
    const exercises = records.map((e) => ({
      id: e.id,
      nodeId: e.node_id,
      knowledgePointId: e.knowledge_point_id,
      question: e.question,
      options: safeJsonParse(e.options, []),
      correctAnswer: e.correct_answer,
      explanation: e.explanation,
      difficulty: e.difficulty
    }));

    res.json({ success: true, data: { exercises } });
  } catch (error) {
    console.error('[learning/nodes/exercises] error:', error);
    res.status(500).json({ message: error.message || '获取节点练习题失败' });
  }
});

app.patch('/api/learning/nodes/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.body.userId || '').trim();
    const { status } = req.body || {};
    const validStatuses = ['pending', 'active', 'paused', 'completed'];
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (!validStatuses.includes(status)) return res.status(400).json({ message: '无效的状态' });

    const found = findNodeInPlans(userId, id);
    if (!found) return res.status(404).json({ message: 'Node not found' });

    // 更新 knowledge_points_json 中对应节点状态
    const points = safeJsonParse(found.planRecord.knowledge_points_json, []);
    const walk = (nodes) => {
      for (const node of nodes || []) {
        if (node.id === id) {
          node.status = status;
          return true;
        }
        if (node.children && walk(node.children)) return true;
      }
      return false;
    };
    for (const point of points) walk(point.tree);

    const content = safeJsonParse(found.planRecord.content, {});
    const newKnowledgePoints = points;
    const newContent = { ...content, knowledgePoints: newKnowledgePoints };

    db.prepare('UPDATE study_plans SET knowledge_points_json = ?, content = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(newKnowledgePoints),
      JSON.stringify(newContent),
      now(),
      found.planRecord.id
    );
    syncBack();
    res.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error('[learning/nodes/status] error:', error);
    res.status(500).json({ message: error.message || '更新节点状态失败' });
  }
});

app.post('/api/learning/exercises/:id/submit', (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.body.userId || '').trim();
    const { answer } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?').get(id, userId);
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const isCorrect = String(answer).trim() === String(exercise.correct_answer).trim();
    const masteryDelta = isCorrect ? 10 : -5;

    db.prepare(`
      INSERT INTO exercise_attempts (id, user_id, exercise_id, answer, is_correct, mastery_delta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(createId(), userId, id, String(answer).trim(), isCorrect ? 1 : 0, masteryDelta, now());

    syncBack();
    res.json({ success: true, data: { isCorrect, correctAnswer: exercise.correct_answer, explanation: exercise.explanation, masteryDelta } });
  } catch (error) {
    console.error('[learning/exercises/submit] error:', error);
    res.status(500).json({ message: error.message || '提交答案失败' });
  }
});

app.get('/api/learning/wrong-answers', (req, res) => {
  try {
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const rows = db.prepare(`
      SELECT a.*, e.question, e.options, e.correct_answer, e.explanation, e.node_id, e.difficulty
      FROM exercise_attempts a
      JOIN exercises e ON a.exercise_id = e.id
      WHERE a.user_id = ? AND a.is_correct = 0
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all(userId);

    const wrongAnswers = rows.map((w) => ({
      id: w.id,
      exerciseId: w.exercise_id,
      answer: w.answer,
      correctAnswer: w.correct_answer,
      explanation: w.explanation,
      question: w.question,
      options: safeJsonParse(w.options, []),
      nodeId: w.node_id,
      difficulty: w.difficulty,
      createdAt: w.created_at
    }));

    res.json({ success: true, data: { wrongAnswers } });
  } catch (error) {
    console.error('[learning/wrong-answers] error:', error);
    res.status(500).json({ message: error.message || '获取错题本失败' });
  }
});

app.get('/api/knowledge', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(401).json({ message: 'userId is required' });
  }
  const bases = db.prepare('SELECT * FROM knowledge_bases WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  const documents = db.prepare('SELECT * FROM knowledge_documents WHERE user_id = ? ORDER BY created_at DESC').all(userId);

  const docCounts = db.prepare('SELECT knowledge_base_id, COUNT(*) as cnt FROM knowledge_documents WHERE user_id = ? GROUP BY knowledge_base_id').all(userId);
  const docMap = {};
  docCounts.forEach((d) => { docMap[d.knowledge_base_id] = d.cnt; });

  const enrichedBases = bases.map((b) => ({
    ...b,
    document_count: docMap[b.id] || 0,
    chunk_count: docMap[b.id] || 0
  }));

  res.json({
    bases: snakeToCamel(enrichedBases),
    documents: snakeToCamel(documents.map((item) => ({ ...item, tags: safeJsonParse(item.tags, []) }))),
    stats: {
      baseCount: bases.length,
      documentCount: documents.length,
      chunkCount: documents.length
    }
  });
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

  const docCounts = db.prepare('SELECT knowledge_base_id, COUNT(*) as cnt FROM knowledge_documents WHERE user_id = ? GROUP BY knowledge_base_id').all(userId);
  const docMap = {};
  docCounts.forEach((d) => { docMap[d.knowledge_base_id] = d.cnt; });

  const enrichedList = list.map((b) => ({
    ...b,
    document_count: docMap[b.id] || 0,
    chunk_count: docMap[b.id] || 0
  }));

  res.json(snakeToCamel(enrichedList));
});

app.post('/api/knowledge-bases', (req, res) => {
  const { user_id, userId, name, description = null } = req.body;
  const uid = user_id || userId;

  if (!uid || !name) {
    return res.status(400).json({ message: 'user_id and name are required' });
  }

  // Ensure user exists for FK
  const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(uid);
  if (!userExists) {
    db.prepare('INSERT INTO users (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      uid, '用户', now(), now()
    );
  }

  const id = createId();
  db.prepare(`
    INSERT INTO knowledge_bases (id, user_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, uid, name, description, now(), now());

  const record = db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(id);
  res.status(201).json(snakeToCamel(record));
});

app.get('/api/knowledge-bases/:id/files', (req, res) => {
  const { id } = req.params;

  const files = db.prepare(`
    SELECT * FROM knowledge_documents
    WHERE knowledge_base_id = ?
    ORDER BY created_at DESC
  `).all(id);

  res.json(snakeToCamel(files.map((file) => ({
    ...file,
    tags: safeJsonParse(file.tags, [])
  }))));
});

const KNOWLEDGE_UPLOAD_DIR = path.join(os.tmpdir(), 'knowledge-uploads');
const knowledgeUpload = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => cb(null, KNOWLEDGE_UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
}), limits: { fileSize: 50 * 1024 * 1024 } });
fs.mkdirSync(KNOWLEDGE_UPLOAD_DIR, { recursive: true });

app.post('/api/knowledge-upload', knowledgeUpload.single('file'), async (req, res) => {
  try {
    const { knowledge_base_id, user_id } = req.body;
    if (!req.file) return res.status(400).json({ message: 'file is required' });
    if (!user_id) return res.status(400).json({ message: 'user_id is required' });

    // Ensure user exists (create minimal record if missing to satisfy FK)
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!userExists) {
      db.prepare('INSERT INTO users (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        user_id, '用户', now(), now()
      );
    }

    let baseId = knowledge_base_id;
    let baseName = req.body.knowledge_base_name || '';
    const parsed = await parseSourceFile(req.file.path);
    const analysis = analyzeDocumentType(parsed);

    // Verify knowledge_base_id actually exists; if not, fall back to creating new
    if (baseId) {
      const baseExists = db.prepare('SELECT id FROM knowledge_bases WHERE id = ?').get(baseId);
      if (!baseExists) baseId = null;
    }

    if (!baseId) {
      baseName = baseName || req.body.display_name || req.file.originalname.replace(/\.[^.]+$/, '').slice(0, 24) || analysis.documentType;
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
      (req.body.display_name || '').trim() || null,
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
    res.status(201).json({
      ...snakeToCamel(record),
      displayName: normalizeFilename(record.display_name || record.original_name),
      tags: safeJsonParse(record.tags, []),
      analysis,
      knowledgeBase: snakeToCamel(base)
    });
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
  res.json({ documents: snakeToCamel(list.map((item) => ({ ...item, tags: safeJsonParse(item.tags, []) }))) });
});

app.delete('/api/knowledge-bases/:id', (req, res) => {
  const { id } = req.params;
  const record = db.prepare('SELECT * FROM knowledge_bases WHERE id = ?').get(id);
  if (!record) return res.status(404).json({ message: 'knowledge base not found' });
  db.prepare('DELETE FROM knowledge_documents WHERE knowledge_base_id = ?').run(id);
  db.prepare('DELETE FROM knowledge_bases WHERE id = ?').run(id);
  res.json({ message: 'deleted', id });
});

app.get('/api/knowledge-documents/:id', (req, res) => {
  const record = db.prepare('SELECT * FROM knowledge_documents WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ message: 'document not found' });
  res.json(snakeToCamel({ ...record, tags: safeJsonParse(record.tags, []) }));
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
  const streak = getStreakDays(userId);

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
    recordDailyActivity(userId);
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
    recordDailyActivity(userId);
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

app.post('/api/daily-activity', (req, res) => {
  try {
    const userId = String(req.body.userId || '').trim();
    const source = String(req.body.source || 'open_app').trim();
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    recordDailyActivity(userId, source);
    res.json({ success: true, streakDays: getStreakDays(userId) });
  } catch (error) {
    console.error('[daily-activity] error:', error);
    res.status(500).json({ message: error.message || '记录每日活跃失败' });
  }
});

app.get('/api/daily-activity', (req, res) => {
  try {
    const userId = String(req.query.userId || '').trim();
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    recordDailyActivity(userId);
    const rows = db.prepare('SELECT activity_date FROM user_daily_activity WHERE user_id = ? ORDER BY activity_date DESC').all(userId);
    res.json({
      streakDays: getStreakDays(userId),
      dates: rows.map((r) => r.activity_date)
    });
  } catch (error) {
    console.error('[daily-activity] error:', error);
    res.status(500).json({ message: error.message || '获取每日活跃失败' });
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
      originalName: req.file.originalname,
      pages: 15
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'ERROR', message: error.message } });
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
    res.status(500).json({ success: false, error: { code: 'ERROR', message: error.message } });
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
    const outline = await generateOutline({ content: parsed.text, summary: parsed.summary, sections: parsed.sections, paragraphs: parsed.paragraphs, keywords: parsed.keywords, pptType, template, slideCount, documentType });
    res.json({ ...outline, documentType, analysis, sourceFileName: fileId });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'ERROR', message: error.message } });
  }
});

app.post('/api/ppt/export-pptx', async (req, res) => {
  try {
    const { outline } = req.body;
    const output = await buildPptxFile({ outline: outline || fallbackDoc(), outputDir: PPT_OUTPUT_DIR, sourceFileName: req.body.sourceFileName || outline?.title || 'AI 生成PPT' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.send(fs.readFileSync(path.join(PPT_OUTPUT_DIR, output.fileName)));
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'ERROR', message: error.message } });
  }
});

app.post('/api/ppt/export-pdf', async (req, res) => {
  try {
    const doc = normalizePPTDocument(req.body?.outline || req.body?.document || fallbackDoc(), String(req.body?.input || 'PPT生成器'));
    const pdf = await exportPDF(doc);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'ERROR', message: error.message } });
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

// ── 工具定义 ──
const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: '获取用户的任务列表，可按状态筛选。用户问"我的任务""今日任务""待办"时调用。',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed'], description: '任务状态' },
          limit: { type: 'number', description: '返回条数上限，默认20' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_study_plans',
      description: '获取用户的学习计划列表。用户问"学习计划""我的计划"时调用。',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'completed', 'paused'], description: '计划状态' },
          limit: { type: 'number', description: '返回条数上限，默认10' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_learning_records',
      description: '获取用户的学习记录和进度。用户问"学习状态""学习分析""学了什么"时调用。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '返回条数上限，默认20' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_knowledge_bases',
      description: '获取用户的知识库列表。用户问"知识库""我的资料"时调用。',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: '返回条数上限，默认10' }
        }
      }
    }
  }
];

// ── 工具执行器 ──
function executeChatTool(name, args, userId) {
  if (!userId) return { error: '用户未登录，无法查询数据' };
  const limit = args.limit || 20;
  switch (name) {
    case 'get_tasks': {
      let rows;
      if (args.status) {
        rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?').all(userId, args.status, limit);
      } else {
        rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
      }
      return {
        total: rows.length,
        counts_by_status: {
          pending: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = ?').get(userId, 'pending')?.c || 0,
          in_progress: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = ?').get(userId, 'in_progress')?.c || 0,
          completed: db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND status = ?').get(userId, 'completed')?.c || 0
        },
        tasks: rows.map(r => ({
          id: r.id, title: r.title, status: r.status, priority: r.priority,
          due_date: r.due_date, source_type: r.source_type, created_at: r.created_at
        }))
      };
    }
    case 'get_study_plans': {
      let rows;
      if (args.status) {
        rows = db.prepare('SELECT * FROM study_plans WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?').all(userId, args.status, limit);
      } else {
        rows = db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
      }
      return {
        total: rows.length,
        plans: rows.map(r => ({
          id: r.id, title: r.title, status: r.status,
          knowledge_base_id: r.knowledge_base_id, created_at: r.created_at
        }))
      };
    }
    case 'get_learning_records': {
      const rows = db.prepare('SELECT * FROM learning_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
      const total = db.prepare('SELECT COUNT(*) as c FROM learning_records WHERE user_id = ?').get(userId)?.c || 0;
      const avgMastery = db.prepare('SELECT AVG(mastery) as avg FROM learning_records WHERE user_id = ?').get(userId)?.avg || 0;
      return {
        total,
        average_mastery: Math.round(avgMastery * 10) / 10,
        records: rows.map(r => ({
          id: r.id, subject: r.subject, topic: r.topic,
          mastery: r.mastery, note: r.note, created_at: r.created_at
        }))
      };
    }
    case 'get_knowledge_bases': {
      const rows = db.prepare('SELECT kb.*, (SELECT COUNT(*) FROM knowledge_documents kd WHERE kd.knowledge_base_id = kb.id) as doc_count FROM knowledge_bases kb WHERE kb.user_id = ? ORDER BY kb.updated_at DESC LIMIT ?').all(userId, limit);
      return {
        total: rows.length,
        knowledge_bases: rows.map(r => ({
          id: r.id, name: r.name, description: r.description,
          source_type: r.source_type, doc_count: r.doc_count, created_at: r.created_at
        }))
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── 意图识别：从用户消息中提取数据上下文 ──
function buildIntentContext(message, userId) {
  const msg = message.toLowerCase();
  const snippets = [];

  // 任务相关
  if (/任务|待办|todo|task|今天要做/.test(msg)) {
    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
    if (tasks.length > 0) {
      const pending = tasks.filter(t => t.status === 'pending');
      const inProgress = tasks.filter(t => t.status === 'in_progress');
      snippets.push(`【用户任务数据】共${tasks.length}条。待处理${pending.length}条，进行中${inProgress.length}条。`);
      snippets.push(pending.slice(0, 8).map(t => `- [${t.priority}] ${t.title} (截止:${t.due_date || '未设'})`).join('\n'));
    }
  }

  // 学习计划相关
  if (/学习计划|学习路径|计划|plan|study/.test(msg)) {
    const plans = db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10').all(userId);
    if (plans.length > 0) {
      snippets.push(`【学习计划数据】共${plans.length}个计划。`);
      snippets.push(plans.map(p => `- ${p.title} [${p.status}]`).join('\n'));
    }
  }

  // 知识库相关
  if (/知识库|资料|文档|知识|knowledge/.test(msg)) {
    const kbs = db.prepare('SELECT kb.*, (SELECT COUNT(*) FROM knowledge_documents kd WHERE kd.knowledge_base_id = kb.id) as doc_count FROM knowledge_bases kb WHERE kb.user_id = ? ORDER BY kb.updated_at DESC LIMIT 10').all(userId);
    if (kbs.length > 0) {
      snippets.push(`【知识库数据】共${kbs.length}个知识库。`);
      snippets.push(kbs.map(k => `- ${k.name}（${k.doc_count}个文档）`).join('\n'));
    }
  }

  if (snippets.length === 0) return '';
  return '\n\n===== 以下是用户的实际数据，请基于这些数据回答 =====\n' + snippets.join('\n\n');
}

// ── 主路由 ──
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    const userId = req.body.userId || req.body.user_id || req.query?.userId || req.headers['x-user-id'] || req.user?.id || req.authUser?.id || '';

    // 1. 意图识别：注入真实数据上下文
    const intentContext = userId ? buildIntentContext(message, userId) : '';
    const systemPrompt = '你是小W，一个学习办公助手，隶属于虾米Workspace平台。回答要简洁清晰，可以有条目但不啰嗦。如果用户的真实数据为空（比如没有任务、没有计划），如实告知用户当前没有相关数据，并给出建议。'
      + intentContext;

    // 2. Function Calling 循环（最多 3 轮）
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    let finalReply = '';

    for (let round = 0; round < 3; round++) {
      const result = await callDeepSeek(messages, {
        temperature: 0.7,
        max_tokens: 2000,
        enableThinking: false,
        tools: CHAT_TOOLS,
        tool_choice: 'auto'
      });

      const choice = result?.choices?.[0];
      if (!choice) { finalReply = 'AI 返回为空，请重试。'; break; }

      const msg = choice.message;

      // 如果 AI 要调用工具
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // 构建 assistant 消息（content 可能为 null，需兼容处理）
        const assistantMsg = { role: 'assistant', tool_calls: msg.tool_calls };
        if (msg.content) assistantMsg.content = msg.content;
        messages.push(assistantMsg);

        // 执行每个工具调用
        for (const tc of msg.tool_calls) {
          let toolResult;
          try {
            const args = JSON.parse(tc.function.arguments);
            toolResult = executeChatTool(tc.function.name, args, userId);
          } catch (e) {
            toolResult = { error: e.message };
          }
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) });
        }
        continue; // 继续下一轮
      }

      // 正常文本回复
      finalReply = msg.content || '';
      break;
    }

    if (!finalReply) finalReply = '抱歉，我暂时无法处理这个请求，请换个方式表达试试？';

    // 保存 AI 回复到数据库
    if (userId) {
      const chatId = createId();
      db.prepare('INSERT INTO chat_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(chatId, userId, 'assistant', finalReply, now());
    }

    res.json({ success: true, data: { reply: finalReply } });
  } catch (error) {
    console.error('CHAT ERROR');
    console.error(error);
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