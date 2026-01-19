const CATALOG_FILES = [
  'data/salida-de-bano.json',
  'data/mosquiteros.json',
  'data/toallas-y-batas.json',
  'data/manteleria.json',
  'data/protectores.json',
  'data/sabanas.json',
  'data/edredones.json',
  'data/default.json',
  'data/pantuflas.json',
];
const WHATSAPP_DEST_PHONE = '51946168546';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mvgqvqao';

async function loadProductsCatalogFiles(files = CATALOG_FILES) {
  const all = [];
  const map = {};
  try {
    const promises = files.map((f) =>
      fetch(f)
        .then((r) => (r.ok ? r.json().catch(() => []) : []))
        .catch(() => []),
    );
    const results = await Promise.all(promises);
    results.forEach((raw) => {
      if (!raw) return;
      if (Array.isArray(raw)) all.push(...raw);
      else if (typeof raw === 'object') {
        Object.keys(raw).forEach((k) => {
          if (Array.isArray(raw[k])) all.push(...raw[k]);
        });
      }
    });
    all.forEach((p) => {
      if (p && p.id) map[String(p.id)] = p;
    });
  } catch (e) {
    console.error('Error cargando catálogos:', e);
  }
  window.allProducts = all;
  window.productsMap = map;
  return { all, map };
}

function parsePrecio(precioStr) {
  if (!precioStr) return 0;
  let s = String(precioStr)
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '.')
    .trim();
  const parts = s.split('.');
  if (parts.length > 1) {
    const dec = parts.pop();
    s = parts.join('') + '.' + dec;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function formatPrice(n) {
  return 'S/ ' + Number(n || 0).toFixed(2);
}

function leerCarrito() {
  try {
    const raw = JSON.parse(localStorage.getItem('carrito')) || [];
    return raw.map((it) => ({
      id: String(it.id || ''),
      nombre: it.nombre || it.title || '',
      subnombre: it.subnombre || '',
      precio: it.precio || '',
      img: it.img || '',
      cantidad: Number(it.cantidad) || 1,
    }));
  } catch (e) {
    return [];
  }
}
function guardarCarrito(arr) {
  localStorage.setItem('carrito', JSON.stringify(arr || []));
  actualizarContadorCarrito();
}
function vaciarCarrito() {
  localStorage.removeItem('carrito');
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const total = leerCarrito().reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
  document.querySelectorAll('#cart-count, .cart-count').forEach((el) => (el.innerText = total));
}

function buildItemHTML(producto, idx, catalogProd) {
  const precioFuente =
    catalogProd && catalogProd.precio ? catalogProd.precio : producto.precio || 'S/ 0.00';
  const precioNum = parsePrecio(precioFuente);
  const cantidad = Number(producto.cantidad) || 1;
  const subtotal = precioNum * cantidad;
  const img =
    catalogProd && catalogProd.img ? catalogProd.img : producto.img || '/img/product-1.jpg';
  return `
  <div class="col-12 mb-3 cart-item" data-index="${idx}" data-product-id="${escapeHtml(
    producto.id,
  )}">
    <div class="card shadow-sm border-0 rounded-3 py-3 px-3 cart-card">
      <div class="row g-2 align-items-center cart-row">
        <div class="col-auto cart-col-img img-laterales">
          <img class="cart-img" src="${escapeHtml(img)}" alt="${escapeHtml(producto.nombre)}" />
        </div>

        <div class="col cart-col-main px-0">
          <h5 class="mb-1 titulo-producto cart-title" data-index="${idx}">${escapeHtml(
    producto.nombre,
  )}</h5>
          <p class="mb-1 text-muted small cart-subtitle">${escapeHtml(producto.subnombre || '')}</p>
        </div>

        <div class="col-auto text-end cart-col-right informacion-card">
          <!-- precio y subtotal en dos columnas (el CSS organiza la rejilla) -->
          <div class="small text-muted price-label">Precio</div>
          <div class="fw-semibold price-value">${formatPrice(precioNum)}</div>

          <div class="small text-muted subtotal-label">Subtotal</div>
          <div class="fw-bold subtotal-value">${formatPrice(subtotal)}</div>

          <!-- controles: ocupan la fila completa debajo -->
          <div class="d-flex align-items-center gap-2 mt-2 qty-controls" data-index="${idx}">
            <button class="btn btn-sm btn-outline-secondary btn-decrease qty-decrease" data-index="${idx}" aria-label="Disminuir">−</button>
            <input type="number" min="1" class="form-control form-control-sm qty-input qty-number" data-index="${idx}" value="${cantidad}" style="width:70px"/>
            <button class="btn btn-sm btn-outline-secondary btn-increase qty-increase" data-index="${idx}" aria-label="Aumentar">+</button>

            <button class="btn btn-eliminar" data-index="${idx}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}

function mostrarCarrito() {
  const cont = document.getElementById('carrito-contenido');
  if (!cont) return;
  const carrito = leerCarrito();

  const btnWa = document.getElementById('enviar-whatsapp-btn');
  if (btnWa) btnWa.disabled = !(carrito && carrito.length > 0);

  if (carrito.length === 0) {
    const suppressUntil = window._suppressEmptyUntil || 0;
    const now = Date.now();

    updateOrCreateTotalElement(0, cont);
    actualizarContadorCarrito();
    const btnWa = document.getElementById('enviar-whatsapp-btn');
    if (btnWa) btnWa.disabled = true;
    const btnCot = document.getElementById('solicitar-cotizacion-btn');
    if (btnCot) btnCot.disabled = true;

    if (now < suppressUntil) return;

    cont.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'empty-wrapper';

    const p = document.createElement('p');
    p.className = 'empty-cart';
    p.textContent = 'Tu carrito está vacío.';

    wrapper.appendChild(p);
    cont.appendChild(wrapper);

    wrapper.style.height = 'auto';

    wrapper.getBoundingClientRect();

    const naturalHeight = wrapper.scrollHeight;

    wrapper.style.height = '0px';
    wrapper.getBoundingClientRect();

    requestAnimationFrame(() => {
      wrapper.style.height = naturalHeight + 'px';
    });

    const HEIGHT_MS = 360;
    const FADE_MS = 360;

    const onWrapperEnd = (ev) => {
      if (ev.propertyName !== 'height') return;
      wrapper.removeEventListener('transitionend', onWrapperEnd);

      requestAnimationFrame(() => p.classList.add('show'));

      setTimeout(() => {
        wrapper.style.height = 'auto';
      }, FADE_MS + 20);
    };

    wrapper.addEventListener('transitionend', onWrapperEnd);

    setTimeout(() => {
      if (!p.classList.contains('show')) p.classList.add('show');
      wrapper.style.height = 'auto';
      wrapper.removeEventListener('transitionend', onWrapperEnd);
    }, HEIGHT_MS + FADE_MS + 120);

    return;
  }

  const totalGeneral = carrito.reduce((sum, p) => {
    const catalogProd = window.productsMap && window.productsMap[String(p.id)];
    const precioFuente =
      catalogProd && catalogProd.precio ? catalogProd.precio : p.precio || 'S/ 0.00';
    const precioNum = parsePrecio(precioFuente);
    const cantidad = Number(p.cantidad) || 1;
    return sum + precioNum * cantidad;
  }, 0);

  const html = carrito
    .map((p, i) => {
      const catalogProd = window.productsMap && window.productsMap[String(p.id)];
      return buildItemHTML(p, i, catalogProd);
    })
    .join('');
  cont.innerHTML = html;

  updateOrCreateTotalElement(totalGeneral, cont);

  cont.querySelectorAll('.btn-decrease').forEach((b) =>
    b.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const cart = leerCarrito();
      if (!cart[idx]) return;
      cart[idx].cantidad = Math.max(1, (Number(cart[idx].cantidad) || 1) - 1);
      guardarCarrito(cart);
      mostrarCarrito();
    }),
  );
  cont.querySelectorAll('.btn-increase').forEach((b) =>
    b.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const cart = leerCarrito();
      if (!cart[idx]) return;
      cart[idx].cantidad = (Number(cart[idx].cantidad) || 0) + 1;
      guardarCarrito(cart);
      mostrarCarrito();
    }),
  );
  cont.querySelectorAll('.qty-input').forEach((inp) =>
    inp.addEventListener('change', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      const val = Math.max(1, Number(e.currentTarget.value) || 1);
      const cart = leerCarrito();
      if (!cart[idx]) return;
      cart[idx].cantidad = val;
      guardarCarrito(cart);
      mostrarCarrito();
    }),
  );

  cont.querySelectorAll('.btn-eliminar').forEach((b) =>
    b.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const itemEl = btn.closest('.cart-item');
      if (!itemEl) return;
      if (itemEl.dataset.removing) return;
      itemEl.dataset.removing = '1';

      const prodId =
        itemEl.dataset.productId || (itemEl.querySelector('.cart-title') || {}).innerText || null;

      const FADE_MS = 120;
      const COLLAPSE_MS = 420;
      const COLLAPSE_DELAY = 80;
      const SAFETY = 200;
      const EMPTY_DELAY = COLLAPSE_DELAY + COLLAPSE_MS + 300;

      if (window._suppressEmptyTimeout) {
        clearTimeout(window._suppressEmptyTimeout);
        window._suppressEmptyTimeout = null;
      }
      window._suppressEmptyUntil = Date.now() + EMPTY_DELAY;

      itemEl.style.boxSizing = 'border-box';
      itemEl.style.overflow = 'hidden';
      const startH = Math.ceil(itemEl.getBoundingClientRect().height) || 0;
      itemEl.style.height = (startH || 1) + 'px';

      itemEl.getBoundingClientRect();

      itemEl.style.pointerEvents = 'none';

      const supportsWA = typeof itemEl.animate === 'function';

      let finished = false;
      const finishRemoval = () => {
        if (finished) return;
        finished = true;

        const current = leerCarrito();

        if (prodId) {
          const idxInCart = current.findIndex((it) => String(it.id) === String(prodId));
          if (idxInCart >= 0) current.splice(idxInCart, 1);
          else {
            const nombre = (itemEl.querySelector('.cart-title') || {}).innerText || '';
            const at = current.findIndex((it) => (it.nombre || '') === nombre);
            if (at >= 0) current.splice(at, 1);
          }
        } else {
          const dataIdx = Number(itemEl.dataset.index);
          if (!Number.isNaN(dataIdx) && current[dataIdx]) current.splice(dataIdx, 1);
        }

        guardarCarrito(current);

        if (!current || current.length === 0) {
          const remaining = Math.max(0, (window._suppressEmptyUntil || 0) - Date.now());
          if (window._suppressEmptyTimeout) clearTimeout(window._suppressEmptyTimeout);
          window._suppressEmptyTimeout = setTimeout(() => {
            window._suppressEmptyUntil = 0;
            window._suppressEmptyTimeout = null;
            mostrarCarrito();
          }, remaining);
        } else {
          mostrarCarrito();
        }
      };

      if (supportsWA) {
        const keyframes = [
          { height: startH + 'px', opacity: 1, transform: 'translateX(0) scale(1)' },
          { height: '0px', opacity: 0, transform: 'translateX(12px) scale(0.985)' },
        ];
        const timing = {
          duration: COLLAPSE_MS,
          easing: 'cubic-bezier(.2,.8,.2,1)',
          delay: COLLAPSE_DELAY,
          fill: 'forwards',
        };
        const anim = itemEl.animate(keyframes, timing);

        const timeout = setTimeout(() => {
          anim.cancel && anim.cancel();
          finishRemoval();
        }, COLLAPSE_DELAY + COLLAPSE_MS + SAFETY);

        anim.onfinish = () => {
          clearTimeout(timeout);
          finishRemoval();
        };
        anim.oncancel = () => {
          clearTimeout(timeout);
          finishRemoval();
        };
      } else {
        const FADE = FADE_MS;
        const COLL = COLLAPSE_MS;
        const DEL = COLLAPSE_DELAY;
        itemEl.classList.add('removing');
        itemEl.style.transition = [
          `opacity ${FADE}ms ease-out`,
          `transform ${FADE}ms ease-out`,
          `height ${COLL}ms ease ${DEL}ms`,
          `margin ${COLL}ms ease ${DEL}ms`,
          `padding ${COLL}ms ease ${DEL}ms`,
        ].join(', ');
        requestAnimationFrame(() => {
          itemEl.style.height = '0';
          itemEl.style.margin = '0';
          itemEl.style.padding = '0';
        });
        const to = setTimeout(() => {
          clearTimeout(to);
          finishRemoval();
        }, DEL + COLL + SAFETY);
        itemEl.addEventListener('transitionend', function onEnd(ev) {
          if (ev.propertyName === 'height' || ev.propertyName === 'opacity') {
            itemEl.removeEventListener('transitionend', onEnd);
            clearTimeout(to);
            finishRemoval();
          }
        });
      }
    }),
  );

  actualizarContadorCarrito();
}

function updateOrCreateTotalElement(totalValue, carritoContenidoEl) {
  let totalEl = document.getElementById('total-general');
  if (!totalEl) {
    totalEl = document.createElement('div');
    totalEl.id = 'total-general';
    totalEl.className = 'text-end mt-3 fw-semibold fs-5 total-align-end';
    const parentCard = carritoContenidoEl.closest('.card') || carritoContenidoEl.parentElement;
    if (parentCard) {
      const actions = parentCard.querySelector('.mt-4.text-end');
      if (actions) parentCard.insertBefore(totalEl, actions);
      else parentCard.appendChild(totalEl);
    } else {
      carritoContenidoEl.appendChild(totalEl);
    }
  }
  totalEl.innerText = `Total: ${formatPrice(totalValue)}`;
}

function escapeHtml(str) {
  return String(str || '').replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]),
  );
}
function stripTagsAndScripts(input) {
  if (!input) return '';
  let s = String(input);
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<\/?[^>]+(>|$)/g, '');
  return s;
}
function sanitizeTextField(raw, maxLen = 1000) {
  if (!raw) return '';
  let s = String(raw)
    .replace(/\u200B/g, '')
    .trim();
  s = stripTagsAndScripts(s);
  if (s.length > maxLen) s = s.slice(0, maxLen) + '...';
  return escapeHtml(s);
}
function sanitizeEmail(raw) {
  if (!raw) return '';
  let e = stripTagsAndScripts(String(raw).trim()).toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(e)) return '';
  if (e.length > 254) e = e.slice(0, 254);
  return e;
}
function sanitizePhone(raw) {
  if (!raw) return '';
  let p = String(raw)
    .replace(/[^0-9+\-\s()]/g, '')
    .trim();
  if (p.length > 30) p = p.slice(0, 30);
  return p;
}

function getCartSummaryForForm() {
  const carrito = leerCarrito();
  const summary = carrito.map((item) => {
    const catalogProd = window.productsMap && window.productsMap[String(item.id)];
    return {
      id: String(item.id || ''),
      nombre: item.nombre || '',
      subnombre: item.subnombre || '',
      marca: catalogProd && catalogProd.marca ? catalogProd.marca : '',
      descripcion:
        catalogProd && (catalogProd.descripcion_corta || catalogProd.descripcion)
          ? catalogProd.descripcion_corta || catalogProd.descripcion
          : '',
      cantidad: Number(item.cantidad || 1),
    };
  });
  return summary;
}
function buildCartPlainPerItem(summary) {
  if (!summary || summary.length === 0) return 'No hay productos.';
  return summary
    .map((it) => {
      const lines = [
        `- cantidad: ${it.cantidad}`,
        `id: ${it.id}`,
        it.marca ? `marca: ${it.marca}` : '',
        it.nombre ? `nombre: ${it.nombre}` : '',
        it.subnombre ? `subnombre: ${it.subnombre}` : '',
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');
}
function buildCartSummaryText(summary) {
  if (!summary || summary.length === 0) return 'No hay productos.';
  return summary
    .map((it, i) => {
      const cantidad = Number(it.cantidad || 1);
      const parts = [`${i + 1}) ${it.id} x${cantidad} — ${it.nombre || 'Sin nombre'}`];
      if (it.subnombre) parts.push(it.subnombre);
      if (it.marca) parts.push(`Marca: ${it.marca}`);
      return parts.join(' — ');
    })
    .join('\n');
}

function renderCartPreview(previewEl, summaryArr) {
  if (!previewEl) return;
  if (!summaryArr || summaryArr.length === 0) {
    previewEl.innerHTML = '<div class="text-muted">No hay productos en el carrito.</div>';
    return;
  }
  previewEl.innerHTML = summaryArr
    .map((s) => {
      const lines = [
        `<strong>${escapeHtml(s.nombre)}</strong>`,
        s.subnombre ? `${escapeHtml(s.subnombre)}` : '',
        s.marca ? `Marca: ${escapeHtml(s.marca)}` : '',
        s.descripcion ? `${escapeHtml(s.descripcion)}` : '',
        `Cantidad: ${s.cantidad}`,
      ].filter(Boolean);
      return `<div class="mb-2 small">${lines.join('<br>')}</div>`;
    })
    .join('');
}

function openCotizacionModal() {
  const summary = getCartSummaryForForm();
  const modalEl = document.getElementById('modalCotizacion');
  if (!modalEl) {
    sendCartToWhatsAppHandler();
    return;
  }

  const hidden = document.getElementById('cart-summary-hidden');
  if (hidden) hidden.value = JSON.stringify(summary);

  const hiddenText = document.getElementById('cart-summary-text-hidden');
  if (hiddenText) hiddenText.value = buildCartPlainPerItem(summary);

  const preview = document.getElementById('cart-preview');
  renderCartPreview(preview, summary);

  try {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  } catch (e) {
    try {
      $('#modalCotizacion').modal('show');
    } catch (err) {
      console.warn('No se pudo abrir modal (bootstrap no detectado).');
      alert('No se pudo abrir el modal. Intentando fallback: enviar por WhatsApp.');
      sendCartToWhatsAppHandler();
    }
  }
}

async function submitCotizacionForm(ev) {
  ev && ev.preventDefault && ev.preventDefault();
  const form = document.getElementById('form-cotizacion');
  if (!form) return;
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  const prevMsg = form.querySelector('.form-message');
  if (prevMsg) prevMsg.remove();

  const nombreEl = document.getElementById('cliente-nombre');
  const telefonoEl = document.getElementById('cliente-telefono');
  const emailEl = document.getElementById('cliente-email');
  const comentariosEl = document.getElementById('cliente-comentario');

  const nombre = nombreEl ? String(nombreEl.value || '').trim() : '';
  const telefono = telefonoEl ? String(telefonoEl.value || '').trim() : '';
  const email = emailEl ? String(emailEl.value || '').trim() : '';
  const comentarios = comentariosEl ? String(comentariosEl.value || '').trim() : '';

  const invalids = [];
  if (!nombre) invalids.push({ id: 'cliente-nombre', msg: 'Por favor ingresa tu nombre.' });
  if (!telefono)
    invalids.push({ id: 'cliente-telefono', msg: 'Por favor ingresa un teléfono válido.' });
  if (!email || !sanitizeEmail(email))
    invalids.push({ id: 'cliente-email', msg: 'Por favor ingresa un correo válido.' });

  if (invalids.length) {
    invalids.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) el.classList.add('is-invalid');
    });
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger form-message';
    alertDiv.role = 'alert';
    alertDiv.innerText = invalids[0].msg || 'Completa los campos requeridos.';
    form.prepend(alertDiv);
    const firstInvalidEl = document.getElementById(invalids[0].id);
    if (firstInvalidEl) firstInvalidEl.focus();
    return;
  }

  const liveCart = getCartSummaryForForm();
  const cartPlain = buildCartPlainPerItem(liveCart);
  const cartText = buildCartSummaryText(liveCart);

  const fd = new FormData();
  fd.append('nombre', sanitizeTextField(nombre, 200));
  fd.append('telefono', sanitizePhone(telefono));
  fd.append('email', sanitizeEmail(email));
  fd.append('comentarios', sanitizeTextField(comentarios, 800));
  fd.append('cart_summary_json', JSON.stringify(liveCart));
  fd.append('cart_summary_text', cartPlain);
  fd.append('_replyto', sanitizeEmail(email));
  const totalItems = liveCart.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
  fd.append(
    '_subject',
    `Nueva cotización - ${sanitizeTextField(nombre, 120)} (${totalItems} items)`,
  );

  const submitBtn = document.getElementById('submit-cotizacion-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Enviando...';
  }

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: fd,
    });

    if (res.ok) {
      vaciarCarrito();
      mostrarCarrito();
      const modalEl = document.getElementById('modalCotizacion');
      if (modalEl) {
        const modalObj =
          (bootstrap &&
            bootstrap.Modal &&
            bootstrap.Modal.getInstance &&
            bootstrap.Modal.getInstance(modalEl)) ||
          null;
        const modalContent = modalEl.querySelector('.modal-content');
        if (modalContent) {
          modalContent.innerHTML = `
            <div class="modal-header">
              <h5 class="modal-title">Solicitud enviada</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <p>Gracias ${escapeHtml(
                nombre,
              )}. Recibimos tu solicitud y te contactaremos pronto al ${escapeHtml(telefono)}.</p>
              <p class="small text-muted">Revisa también tu correo (${escapeHtml(
                email,
              )}) por si te enviamos la cotización.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Aceptar</button>
            </div>
          `;
        } else {
          alert('Solicitud enviada. Te contactaremos pronto.');
        }
      } else {
        alert('Solicitud enviada. Te contactaremos pronto.');
      }
    } else {
      const data = await res.json().catch(() => ({}));
      console.error('Formspree error', res.status, data);
      const errMsg = 'Ocurrió un error al enviar la cotización. Inténtalo de nuevo más tarde.';
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-danger form-message';
      alertDiv.role = 'alert';
      alertDiv.innerText = errMsg;
      form.prepend(alertDiv);
    }
  } catch (err) {
    console.error('Error enviando cotización:', err);
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger form-message';
    alertDiv.role = 'alert';
    alertDiv.innerText = 'Error de red al enviar la cotización. Verifica tu conexión.';
    form.prepend(alertDiv);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Enviar cotización';
    }
  }
}

function buildWhatsAppMessage(cart, opts = {}) {
  if (!Array.isArray(cart) || cart.length === 0) return '';
  const lines = ['Solicitud de cotización — Casas y Estilos', ''];
  cart.forEach((it, i) => {
    lines.push(
      `${i + 1}) x${it.cantidad} — ${it.nombre || 'Sin nombre'}${
        it.subnombre ? ' — ' + it.subnombre : ''
      }`,
    );
    if (it.id) lines.push(`   id: ${it.id}`);
  });
  lines.push('');
  const totalItems = cart.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
  lines.push(`Total items: ${totalItems}`);
  if (opts.nombre) lines.push(`Cliente: ${opts.nombre}`);
  if (opts.telefono) lines.push(`Tel: ${opts.telefono}`);
  if (opts.comentarios) lines.push(`Comentarios: ${opts.comentarios}`);
  lines.push('', 'Gracias.');
  return lines.join('\n');
}
function normalizePhoneForWa(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/\D/g, '');
  if (p.length <= 9 && !p.startsWith('51')) p = '51' + p;
  return p;
}
function openWhatsAppWithText(phone, text) {
  if (!text) return;
  const base = phone ? `https://wa.me/${phone}?text=` : `https://api.whatsapp.com/send?text=`;
  const enc = encodeURIComponent(text).slice(0, 1800);
  window.open(base + enc, '_blank');
}
function sendCartToWhatsAppHandler(e) {
  e && e.preventDefault && e.preventDefault();
  const raw = leerCarrito();
  if (!raw || raw.length === 0) {
    alert('Tu carrito está vacío.');
    return;
  }
  const nombre = (document.getElementById('cliente-nombre') || {}).value || '';
  const telefono = (document.getElementById('cliente-telefono') || {}).value || '';
  const comentarios = (document.getElementById('cliente-comentario') || {}).value || '';

  const msg = buildWhatsAppMessage(raw, { nombre, telefono, comentarios });
  const phone = normalizePhoneForWa(WHATSAPP_DEST_PHONE || telefono || '');
  openWhatsAppWithText(phone, msg);
}

document.addEventListener('DOMContentLoaded', async function () {
  await loadProductsCatalogFiles();
  actualizarContadorCarrito();
  mostrarCarrito();

  const btnWa = document.getElementById('enviar-whatsapp-btn');
  if (btnWa) btnWa.addEventListener('click', sendCartToWhatsAppHandler);

  const btnCot = document.getElementById('solicitar-cotizacion-btn');
  if (btnCot)
    btnCot.addEventListener('click', function (e) {
      e && e.preventDefault && e.preventDefault();
      openCotizacionModal();
    });

  const form = document.getElementById('form-cotizacion');
  if (form) form.addEventListener('submit', submitCotizacionForm);
});
