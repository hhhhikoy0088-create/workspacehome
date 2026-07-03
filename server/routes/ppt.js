const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const multer = require('multer');
const { generatePPT, normalizePPTDocument, fallbackDoc, runSkillPipeline } = require('../../ppt-engine/index.ts');
const { exportHTML } = require('../../ppt/export/html.ts');
const { exportPDF } = require('../../ppt/export/pdf.ts');
const { exportPPTX } = require('../../ppt/export/pptx.ts');

const router = express.Router();
const PPT_UPLOAD_DIR = path.join(os.tmpdir(), 'ppt-uploads');
const PPT_OUTPUT_DIR = path.join(os.tmpdir(), 'ppt-outputs');
fs.mkdirSync(PPT_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PPT_OUTPUT_DIR, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: (_, __, cb) => cb(null, PPT_UPLOAD_DIR), filename: (_, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`) }) });

function buildSlidesForPages(doc, pages = 3, pptType = '通用PPT') {
  const target = Math.max(1, Number(pages) || 3);
  const slides = Array.isArray(doc?.slides) ? doc.slides.slice() : [];
  while (slides.length < target) {
    const idx = slides.length + 1;
    if (idx === 1) {
      slides.push({ type: 'hero', title: pptType, subtitle: '基于文档内容智能生成的演示文稿' });
    } else if (idx === target) {
      slides.push({ type: 'hero', title: '感谢聆听', subtitle: 'Thanks for Watching' });
    } else {
      slides.push({ type: 'text', title: `${pptType} · 第 ${idx} 页`, content: [`本页围绕${pptType}的核心要点展开详细论述`, `结合文件内容分析关键信息与实际应用`, `总结本章节要点并提出后续思考方向`] });
    }
  }
  return { ...doc, slides: slides.slice(0, target) };
}

async function callDeepSeekOutline(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is missing');
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: '只输出严格 JSON。' }, { role: 'user', content: prompt }], temperature: 0.3 })
  });
  if (!response.ok) throw new Error(`DeepSeek request failed with ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

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
  const summary = text.slice(0, 1000);
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/).filter(p => p.trim().length > 10).slice(0, 30);
  const sections = paragraphs.slice(0, 15).map((p, i) => ({ title: `段落 ${i + 1}`, content: p.slice(0, 300) }));
  const keywords = [...new Set((text.match(/[\u4e00-\u9fa5]{2,6}/g) || []))].slice(0, 15);

  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    text: text.slice(0, 8000),
    summary,
    paragraphs,
    sections,
    keywords,
    fileName
  };
}

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'file is required' });
  res.json({ fileId: req.file.filename, fileName: req.file.originalname, pages: 15, originalName: req.file.originalname });
});

router.post('/parse', async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ message: 'fileId is required' });
    const parsed = await parseSourceFile(path.join(PPT_UPLOAD_DIR, fileId));
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function buildTypePrompt(pptType, pages, fileTitle, fileContent, summary) {
  const baseRules = `你是一位资深的PPT内容策划专家。请根据以下文件内容，生成一份高质量、内容丰富的PPT大纲。

【文件标题】${fileTitle}
【PPT 类型】${pptType}
【要求页数】${pages}
【文件内容摘要】${summary || ''}
【文件完整内容】${fileContent.slice(0, 6000)}

通用要求：
1. 严格根据文件内容提炼大纲，不要编造与文件无关的内容
2. 每页幻灯片的内容必须详实、有深度，不能只有标题没有内容
3. text 类型页面的 content 数组每页至少3-5个要点，每个要点20-80字，要有具体信息量
4. cards 类型页面的 items 至少3-4个卡片，每个卡片的 desc 描述至少30-60字
5. 第一页必须是 hero 类型作为封面，最后一页必须是 hero 类型（标题"感谢聆听"）
6. 输出格式必须是合法的 JSON，不要包含 markdown 代码块标记
7. 确保 slides 数组长度接近要求的页数（${pages}页）`;

  const typeSpecific = {
    '答辩PPT': `

【答辩PPT专用结构要求】
- 封面页：项目名称 + 答辩人信息风格副标题
- 第2页：研究背景与意义（text类型，分析为什么做这项研究）
- 第3-4页：国内外研究现状/文献综述（text或cards，对比现有方案）
- 第5-6页：研究内容与方法（cards类型，展示技术路线、实验设计）
- 第7-8页：核心成果与数据（text类型，展示关键发现、实验数据）
- 第9-10页：创新点（cards类型，3-4个创新亮点）
- 第11页：不足与展望（text类型，诚实分析局限+未来方向）
- 最后：致谢页
- 语气：学术严谨、逻辑清晰、数据驱动`,

    '商业计划书': `

【商业计划书专用结构要求】
- 封面页：项目/公司名称 + 一句话定位
- 第2页：项目概述（text类型，解决什么痛点、目标用户）
- 第3页：市场分析（cards类型，市场规模、趋势、竞品对比）
- 第4-5页：产品/服务介绍（cards类型，核心功能、差异化优势）
- 第6页：商业模式（text类型，盈利模式、定价策略、收入来源）
- 第7页：营销策略（text类型，获客渠道、增长策略、品牌建设）
- 第8页：运营数据（cards类型，关键指标、用户数据、增长曲线）
- 第9页：财务预测（text类型，收入预测、成本结构、融资需求）
- 第10页：团队介绍（cards类型，核心成员、背景、分工）
- 第11页：发展规划（text类型，里程碑、路线图、战略目标）
- 最后：致谢/联系方式页
- 语气：商业敏锐、数据支撑、说服力`,

    '工作汇报': `

【工作汇报专用结构要求】
- 封面页：汇报主题 + 汇报人/部门 + 时间周期
- 第2页：工作概览（cards类型，关键指标总览、完成情况）
- 第3-4页：主要成果（text类型，逐项列举已完成的重要工作及成效）
- 第5页：重点项目进展（cards类型，项目名称、进度、成果）
- 第6页：问题与挑战（text类型，当前面临的困难、原因分析）
- 第7页：解决方案（cards类型，针对问题的应对措施、改进方案）
- 第8-9页：下阶段计划（text类型，目标、关键任务、时间节点）
- 第10页：资源需求（text类型，需要的支持、预算、人力）
- 最后：致谢页
- 语气：务实客观、结果导向、条理清晰`,

    '课程作业': `

【课程作业专用结构要求】
- 封面页：课程名称 + 作业主题 + 学生信息
- 第2页：知识框架（cards类型，本章/本主题的核心概念）
- 第3-4页：理论要点（text类型，关键定义、定理、公式推导）
- 第5-6页：案例分析（cards类型，典型案例、应用场景、分析过程）
- 第7页：实践操作（text类型，实验步骤、代码/操作说明、结果）
- 第8页：遇到的问题与解决（text类型，困难描述、解决方案、心得）
- 第9页：总结与思考（text类型，知识总结、个人理解、延伸思考）
- 最后：致谢页
- 语气：学习探索、理解深入、思考独立`,
  };

  const jsonFormat = `

JSON 结构：
{
  "title": "PPT 主标题（从文件内容提炼，不要直接用文件名）",
  "slides": [
    { "type": "hero", "title": "封面标题", "subtitle": "副标题（20-40字概括全文核心）" },
    { "type": "text", "title": "章节标题", "content": ["要点1（20-80字具体内容）", "要点2", "要点3", "要点4"] },
    { "type": "cards", "title": "卡片页标题", "items": [{ "title": "卡片标题", "desc": "30-60字详细描述" }] },
    { "type": "hero", "title": "感谢聆听", "subtitle": "Thanks for Watching" }
  ]
}`;

  return baseRules + (typeSpecific[pptType] || typeSpecific['答辩PPT']) + jsonFormat;
}

router.post('/generate', async (req, res) => {
  try {
    const input = String(req.body?.input || req.body?.topic || 'PPT生成器');
    const pptType = String(req.body?.pptType || '答辩PPT');
    const pages = Number(req.body?.pages || 15);
    const parsedFile = req.body?.parsedFile || null;
    const fileContent = parsedFile?.text || parsedFile?.summary || input;
    const fileTitle = parsedFile?.title || input;
    const prompt = buildTypePrompt(pptType, pages, fileTitle, fileContent, parsedFile?.summary || '');
    let outline;
    try {
      const raw = await callDeepSeekOutline(prompt);
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      outline = JSON.parse((match ? match[1] : raw).trim());
    } catch {
      outline = null;
    }
    const base = outline ? normalizePPTDocument(outline, input) : normalizePPTDocument(generatePPT(parsedFile?.summary || input), input);
    const doc = normalizePPTDocument(buildSlidesForPages(base, pages, pptType), input);
    res.json({ success: true, data: { document: doc } });
  } catch (error) {
    res.json({ success: true, data: { document: fallbackDoc(), error: error.message } });
  }
});

router.post('/export-html', async (req, res) => {
  try {
    const doc = normalizePPTDocument(req.body?.outline || req.body?.document || fallbackDoc(), String(req.body?.input || 'PPT生成器'));
    const style = String(req.body?.style || 'magazine');
    const theme = String(req.body?.theme || (style === 'swiss' ? 'ikb' : 'ink'));
    const html = exportHTML(doc, style, theme);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.title || 'ppt')}.html"`);
    res.send(html);
  } catch (error) {
    const html = exportHTML(fallbackDoc(), 'magazine', 'ink');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
});
router.post('/export-pdf', async (req, res) => { try { const doc = normalizePPTDocument(req.body?.outline || req.body?.document || fallbackDoc(), String(req.body?.input || 'PPT生成器')); const pdf = await exportPDF(doc); res.setHeader('Content-Type', 'application/pdf'); res.send(pdf); } catch { const pdf = await exportPDF(fallbackDoc()); res.setHeader('Content-Type', 'application/pdf'); res.send(pdf); } });
router.post('/export-pptx', async (req, res) => { try { const doc = normalizePPTDocument(req.body?.outline || req.body?.document || fallbackDoc(), String(req.body?.input || 'PPT生成器')); const buffer = await exportPPTX(doc); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'); res.setHeader('Content-Disposition', 'attachment; filename="ppt-export.pptx"'); res.send(buffer); } catch { const buffer = await exportPPTX(fallbackDoc()); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'); res.setHeader('Content-Disposition', 'attachment; filename="ppt-export.pptx"'); res.send(buffer); } });

// ── PPT Master (Python) 导出 ──────────────────────────────
// 使用 python-pptx 生成原生可编辑 PPTX，设计参考 PPT Master 项目
function findPython() {
  // 优先级：环境变量 > 管理 Python > 系统 Python > PATH
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) return process.env.PYTHON_PATH;
  const managed = 'C:/Users/xx/.workbuddy/binaries/python/versions/3.13.12/python.exe';
  if (fs.existsSync(managed)) return managed;
  const systemPy = 'D:/python/python.exe';
  if (fs.existsSync(systemPy)) return systemPy;
  return 'python';
}

const BRIDGE_SCRIPT = path.join(__dirname, '..', 'ppt-master-bridge.py');

router.post('/export-pptx-python', async (req, res) => {
  const tmpDir = path.join(os.tmpdir(), 'ppt-master-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  const jsonPath = path.join(tmpDir, 'input.json');
  const outputPath = path.join(tmpDir, 'output.pptx');

  try {
    const doc = normalizePPTDocument(req.body?.outline || req.body?.document || fallbackDoc(), String(req.body?.input || 'PPT生成器'));

    // 将大纲写入临时 JSON 文件（避免 stdin 编码问题）
    fs.writeFileSync(jsonPath, JSON.stringify(doc), 'utf-8');

    const pythonExe = findPython();
    const args = [BRIDGE_SCRIPT, outputPath, '--input', jsonPath];

    await new Promise((resolve, reject) => {
      execFile(pythonExe, args, {
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      }, (err, stdout, stderr) => {
        if (err) {
          console.error('[PPT Master] Python error:', stderr || err.message);
          reject(new Error(stderr?.trim() || err.message || 'Python execution failed'));
        } else {
          resolve(stdout);
        }
      });
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error('PPTX file was not generated');
    }

    const buffer = fs.readFileSync(outputPath);
    const filename = encodeURIComponent(doc.title || 'ppt-master');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pptx"`);
    res.send(buffer);
  } catch (error) {
    console.error('[PPT Master] Export failed:', error.message);
    // 回退到 JS 导出
    try {
      const doc = normalizePPTDocument(req.body?.outline || req.body?.document || fallbackDoc(), String(req.body?.input || 'PPT生成器'));
      const buffer = await exportPPTX(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', 'attachment; filename="ppt-export.pptx"');
      res.send(buffer);
    } catch {
      res.status(500).json({ message: 'PPT Master 导出失败：' + error.message });
    }
  } finally {
    // 清理临时文件
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

module.exports = router;
