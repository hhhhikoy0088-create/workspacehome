function applyEmphasis(slides) {
  return slides.map((slide) => ({
    ...slide,
    metadata: { ...(slide.metadata || {}), skill: 'emphasis' },
    title: slide.title ? String(slide.title).toUpperCase() : slide.title
  }));
}

module.exports = { applyEmphasis };
