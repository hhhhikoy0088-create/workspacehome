const React = require('react');

function SlideRenderer({ slide }) {
  const content = Array.isArray(slide?.content) ? slide.content : [];
  if (slide?.type === 'hero') {
    return React.createElement('section', { className: 'ppt-slide ppt-hero' },
      React.createElement('div', { className: 'ppt-card' },
        React.createElement('h1', null, slide.title),
        React.createElement('div', { className: 'ppt-content' }, content.map((item, idx) => React.createElement('p', { key: idx }, item)))
      )
    );
  }
  if (slide?.type === 'cards') {
    return React.createElement('section', { className: 'ppt-slide ppt-cards' },
      React.createElement('div', { className: 'ppt-card' },
        React.createElement('h2', null, slide.title),
        React.createElement('div', { className: 'ppt-grid' }, content.map((item, idx) => React.createElement('div', { key: idx, className: 'ppt-mini-card' }, item)))
      )
    );
  }
  return React.createElement('section', { className: 'ppt-slide ppt-content' },
    React.createElement('div', { className: 'ppt-card' },
      React.createElement('h2', null, slide.title),
      React.createElement('div', { className: 'ppt-content' }, content.map((item, idx) => React.createElement('p', { key: idx }, `• ${item}`)))
    )
  );
}

function PPTRenderer({ doc }) {
  const slides = Array.isArray(doc?.slides) ? doc.slides : [];
  return React.createElement('div', { className: 'ppt-deck' }, slides.map((slide, idx) => React.createElement(SlideRenderer, { key: slide.id || idx, slide })));
}

module.exports = { PPTRenderer };
