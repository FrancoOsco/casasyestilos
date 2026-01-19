/**
 * js/search-autocomplete.js
 *
 * Autocomplete / búsqueda rápida para el input del header.
 * Incluir: <script src="/js/search-autocomplete.js" defer></script>
 *
 * Notas importantes:
 * - Cada producto recibe un campo temporal "_catalog" al cargar los JSON.
 * - Las URLs a producto incluyen &catalog=<clave> para que main-producto.js cargue el JSON correcto.
 */

(function () {
  const DATA_FILES = [
    '/data/default.json',
    '/data/edredones.json',
    '/data/frazadas.json',
    '/data/manteleria.json',
    '/data/mosquiteros.json',
    '/data/protectores.json',
    '/data/sabanas.json',
    '/data/salidas-de-bano.json',
    '/data/tela-bramante.json',
    '/data/toallas-y-batas.json',
  ];

  function findSearchInput() {
    return Array.from(document.querySelectorAll('input[type="text"], input[type="search"]')).find(
      (el) => el.placeholder && el.placeholder.toLowerCase().startsWith('buscar productos'),
    );
  }

  function normalizeText(s) {
    return (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function createDropdown() {
    const dd = document.createElement('div');
    dd.className = 'search-autocomplete-dropdown shadow-sm rounded-soft';
    dd.style.position = 'absolute';
    dd.style.zIndex = 1100;
    dd.style.minWidth = '320px';
    dd.style.maxWidth = '680px';
    dd.style.background = '#fff';
    dd.style.border = '1px solid rgba(0,0,0,0.08)';
    dd.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
    dd.style.padding = '6px';
    dd.style.display = 'none';
    dd.style.maxHeight = '56vh';
    dd.style.overflow = 'auto';
    dd.setAttribute('role', 'listbox');
    dd.setAttribute('aria-expanded', 'false');
    dd.style.backdropFilter = 'blur(0.5px)';
    return dd;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const nq = normalizeText(q)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/(.)/g, '$1.*'))
      .join('|');
    try {
      const re = new RegExp('(' + nq + ')', 'i');
      return escapeHtml(text).replace(re, '<mark>$1</mark>');
    } catch {
      return escapeHtml(text);
    }
  }

  function createSuggestionNode(item, query) {
    const row = document.createElement('a');
    row.href = item.url || '#';
    row.className = 'search-suggestion d-flex align-items-center gap-2';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.padding = '6px 8px';
    row.style.borderRadius = '6px';
    row.style.textDecoration = 'none';
    row.style.color = '#222';
    row.style.gap = '10px';
    row.style.marginBottom = '4px';

    row.innerHTML = `
      <div style="width:56px; height:56px; flex:0 0 56px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:6px; background:#f6f6f6;">
        <img src="${escapeHtml(item.img || '/img/placeholder.jpg')}" alt="${escapeHtml(
      item.title || '',
    )}" style="max-width:100%; max-height:100%; object-fit:contain;">
      </div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div style="min-width:0;">
            <div style="font-weight:600; font-size:0.98rem; line-height:1.1;">${highlight(
              item.title || '',
              query,
            )}</div>
            <div style="font-size:0.82rem; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${highlight(
              item.subtitle || '',
              query,
            )}</div>
          </div>
          <div style="flex:0 0 auto; margin-left:8px; text-align:right;">
            <div style="font-weight:700; font-size:0.92rem;">${escapeHtml(item.price || '')}</div>
            <div style="font-size:0.75rem; color:#9aa0a6;">${escapeHtml(
              item.type === 'catalog' ? 'Catálogo' : item.catalog || '',
            )}</div>
          </div>
        </div>
      </div>
    `;
    row.setAttribute('role', 'option');
    return row;
  }

  function fmtPrice(v) {
    if (v === undefined || v === null || v === '') return 'Consultar precio';
    const n = Number(v);
    if (isNaN(n) || n === 0) return 'Consultar precio';
    return 'S/ ' + n.toFixed(2);
  }

  async function loadAllData() {
    const all = [];
    const byCatalog = {};
    const promises = DATA_FILES.map((f) =>
      fetch(f, { cache: 'no-cache' })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then((json) => {
          let arr = [];
          if (Array.isArray(json)) arr = json;
          else if (json && typeof json === 'object') {
            Object.keys(json).forEach((k) => {
              if (Array.isArray(json[k])) arr = arr.concat(json[k]);
            });
          }
          const key = f.split('/').pop().replace('.json', '');
          arr = arr.map((p) => {
            try {
              p._catalog = key;
            } catch (e) {}
            return p;
          });
          byCatalog[key] = arr;
          all.push(...arr);
        })
        .catch((e) => {
          console.warn('search-autocomplete: no se pudo cargar', f, e);
        }),
    );
    await Promise.all(promises);
    return { all, byCatalog };
  }

  function buildIndex(allProducts, byCatalog) {
    const index = [];
    allProducts.forEach((p) => {
      const nombre = p.nombre || p.title || '';
      const tags = Array.isArray(p.tags) ? p.tags.join(' ') : p.tags || '';
      const categorias = Array.isArray(p.categorias) ? p.categorias.join(' ') : p.categorias || '';
      const descripcion = p.descripcion || p.descripcion_corta || p.descripcion_breve || '';
      const id = p.id || p._id || '';
      const price =
        p.precio_desde !== undefined && p.precio_desde !== null
          ? fmtPrice(p.precio_desde)
          : 'Consultar precio';
      const img = p.img || p.thumbnail || (p.imagenes && p.imagenes[0]) || '/img/placeholder.jpg';
      const catalogKey = (p._catalog && String(p._catalog)) || '';
      const searchable = normalizeText([nombre, tags, categorias, descripcion, id].join(' '));
      index.push({
        type: 'product',
        id: id,
        title: nombre,
        subtitle: categorias || tags || descripcion.slice(0, 80),
        img,
        price,
        catalog: catalogKey,
        searchable,
        raw: p,
      });
    });

    const catalogs = Object.keys(byCatalog || {}).map((k) => {
      const title = k.replace(/[-_]/g, ' ');
      return {
        key: k,
        title,
        url: `/pages/catalogo/${encodeURIComponent(k)}.html`,
      };
    });

    return { index, catalogs };
  }

  function searchIndex(index, catalogs, q, maxResults = 8) {
    if (!q || q.trim().length === 0) return { results: [], catalogMatches: [] };
    const nq = normalizeText(q);
    const tokens = nq.split(/\s+/).filter(Boolean);

    const scored = index.map((it) => {
      let score = 0;
      for (const t of tokens) {
        if (!t) continue;
        if (it.searchable.includes(t)) {
          if (normalizeText(it.title).startsWith(t)) score += 4;
          else score += 2;
        }
      }
      return { it, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const results = scored
      .filter((s) => s.score > 0)
      .slice(0, maxResults)
      .map((s) => {
        const it = s.it;
        const catalogSafe = it.catalog ? encodeURIComponent(it.catalog) : 'default';
        return {
          type: 'product',
          id: it.id,
          title: it.title,
          subtitle: it.subtitle,
          img: it.img,
          price: it.price,
          catalog: it.catalog || '',
          url: it.id
            ? `/pages/catalogo/producto.html?id=${encodeURIComponent(it.id)}&catalog=${catalogSafe}`
            : '#',
        };
      });

    const catalogMatches = catalogs
      .filter((c) => normalizeText(c.key).includes(nq) || normalizeText(c.title).includes(nq))
      .map((c) => ({
        type: 'catalog',
        title: c.title,
        url: c.url,
        img: '/img/placeholder.jpg',
        subtitle: 'Ir al catálogo',
      }));

    return { results, catalogMatches };
  }

  function positionDropdown(dd, input) {
    const rect = input.getBoundingClientRect();
    dd.style.minWidth = rect.width + 'px';
    dd.style.left = rect.left + window.scrollX + 'px';
    dd.style.top = rect.bottom + window.scrollY + 8 + 'px';
    const maxRight = window.innerWidth - 12;
    const ddRight = rect.left + parseFloat(dd.style.minWidth || rect.width);
    if (ddRight > maxRight) {
      const overflow = ddRight - maxRight;
      dd.style.left = rect.left + window.scrollX - overflow + 'px';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const input = findSearchInput();
    if (!input) {
      console.warn(
        'search-autocomplete: no se encontró el input (placeholder "Buscar productos...")',
      );
      return;
    }

    const dd = createDropdown();
    document.body.appendChild(dd);

    let dataLoaded = false;
    let index = [];
    let catalogs = [];

    const loader = loadAllData().then(({ all, byCatalog }) => {
      const built = buildIndex(all, byCatalog);
      index = built.index;
      catalogs = built.catalogs;
      dataLoaded = true;
    });

    let selectedIndex = -1;

    function clearSelection() {
      selectedIndex = -1;
      Array.from(dd.querySelectorAll('.search-suggestion')).forEach((el) =>
        el.classList.remove('active'),
      );
    }

    function setActive(idx) {
      clearSelection();
      const items = dd.querySelectorAll('.search-suggestion');
      if (!items || items.length === 0) return;
      if (idx < 0) idx = 0;
      if (idx >= items.length) idx = items.length - 1;
      selectedIndex = idx;
      const el = items[idx];
      if (el) {
        el.classList.add('active');
        el.style.background = 'rgba(0,0,0,0.03)';
        const r = el.getBoundingClientRect();
        const rr = dd.getBoundingClientRect();
        if (r.top < rr.top) el.scrollIntoView({ block: 'nearest' });
        else if (r.bottom > rr.bottom) el.scrollIntoView({ block: 'nearest' });
      }
    }

    function renderSuggestions(q) {
      dd.innerHTML = '';
      dd.style.display = 'none';
      dd.setAttribute('aria-expanded', 'false');
      if (!dataLoaded) {
        const loaderNode = document.createElement('div');
        loaderNode.style.padding = '10px';
        loaderNode.style.color = '#6b7280';
        loaderNode.textContent = 'Cargando productos...';
        dd.appendChild(loaderNode);
        dd.style.display = 'block';
        dd.setAttribute('aria-expanded', 'true');
        positionDropdown(dd, input);
        return;
      }

      const { results, catalogMatches } = searchIndex(index, catalogs, q, 8);
      const items = [];

      results.forEach((r) => {
        const node = createSuggestionNode(r, q);
        node.addEventListener('click', (ev) => {
          const href = node.getAttribute('href');
          if (href && href !== '#') {
            window.location.href = href;
            ev.preventDefault();
          }
        });
        items.push(node);
      });

      if (catalogMatches && catalogMatches.length) {
        const sep = document.createElement('div');
        sep.style.height = '1px';
        sep.style.background = 'linear-gradient(90deg, rgba(0,0,0,0.03), rgba(0,0,0,0.02))';
        sep.style.margin = '6px 0';
        dd.appendChild(sep);
        catalogMatches.forEach((c) => {
          const node = createSuggestionNode(
            {
              type: 'catalog',
              title: c.title,
              subtitle: c.subtitle,
              img: c.img,
              price: '',
              url: c.url,
            },
            q,
          );
          node.addEventListener('click', (ev) => {
            window.location.href = c.url;
            ev.preventDefault();
          });
          items.push(node);
        });
      }

      if (items.length === 0) {
        const no = document.createElement('div');
        no.style.padding = '10px';
        no.style.color = '#6b7280';
        no.textContent = 'No se encontraron resultados.';
        dd.appendChild(no);
      } else {
        items.forEach((it) => dd.appendChild(it));
      }

      const footer = document.createElement('div');
      footer.style.padding = '6px 8px';
      footer.style.borderTop = '1px dashed rgba(0,0,0,0.04)';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'space-between';
      footer.style.alignItems = 'center';

      const linkAll = document.createElement('a');
      linkAll.href = `/pages/catalogo/default.html?q=${encodeURIComponent(q)}`;
      linkAll.textContent = 'Ver todos los resultados';
      linkAll.style.fontSize = '0.88rem';
      linkAll.style.color = '#2563eb';
      linkAll.style.textDecoration = 'none';
      footer.appendChild(linkAll);

      dd.appendChild(footer);

      dd.style.display = 'block';
      dd.setAttribute('aria-expanded', 'true');
      positionDropdown(dd, input);
      clearSelection();
    }

    const onInput = debounce((ev) => {
      const q = input.value || '';
      if (!q || q.trim().length < 1) {
        dd.style.display = 'none';
        dd.setAttribute('aria-expanded', 'false');
        return;
      }
      renderSuggestions(q);
    }, 160);

    input.addEventListener('input', onInput);

    input.addEventListener('focus', (e) => {
      if (input.value && input.value.trim().length > 0) {
        renderSuggestions(input.value);
      }
    });

    input.addEventListener('keydown', (ev) => {
      if (dd.style.display === 'none') return;
      const items = dd.querySelectorAll('.search-suggestion');
      if (!items || items.length === 0) return;
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setActive(selectedIndex === -1 ? 0 : selectedIndex + 1);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        setActive(selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1);
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        const idx = selectedIndex >= 0 ? selectedIndex : 0;
        const el = items[idx];
        if (el) {
          const href = el.getAttribute('href');
          if (href && href !== '#') window.location.href = href;
        }
      } else if (ev.key === 'Escape') {
        dd.style.display = 'none';
      }
    });

    document.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!dd.contains(target) && target !== input && !input.contains(target)) {
        dd.style.display = 'none';
      }
    });

    window.addEventListener('resize', () => {
      if (dd.style.display === 'block') positionDropdown(dd, input);
    });
    window.addEventListener(
      'scroll',
      () => {
        if (dd.style.display === 'block') positionDropdown(dd, input);
      },
      { passive: true },
    );

    loader
      .catch(() => {})
      .then(() => {
        if (input.value && input.value.trim().length > 0) renderSuggestions(input.value);
      });
  });
})();
