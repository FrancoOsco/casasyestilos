(function () {
  var CLOSE_DURATION = 220;

  function removeBackdrop() {
    document.querySelectorAll('.modal-backdrop').forEach(function (b) {
      b.remove();
    });
  }

  function manualHideAnimated(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('mc-fade-out');

    document.querySelectorAll('.modal-backdrop').forEach(function (b) {
      b.classList.add('mc-fade-out');
    });

    setTimeout(function () {
      modalEl.classList.remove('show', 'mc-fade-out');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.removeAttribute('aria-modal');
      modalEl.removeAttribute('role');
      removeBackdrop();
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = '';
    }, CLOSE_DURATION + 20);
  }

  function closeViaBootstrapAnimated(modalEl) {
    try {
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        var inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        inst.hide();
        return;
      }
    } catch (e) {}
    manualHideAnimated(modalEl);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-bs-dismiss="modal"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var modalEl = btn.closest('.modal');
    if (!modalEl) return;

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      modalEl.classList.add('mc-fade-out');
      document.querySelectorAll('.modal-backdrop').forEach(function (b) {
        b.classList.add('mc-fade-out');
      });

      setTimeout(function () {
        try {
          var inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
          inst.hide();
        } catch (err) {
          manualHideAnimated(modalEl);
        }
      }, 10);
    } else {
      manualHideAnimated(modalEl);
    }
  });

  document.addEventListener('hidden.bs.modal', function (ev) {
    var m = ev.target;
    if (m && m.id === 'modalCotizacion') {
      m.classList.remove('mc-fade-out');
      removeBackdrop();
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = '';
    }
  });
})();
