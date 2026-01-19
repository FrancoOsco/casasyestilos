(function () {
  'use strict';
  try {
    console.log('✅ collections.infinite.js cargado');

    const track = document.querySelector('.nh-track');
    if (!track) return;
    const prevBtn = document.querySelector('.nh-btn--prev');
    const nextBtn = document.querySelector('.nh-btn--next');
    const dotsContainer = document.querySelector('.nh-dots');

    let originalSlides = Array.from(track.children).map((n) => n.cloneNode(true));

    let visible = getVisibleSlides();
    let clones = visible;
    let realCount = originalSlides.length;
    let items = [];
    let totalItems = 0;
    let currentIndex = 0;
    let isAnimating = false;
    let lastTargetIndex = null;

    function getVisibleSlides() {
      const w = window.innerWidth;
      if (w >= 992) return 3;
      if (w >= 768) return 2;
      return 1;
    }

    function getItemMetrics() {
      items = Array.from(track.children || []);
      totalItems = items.length;
      const gap = parseFloat(getComputedStyle(track).gap || 0) || 0;
      const first = items[0];
      if (!first) return { itemWidth: 0, gap, totalItems };
      const itemRect = first.getBoundingClientRect();
      const itemWidth = itemRect.width + gap;
      return { itemWidth, gap, totalItems };
    }

    function rebuildTrack() {
      visible = getVisibleSlides();
      clones = visible;

      track.innerHTML = '';
      originalSlides.forEach((s) => track.appendChild(s.cloneNode(true)));

      realCount = originalSlides.length;

      if (realCount === 0) return;

      const currentChildren = Array.from(track.children);
      for (let i = 0; i < clones; i++) {
        const node = currentChildren[i % currentChildren.length].cloneNode(true);
        node.classList.add('nh-clone');
        track.appendChild(node);
      }
      for (let i = 0; i < clones; i++) {
        const node =
          currentChildren[
            (currentChildren.length - 1 - i + currentChildren.length) % currentChildren.length
          ].cloneNode(true);
        node.classList.add('nh-clone');
        track.insertBefore(node, track.firstChild);
      }

      items = Array.from(track.children);
      totalItems = items.length;

      currentIndex = clones;

      const { itemWidth } = getItemMetrics();
      track.style.transition = 'none';
      track.style.transform = `translateX(-${Math.round(currentIndex * itemWidth)}px)`;
      track.offsetHeight;
      track.style.transition = '';
      buildDots();
      updateActiveDot();
    }

    function buildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      if (realCount <= 0) return;
      for (let i = 0; i < realCount; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.index = i;
        btn.setAttribute('aria-label', `Ir a la colección ${i + 1}`);
        dotsContainer.appendChild(btn);
      }
    }

    function updateActiveDot() {
      if (!dotsContainer) return;
      const dots = Array.from(dotsContainer.children);
      if (dots.length === 0) return;

      let realStartIndex = currentIndex - clones;
      realStartIndex = ((realStartIndex % realCount) + realCount) % realCount;

      dots.forEach((d, i) => {
        if (i === realStartIndex) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    function moveTo(index, withAnimation = true) {
      if (!track) return;
      const { itemWidth } = getItemMetrics();
      if (itemWidth === 0) return;

      lastTargetIndex = index;
      if (!withAnimation) track.style.transition = 'none';
      else track.style.transition = 'transform 420ms cubic-bezier(0.22, 0.9, 0.2, 1)';

      const offset = Math.round(index * itemWidth);
      track.style.transform = `translateX(-${offset}px)`;
      isAnimating = withAnimation;
    }

    track.addEventListener('transitionend', (e) => {
      if (e.propertyName !== 'transform') return;
      if (!isAnimating) return;
      isAnimating = false;

      const { itemWidth } = getItemMetrics();
      let target = lastTargetIndex;
      const minReal = clones;
      const maxReal = clones + realCount - 1;

      if (target > maxReal) {
        const delta = target - clones;
        const equivalent = clones + (delta % realCount);
        track.style.transition = 'none';
        track.style.transform = `translateX(-${Math.round(equivalent * itemWidth)}px)`;
        track.offsetHeight;
        track.style.transition = '';
        currentIndex = equivalent;
      } else if (target < minReal) {
        const delta = target - clones;
        const equivalent = clones + (((delta % realCount) + realCount) % realCount);
        track.style.transition = 'none';
        track.style.transform = `translateX(-${Math.round(equivalent * itemWidth)}px)`;
        track.offsetHeight;
        track.style.transition = '';
        currentIndex = equivalent;
      } else {
        currentIndex = target;
      }
      updateActiveDot();
    });

    function goPrev() {
      const newIndex = currentIndex - 1;
      moveTo(newIndex, true);
    }
    function goNext() {
      const newIndex = currentIndex + 1;
      moveTo(newIndex, true);
    }

    if (dotsContainer) {
      dotsContainer.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const dotIndex = Number(e.target.dataset.index);
        if (Number.isNaN(dotIndex)) return;
        moveTo(clones + dotIndex, true);
      });
    }
    if (prevBtn)
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;
        goPrev();
      });
    if (nextBtn)
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAnimating) return;
        goNext();
      });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    });

    (function addSwipe() {
      let startX = 0,
        currentX = 0,
        dragging = false,
        pointerId = null;
      const minSwipe = 35;

      track.addEventListener('pointerdown', (e) => {
        if (isAnimating) return;
        pointerId = e.pointerId;
        try {
          track.setPointerCapture(pointerId);
        } catch {}
        startX = e.clientX;
        currentX = startX;
        dragging = true;
        track.style.transition = 'none';
      });
      track.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        currentX = e.clientX;
        const dx = currentX - startX;
        const { itemWidth } = getItemMetrics();
        const baseOffset = currentIndex * itemWidth;
        track.style.transform = `translateX(-${Math.round(baseOffset - dx)}px)`;
      });
      function endSwipe() {
        if (!dragging) return;
        dragging = false;
        track.style.transition = '';
        const dx = currentX - startX;
        if (dx > minSwipe) goPrev();
        else if (dx < -minSwipe) goNext();
        else moveTo(currentIndex, true);
        if (pointerId !== null) {
          try {
            track.releasePointerCapture(pointerId);
          } catch {}
          pointerId = null;
        }
      }
      track.addEventListener('pointerup', endSwipe);
      track.addEventListener('pointercancel', endSwipe);
      track.addEventListener('pointerleave', endSwipe);
    })();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        rebuildTrack();
      }, 120);
    });

    function attachImageListeners() {
      const imgs = track.querySelectorAll('img');
      imgs.forEach((img) => {
        if (!img.complete) {
          img.addEventListener('load', () => setTimeout(() => rebuildTrack(), 60), { once: true });
          img.addEventListener('error', () => setTimeout(() => rebuildTrack(), 60), { once: true });
        }
      });
    }
    attachImageListeners();

    window.addEventListener('load', () => setTimeout(() => rebuildTrack(), 80));

    (function init() {
      if (!originalSlides || originalSlides.length === 0) {
        originalSlides = Array.from(track.children).map((n) => n.cloneNode(true));
      }
      rebuildTrack();
      window.__nh_collections = {
        rebuild: rebuildTrack,
        moveTo: (i) => moveTo(i),
      };
    })();
  } catch (err) {
    console.error('❌ collections.infinite.js error inesperado:', err);
  }
})();
