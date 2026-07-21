// Takeoff & Landing vertical card stack (vanilla JS)
// - Reads image list from data-images on #takeoff-stack
// - Creates stacked cards and handles Next / Previous, swipe, and wheel

(function () {
  const root = document.getElementById('takeoff-stack');
  if (!root) return;
  const stackEl = root.querySelector('.stack');
  const btnNext = document.getElementById('stack-next');
  const btnPrev = document.getElementById('stack-prev');
  const data = (root.getAttribute('data-images') || '');
  const names = data.split(',').map(s => s.trim()).filter(Boolean);
  if (!names.length) { console.log('takeoff-stack: no images found'); return; }

  // initialized

  let isAnimating = false;

  // create DOM cards
  function createCard(name, idx) {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-name', name);
    card.setAttribute('data-index', idx);

    const img = document.createElement('img');
    // tolerate common filename typos (e.g., 'piic8' -> 'pic8')
    let base = name;
    if (/^piic/i.test(name)) base = name.replace(/^piic/i, 'pic');
    img.src = `images/${base}.jpg`;
    img.alt = `Model ${idx + 1}`;
    img.loading = 'lazy';
    img.onerror = function () {
      if (!img.dataset._tried) { img.dataset._tried = 'png'; img.src = `images/${name}.png`; }
      else if (img.dataset._tried === 'png') { img.dataset._tried = 'webp'; img.src = `images/${name}.webp`; }
    };

    const info = document.createElement('div');
    info.className = 'card-info';
    const title = document.createElement('h3');
    title.textContent = prettifyName(name);
    const scale = document.createElement('p');
    scale.textContent = 'Scale: 1:72';

    info.appendChild(title);
    info.appendChild(scale);

    // Only append the image for a clean, image-only card (no visible details)
    card.appendChild(img);
    return card;
  }

  function prettifyName(filename) {
    // turn pic12 -> "Model 12" or preserve other names
    const m = filename.match(/pic(\d+)/i);
    if (m) return `Model ${m[1]}`;
    return filename.replace(/[-_]/g, ' ');
  }

  // populate stack and keep a stable cards array (do NOT rely on DOM order for state)
  names.forEach((n, i) => stackEl.appendChild(createCard(n, i)));
  const cards = Array.from(stackEl.querySelectorAll('.card'));
  const cardCount = cards.length;
  let activeIndex = 0; // which index in `cards` is currently the top card

  function updatePositions() {
    // clear classes and attach visual positions based on activeIndex (circular)
    for (let i = 0; i < cardCount; i++) {
      const c = cards[i];
      c.classList.remove('pos-top','pos-back1','pos-back2','pos-hidden','takeoff','landing','come-in');
      if (c._topClickHandler) { c.removeEventListener('click', c._topClickHandler); delete c._topClickHandler; }
      if (c._topPointerHandler) { c.removeEventListener('pointerdown', c._topPointerHandler); delete c._topPointerHandler; }
    }

    for (let offset = 0; offset < cardCount; offset++) {
      const idx = (activeIndex + offset) % cardCount;
      const el = cards[idx];
      if (offset === 0) el.classList.add('pos-top');
      else if (offset === 1) el.classList.add('pos-back1');
      else if (offset === 2) el.classList.add('pos-back2');
      else el.classList.add('pos-hidden');
    }

    // attach handlers to the visual top card
    const topEl = cards[activeIndex];
    if (topEl) {
      const handlerClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); doNext(); };
      const handlerPointer = (ev) => { ev.preventDefault(); ev.stopPropagation(); doNext(); };
      topEl._topClickHandler = handlerClick;
      topEl._topPointerHandler = handlerPointer;
      topEl.addEventListener('click', handlerClick);
      topEl.addEventListener('pointerdown', handlerPointer);
      topEl.setAttribute('tabindex', '0');
      topEl.setAttribute('role', 'button');
    }
  }

  updatePositions();

  // No overlay: rely on top-card handlers and capture pointer fallback for desktop

  function doNext() {
    if (isAnimating) return;
    if (cardCount === 0) return;
    isAnimating = true;
    const top = cards[activeIndex];
    // animate top card off and advance index
    top.classList.add('takeoff');

    let finished = false;
    const onEnd = () => {
      if (finished) return; finished = true;
      try { top.removeEventListener('transitionend', onEnd); } catch (e) {}
      top.classList.remove('takeoff');
      // advance active index circularly
      activeIndex = (activeIndex + 1) % cardCount;
      // update visuals
      requestAnimationFrame(() => {
        updatePositions();
        setTimeout(() => { isAnimating = false; }, 160);
      });
      clearTimeout(fallbackTimeout);
    };

    top.addEventListener('transitionend', onEnd);
    const fallbackTimeout = setTimeout(() => { onEnd(); }, 900);
  }

  function doPrev() {
    if (isAnimating) return;
    if (cardCount === 0) return;
    isAnimating = true;
    const prevIndex = (activeIndex - 1 + cardCount) % cardCount;
    const prevEl = cards[prevIndex];
    // prepare prev to come-in and then land
    prevEl.classList.add('come-in');

    requestAnimationFrame(() => {
      prevEl.classList.remove('come-in');
      prevEl.classList.add('landing');

      let finished = false;
      const onEnd = () => {
        if (finished) return; finished = true;
        try { prevEl.removeEventListener('transitionend', onEnd); } catch (e) {}
        prevEl.classList.remove('landing');
        activeIndex = prevIndex;
        updatePositions();
        setTimeout(() => { isAnimating = false; }, 120);
        clearTimeout(fallbackTimeout);
      };

      prevEl.addEventListener('transitionend', onEnd);
      const fallbackTimeout = setTimeout(() => { if (isAnimating) onEnd(); }, 800);
    });
  }

  // handle buttons
  if (btnNext) {
    btnNext.addEventListener('click', (e) => { e.preventDefault(); doNext(); });
  }
  if (btnPrev) {
    btnPrev.addEventListener('click', (e) => { e.preventDefault(); doPrev(); });
  }

  // Click top card to takeoff (desktop expectation)
  stackEl.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    // only trigger if it's the visual top card
    const idx = cards.indexOf(card);
    if (idx === activeIndex) doNext();
  });

  // touch swipe support (vertical swipe)
  let touchStartY = 0;
  let touchMoved = false;
  stackEl.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) { touchStartY = e.touches[0].clientY; touchMoved = false; }
  }, {passive:true});
  stackEl.addEventListener('touchmove', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dy) > 12) touchMoved = true;
  }, {passive:true});
  stackEl.addEventListener('touchend', (e) => {
    if (!touchMoved) return;
    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;
    const dy = touch.clientY - touchStartY;
    // swipe up -> next (takeoff)
    if (dy < -40) doNext();
    // swipe down -> prev (landing previous)
    else if (dy > 40) doPrev();
  });

  // wheel / scroll support: wheel up (negative) => next
  let wheelTimeout = null;
  stackEl.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 8) return;
    if (wheelTimeout) return; // simple throttle
    wheelTimeout = setTimeout(() => wheelTimeout = null, 400);
    if (e.deltaY < 0) doNext(); else doPrev();
  }, {passive:true});

  // keyboard: left/right
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') doNext();
    if (e.key === 'ArrowDown') doPrev();
  });

  // Desktop-only: capture pointerdown on the stack container to advance (robust fallback)
  try {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) {
      stackEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest && e.target.closest('.stack-controls')) return;
        e.preventDefault();
        doNext();
      }, {capture:true});
    }
  } catch (err) {}

  // finished wiring handlers

})();
