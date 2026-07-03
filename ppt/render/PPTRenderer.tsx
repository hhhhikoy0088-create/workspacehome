const React = require('react');

function HeroSlide(props) {
  return React.createElement('section', { className: 'ppt-slide ppt-hero' },
    React.createElement('div', { className: 'ppt-card' },
      React.createElement('h1', null, props.title),
      props.subtitle ? React.createElement('p', null, props.subtitle) : null
    )
  );
}

function TextSlide(props) {
  const content = Array.isArray(props.content) ? props.content : [];
  return React.createElement('section', { className: 'ppt-slide ppt-text' },
    React.createElement('div', { className: 'ppt-card' },
      React.createElement('h2', null, props.title),
      React.createElement('div', { className: 'ppt-content' }, content.map((item, idx) => React.createElement('p', { key: idx }, `• ${item}`)))
    )
  );
}

function CardsSlide(props) {
  const items = Array.isArray(props.items) ? props.items : [];
  return React.createElement('section', { className: 'ppt-slide ppt-cards' },
    React.createElement('div', { className: 'ppt-card' },
      React.createElement('h2', null, props.title),
      React.createElement('div', { className: 'ppt-grid' }, items.map((item, idx) => React.createElement('div', { key: idx, className: 'ppt-mini-card' }, React.createElement('h3', null, item.title), React.createElement('p', null, item.desc))))
    )
  );
}

function renderSlide(slide, index) {
  switch (slide?.type) {
    case 'hero':
      return React.createElement(HeroSlide, { key: index, ...slide });
    case 'cards':
      return React.createElement(CardsSlide, { key: index, ...slide });
    case 'text':
    default:
      return React.createElement(TextSlide, { key: index, ...slide });
  }
}

function PPTRenderer({ doc }) {
  const slides = Array.isArray(doc?.slides) ? doc.slides : [];
  if (!slides.length) return React.createElement('div', null, 'Loading fallback PPT...');
  return React.createElement('div', { className: 'ppt-deck' }, slides.map(renderSlide));
}

module.exports = { PPTRenderer, renderSlide };
