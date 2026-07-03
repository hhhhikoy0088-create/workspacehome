/**
 * Guizang PPT Skill 主题色配置
 * Style A: 电子杂志风 (8 套主题)
 * Style B: 瑞士国际主义 (8 套主题)
 */

const MAGAZINE_THEMES = {
  ink: {
    name: '墨水经典',
    emoji: '\u270D',
    desc: '通用默认、商业发布',
    colors: { ink: '#0a0a0b', inkRgb: '10,10,11', paper: '#f1efea', paperRgb: '241,239,234', paperTint: '#e8e5de', inkTint: '#18181a' },
  },
  indigo: {
    name: '靛蓝瓷',
    emoji: '\uD83C\uDF0A',
    desc: '科技、研究、AI',
    colors: { ink: '#0a1f3d', inkRgb: '10,31,61', paper: '#f1f3f5', paperRgb: '241,243,245', paperTint: '#e4e8ec', inkTint: '#152a4a' },
  },
  forest: {
    name: '森林墨',
    emoji: '\uD83C\uDF3F',
    desc: '自然、可持续、文化',
    colors: { ink: '#1a2e1f', inkRgb: '26,46,31', paper: '#f5f1e8', paperRgb: '245,241,232', paperTint: '#ece7da', inkTint: '#253d2c' },
  },
  kraft: {
    name: '牛皮纸',
    emoji: '\uD83C\uDF42',
    desc: '怀旧、人文、阅读',
    colors: { ink: '#2a1e13', inkRgb: '42,30,19', paper: '#eedfc7', paperRgb: '238,223,199', paperTint: '#e0d0b6', inkTint: '#3a2a1d' },
  },
  dune: {
    name: '沙丘',
    emoji: '\uD83C\uDF19',
    desc: '艺术、设计、创意',
    colors: { ink: '#1f1a14', inkRgb: '31,26,20', paper: '#f0e6d2', paperRgb: '240,230,210', paperTint: '#e3d7bf', inkTint: '#2d2620' },
  },
  cinnabar: {
    name: '朱砂红',
    emoji: '\uD83C\uDFE0',
    desc: '中国红、庄重、节庆',
    colors: { ink: '#3d0a0a', inkRgb: '61,10,10', paper: '#f5e8e8', paperRgb: '245,232,232', paperTint: '#ecd8d8', inkTint: '#4a1515' },
  },
  lavender: {
    name: '暮紫',
    emoji: '\uD83D\uDC9C',
    desc: '优雅、浪漫、艺术',
    colors: { ink: '#1e1433', inkRgb: '30,20,51', paper: '#f0edf5', paperRgb: '240,237,245', paperTint: '#e5e0ed', inkTint: '#2a1f40' },
  },
  slate: {
    name: '鸦青',
    emoji: '\uD83D\uDC26',
    desc: '冷峻、商务、极简',
    colors: { ink: '#1c2433', inkRgb: '28,36,51', paper: '#eef1f5', paperRgb: '238,241,245', paperTint: '#e1e6ed', inkTint: '#263040' },
  },
};

const SWISS_THEMES = {
  ikb: {
    name: '克莱因蓝',
    emoji: '\uD83D\uDD35',
    desc: '通用、商业、AI/科技',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#002FA7', accentRgb: '0,47,167', accentOn: '#ffffff' },
  },
  lemon: {
    name: '柠檬黄',
    emoji: '\uD83D\uDFE1',
    desc: '年轻、运动、零售',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#FFD500', accentRgb: '255,213,0', accentOn: '#0a0a0a' },
  },
  neon: {
    name: '荧光绿',
    emoji: '\uD83D\uDFE2',
    desc: '生态、未来、Z世代',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#39FF14', accentRgb: '57,255,20', accentOn: '#0a0a0a' },
  },
  orange: {
    name: '安全橙',
    emoji: '\uD83D\uDFE0',
    desc: '工业、警示、运动',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#FF6B35', accentRgb: '255,107,53', accentOn: '#ffffff' },
  },
  burgundy: {
    name: '勃艮第红',
    emoji: '\uD83C\uDF77',
    desc: '高端、奢华、品牌',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#800020', accentRgb: '128,0,32', accentOn: '#ffffff' },
  },
  mint: {
    name: '薄荷青',
    emoji: '\uD83E\uDD0C',
    desc: '清新、健康、生活',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#4ECDC4', accentRgb: '78,205,196', accentOn: '#0a0a0a' },
  },
  coral: {
    name: '珊瑚粉',
    emoji: '\uD83D\uDC08',
    desc: '温暖、女性、创意',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#FF6F61', accentRgb: '255,111,97', accentOn: '#ffffff' },
  },
  charcoal: {
    name: '炭黑金',
    emoji: '\uD83D\uDC51',
    desc: '金融、高端、商务',
    colors: { paper: '#fafaf8', paperRgb: '250,250,248', ink: '#0a0a0a', inkRgb: '10,10,10', grey1: '#f0f0ee', grey2: '#d4d4d2', grey3: '#737373', accent: '#1a1a1a', accentRgb: '26,26,26', accentOn: '#FFD700' },
  },
};

module.exports = { MAGAZINE_THEMES, SWISS_THEMES };
