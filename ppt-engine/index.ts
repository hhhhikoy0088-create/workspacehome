const crypto = require('crypto');
const { PPT_SKILLS } = require('./schema.ts');
const { applyMinimal } = require('./skills/minimal.ts');
const { applyData } = require('./skills/data.ts');
const { applyNarrative } = require('./skills/narrative.ts');
const { applyEmphasis } = require('./skills/emphasis.ts');
const { applyCard } = require('./skills/card.ts');
const { applySlidevEnhanced } = require('./skills/slidev-enhanced.ts');

const SKILL_MAP = {
  minimal: applyMinimal,
  data: applyData,
  narrative: applyNarrative,
  emphasis: applyEmphasis,
  card: applyCard,
  'slidev-enhanced': applySlidevEnhanced
};

function normalizeSlides(slides) {
  return (Array.isArray(slides) ? slides : []).map((slide) => ({
    title: String(slide?.title || 'Untitled'),
    content: Array.isArray(slide?.content) ? slide.content.map(String).filter(Boolean) : [],
    type: ['hero', 'text', 'cards'].includes(slide?.type) ? slide.type : 'text',
    metadata: { ...(slide?.metadata || {}) }
  }));
}

function fallbackDoc() {
  return {
    id: 'fallback',
    title: 'Demo PPT',
    theme: 'dark',
    slides: [
      { type: 'hero', title: 'PPT 系统初始化成功', subtitle: 'fallback mode active', metadata: { skill: 'minimal' } },
      { type: 'text', title: 'Overview', content: ['输入主题或文档', '系统会自动生成内容', '不会出现空白页'], metadata: { skill: 'minimal' } },
      { type: 'cards', title: 'Details', items: [{ title: 'A', desc: 'Description A' }, { title: 'B', desc: 'Description B' }], metadata: { skill: 'minimal' } }
    ]
  };
}

function generatePPT(input = '') {
  const title = String(input || 'PPT生成器').trim();
  return {
    id: crypto.randomUUID(),
    title,
    theme: 'dark',
    slides: [
      { type: 'hero', title, subtitle: 'Auto Generated Presentation' },
      { type: 'text', title: 'Overview', content: ['Key Point 1', 'Key Point 2', 'Key Point 3'] },
      { type: 'cards', title: 'Details', items: [{ title: 'A', desc: 'Description A' }, { title: 'B', desc: 'Description B' }] }
    ]
  };
}

function normalizePPTDocument(input, inputText = '') {
  const fallback = fallbackDoc();
  const raw = input && typeof input === 'object' ? input : fallback;
  const slides = Array.isArray(raw.slides) && raw.slides.length ? raw.slides : fallback.slides;
  return {
    id: String(raw.id || crypto.randomUUID()),
    title: String(raw.title || inputText || fallback.title),
    theme: ['dark', 'light', 'purple'].includes(raw.theme) ? raw.theme : 'dark',
    slides: slides.map((slide, index) => {
      if (slide?.type === 'cards') {
        return {
          type: 'cards',
          title: String(slide.title || `Cards ${index + 1}`),
          items: Array.isArray(slide.items) && slide.items.length ? slide.items.map((item) => ({ title: String(item?.title || 'Item'), desc: String(item?.desc || '') })) : fallback.slides[2].items,
          metadata: { ...(slide.metadata || {}) }
        };
      }
      if (slide?.type === 'hero') {
        return {
          type: 'hero',
          title: String(slide.title || title || fallback.title),
          subtitle: String(slide.subtitle || 'Auto Generated Presentation'),
          background: String(slide.background || ''),
          metadata: { ...(slide.metadata || {}) }
        };
      }
      return {
        type: 'text',
        title: String(slide?.title || `Text ${index + 1}`),
        content: Array.isArray(slide?.content) && slide.content.length ? slide.content.map((item) => String(item)).filter(Boolean) : ['No content'],
        metadata: { ...(slide?.metadata || {}) }
      };
    })
  };
}

function runSkillPipeline(doc, skills = ['minimal']) {
  const normalized = normalizePPTDocument(doc);
  const slides = normalized.slides;
  const pipeline = Array.isArray(skills) && skills.length ? skills : ['minimal'];
  const transformed = pipeline.reduce((acc, skill) => {
    const fn = SKILL_MAP[skill];
    return fn ? fn(acc) : acc;
  }, normalizeSlides(slides));
  return { ...normalized, slides: transformed };
}

module.exports = { PPT_SKILLS, runSkillPipeline, normalizeSlides, fallbackDoc, generatePPT, normalizePPTDocument };
