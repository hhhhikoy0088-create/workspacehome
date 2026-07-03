function applyNarrative(slides) {
  return slides.map((slide, index) => ({
    ...slide,
    metadata: { ...(slide.metadata || {}), skill: 'narrative', order: index + 1 },
    content: Array.isArray(slide.content) ? slide.content : []
  }));
}

module.exports = { applyNarrative };
