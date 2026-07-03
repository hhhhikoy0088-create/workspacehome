const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { PPTRenderer } = require('../render/renderer.ts');
const { normalizePPTDocument } = require('../core/validator.ts');

function buildHTML(doc) {
  const normalized = normalizePPTDocument(doc);
  const deck = renderToStaticMarkup(React.createElement(PPTRenderer, { doc: normalized }));
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>body{margin:0;background:#0b1020;color:#fff;font-family:Arial,sans-serif}.ppt-deck{display:flex;flex-direction:column;gap:24px;padding:24px}.ppt-slide{width:1280px;min-height:720px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.05));border-radius:28px}.ppt-card{width:1080px;min-height:560px;padding:56px;box-sizing:border-box}.ppt-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:28px}.ppt-mini-card{border:1px solid rgba(255,255,255,.25);border-radius:18px;padding:24px;min-height:120px}.ppt-card h1,.ppt-card h2{margin:0 0 16px 0;line-height:1.15}.ppt-content p{font-size:20px;line-height:1.6}</style></head><body>${deck}</body></html>`;
}

module.exports = { buildHTML };
