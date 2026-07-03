function fallbackSlide(message = 'Please retry') {
  return {
    id: 'fallback',
    type: 'content',
    title: 'PPT生成器',
    content: message,
    bullets: ['请重试', '或上传更完整的文档'],
    images: [],
    layout: 'center',
    style: { theme: 'modern' }
  };
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map((item) => normalizeText(item)).filter(Boolean) : [];
}

function normalizePPTDocument(input, options = {}) {
  const theme = ['modern', 'minimal', 'tech'].includes(options.theme) ? options.theme : 'modern';
  const rawSlides = Array.isArray(input?.slides) ? input.slides : [];
  const slides = rawSlides.length ? rawSlides.map((slide, index) => ({
    id: normalizeText(slide?.id, `slide-${index + 1}`),
    type: ['hero', 'content', 'cards'].includes(slide?.type) ? slide.type : 'content',
    title: normalizeText(slide?.title, `Slide ${index + 1}`),
    content: normalizeArray(slide?.content),
    layout: 'center'
  })) : [fallbackSlide()];
  return {
    title: normalizeText(input?.title, 'PPT生成器'),
    theme,
    slides
  };
}

module.exports = { normalizePPTDocument, fallbackSlide };
