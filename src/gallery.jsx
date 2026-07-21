/* Slideshow / carousel gallery implemented with React.
   Centers the active slide using the existing .luxury-track styles,
   provides prev/next controls, autoplay, and keyboard navigation.
*/

const { useState, useEffect, useRef } = React;

function SlideshowGallery({ imageNames }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);
  const autoplayRef = useRef(null);

  const sizes = ['size-lg', 'size-md', 'size-sm'];

  const scrollToIndex = (i) => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.children[i];
    if (!item) return;
    const left = item.offsetLeft - (track.clientWidth - item.clientWidth) / 2;
    track.scrollTo({ left, behavior: 'smooth' });
    setIndex(i);
  };

  const next = () => scrollToIndex((index + 1) % imageNames.length);
  const prev = () => scrollToIndex((index - 1 + imageNames.length) % imageNames.length);

  useEffect(() => {
    // start autoplay
    autoplayRef.current = setInterval(() => {
      setIndex((i) => {
        const ni = (i + 1) % imageNames.length;
        // scroll in next tick
        setTimeout(() => scrollToIndex(ni), 0);
        return ni;
      });
    }, 4500);
    return () => clearInterval(autoplayRef.current);
  }, [imageNames.length]);

  useEffect(() => { // ensure centered on mount and when index changes
    scrollToIndex(index);
    // keyboard nav
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement('div', { className: 'luxury-gallery-root' },
    React.createElement('button', { className: 'mosaic-prev', onClick: prev, 'aria-label': 'Previous' }, '‹'),
    React.createElement('div', { className: 'luxury-track', ref: trackRef, role: 'list' },
      imageNames.map((name, i) => {
        const cls = 'luxury-item ' + sizes[i % sizes.length];
        const srcBase = `images/${name}`;
        const src = `${srcBase}.jpg`;
        return React.createElement('div', { key: name, className: cls, role: 'listitem', tabIndex: 0, onClick: () => scrollToIndex(i) },
          React.createElement('img', {
            src,
            alt: `Model ${i+1}`,
            loading: 'lazy',
            onError: (e) => {
              const el = e.target; if (!el) return;
              const tried = el.dataset._tried || '';
              if (!tried.includes('.png')) { el.dataset._tried = tried + '.png'; el.src = `${srcBase}.png`; return; }
              if (!tried.includes('.webp')) { el.dataset._tried = tried + '.webp'; el.src = `${srcBase}.webp`; return; }
            }
          })
        );
      })
    ),
    React.createElement('button', { className: 'mosaic-next', onClick: next, 'aria-label': 'Next' }, '›'),
    React.createElement('div', { className: 'luxury-indicators' },
      imageNames.map((_, i) => React.createElement('button', {
        key: i,
        className: 'indicator' + (i === index ? ' active' : ''),
        onClick: () => scrollToIndex(i),
        'aria-label': `Go to slide ${i+1}`
      }, '•'))
    )
  );
}

// mount
(function mountGallery() {
  const rootEl = document.getElementById('luxury-gallery-root');
  if (!rootEl) return;
  const data = rootEl.getAttribute('data-images') || '';
  const names = data.split(',').map(s => s.trim()).filter(Boolean);
  ReactDOM.render(React.createElement(SlideshowGallery, { imageNames: names }), rootEl);
})();
