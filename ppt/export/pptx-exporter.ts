const PptxGenJS = require('pptxgenjs');
const { normalizePPTDocument } = require('../core/validator.ts');

async function exportPPTX(doc) {
  const normalized = normalizePPTDocument(doc);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Workspace AI';
  pptx.title = normalized.title;
  normalized.slides.forEach((slide) => {
    const s = pptx.addSlide();
    s.background = { color: '0B1020' };
    s.addText(slide.title, { x: 0.7, y: 0.6, w: 12, h: 0.6, fontSize: 24, bold: true, color: 'FFFFFF' });
    (slide.content || []).slice(0, 6).forEach((item, idx) => {
      s.addText(`• ${item}`, { x: 0.9, y: 1.5 + idx * 0.5, w: 11.5, h: 0.3, fontSize: 14, color: 'E5E7EB' });
    });
  });
  return pptx.write({ outputType: 'nodebuffer' });
}

module.exports = { exportPPTX };
