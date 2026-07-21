// Gallery Grid — See More + Lightbox
(function () {
  const grid = document.getElementById('gallery-grid');
  const seeMoreBtn = document.getElementById('gallery-see-more');
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxCounter = document.getElementById('lightbox-counter');

  if (!grid) return;

  let expanded = false;
  let currentLightboxIndex = -1;

  // Collect all gallery items and their image sources
  const allItems = Array.from(grid.querySelectorAll('.gallery-item'));
  const imageSources = allItems.map(item => item.querySelector('img').src);

  // ——— See More / Show Less ———
  if (seeMoreBtn) {
    seeMoreBtn.addEventListener('click', function () {
      expanded = !expanded;
      const hiddenItems = grid.querySelectorAll('.gallery-item--hidden');
      const btnText = seeMoreBtn.querySelector('.btn-text');
      const btnIcon = seeMoreBtn.querySelector('i');

      if (expanded) {
        hiddenItems.forEach((item, i) => {
          item.style.transitionDelay = `${i * 60}ms`;
          item.classList.add('gallery-item--revealed');
        });
        btnText.textContent = 'Show Less';
        btnIcon.classList.remove('fa-chevron-down');
        btnIcon.classList.add('fa-chevron-up');
      } else {
        hiddenItems.forEach((item) => {
          item.style.transitionDelay = '0ms';
          item.classList.remove('gallery-item--revealed');
        });
        btnText.textContent = 'See More';
        btnIcon.classList.remove('fa-chevron-up');
        btnIcon.classList.add('fa-chevron-down');

        // Scroll back to the collection section
        const section = document.getElementById('collection');
        if (section) {
          setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 350);
        }
      }
    });
  }

  // ——— Lightbox ———
  function openLightbox(index) {
    currentLightboxIndex = index;
    lightboxImg.src = imageSources[index];
    lightboxCounter.textContent = `${index + 1} / ${imageSources.length}`;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentLightboxIndex = -1;
  }

  function navigateLightbox(direction) {
    if (currentLightboxIndex < 0) return;
    // Only navigate to visible items
    const visibleItems = allItems.filter(item =>
      !item.classList.contains('gallery-item--hidden') ||
      item.classList.contains('gallery-item--revealed')
    );
    const visibleIndices = visibleItems.map(item => allItems.indexOf(item));
    const currentPos = visibleIndices.indexOf(currentLightboxIndex);

    let newPos = currentPos + direction;
    if (newPos < 0) newPos = visibleIndices.length - 1;
    if (newPos >= visibleIndices.length) newPos = 0;

    currentLightboxIndex = visibleIndices[newPos];
    lightboxImg.style.opacity = '0';
    lightboxImg.style.transform = direction > 0 ? 'translateX(30px) scale(0.96)' : 'translateX(-30px) scale(0.96)';

    setTimeout(() => {
      lightboxImg.src = imageSources[currentLightboxIndex];
      lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${imageSources.length}`;
      lightboxImg.style.opacity = '1';
      lightboxImg.style.transform = 'translateX(0) scale(1)';
    }, 180);
  }

  // Click on gallery items to open lightbox
  allItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      openLightbox(index);
    });
  });

  // Lightbox controls
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => navigateLightbox(1));

  // Click backdrop to close
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (currentLightboxIndex < 0) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // Touch swipe for lightbox
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) touchStartX = e.touches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      navigateLightbox(dx < 0 ? 1 : -1);
    }
  });

  // ——— Scroll-in Animation ———
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('gallery-item--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  // Only observe initially-visible items (not hidden ones)
  allItems.forEach(item => {
    if (!item.classList.contains('gallery-item--hidden')) {
      observer.observe(item);
    }
  });

})();
