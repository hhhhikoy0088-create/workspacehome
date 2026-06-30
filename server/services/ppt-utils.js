const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const PptxGenJS = require('pptxgenjs');

const PPT_THEMES = {
  科技蓝: { bg: 'EEF3FA', title: '3A4A66', text: '5F6B7A', accent: 'AFC1DE', accent2: 'DDE7F5' },
  极简暗: { bg: 'F0ECE8', title: '5A534D', text: '6F6862', accent: 'C5B9B0', accent2: 'E8DFD8' },
  温暖米: { bg: 'F6F0E8', title: '5B534C', text: '7A6F67', accent: 'D9C7B8', accent2: 'F2E6D9' },
  自然绿: { bg: 'EEF5EF', title: '50605A', text: '6E7D77', accent: 'B8C9BE', accent2: 'DDE9E0' }
};

function safeJsonParse(value) {
  const trimmed = String(value || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try { return JSON.parse(candidate); } catch { return null; }
}

async function parseSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const data = await pdfParse(fs.readFileSync(filePath));
    return buildParseResult(data.text);
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return buildParseResult(result.value);
  }
  if (ext === '.md' || ext === '.txt') {
    return buildParseResult(fs.readFileSync(filePath, 'utf-8'));
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

function buildParseResult(text) {
  const cleaned = String(text || '').trim();
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
  const paragraphs = cleaned.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return {
    text: cleaned,
    summary: lines.slice(0, 5).join(' '),
    sections: lines.slice(0, 8),
    paragraphs,
    keywords: extractKeywords(cleaned)
  };
}

function extractKeywords(text) {
  const dict = ['项目', '目标', '方法', '结果', '分析', '结论', '背景', '现状', '需求', '优化', '技术', '系统', '数据', '用户', '方案', '实践', '总结', '建议', '流程', '架构', '流程图', '界面', '功能', '指标', '效率'];
  const matched = dict.filter((word) => text.includes(word));
  return matched.slice(0, 10);
}

function analyzeDocumentType(parsed) {
  const text = `${parsed?.summary || ''}\n${Array.isArray(parsed?.sections) ? parsed.sections.join('\n') : ''}\n${Array.isArray(parsed?.paragraphs) ? parsed.paragraphs.slice(0, 3).join('\n') : ''}`;
  const score = { 教程: 0, 报告: 0, 方案: 0, 总结: 0 };
  const matched = { 教程: [], 报告: [], 方案: [], 总结: [] };
  const rules = {
    教程: ['步骤', '操作', '安装', '配置', '使用', '教程', '打开', '点击', '输入', '生成', '实训'],
    报告: ['数据', '分析', '结果', '调研', '统计', '趋势', '图表', '结论', '现状', '同比', '环比'],
    方案: ['方案', '设计', '架构', '实现', '系统', '需求', '流程', '模块', '功能', '规划', '落地'],
    总结: ['总结', '回顾', '复盘', '收获', '体会', '感悟', '经验', '成果', '改进', '展望']
  };
  Object.entries(rules).forEach(([type, words]) => {
    words.forEach((word) => {
      if (text.includes(word)) {
        score[type] += 1;
        matched[type].push(word);
      }
    });
  });
  const priority = ['教程', '报告', '方案', '总结'];
  const documentType = priority.sort((a, b) => score[b] - score[a])[0] || '教程';
  return { documentType, score, matchedKeywords: matched[documentType].slice(0, 6), preset: getPptPreset(documentType) };
}

function detectDocumentType(parsed) {
  return analyzeDocumentType(parsed).documentType;
}

function getPptPreset(documentType) {
  const map = {
    教程: { template: '科技蓝', tone: '步骤清晰、图文并茂、偏教学操作', layouts: ['timeline', 'two-column', 'cards', 'full'] },
    报告: { template: '极简暗', tone: '数据驱动、结论明确、突出图表', layouts: ['chart', 'split', 'cards', 'quote'] },
    方案: { template: '科技蓝', tone: '结构化、方案感强、强调架构和流程', layouts: ['split', 'timeline', 'two-column', 'cards'] },
    总结: { template: '温暖米', tone: '复盘感、轻商务、温和收束', layouts: ['quote', 'cards', 'timeline', 'full'] }
  };
  return map[documentType] || map.教程;
}

async function generateOutline({ aiCall, content, summary, sections, paragraphs, keywords, pptType, template, slideCount, documentType }) {
  const prompt = `
你是专业 PPT 结构生成助手。请只输出 JSON。
要求：
1. 仅输出 JSON，不要解释
2. 结构要贴合文件内容，避免空泛
3. 必须包含封面、目录、若干内容页、总结页
4. 每页要有足够内容，避免只有一两句
5. 至少 70% 页面使用图文混排、图表、对比、时间轴、流程等多样版式
6. 绝不要所有页面都使用同一种版式
7. 每页给出 4-6 条要点，内容尽量具体，避免过短
8. 必须给出图片关键词、图表建议、版式建议
9. 如果文件是教程/流程/方案类，要自动拆成“背景-步骤-效果-总结”
10. 如果文件是报告/总结类，要自动拆成“现状-分析-问题-建议”
11. 如果内容适合，至少生成一页对比页、一页流程页、一页图表页、一页总结页
12. 控制页数接近 ${slideCount || 15} 页
13. 输出中 slide.type 与 layout 要丰富变化，避免重复

PPT 类型：${pptType || '通用'}
文档类型：${documentType || '教程'}
模板风格：${template || '默认'}
生成策略：${getPptPreset(documentType).tone}
摘要：${summary || ''}
关键词：${Array.isArray(keywords) ? keywords.join(' / ') : ''}
章节线索：${Array.isArray(sections) ? sections.join(' / ') : ''}
段落线索：${Array.isArray(paragraphs) ? paragraphs.slice(0, 8).join(' || ') : ''}
正文：${content || ''}

JSON 格式：
{
  "title": "标题",
  "subtitle": "副标题",
  "coverImagePrompt": "用于封面图的图片描述",
  "slides": [
    {
      "index": 1,
      "type": "cover|agenda|content|chart|comparison|timeline|process|summary",
      "title": "...",
      "subtitle": "...",
      "bullets": ["..."],
      "chartType": "bar|line|pie|flow|timeline|none",
      "imagePrompt": "图片描述",
      "imageKeywords": ["关键词1", "关键词2"],
      "layout": "left|right|two-column|full|split|cards|timeline|quote",
      "speakerNotes": "..."
    }
  ]
}
`;
  const result = await aiCall([
    { role: 'system', content: '你是一个只输出严格 JSON 的 PPT 生成助手。' },
    { role: 'user', content: prompt }
  ], { temperature: 0.35, max_tokens: 4000, timeoutMs: 90000 });
  const contentText = result.choices?.[0]?.message?.content || '';
  const outline = safeJsonParse(contentText);
  if (!outline?.slides?.length) throw new Error('AI did not return a valid outline');
  return outline;
}

function sanitizeFileName(name) {
  return String(name || 'AI 生成PPT')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.[^.]+$/, '')
    .trim() || 'AI 生成PPT';
}

function pickLayout(type, index, total) {
  const cycle = ['two-column', 'split', 'cards', 'timeline', 'quote', 'full'];
  if (type === 'cover') return 'cover';
  if (type === 'agenda') return 'agenda';
  if (type === 'summary') return 'summary';
  if (type === 'chart') return 'chart';
  if (type === 'comparison') return 'split';
  if (type === 'timeline' || type === 'process') return 'timeline';
  return cycle[(index + total) % cycle.length];
}

async function buildPptxFile({ outline, template = '温暖米', pptType = '通用', outputDir, sourceFileName = 'AI 生成PPT', documentType = '教程' }) {
  const preset = getPptPreset(documentType);
  const theme = PPT_THEMES[preset.template] || PPT_THEMES[template] || PPT_THEMES['温暖米'];
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Workspace AI';
  pptx.company = 'Workspace';
  pptx.subject = pptType;
  pptx.title = sourceFileName;
  pptx.lang = 'zh-CN';

  const addHeader = (slide, title, subtitle, index) => {
    slide.addText(title, { x: 0.65, y: 0.45, w: 11.8, h: 0.55, fontFace: 'Microsoft YaHei', fontSize: 22, bold: true, color: theme.title });
    if (subtitle) slide.addText(subtitle, { x: 0.67, y: 1.02, w: 11.5, h: 0.32, fontFace: 'Microsoft YaHei', fontSize: 10.5, color: theme.text });
    slide.addText(String(index).padStart(2, '0'), { x: 12.2, y: 0.42, w: 0.6, h: 0.4, fontFace: 'Aptos', fontSize: 14, bold: true, color: theme.accent });
    slide.addShape(pptx.ShapeType.line, { x: 0.65, y: 1.36, w: 12, h: 0, line: { color: theme.accent, pt: 1.1 } });
  };

  const addDecor = (slide) => {
    slide.addShape(pptx.ShapeType.rect, { x: 12.25, y: 0, w: 0.15, h: 7.5, fill: { color: theme.accent2 }, line: { color: theme.accent2, transparency: 100 } });
    slide.addShape(pptx.ShapeType.ellipse, { x: 12.0, y: 6.5, w: 0.8, h: 0.8, fill: { color: theme.accent, transparency: 35 }, line: { color: theme.accent, transparency: 100 } });
  };

  const addCoverSlide = () => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };
    addDecor(slide);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: 0.5, w: 12.6, h: 6.35, rectRadius: 0.18, fill: { color: 'FFFFFF', transparency: 8 }, line: { color: theme.accent, pt: 1.1, transparency: 10 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.82, y: 0.8, w: 2.4, h: 0.5, rectRadius: 0.12, fill: { color: theme.accent2 }, line: { color: theme.accent2, transparency: 100 } });
    slide.addText(pptx.subject || pptType, { x: 1.0, y: 0.9, w: 2, h: 0.2, fontSize: 10, color: theme.title, bold: true });
    slide.addText(outline.title || sourceFileName, { x: 0.95, y: 1.7, w: 10.8, h: 1.2, fontFace: 'Microsoft YaHei', fontSize: 30, bold: true, color: theme.title });
    slide.addText(outline.subtitle || '基于导入内容自动生成的可编辑演示稿', { x: 0.98, y: 3.0, w: 10.5, h: 0.45, fontFace: 'Microsoft YaHei', fontSize: 14, color: theme.text });
    const meta = [
      { label: '文档来源', value: sourceFileName },
      { label: 'PPT 类型', value: pptType },
      { label: '页数', value: String(outline.slides?.length || 0) }
    ];
    meta.forEach((item, idx) => {
      const x = 1.0 + idx * 3.95;
      slide.addShape(pptx.ShapeType.roundRect, { x, y: 4.1, w: 3.55, h: 0.95, rectRadius: 0.12, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.8, transparency: 22 } });
      slide.addText(item.label, { x: x + 0.18, y: 4.28, w: 1.5, h: 0.18, fontSize: 9, color: theme.text });
      slide.addText(item.value, { x: x + 0.18, y: 4.56, w: 3.0, h: 0.28, fontSize: 13, bold: true, color: theme.title, fontFace: 'Microsoft YaHei' });
    });
    slide.addText(`生成时间：${new Date().toLocaleString('zh-CN')}`, { x: 0.98, y: 5.55, w: 5, h: 0.25, fontSize: 9.5, color: theme.text });
  };

  const addAgendaSlide = (slideData, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };
    addDecor(slide);
    addHeader(slide, slideData.title || '目录', slideData.subtitle || 'Contents', index);
    const bullets = Array.isArray(slideData.bullets) ? slideData.bullets : [];
    bullets.slice(0, 6).forEach((item, idx) => {
      const y = 1.95 + idx * 0.72;
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.9, y, w: 0.42, h: 0.42, rectRadius: 0.06, fill: { color: theme.accent }, line: { color: theme.accent, transparency: 100 } });
      slide.addText(String(idx + 1).padStart(2, '0'), { x: 0.99, y: y + 0.07, w: 0.2, h: 0.12, fontSize: 8, bold: true, color: 'FFFFFF' });
      slide.addText(item, { x: 1.5, y: y - 0.02, w: 9.8, h: 0.28, fontSize: 15, color: theme.title, bold: idx === 0, fontFace: 'Microsoft YaHei' });
      slide.addText('—', { x: 11.8, y: y - 0.02, w: 0.3, h: 0.2, fontSize: 14, color: theme.accent });
    });
  };

  const addVisualPanel = (slide, slideData) => {
    const chartType = slideData.chartType || 'none';
    const keywords = Array.isArray(slideData.imageKeywords) ? slideData.imageKeywords.slice(0, 3) : [];
    slide.addShape(pptx.ShapeType.roundRect, { x: 7.52, y: 2.05, w: 5.2, h: 3.25, rectRadius: 0.1, fill: { color: 'FFFFFF', transparency: 10 }, line: { color: theme.accent, pt: 0.8, transparency: 15 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 7.75, y: 2.3, w: 1.0, h: 2.3, rectRadius: 0.08, fill: { color: theme.accent2 }, line: { color: theme.accent, transparency: 90 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 8.95, y: 2.0, w: 1.0, h: 2.6, rectRadius: 0.08, fill: { color: theme.accent }, line: { color: theme.accent, transparency: 90 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 10.15, y: 2.45, w: 1.0, h: 2.15, rectRadius: 0.08, fill: { color: theme.accent2 }, line: { color: theme.accent, transparency: 90 } });
    slide.addShape(pptx.ShapeType.roundRect, { x: 11.35, y: 2.2, w: 1.0, h: 2.4, rectRadius: 0.08, fill: { color: theme.accent }, line: { color: theme.accent, transparency: 90 } });
    slide.addText(chartType === 'pie' ? '饼图示意' : chartType === 'line' ? '趋势示意' : chartType === 'bar' ? '柱状示意' : chartType === 'flow' ? '流程示意' : '图片占位区', {
      x: 8.25, y: 5.02, w: 3.9, h: 0.25, fontSize: 13.5, bold: true, color: theme.title, align: 'center'
    });
    if (keywords.length) {
      slide.addText(`关键词：${keywords.join(' / ')}`, { x: 7.8, y: 5.35, w: 4.5, h: 0.25, fontSize: 9.5, color: theme.text, align: 'center' });
    }
  };

  const addImagePlaceholder = (slide, slideData, x, y, w, h) => {
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: 'FFFFFF', transparency: 12 }, line: { color: theme.accent, pt: 0.8, dash: 'dash' } });
    slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.35, y: y + 0.35, w: 0.55, h: 0.55, fill: { color: theme.accent2 }, line: { color: theme.accent, transparency: 100 } });
    slide.addText('图片 / 图标 / 截图', { x: x + 1.05, y: y + 0.45, w: w - 1.4, h: 0.25, fontSize: 12, bold: true, color: theme.title });
    const kw = Array.isArray(slideData.imageKeywords) ? slideData.imageKeywords.slice(0, 3).join(' / ') : '';
    slide.addText(slideData.imagePrompt || '这里可插入与内容相关的图片或图标。', { x: x + 0.35, y: y + 1.0, w: w - 0.7, h: h - 1.15, fontSize: 10.5, color: theme.text, fontFace: 'Microsoft YaHei' });
    if (kw) slide.addText(`建议关键词：${kw}`, { x: x + 0.35, y: y + h - 0.35, w: w - 0.7, h: 0.2, fontSize: 9.5, color: theme.text });
  };

  const addContentSlide = (slideData, index, total) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };
    addDecor(slide);
    addHeader(slide, slideData.title || '', slideData.subtitle || '', index);

    const bullets = Array.isArray(slideData.bullets) ? slideData.bullets : [];
    const hasImage = Boolean(slideData.imagePrompt);
    const layout = slideData.layout || preset.layouts[(index + total) % preset.layouts.length] || pickLayout(slideData.type, index, total);

    if (layout === 'split') {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.8, w: 5.8, h: 4.9, rectRadius: 0.14, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
      slide.addShape(pptx.ShapeType.roundRect, { x: 6.75, y: 1.8, w: 6.05, h: 4.9, rectRadius: 0.14, fill: { color: theme.accent2 }, line: { color: theme.accent, pt: 0.8, transparency: 25 } });
      slide.addText('A 组', { x: 0.98, y: 2.05, w: 1.2, h: 0.25, fontSize: 13, bold: true, color: theme.title });
      bullets.slice(0, 4).forEach((item, idx) => {
        slide.addText(`• ${item}`, { x: 1.0, y: 2.45 + idx * 0.82, w: 5.1, h: 0.34, fontSize: 12.5, color: theme.text, fontFace: 'Microsoft YaHei' });
      });
      slide.addText('B 组', { x: 7.05, y: 2.05, w: 1.2, h: 0.25, fontSize: 13, bold: true, color: theme.title });
      addImagePlaceholder(slide, slideData, 7.05, 2.45, 5.15, 1.85);
      addVisualPanel(slide, slideData);
    } else if (layout === 'cards') {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.8, w: 12.0, h: 4.9, rectRadius: 0.14, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
      bullets.slice(0, 4).forEach((item, idx) => {
        const x = 0.95 + (idx % 2) * 5.85;
        const y = 2.1 + Math.floor(idx / 2) * 1.35;
        slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 5.25, h: 1.05, rectRadius: 0.08, fill: { color: idx % 2 === 0 ? theme.accent2 : 'FFFFFF' }, line: { color: theme.accent, pt: 0.5, transparency: 30 } });
        slide.addText(item, { x: x + 0.2, y: y + 0.24, w: 4.8, h: 0.45, fontSize: 12.2, color: theme.title, fontFace: 'Microsoft YaHei' });
      });
      addVisualPanel(slide, slideData);
    } else if (layout === 'timeline') {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.8, w: 12.0, h: 4.9, rectRadius: 0.14, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
      const count = Math.min(5, Math.max(3, bullets.length));
      for (let i = 0; i < count; i++) {
        const x = 1.1 + i * 2.3;
        slide.addShape(pptx.ShapeType.line, { x: 1.2, y: 4.0, w: 9.5, h: 0, line: { color: theme.accent, pt: 1.1 } });
        slide.addShape(pptx.ShapeType.ellipse, { x, y: 3.78, w: 0.42, h: 0.42, fill: { color: i % 2 === 0 ? theme.accent : theme.accent2 }, line: { color: theme.accent, transparency: 100 } });
        slide.addShape(pptx.ShapeType.roundRect, { x: x - 0.4, y: 2.2, w: 1.15, h: 0.95, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: theme.accent, pt: 0.4, transparency: 30 } });
        slide.addText(bullets[i] || `步骤 ${i + 1}`, { x: x - 0.28, y: 2.44, w: 0.9, h: 0.35, fontSize: 11.2, color: theme.title, align: 'center' });
      }
      addImagePlaceholder(slide, slideData, 8.95, 2.0, 3.65, 1.6);
      slide.addText('时间轴 / 流程', { x: 8.95, y: 3.8, w: 3.6, h: 0.25, fontSize: 13, bold: true, color: theme.title, align: 'center' });
      addVisualPanel(slide, slideData);
    } else if (layout === 'quote') {
      slide.addShape(pptx.ShapeType.roundRect, { x: 1.1, y: 1.8, w: 11.2, h: 4.8, rectRadius: 0.18, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
      slide.addText('“', { x: 1.6, y: 2.1, w: 0.5, h: 0.5, fontSize: 34, bold: true, color: theme.accent });
      slide.addText(slideData.subtitle || slideData.title || '', { x: 2.1, y: 2.35, w: 8.8, h: 0.55, fontSize: 18, bold: true, color: theme.title, fontFace: 'Microsoft YaHei' });
      slide.addText((bullets[0] || slideData.imagePrompt || '这里适合放一句总结性的话。'), { x: 2.1, y: 3.15, w: 8.8, h: 1.05, fontSize: 13.5, color: theme.text, fontFace: 'Microsoft YaHei' });
      addImagePlaceholder(slide, slideData, 9.2, 4.4, 2.6, 1.0);
    } else if (layout === 'two-column') {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.8, w: 6.2, h: 4.9, rectRadius: 0.14, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
      slide.addShape(pptx.ShapeType.roundRect, { x: 7.2, y: 1.8, w: 5.7, h: 4.9, rectRadius: 0.14, fill: { color: theme.accent2 }, line: { color: theme.accent, pt: 0.8, transparency: 25 } });
      slide.addText('核心要点', { x: 0.98, y: 2.05, w: 2, h: 0.25, fontSize: 13, bold: true, color: theme.title });
      bullets.slice(0, 6).forEach((item, idx) => {
        slide.addText(`• ${item}`, { x: 1.0, y: 2.42 + idx * 0.52, w: 5.5, h: 0.28, fontSize: 12.1, color: theme.text, fontFace: 'Microsoft YaHei' });
      });
      slide.addText('配图建议', { x: 7.5, y: 2.05, w: 2, h: 0.25, fontSize: 13, bold: true, color: theme.title });
      slide.addText(slideData.imagePrompt || '可在此插入与内容相关的图示、流程图或截图。', { x: 7.5, y: 2.45, w: 4.8, h: 0.95, fontSize: 12, color: theme.text, fontFace: 'Microsoft YaHei' });
      addImagePlaceholder(slide, slideData, 7.48, 3.7, 5.1, 1.15);
      addVisualPanel(slide, slideData);
    } else {
      slide.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.8, w: 12.0, h: 4.9, rectRadius: 0.14, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
      const left = bullets.slice(0, 5);
      left.forEach((item, idx) => {
        slide.addShape(pptx.ShapeType.roundRect, { x: 1.0, y: 2.12 + idx * 0.78, w: 6.05, h: 0.62, rectRadius: 0.08, fill: { color: idx % 2 === 0 ? theme.accent2 : 'FFFFFF' }, line: { color: theme.accent, pt: 0.4, transparency: 35 } });
        slide.addText(item, { x: 1.2, y: 2.28 + idx * 0.78, w: 5.7, h: 0.24, fontSize: 12.0, color: theme.title, fontFace: 'Microsoft YaHei' });
      });
      addImagePlaceholder(slide, slideData, 7.45, 2.15, 4.95, 2.15);
      addVisualPanel(slide, slideData);
    }

    if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  };

  const addSummarySlide = (slideData, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.bg };
    addDecor(slide);
    addHeader(slide, slideData.title || '总结', slideData.subtitle || 'Summary', index);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 1.9, w: 11.9, h: 4.7, rectRadius: 0.16, fill: { color: 'FFFFFF', transparency: 0 }, line: { color: theme.accent, pt: 0.9, transparency: 20 } });
    const bullets = Array.isArray(slideData.bullets) ? slideData.bullets : [];
    bullets.slice(0, 5).forEach((item, idx) => {
      slide.addShape(pptx.ShapeType.ellipse, { x: 1.15, y: 2.3 + idx * 0.78, w: 0.18, h: 0.18, fill: { color: theme.accent }, line: { color: theme.accent, transparency: 100 } });
      slide.addText(item, { x: 1.48, y: 2.24 + idx * 0.78, w: 10.5, h: 0.28, fontSize: 12.8, color: theme.text, fontFace: 'Microsoft YaHei' });
    });
    slide.addText('谢谢聆听', { x: 9.6, y: 5.65, w: 2.2, h: 0.3, fontSize: 16, bold: true, color: theme.title });
  };

  addCoverSlide();
  (outline.slides || []).forEach((slide, index) => {
    if (index === 0 && slide.type === 'cover') return;
    if (slide.type === 'agenda') return addAgendaSlide(slide, index + 1);
    if (slide.type === 'summary') return addSummarySlide(slide, index + 1);
    return addContentSlide(slide, index + 1, outline.slides.length);
  });

  const baseName = sanitizeFileName(sourceFileName);
  const fileId = `${baseName}.pptx`;
  const filePath = path.join(outputDir, fileId);
  await pptx.writeFile({ fileName: filePath });
  return { fileId, fileName: fileId, filePath };
}

module.exports = { parseSourceFile, generateOutline, buildPptxFile, detectDocumentType, analyzeDocumentType, getPptPreset };
