function applyData(slides) {
  return slides.map((slide) => ({
    ...slide,
    metadata: { ...(slide.metadata || {}), skill: 'data' },
    content: Array.isArray(slide.content) ? slide.content.map((item) => `${item}`) : []
  }));
}

module.exports = { applyData };
