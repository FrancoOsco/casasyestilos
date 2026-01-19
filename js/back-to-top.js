(function () {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  const on = 250,
    off = 220;
  let visible = false,
    ticking = false;
  function rafRefresh() {
    const y = window.scrollY || 0;
    if (y > on && !visible) {
      btn.classList.add('visible');
      visible = true;
    } else if (y < off && visible) {
      btn.classList.remove('visible');
      visible = false;
    }
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          rafRefresh();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );
  document.addEventListener('DOMContentLoaded', rafRefresh);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
