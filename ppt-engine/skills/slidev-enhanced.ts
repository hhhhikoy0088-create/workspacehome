function applySlidevEnhanced(slides) {
  return slides.map((slide) => ({
    ...slide,
    metadata: { ...(slide.metadata || {}), skill: 'slidev-enhanced', compatibility: 'slidev' }
  }));
}

module.exports = { applySlidevEnhanced };
