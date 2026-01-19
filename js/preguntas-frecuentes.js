(function () {
  const container = document.querySelector('.reasons-wrapper');
  if (!container) return;
  const single = container.getAttribute('data-accordion') === 'single';
  const headers = Array.from(container.querySelectorAll('.reasons-header'));
  const TRANSITION_FALLBACK = 700; 

  function waitMaxHeightTransition(panel) {
    return new Promise((resolve) => {
      let finished = false;
      function onEnd(e) {
        if (e.propertyName === 'max-height') {
          finished = true;
          panel.removeEventListener('transitionend', onEnd);
          resolve();
        }
      }
      panel.addEventListener('transitionend', onEnd);
      setTimeout(() => {
        if (!finished) {
          panel.removeEventListener('transitionend', onEnd);
          resolve();
        }
      }, TRANSITION_FALLBACK);
    });
  }

  async function closePanel(panel, header, btn) {
    if (panel._animating) return;
    panel._animating = true;

    panel.style.maxHeight = (panel.scrollHeight || 0) + 'px';

    await new Promise((r) => requestAnimationFrame(r));
    panel.classList.remove('open');
    if (header) header.setAttribute('aria-expanded', 'false');
    if (btn) {
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    await new Promise((r) => requestAnimationFrame(r));
    panel.style.maxHeight = '0px';

    await waitMaxHeightTransition(panel);

    panel.setAttribute('aria-hidden', 'true');
    panel._animating = false;
  }

  async function openPanel(panel, header, btn) {
    if (panel._animating) return;
    panel._animating = true;

    panel.style.maxHeight =
      panel.style.maxHeight && panel.style.maxHeight !== 'none' ? panel.style.maxHeight : '0px';

    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (header) header.setAttribute('aria-expanded', 'true');
    if (btn) {
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }

    await new Promise((r) => requestAnimationFrame(r));
    panel.style.maxHeight = panel.scrollHeight + 'px';

    await waitMaxHeightTransition(panel);

    panel.style.maxHeight = 'none';
    panel._animating = false;
  }

  async function togglePanel(panel, header, btn) {
    if (panel._animating) return;

    const isOpen = panel.classList.contains('open');

    if (isOpen) {
      await closePanel(panel, header, btn);
    } else {
      if (single) {
        const others = Array.from(container.querySelectorAll('.reasons-collapse.open')).filter(
          (other) => other !== panel,
        );
        for (const other of others) {
          const h = container.querySelector('[aria-controls="' + other.id + '"]');
          const b = h && h.querySelector('.reasons-toggle');
          await closePanel(other, h, b);
        }
      }
      await openPanel(panel, header, btn);
    }
  }

  headers.forEach((header) => {
    const targetId = header.getAttribute('data-target') || header.getAttribute('aria-controls');
    const panel = document.getElementById(targetId);
    const btn = header.querySelector('.reasons-toggle');

    panel.classList.remove('open');
    panel.style.maxHeight = '0px';
    panel.setAttribute('aria-hidden', 'true');
    header.setAttribute('aria-expanded', 'false');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    panel._animating = false;

    header.addEventListener('click', (e) => {
      togglePanel(panel, header, btn);
    });

    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        togglePanel(panel, header, btn);
      }
    });

    if (btn) {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        togglePanel(panel, header, btn);
      });
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      container.querySelectorAll('.reasons-collapse.open').forEach((panel) => {
        if (!panel._animating) panel.style.maxHeight = panel.scrollHeight + 'px';
      });
    }, 140);
  });
})();
