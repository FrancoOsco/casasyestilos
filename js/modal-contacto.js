document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmitBtn');
  const modalEl = $('#formResponseModal');
  const modalBody = document.getElementById('formResponseModalBody');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (submitBtn) {
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Enviando...';
    }

    const action = form.getAttribute('action') || window.location.href;
    const data = new FormData(form);

    try {
      const resp = await fetch(action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: data,
      });

      if (resp.ok) {
        let json = {};
        try {
          json = await resp.json();
        } catch (err) {}

        if (json && json.message) {
          modalBody.textContent = json.message;
        } else {
          modalBody.textContent = '¡Muchas Gracias! Leeremos tu mensaje y te responderemos pronto.';
        }

        form.reset();
      } else {
        let errText = 'Ocurrió un error al enviar. Por favor inténtalo nuevamente.';
        try {
          const errJson = await resp.json();
          if (errJson && errJson.error) errText = errJson.error;
        } catch (_) {}
        modalBody.textContent = errText;
      }
    } catch (error) {
      modalBody.textContent =
        'No se pudo enviar (error de conexión). Por favor inténtalo más tarde.';
      console.error('Form submit error:', error);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Enviar mensaje';
      }
      modalEl.modal('show');
    }
  });
});
