(function () {
  const DEFAULT_PAGE_SIZE = 12;
  const SEARCH_INPUT_SELECTOR = '#search';
  const META_SHOWN_SELECTOR = '#metaShown';
  const META_TOTAL_SELECTOR = '#metaTotal';
  const PAGINATION_CONTAINER_ID = 'catalogPagination';
  const LOADER_HTML = '<div class="col-12 text-center py-5">Cargando productos…</div>';

  function formatPrice(p) {
    if (p === undefined || p === null || p === '') return '';
    const n = Number(p);
    if (Number.isNaN(n)) return '';
    return 'S/ ' + n.toFixed(2);
  }

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function cardHTML(product, slug) {
    const titulo = esc(product.nombre || product.title || '');
    const descripcion = esc(product.descripcion_corta || product.descripcion || '');
    const precio = formatPrice(product.precio_desde ?? product.precio);
    let img = product.img || product.image || '';
    if (!img) img = '/img/Edredones/Edredon-beta.jpg';
    const id = esc(product.id || '');

    return `
      <article class="col product-card" data-title="${titulo}" tabindex="0">
        <div class="card h-100">
          <div class="img-wrapper">
            <img src="${esc(img)}" class="card-img-top" alt="${titulo}" loading="lazy" />
          </div>
          <div class="card-body">
            <h5 class="card-title mb-1">${titulo}</h5>
            <p class="mb-1 small text-muted desc-3">${descripcion}</p>
            <p class="mb-2"><strong>${precio ? precio : ''}</strong></p>
            <a href="/pages/catalogo/producto.html?id=${encodeURIComponent(
              id,
            )}&catalog=${encodeURIComponent(slug)}"
              class="btn btn-outline-primary btn-sm">Ver detalle</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderPagination(container, totalItems, pageSize, currentPage, onPage) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const el = container;
    el.innerHTML = '';

    function addLi(label, disabled, active, pageNum) {
      const li = document.createElement('li');
      li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
      const a = document.createElement('a');
      a.className = 'page-link';
      a.href = '#';
      a.innerText = label;
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (!disabled && !active && typeof onPage === 'function') onPage(pageNum);
      });
      li.appendChild(a);
      el.appendChild(li);
    }

    addLi('«', currentPage <= 1, false, currentPage - 1);

    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start < windowSize - 1) {
      start = Math.max(1, end - windowSize + 1);
    }
    for (let p = start; p <= end; p++) {
      addLi(String(p), false, p === currentPage, p);
    }

    addLi('»', currentPage >= totalPages, false, currentPage + 1);
  }

  function filterProducts(products, term) {
    if (!term) return products;
    const q = term.trim().toLowerCase();
    return products.filter((p) => {
      const hay = (p.nombre || p.descripcion_corta || p.descripcion || '').toString().toLowerCase();
      const tags = (Array.isArray(p.tags) ? p.tags.join(' ') : p.tags || '')
        .toString()
        .toLowerCase();
      return hay.includes(q) || tags.includes(q);
    });
  }

  async function fetchAndRenderProducts(containerSelector, categoriaSlug, options = {}) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn('fetchAndRenderProducts: contenedor no encontrado ->', containerSelector);
      return;
    }

    const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
    const searchInput = document.querySelector(SEARCH_INPUT_SELECTOR);
    const metaShownEl = document.querySelector(META_SHOWN_SELECTOR);
    const metaTotalEl = document.querySelector(META_TOTAL_SELECTOR);
    const paginationEl = document.getElementById(PAGINATION_CONTAINER_ID);

    const loader = document.createElement('div');
    loader.innerHTML = LOADER_HTML;
    const prevLoader = container.querySelector('#products-loading');
    if (!prevLoader) container.insertAdjacentElement('afterbegin', loader.firstElementChild);
    else prevLoader.innerHTML = 'Cargando productos…';

    let data = null;
    try {
      const res = await fetch(`/api/productos/${encodeURIComponent(categoriaSlug)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Fetch error ' + res.status);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Formato inesperado');
      data = Array.isArray(json.productos) ? json.productos : json.productos || [];
    } catch (err) {
      console.error('No se pudieron cargar productos', err);
      const existing = container.querySelectorAll('article.product-card');
      if (existing.length) {
        if (metaShownEl && metaTotalEl) {
          metaShownEl.innerText = 1;
          metaTotalEl.innerText = existing.length;
        }
      } else {
        container.innerHTML = `<div class="col-12 text-center py-5">Error cargando productos. Intenta más tarde.</div>`;
      }
      return;
    }

    let currentPage = 1;
    let filtered = data.slice();

    function updateList() {
      const term = searchInput && searchInput.value ? searchInput.value : '';
      filtered = filterProducts(data, term);

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;

      const start = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      if (!pageItems.length) {
        container.innerHTML =
          '<div class="col-12 text-center py-5">No hay productos para mostrar.</div>';
      } else {
        const html = pageItems.map((p) => cardHTML(p, categoriaSlug)).join('');
        container.innerHTML = html;
      }

      if (metaShownEl) metaShownEl.innerText = String(currentPage);
      if (metaTotalEl) metaTotalEl.innerText = String(totalPages);
      if (paginationEl) {
        renderPagination(paginationEl, total, pageSize, currentPage, (pageNum) => {
          if (pageNum < 1) pageNum = 1;
          const last = Math.max(1, Math.ceil(total / pageSize));
          if (pageNum > last) pageNum = last;
          currentPage = pageNum;
          updateList();
          const contTop = container.getBoundingClientRect().top + window.pageYOffset - 120;
          window.scrollTo({ top: contTop, behavior: 'smooth' });
        });
      }
    }

    let searchTimeout = null;
    function onSearchChange() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        updateList();
      }, 250);
    }

    if (searchInput) {
      searchInput.addEventListener('input', onSearchChange);
    }

    updateList();
  }

  window.fetchAndRenderProducts = fetchAndRenderProducts;
})();
