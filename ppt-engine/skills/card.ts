function applyCard(slides) {
  return slides.map((slide) => ({
    ...slide,
    metadata: { ...(slide.metadata || {}), skill: 'card' }
  }));
}

module.exports = { applyCard };
