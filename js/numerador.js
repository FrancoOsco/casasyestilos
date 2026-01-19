(function () {
  function getCartTotalFromStorage() {
    try {
      const arr = JSON.parse(localStorage.getItem('carrito')) || [];
      return arr.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
    } catch (e) {
      return 0;
    }
  }

  function updateCartBadge() {
    const total = getCartTotalFromStorage();
    document.querySelectorAll('#cart-count, .cart-count').forEach((el) => {
      el.innerText = String(total);
      if (Number(total) === 0) {
        el.setAttribute('data-zero', 'true');
      } else {
        el.removeAttribute('data-zero');
      }
    });
  }

  window.updateCartBadge = updateCartBadge;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartBadge);
  } else {
    updateCartBadge();
  }

  window.addEventListener('storage', (ev) => {
    if (ev.key === 'carrito') updateCartBadge();
  });

  try {
    if (typeof window.guardarCarrito === 'function') {
      const _orig = window.guardarCarrito;
      window.guardarCarrito = function (arr) {
        const res = _orig.call(this, arr);
        try {
          updateCartBadge();
        } catch (e) {}
        return res;
      };
    }
  } catch (e) {}
})();
