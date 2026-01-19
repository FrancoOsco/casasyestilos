if (window._productRendererInit) {
  console.info('product renderer: ya inicializado');
} else {
  window._productRendererInit = true;

  (function () {
    const params = (function () {
      try {
        return new URLSearchParams(window.location.search);
      } catch {
        return new URLSearchParams();
      }
    })();

    const catalogUrlParam = params.get('catalogUrl');
    const catalogName = params.get('catalog');

    if (catalogUrlParam) {
      window.__CATALOG_URL_TO_LOAD = catalogUrlParam;
    } else if (catalogName) {
      window.__CATALOG_URL_TO_LOAD = `/data/${encodeURIComponent(catalogName)}.json`;
      window.__CATALOG_NAME = catalogName;
    } else if (window.CATALOG_URL) {
      window.__CATALOG_URL_TO_LOAD = window.CATALOG_URL;
    } else {
      window.__CATALOG_URL_TO_LOAD = '/data/default.json';
    }

    const catalogPageParam = params.get('catalogPage');
    if (catalogPageParam) {
      window.__CATALOG_PAGE_TO_USE = catalogPageParam;
    } else if (window.CATALOG_PAGE) {
      window.__CATALOG_PAGE_TO_USE = window.CATALOG_PAGE;
    } else if (window.__CATALOG_NAME) {
      window.__CATALOG_PAGE_TO_USE = `/pages/catalogo/${encodeURIComponent(
        window.__CATALOG_NAME,
      )}.html`;
    } else {
      window.__CATALOG_PAGE_TO_USE = '/pages/catalogo/default.html';
    }
  })();

  const CATALOG_URL = window.__CATALOG_URL_TO_LOAD;
  const CART_KEY = 'carrito';
  const WISH_KEY = 'wishlist';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtPrice(v) {
    if (v === undefined || v === null || v === '') return 'Consultar precio';
    const n = Number(v);
    if (isNaN(n) || n === 0) return 'Consultar precio';
    return 'S/ ' + n.toFixed(2);
  }

  function leerCarrito() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function guardarCarrito(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart || []));
    actualizarContadorCarrito();
  }

  function actualizarContadorCarrito() {
    const cart = leerCarrito();
    const total = cart.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
    document.querySelectorAll('#cart-count, .cart-count').forEach((el) => (el.innerText = total));
  }

  function leerWishlist() {
    try {
      return JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function guardarWishlist(arr) {
    localStorage.setItem(WISH_KEY, JSON.stringify(arr || []));
    actualizarWishlistBadges();
  }

  function estaEnWishlist(id) {
    const w = leerWishlist();
    return w.includes(String(id));
  }

  function toggleWishlist(id) {
    const w = leerWishlist();
    const sid = String(id);
    const idx = w.indexOf(sid);
    if (idx >= 0) w.splice(idx, 1);
    else w.push(sid);
    guardarWishlist(w);
    return w;
  }

  function actualizarWishlistBadges() {
    const cnt = leerWishlist().length;
    document.querySelectorAll('#wish-count, .wish-count').forEach((el) => (el.innerText = cnt));
  }

  async function loadProductsCatalog(url = CATALOG_URL) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();
      let all = [];
      if (Array.isArray(raw)) all = raw;
      else if (raw && typeof raw === 'object') {
        Object.keys(raw).forEach((k) => {
          if (Array.isArray(raw[k])) all = all.concat(raw[k]);
        });
      }
      if (!Array.isArray(all)) all = [];
      window.allProducts = all;
      window.productsMap = all.reduce((m, p) => {
        if (p && p.id) m[String(p.id)] = p;
        return m;
      }, {});
      return all;
    } catch (e) {
      console.error('Error cargando catálogo:', e);
      window.allProducts = [];
      window.productsMap = {};
      return [];
    }
  }

  function renderList(products) {
    const cont = document.getElementById('productos-container');
    if (!cont) return;
    if (!products || !products.length) {
      cont.innerHTML =
        '<div class="col-12"><p class="text-muted">No hay productos disponibles.</p></div>';
      return;
    }

    cont.innerHTML = `<div class="row g-4">${products
      .map((p) => {
        const id = encodeURIComponent(String(p.id || ''));
        const img = esc(p.img || p.thumbnail || '/img/placeholder.jpg');
        const nombre = esc(p.nombre || 'Sin nombre');
        const precio =
          p.precio_desde !== undefined && p.precio_desde !== null
            ? fmtPrice(p.precio_desde)
            : 'Consultar precio';
        const desc = esc(String(p.descripcion_corta || p.descripcion || '').slice(0, 120));
        return `
          <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <article class="card product-card h-100 shadow-sm">
              <a href="producto.html?id=${id}" class="d-block" aria-label="Ver detalle ${nombre}">
                <div class="img-wrapper" style="height:220px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                  <img src="${img}" class="card-img-top" alt="${nombre}" loading="lazy" style="max-width:100%; max-height:100%; object-fit:contain;">
                </div>
              </a>
              <div class="card-body">
                <h5 class="card-title mb-1">${nombre}</h5>
                <p class="mb-1 small text-muted desc-3">${desc}</p>
                <p class="mb-2"><strong>${precio}</strong></p>
                <a href="producto.html?id=${id}" class="btn btn-outline-primary btn-sm">Ver detalle</a>
              </div>
            </article>
          </div>`;
      })
      .join('')}</div>`;
  }

  function renderDetail(product) {
    const cont = document.getElementById('productos-container');
    if (!cont) return;
    if (!product) {
      let catalogPage = window.__CATALOG_PAGE_TO_USE || document.referrer || '/';
      cont.innerHTML = `
    <div class="col-12">
      <p class="text-muted">
        Producto no encontrado. 
        <a href="${catalogPage}">Volver al catálogo</a>
      </p>
    </div>`;
      return;
    }

    const id = esc(String(product.id || ''));
    const nombre = esc(product.nombre || 'Sin nombre');
    const marca = esc(product.marca || '');
    const sub = esc(product.subnombre || '');
    const price =
      product.precio_desde !== undefined && product.precio_desde !== null
        ? fmtPrice(product.precio_desde)
        : 'Consultar precio';
    const desc = esc(String(product.descripcion || product.descripcion_corta || ''));

    const imgs = [];
    if (product.img) imgs.push(product.img);
    if (product.img2) imgs.push(product.img2);
    if (product.imagenes && Array.isArray(product.imagenes)) imgs.push(...product.imagenes);
    if (imgs.length === 0) imgs.push('/img/placeholder.jpg');
    if (imgs.length === 1) imgs.push(imgs[0]);

    const features = Array.isArray(product.features) ? product.features : [];
    const specs = product.specs && typeof product.specs === 'object' ? product.specs : {};
    const models = Array.isArray(product.models) ? product.models : [];
    const paymentMethods = product.payment_methods || 'Depósito / Transferencia / Yape';
    const bankAccounts = Array.isArray(product.bank_accounts) ? product.bank_accounts : [];

    cont.innerHTML = `
      <div class="col-12">
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="border p-2 text-center">
              <img id="main-product-img" src="${esc(
                imgs[0],
              )}" alt="${nombre}" class="img-fluid mb-2" style="max-height:420px;object-fit:contain;">
              <div id="product-thumbs" class="d-flex justify-content-center" style="gap:10px;">
                ${imgs
                  .map(
                    (s, i) =>
                      `<img src="${esc(
                        s,
                      )}" class="img-thumbnail product-thumb" data-idx="${i}" style="height:70px;cursor:pointer;">`,
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <h2 class="product-title mb-1">${nombre}</h2>
            <h6 class="text-muted mb-2">${marca}${sub ? ' — ' + sub : ''}</h6>
            <div class="price-row mb-2"><strong class="product-price">${price}</strong><small class="text-muted ms-3">Marca: <strong>${marca}</strong></small></div>

            <div class="d-flex flex-column flex-md-row mb-3 product-actions" style="gap:8px;">
  <button id="btn-addcart" class="btn btn-outline-primary d-flex align-items-center justify-content-center" style="min-width:160px; gap:8px;">
    <i class="bi bi-cart-plus" aria-hidden="true"></i>
    <span>Agregar al carrito</span>
  </button>

  <button id="btn-wish" class="btn btn-outline-secondary d-flex align-items-center justify-content-center" style="min-width:160px; gap:8px;">
    <i class="bi bi-heart" aria-hidden="true"></i>
    <span>Añadir a mis deseos</span>
  </button>

  <button id="btn-share" class="btn btn-secondary d-flex align-items-center justify-content-center" style="min-width:160px; gap:8px;">
    <i class="bi bi-share logo-share" aria-hidden="true"></i>
    <span>Compartir</span>
  </button>
</div>

            <div class="mb-3"><small class="text-muted">Categorías: ${esc(
              Array.isArray(product.categorias) ? product.categorias.join(', ') : '',
            )}</small><br><small class="text-muted">Etiquetas: ${esc(
      Array.isArray(product.tags) ? product.tags.join(', ') : '',
    )}</small></div>

            <ul class="nav nav-tabs" id="productTabs" role="tablist">
  <li class="nav-item" role="presentation">
    <button class="nav-link active" id="desc-tab" data-bs-toggle="tab" data-bs-target="#desc" type="button" role="tab" aria-controls="desc" aria-selected="true">Descripción</button>
  </li>
  <li class="nav-item" role="presentation">
    <button class="nav-link" id="spec-tab" data-bs-toggle="tab" data-bs-target="#spec" type="button" role="tab" aria-controls="spec" aria-selected="false">Especificaciones</button>
  </li>
  <li class="nav-item" role="presentation">
    <button class="nav-link" id="model-tab" data-bs-toggle="tab" data-bs-target="#model" type="button" role="tab" aria-controls="model" aria-selected="false">Modelos</button>
  </li>
  <li class="nav-item" role="presentation">
    <button class="nav-link" id="pay-tab" data-bs-toggle="tab" data-bs-target="#pay" type="button" role="tab" aria-controls="pay" aria-selected="false">Pago / Bancos</button>
  </li>
</ul>

<div id="productTabsContent" class="tab-content border p-3 rounded-bottom" style="min-height:140px;">

  <div class="tab-pane fade show active" id="desc" role="tabpanel" aria-labelledby="desc-tab">
    <p class="mb-0">${desc}</p>
  </div>

  <div class="tab-pane fade" id="spec" role="tabpanel" aria-labelledby="spec-tab">
    ${
      features.length
        ? '<ul>' + features.map((f) => `<li>${esc(f)}</li>`).join('') + '</ul>'
        : "<p class='text-muted mb-0'>No hay especificaciones breves.</p>"
    }
    ${
      Object.keys(specs).length
        ? "<hr><table class='table table-sm'><tbody>" +
          Object.keys(specs)
            .map(
              (k) =>
                `<tr><th style="width:40%">${esc(k)}</th><td>${esc(
                  String(specs[k] || ''),
                )}</td></tr>`,
            )
            .join('') +
          '</tbody></table>'
        : ''
    }
  </div>

  <div class="tab-pane fade" id="model" role="tabpanel" aria-labelledby="model-tab">
    ${
      models.length
        ? "<div class='table-responsive'><table class='table table-sm'><thead><tr><th>Modelo</th><th>Presentación</th><th>Especificación</th></tr></thead><tbody>" +
          models
            .map(
              (m) =>
                `<tr><td>${esc(m.model || '')}</td><td>${esc(
                  m.length || m.presentation || '',
                )}</td><td>${esc(m.spec || '')}</td></tr>`,
            )
            .join('') +
          '</tbody></table></div>'
        : "<p class='text-muted mb-0'>No hay modelos disponibles.</p>"
    }
  </div>

  <div class="tab-pane fade" id="pay" role="tabpanel" aria-labelledby="pay-tab">
    <p class="mb-1"><strong>Métodos de pago:</strong> ${esc(paymentMethods)}</p>
    ${
      bankAccounts.length
        ? "<div class='small'>" +
          bankAccounts
            .map(
              (b) =>
                `<div class='mb-2'><strong>${esc(b.name || b.bank || '')}</strong><br>${esc(
                  b.info || b.details || '',
                )}</div>`,
            )
            .join('') +
          '</div>'
        : ''
    }
  </div>

</div>

          </div>
        </div>
      </div>
    `;

    (function ensureActionIcons() {
      const map = [
        { id: 'btn-addcart', cls: 'bi bi-cart-plus' },
        { id: 'btn-wish', cls: 'bi bi-heart' },
        { id: 'btn-share', cls: 'bi bi-share' },
      ];
      map.forEach((item) => {
        const btn = document.getElementById(item.id);
        if (!btn) return;
        if (btn.querySelector('i.bi') || btn.querySelector('svg')) return;
        const i = document.createElement('i');
        i.className = item.cls;
        i.setAttribute('aria-hidden', 'true');
        btn.insertBefore(i, btn.firstChild);
        if (!btn.querySelector('span')) {
          const span = document.createElement('span');
          span.textContent = btn.textContent.trim();
          btn.appendChild(span);
        }
      });
    })();

    const mainImg = document.getElementById('main-product-img');
    cont.querySelectorAll('#product-thumbs .product-thumb').forEach((t) =>
      t.addEventListener('click', () => {
        const s = t.getAttribute('src');
        if (s) mainImg.src = s;
        cont
          .querySelectorAll('#product-thumbs .product-thumb')
          .forEach((x) => x.classList.remove('active-thumb'));
        t.classList.add('active-thumb');
      }),
    );

    cont.querySelectorAll('#productTabs .nav-link').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        cont
          .querySelectorAll('#productTabs .nav-link')
          .forEach((n) => n.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.getAttribute('data-bs-target') || btn.getAttribute('data-target') || '';
        if (!target) return;
        cont
          .querySelectorAll('#productTabsContent .tab-pane')
          .forEach((pane) => pane.classList.remove('active', 'show'));
        const pane = cont.querySelector(target);
        if (pane) pane.classList.add('active', 'show');
      });
    });

    const btnShare = document.getElementById('btn-share');
    btnShare &&
      btnShare.addEventListener('click', async (ev) => {
        ev && ev.preventDefault();
        try {
          const url = window.location.href;
          const title = product.nombre || 'Producto';
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            alert('URL copiada al portapapeles');
          }
        } catch (e) {
          console.warn('share error', e);
        }
      });

    const btnAdd = document.getElementById('btn-addcart');
    if (btnAdd) {
      function showAddToast(text, duration = 1500) {
        const FADE_MS = 180;
        const otherCont = document.getElementById('wish-toast-container');
        if (otherCont && otherCont.firstElementChild) {
          const e = otherCont.firstElementChild;
          if (otherCont._removeTimer) {
            clearTimeout(otherCont._removeTimer);
            otherCont._removeTimer = null;
          }
          e.style.opacity = '0';
          e.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (e.parentNode) e.parentNode.removeChild(e);
            if (otherCont && otherCont.children.length === 0 && otherCont.parentNode)
              otherCont.parentNode.removeChild(otherCont);
          }, FADE_MS);
        }

        let cont = document.getElementById('add-toast-container');
        if (!cont) {
          cont = document.createElement('div');
          cont.id = 'add-toast-container';
          cont.setAttribute('aria-live', 'polite');
          cont.style.position = 'fixed';
          cont.style.left = '50%';
          cont.style.bottom = '18px';
          cont.style.transform = 'translateX(-50%)';
          cont.style.zIndex = '1080';
          cont.style.display = 'flex';
          cont.style.flexDirection = 'column';
          cont.style.gap = '8px';
          cont.style.alignItems = 'center';
          cont.style.pointerEvents = 'none';
          document.body.appendChild(cont);
        }

        const existing = cont.firstElementChild;
        if (existing) {
          if (cont._removeTimer) {
            clearTimeout(cont._removeTimer);
            cont._removeTimer = null;
          }
          existing.style.opacity = '0';
          existing.style.transform = 'translateY(10px)';
          cont._removeTimer = setTimeout(() => {
            if (existing.parentNode) existing.parentNode.removeChild(existing);
            cont._removeTimer = null;
            createAddToastNode(cont, text, duration, FADE_MS);
          }, FADE_MS);
          return;
        }

        createAddToastNode(cont, text, duration, FADE_MS);
      }

      function createAddToastNode(cont, text, duration, FADE_MS) {
        const toast = document.createElement('div');
        toast.className = 'add-toast';
        toast.textContent = text;
        toast.style.pointerEvents = 'auto';
        toast.style.maxWidth = '90vw';
        toast.style.minWidth = '220px';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.16)';
        toast.style.background = 'rgba(0,0,0,0.85)';
        toast.style.color = '#fff';
        toast.style.fontSize = '14px';
        toast.style.opacity = '0';
        toast.style.transition = 'transform .18s ease, opacity .18s ease';
        toast.style.transform = 'translateY(10px)';
        toast.style.textAlign = 'center';
        toast.style.lineHeight = '1.2';

        cont.appendChild(toast);
        void toast.offsetWidth;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        if (cont._hideTimer) {
          clearTimeout(cont._hideTimer);
          cont._hideTimer = null;
        }
        let hideTimer = setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
            if (cont && cont.children.length === 0 && cont.parentNode)
              cont.parentNode.removeChild(cont);
          }, FADE_MS);
        }, duration);

        cont._hideTimer = hideTimer;
      }

      btnAdd.addEventListener('click', () => {
        const cart = leerCarrito();
        const sid = String(product.id);
        const idx = cart.findIndex((x) => String(x.id) === sid);
        if (idx >= 0) {
          cart[idx].cantidad = (Number(cart[idx].cantidad) || 1) + 1;
        } else {
          cart.push({
            id: sid,
            nombre: product.nombre || '',
            precio: product.precio_desde || 0,
            img: getImgForStorage(product),
            cantidad: 1,
          });
        }
        guardarCarrito(cart);

        const nombre = product && product.nombre ? product.nombre : '';
        const texto = nombre ? `Añadido: ${nombre}` : 'Tu producto ha sido añadido';
        showAddToast(texto, 1400);
      });
    }

    const btnWish = document.getElementById('btn-wish');
    if (btnWish) {
      function showWishToast(text, duration = 1500) {
        const FADE_MS = 180;
        const otherCont = document.getElementById('add-toast-container');
        if (otherCont && otherCont.firstElementChild) {
          const e = otherCont.firstElementChild;
          if (otherCont._removeTimer) {
            clearTimeout(otherCont._removeTimer);
            otherCont._removeTimer = null;
          }
          e.style.opacity = '0';
          e.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (e.parentNode) e.parentNode.removeChild(e);
            if (otherCont && otherCont.children.length === 0 && otherCont.parentNode)
              otherCont.parentNode.removeChild(otherCont);
          }, FADE_MS);
        }

        let cont = document.getElementById('wish-toast-container');
        if (!cont) {
          cont = document.createElement('div');
          cont.id = 'wish-toast-container';
          cont.setAttribute('aria-live', 'polite');
          cont.style.position = 'fixed';
          cont.style.left = '50%';
          cont.style.bottom = '18px';
          cont.style.transform = 'translateX(-50%)';
          cont.style.zIndex = '1080';
          cont.style.display = 'flex';
          cont.style.flexDirection = 'column';
          cont.style.gap = '8px';
          cont.style.alignItems = 'center';
          cont.style.pointerEvents = 'none';
          document.body.appendChild(cont);
        }

        const existing = cont.firstElementChild;
        if (existing) {
          if (cont._removeTimer) {
            clearTimeout(cont._removeTimer);
            cont._removeTimer = null;
          }
          existing.style.opacity = '0';
          existing.style.transform = 'translateY(10px)';
          cont._removeTimer = setTimeout(() => {
            if (existing.parentNode) existing.parentNode.removeChild(existing);
            cont._removeTimer = null;
            createWishToastNode(cont, text, duration, FADE_MS);
          }, FADE_MS);
          return;
        }

        createWishToastNode(cont, text, duration, FADE_MS);
      }

      function createWishToastNode(cont, text, duration, FADE_MS) {
        const toast = document.createElement('div');
        toast.className = 'wish-toast';
        toast.textContent = text;
        toast.style.pointerEvents = 'auto';
        toast.style.maxWidth = '90vw';
        toast.style.minWidth = '220px';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.16)';
        toast.style.background = 'rgba(0,0,0,0.85)';
        toast.style.color = '#fff';
        toast.style.fontSize = '14px';
        toast.style.opacity = '0';
        toast.style.transition = 'transform .18s ease, opacity .18s ease';
        toast.style.transform = 'translateY(10px)';
        toast.style.textAlign = 'center';
        toast.style.lineHeight = '1.2';

        cont.appendChild(toast);
        void toast.offsetWidth;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        if (cont._hideTimer) {
          clearTimeout(cont._hideTimer);
          cont._hideTimer = null;
        }
        let hideTimer = setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
          setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
            if (cont && cont.children.length === 0 && cont.parentNode)
              cont.parentNode.removeChild(cont);
          }, FADE_MS);
        }, duration);

        cont._hideTimer = hideTimer;
      }

      const textSpan = () => btnWish.querySelector('span') || btnWish;
      const updateWishBtn = () => {
        const wished = estaEnWishlist(product.id);
        btnWish.classList.toggle('btn-secondary', wished);
        btnWish.classList.toggle('btn-outline-secondary', !wished);
        btnWish.setAttribute('title', wished ? 'En mis deseos' : 'Añadir a mis deseos');
        const icon = btnWish.querySelector('i.bi');
        if (icon) {
          icon.classList.toggle('bi-heart', !wished);
          icon.classList.toggle('bi-heart-fill', wished);
        }
      };

      btnWish.addEventListener('click', () => {
        const before = estaEnWishlist(product.id);
        toggleWishlist(product.id);
        updateWishBtn();
        const nombre = product?.nombre || 'Dicho producto';
        showWishToast(
          before
            ? `${nombre} se eliminó de tu lista de deseos`
            : `${nombre} se agregó a tu lista de deseos`,
          1400,
        );
      });

      updateWishBtn();
    }
    if (!document.getElementById('producto-inline-styles')) {
      const st = document.createElement('style');
      st.id = 'producto-inline-styles';
      st.innerHTML = `
        #product-thumbs .product-thumb{border:2px solid transparent;transition:border-color .12s}
        #product-thumbs .product-thumb.active-thumb{border-color:rgba(0,0,0,.12)}
        .product-title{font-size:1.45rem;font-weight:700}
        .product-price{font-size:1.45rem;color:inherit}
        .price-row{display:flex;align-items:center;gap:0.75rem}
        @media(max-width:767px){ #btn-addcart,#btn-wish,#btn-share,.btn{width:100%;display:block;margin-bottom:8px} }
      `;
      document.head.appendChild(st);
    }
  }

  function getImgForStorage(p) {
    if (!p) return '/img/placeholder.jpg';
    if (p.img) return p.img;
    if (p.img2) return p.img2;
    if (p.imagenes && p.imagenes[0]) return p.imagenes[0];
    return '/img/placeholder.jpg';
  }

  async function initRenderer() {
    actualizarContadorCarrito();
    actualizarWishlistBadges();

    const idq = (function () {
      try {
        return new URLSearchParams(window.location.search).get('id') || '';
      } catch {
        return '';
      }
    })();

    const all = await loadProductsCatalog();
    if (!all) {
      const cont = document.getElementById('productos-container');
      if (cont)
        cont.innerHTML =
          '<div class="col-12"><p class="text-danger">Error cargando productos.</p></div>';
      return;
    }

    if (idq) {
      const map = window.productsMap || {};
      let prod = map[idq] || all.find((p) => String(p.id) === String(idq));
      if (!prod) {
        const dec = decodeURIComponent(idq || '');
        prod = map[dec] || all.find((p) => String(p.id) === String(dec));
      }
      renderDetail(prod);
    } else {
      renderList(all);
    }
  }

  document.addEventListener('DOMContentLoaded', initRenderer);
}
