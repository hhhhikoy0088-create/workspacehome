const PptxGenJS = require('pptxgenjs');
const { normalizePPTDocument } = require('../../ppt-engine/index.ts');

/* ==========================================================
   精美 PPTX 导出器
   配色方案：深海蓝科技风
   ========================================================== */

const COLORS = {
  bg: '0A0F1E',           // 深蓝黑背景
  bgLight: '111A2E',      // 稍亮背景
  accent: '38BDF8',       // 天蓝 accent
  accentDark: '0284C7',   // 深蓝 accent
  accentMuted: '0EA5E9',  // 中等蓝
  textPrimary: 'F1F5F9',  // 主文字
  textSecondary: '94A3B8',// 副文字
  textMuted: '64748B',    // 弱化文字
  border: '1E293B',       // 边框色
  gradientStart: '0F172A',// 渐变起点
  gradientEnd: '1E3A5F',  // 渐变终点
};

const FONTS = {
  heading: 'Microsoft YaHei',
  body: 'Microsoft YaHei',
};

function createMasterSlide(pptx: any) {
  // 定义母版：统一背景 + footer
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: COLORS.bg },
    objects: [
      // 底部装饰线
      { rect: { x: 0.5, y: 6.9, w: 12.3, h: 0.01, fill: { color: COLORS.border } } },
      // 左下角品牌文字
      { text: { text: 'Shrimp Workspace AI', options: { x: 0.5, y: 7.0, w: 4, h: 0.25, fontSize: 9, color: COLORS.textMuted, fontFace: FONTS.body } } },
    ],
  });
}

async function exportPPTX(doc: any) {
  const normalized = normalizePPTDocument(doc);
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Shrimp Workspace AI';
  pptx.title = normalized.title;
  pptx.subject = normalized.title;
  pptx.company = 'Shrimp Workspace';

  createMasterSlide(pptx);

  const totalSlides = normalized.slides.length;

  normalized.slides.forEach((slide: any, index: number) => {
    const slideNum = index + 1;
    const isFirst = index === 0;
    const isLast = index === totalSlides - 1;

    const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });

    // === 通用装饰：右上角页码 ===
    s.addText(String(slideNum), {
      x: 11.8, y: 0.35, w: 0.8, h: 0.3,
      fontSize: 10, color: COLORS.textMuted, align: 'right', fontFace: FONTS.body,
    });

    // === 封面页 HERO ===
    if (slide.type === 'hero' || isFirst) {
      // 背景渐变装饰块（左上）
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 6, h: 4,
        fill: { type: 'gradient', gradientType: 'linear', angle: 45, stops: [{ color: COLORS.gradientEnd, position: 0 }, { color: COLORS.bg, position: 1 }] },
      });
      // 背景渐变装饰块（右下）
      s.addShape(pptx.ShapeType.rect, {
        x: 7, y: 3.5, w: 6.3, h: 4,
        fill: { type: 'gradient', gradientType: 'linear', angle: 225, stops: [{ color: COLORS.gradientEnd, position: 0 }, { color: COLORS.bg, position: 1 }] },
      });
      // 顶部 accent 线
      s.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 0.5, w: 2.5, h: 0.04,
        fill: { color: COLORS.accent },
      });
      // 主标题
      s.addText(slide.title || normalized.title, {
        x: 0.5, y: 2.0, w: 12.3, h: 1.0,
        fontSize: 40, bold: true, color: COLORS.textPrimary,
        fontFace: FONTS.heading, align: 'left',
      });
      // 副标题
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.5, y: 3.1, w: 10, h: 0.5,
          fontSize: 18, color: COLORS.textSecondary,
          fontFace: FONTS.body,
        });
      }
      // 底部信息
      s.addText(`共 ${totalSlides} 页 · AI 智能生成`, {
        x: 0.5, y: 5.5, w: 6, h: 0.3,
        fontSize: 11, color: COLORS.textMuted, fontFace: FONTS.body,
      });
      // 右下角装饰圆环
      s.addShape(pptx.ShapeType.ellipse, {
        x: 10.5, y: 4.8, w: 1.8, h: 1.8,
        line: { color: COLORS.accent, width: 1.5 },
        fill: { color: '00000000' },
      });
      return;
    }

    // === 目录页 TOC（第2页如果内容合适）===
    if (slide.type === 'toc' || (index === 1 && slide.title?.includes('目录'))) {
      s.addText(slide.title || '目录', {
        x: 0.5, y: 0.6, w: 12.3, h: 0.6,
        fontSize: 28, bold: true, color: COLORS.textPrimary, fontFace: FONTS.heading,
      });
      s.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 1.3, w: 1.2, h: 0.04,
        fill: { color: COLORS.accent },
      });
      const tocItems = normalized.slides.slice(2, -1).map((s: any, i: number) => `${i + 1}. ${s.title || 'Untitled'}`);
      tocItems.forEach((item: string, idx: number) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        s.addText(item, {
          x: 0.5 + col * 6.2, y: 1.8 + row * 0.7, w: 5.8, h: 0.5,
          fontSize: 14, color: COLORS.textSecondary, fontFace: FONTS.body,
        });
      });
      return;
    }

    // === 结尾页 CLOSING ===
    if (isLast && totalSlides > 2) {
      // 居中感谢文字
      s.addShape(pptx.ShapeType.rect, {
        x: 4.5, y: 2.2, w: 4.3, h: 0.04,
        fill: { color: COLORS.accent },
      });
      s.addText('感谢聆听', {
        x: 0.5, y: 2.6, w: 12.3, h: 0.8,
        fontSize: 36, bold: true, color: COLORS.textPrimary,
        fontFace: FONTS.heading, align: 'center',
      });
      s.addText('THANKS FOR WATCHING', {
        x: 0.5, y: 3.4, w: 12.3, h: 0.4,
        fontSize: 12, color: COLORS.textMuted,
        fontFace: FONTS.body, align: 'center',
      });
      s.addText('Shrimp Workspace AI · 智能演示', {
        x: 0.5, y: 4.2, w: 12.3, h: 0.3,
        fontSize: 11, color: COLORS.textMuted,
        fontFace: FONTS.body, align: 'center',
      });
      // 装饰圆点
      [0, 1, 2].forEach((i) => {
        s.addShape(pptx.ShapeType.ellipse, {
          x: 6.15 + (i - 1) * 0.5, y: 5.2, w: 0.12, h: 0.12,
          fill: { color: i === 1 ? COLORS.accent : COLORS.border },
        });
      });
      return;
    }

    // === 文字页 TEXT ===
    if (slide.type === 'text') {
      // 左侧 accent 竖条
      s.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 0.6, w: 0.06, h: 0.5,
        fill: { color: COLORS.accent },
      });
      // 标题
      s.addText(slide.title, {
        x: 0.7, y: 0.55, w: 11.5, h: 0.55,
        fontSize: 26, bold: true, color: COLORS.textPrimary,
        fontFace: FONTS.heading,
      });
      // 内容要点 - 带序号和图标
      const items = (slide.content || []).slice(0, 6);
      items.forEach((item: string, idx: number) => {
        const y = 1.4 + idx * 0.75;
        // 序号圆圈
        s.addShape(pptx.ShapeType.ellipse, {
          x: 0.6, y: y + 0.04, w: 0.28, h: 0.28,
          fill: { color: COLORS.bgLight },
          line: { color: COLORS.border, width: 1 },
        });
        s.addText(String(idx + 1), {
          x: 0.6, y: y + 0.04, w: 0.28, h: 0.28,
          fontSize: 10, color: COLORS.accent, align: 'center', valign: 'middle',
          fontFace: FONTS.body,
        });
        // 文字
        s.addText(item, {
          x: 1.1, y, w: 11, h: 0.45,
          fontSize: 15, color: COLORS.textSecondary, fontFace: FONTS.body,
        });
      });
      // 如果没有内容，显示提示
      if (!items.length) {
        s.addText('暂无内容', {
          x: 1.1, y: 1.4, w: 11, h: 0.45,
          fontSize: 14, color: COLORS.textMuted, fontFace: FONTS.body,
        });
      }
      return;
    }

    // === 卡片页 CARDS ===
    if (slide.type === 'cards') {
      // 标题
      s.addText(slide.title, {
        x: 0.5, y: 0.55, w: 11.5, h: 0.55,
        fontSize: 26, bold: true, color: COLORS.textPrimary, fontFace: FONTS.heading,
      });
      s.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 1.15, w: 1.0, h: 0.03,
        fill: { color: COLORS.accent },
      });
      // 卡片网格
      const items = (slide.items || []).slice(0, 4);
      const cols = items.length <= 2 ? 2 : 2;
      items.forEach((item: any, idx: number) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cardX = 0.5 + col * 6.15;
        const cardY = 1.5 + row * 2.4;
        // 卡片背景
        s.addShape(pptx.ShapeType.roundRect, {
          x: cardX, y: cardY, w: 5.9, h: 2.1,
          fill: { color: COLORS.bgLight },
          line: { color: COLORS.border, width: 1 },
          rectRadius: 0.08,
        });
        // 卡片顶部 accent 条
        s.addShape(pptx.ShapeType.rect, {
          x: cardX, y: cardY, w: 5.9, h: 0.04,
          fill: { color: COLORS.accent },
        });
        // 卡片标题
        s.addText(item.title || '卡片标题', {
          x: cardX + 0.25, y: cardY + 0.2, w: 5.4, h: 0.4,
          fontSize: 16, bold: true, color: COLORS.textPrimary, fontFace: FONTS.heading,
        });
        // 卡片描述
        s.addText(item.desc || '', {
          x: cardX + 0.25, y: cardY + 0.65, w: 5.4, h: 1.2,
          fontSize: 12, color: COLORS.textSecondary, fontFace: FONTS.body,
        });
      });
      return;
    }

    // === 默认页（兜底）===
    s.addText(slide.title || 'Untitled', {
      x: 0.5, y: 0.6, w: 12.3, h: 0.6,
      fontSize: 28, bold: true, color: COLORS.textPrimary, fontFace: FONTS.heading,
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 1.3, w: 1.0, h: 0.03,
      fill: { color: COLORS.accent },
    });
    if (Array.isArray(slide.content) && slide.content.length) {
      slide.content.slice(0, 6).forEach((item: string, idx: number) => {
        s.addText(`• ${item}`, {
          x: 0.7, y: 1.6 + idx * 0.55, w: 11.5, h: 0.4,
          fontSize: 14, color: COLORS.textSecondary, fontFace: FONTS.body,
        });
      });
    }
  });

  return pptx.write({ outputType: 'nodebuffer' });
}

module.exports = { exportPPTX };
