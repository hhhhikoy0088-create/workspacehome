const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../db');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../uploads/resumes');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 PDF、Word 或 TXT 文档'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

const KEYWORDS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'NestJS', 'Python', 'Java',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GCP',
  'CI/CD', 'Git', 'Linux', '微服务', 'REST', 'GraphQL', 'HTML', 'CSS', '前端', '后端',
  '算法', '数据结构', '项目管理', '测试', '系统设计', 'Spring', 'Spring Boot'
];

function normalizeText(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();
}

async function parseResumeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = normalizeText(data.text);
    console.log('[简历解析] PDF extracted chars:', text.length);
    console.log('[简历解析] PDF extracted text:\n' + text);
    return text;
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    const text = normalizeText(result.value);
    console.log('[简历解析] DOCX extracted chars:', text.length);
    console.log('[简历解析] DOCX extracted text:\n' + text);
    return text;
  }
  if (ext === '.txt') {
    const text = normalizeText(fs.readFileSync(filePath, 'utf8'));
    console.log('[简历解析] TXT extracted chars:', text.length);
    console.log('[简历解析] TXT extracted text:\n' + text);
    return text;
  }
  throw new Error('不支持的文件格式');
}

function extractSections(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const sectionMap = { skills: [], experience: [], projects: [], education: [], contact: [] };
  let current = 'contact';
  for (const line of lines) {
    if (/技能|专业技能|核心技能/i.test(line)) current = 'skills';
    else if (/经历|工作经历|实习经历/i.test(line)) current = 'experience';
    else if (/项目/i.test(line)) current = 'projects';
    else if (/教育|学历|院校/i.test(line)) current = 'education';
    sectionMap[current].push(line);
  }
  return sectionMap;
}

function detectKeywords(text) {
  const found = KEYWORDS.filter((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text));
  return [...new Set(found)];
}

function computeAtsScore(text, foundKeywords, sections) {
  const lengthScore = Math.min(25, Math.round(text.length / 200));
  const keywordScore = Math.min(45, foundKeywords.length * 4);
  const sectionScore = [sections.contact, sections.skills, sections.experience, sections.projects, sections.education]
    .reduce((sum, arr) => sum + (arr.length ? 6 : 0), 0);
  const quantScore = Math.min(15, (text.match(/\d+%|\d+[万千]?|\d+\+|\d+年/g) || []).length * 3);
  const score = lengthScore + keywordScore + sectionScore + quantScore;
  return Math.max(0, Math.min(100, score || null));
}

function inferMissingKeywords(text) {
  const found = new Set(detectKeywords(text));
  const priorities = ['TypeScript', 'React', 'Node.js', 'SQL', 'Docker', 'Git', 'Python', 'JavaScript'];
  return priorities.filter((k) => !found.has(k)).slice(0, 8);
}

function buildOptimizedResume(text, analysis) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const skills = analysis.skillsOptimization.current;
  const recommended = analysis.skillsOptimization.recommended;
  const additions = analysis.skillsOptimization.additions;
  const intro = lines.slice(0, 5).join(' \n');
  return [
    '# 优化后的简历',
    '',
    '## 个人信息',
    intro || '（请补充个人信息）',
    '',
    '## 技能',
    [...skills, ...recommended, ...additions].filter(Boolean).map((s) => `- ${s}`).join('\n') || '-（无）',
    '',
    '## 经历',
    lines.filter((l) => /经历|工作/i.test(l) || /^[-•]/.test(l)).map((l) => `- ${l}`).join('\n') || '（请补充经历）',
    '',
    '## 项目',
    lines.filter((l) => /项目/i.test(l) || /^[-•]/.test(l)).map((l) => `- ${l}`).join('\n') || '（请补充项目）',
    '',
    '## 教育',
    lines.filter((l) => /教育|学历|院校/i.test(l)).map((l) => `- ${l}`).join('\n') || '（请补充教育信息）',
    '',
    '## 优化建议',
    ...(analysis.improvements || []).map((item) => `- ${item}`)
  ].join('\n');
}

function buildAnalysis(resumeText) {
  const sections = extractSections(resumeText);
  const foundKeywords = detectKeywords(resumeText);
  const missingKeywords = inferMissingKeywords(resumeText);
  const atsScore = computeAtsScore(resumeText, foundKeywords, sections);
  const hasProjects = sections.projects.length > 0;
  const hasExperience = sections.experience.length > 0;
  const hasSkills = sections.skills.length > 0;

  const analysis = {
    atsScore,
    jobMatchRate: atsScore == null ? null : Math.max(0, Math.min(100, atsScore + (hasProjects ? 5 : -5) + (hasExperience ? 5 : -5))),
    missingKeywords,
    improvements: [
      hasSkills ? '将技能按“熟练 / 熟悉 / 接触过”分层展示' : '补充技能模块，并按技术栈分类',
      hasExperience ? '在工作经历中加入可量化结果（如性能、转化率、成本）' : '补充工作/实习经历，突出职责和成果',
      hasProjects ? '每个项目补充“背景-动作-结果”三段式描述' : '补充至少 1-2 个真实项目，并写清你的职责',
      '避免单纯罗列技术名词，尽量说明你在其中做了什么',
      '教育经历保留学校、专业、时间、重点课程或排名（如适用）'
    ],
    skillsOptimization: {
      current: hasSkills ? sections.skills.slice(0, 12) : [],
      recommended: missingKeywords.slice(0, 6),
      additions: ['系统设计', '项目量化表达', '问题定位与排查', '版本管理协作']
    },
    projectsOptimization: hasProjects ? sections.projects.slice(0, 6).map((title) => ({
      title,
      suggestions: [
        '补充项目背景、目标和你的具体职责',
        '描述技术选型原因，而不是只列技术名',
        '加入可量化结果，例如性能提升、成本降低、效率提升'
      ]
    })) : []
  };

  analysis.optimizedResume = buildOptimizedResume(resumeText, analysis);
  return analysis;
}

async function analyzeResumeWithDeepSeek(resumeText) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
  if (!apiKey) throw new Error('DeepSeek API Key 未配置');

  console.log('[简历分析] resumeText length:', resumeText.length);
  console.log('[简历分析] resumeText FULL:\n' + resumeText);

  const prompt = `你是一个简历分析与改写引擎。你必须只基于输入简历原文进行分析，禁止编造任何不存在的经历、技能、项目、公司、证书或数字。

任务：
1. 计算 ATS 评分（基于简历中关键词、结构完整度、量化表达、信息密度等规则）
2. 计算岗位匹配度（如果没有岗位描述，就按简历完整度与技术表达成熟度评估）
3. 找出缺失技能（仅列出简历中未出现且属于常见补强项的关键词）
4. 给出结构化优化建议
5. 输出技能优化方案
6. 输出项目优化建议（仅使用原文中真实存在的项目）
7. 生成“优化后的完整简历”，必须保留原始事实，不得新增经历

严格输出 JSON，不要 Markdown，不要解释，不要附加任何多余文本。字段必须完整：
{
  "atsScore": number | null,
  "jobMatchRate": number | null,
  "missingKeywords": string[],
  "improvements": string[],
  "skillsOptimization": {
    "current": string[],
    "recommended": string[],
    "additions": string[]
  },
  "projectsOptimization": [
    { "title": string, "suggestions": string[] }
  ],
  "optimizedResume": string
}

输入简历：
${resumeText}`;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '只返回严格 JSON。禁止编造。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2500,
      reasoning_effort: 'high',
      extra_body: { thinking: { type: 'enabled' } }
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('无法解析 AI 响应为 JSON 格式');
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed;
}

router.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请选择简历文件' });
    const resumeText = await parseResumeFile(req.file.path);
    const heuristic = buildAnalysis(resumeText);
    let ai = {};
    try { ai = await analyzeResumeWithDeepSeek(resumeText); } catch (e) { console.error('[简历分析] AI fallback failed:', e.message); }

    const merged = {
      atsScore: typeof heuristic.atsScore === 'number' ? heuristic.atsScore : ai.atsScore ?? null,
      jobMatchRate: typeof heuristic.jobMatchRate === 'number' ? heuristic.jobMatchRate : ai.jobMatchRate ?? null,
      missingKeywords: heuristic.missingKeywords,
      improvements: heuristic.improvements,
      skillsOptimization: heuristic.skillsOptimization,
      projectsOptimization: heuristic.projectsOptimization,
      optimizedResume: heuristic.optimizedResume
    };

    try {
      db.prepare(`
        INSERT INTO resume_analyses (id, user_id, ats_score, job_match_rate, file_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), req.body.userId || 'demo-user', merged.atsScore, merged.jobMatchRate, req.file.originalname, new Date().toISOString(), new Date().toISOString());
    } catch (persistError) {
      console.error('[简历分析] persist error:', persistError?.message || persistError);
    }

    try { fs.unlinkSync(req.file.path); } catch {}
    res.json({ success: true, fileName: req.file.originalname, fileSize: req.file.size, uploadTime: new Date().toISOString(), userId: req.body.userId || 'unknown', analysis: merged });
  } catch (error) {
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ success: false, message: error?.message || '分析失败' });
  }
});

router.get('/config', (req, res) => {
  res.json({ deepseek: { configured: Boolean(process.env.DEEPSEEK_API_KEY), baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com', model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro' }, maxFileSize: 10 * 1024 * 1024, supportedFormats: ['pdf', 'docx', 'txt'] });
});

router.post('/validate-keys', async (req, res) => {
  try {
    const ok = Boolean(process.env.DEEPSEEK_API_KEY);
    res.json({ deepseek: { valid: ok, error: ok ? null : 'API Key not configured' } });
  } catch (error) {
    res.json({ deepseek: { valid: false, error: error.message } });
  }
});

module.exports = router;
