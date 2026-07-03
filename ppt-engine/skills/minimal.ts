function applyMinimal(slides) {
  return slides.map((slide) => ({
    ...slide,
    metadata: { ...(slide.metadata || {}), skill: 'minimal' },
    content: Array.isArray(slide.content) ? slide.content.slice(0, 3) : []
  }));
}

module.exports = { applyMinimal };
