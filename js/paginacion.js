(function () {
  const searchInput = document.getElementById('search');
  const productsGrid = document.getElementById('products-grid');
  const productCards = Array.from(productsGrid.querySelectorAll('.product-card'));
  const paginationContainer = document.getElementById('catalogPagination');
  const metaShown = document.getElementById('metaShown');
  const metaTotal = document.getElementById('metaTotal');

  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const productDetail = document.getElementById('productDetail');
  const detailTitle = document.getElementById('detailTitle');
  const detailDesc = document.getElementById('detailDesc');
  const detailPrice = document.getElementById('detailPrice');
  const detailBtn = document.getElementById('detailBtn');
  const detailQuote = document.getElementById('detailQuote');

  let filteredCards = productCards.slice();
  let currentPage = 1;
  let itemsPerPage = computeItemsPerPage();

  render();

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    filteredCards = productCards.filter((card) => {
      const title = (card.dataset.title || '').toLowerCase();
      return title.includes(q);
    });
    currentPage = 1;
    itemsPerPage = computeItemsPerPage();
    render();
  });

  window.addEventListener('resize', () => {
    const newItems = computeItemsPerPage();
    if (newItems !== itemsPerPage) {
      itemsPerPage = newItems;
      currentPage = 1;
      render();
    }
  });

  function showPreviewFromCard(card) {
    const img = card.querySelector('img');
    const title =
      card.dataset.title || card.querySelector('.card-title')?.textContent || 'Producto';
    const desc = card.querySelector('.small.text-muted')?.textContent || '';
    const priceEl = card.querySelector('.card-body > p strong')?.textContent || '';
    const detailLink = card.querySelector('a[href]')?.getAttribute('href') || '#';

    if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    if (productDetail) productDetail.style.display = 'block';
    if (detailTitle) detailTitle.textContent = title;
    if (detailDesc) detailDesc.textContent = desc;
    if (detailPrice)
      detailPrice.innerHTML = '<strong>Precio: ' + (priceEl || 'Consultar') + '</strong>';
    if (detailBtn) detailBtn.setAttribute('href', detailLink);
    if (detailQuote)
      detailQuote.setAttribute(
        'href',
        'https://wa.me/51946168546?text=' + encodeURIComponent('Hola, quiero cotizar: ' + title),
      );

    if (img && img.src && productDetail) {
      let topImg = productDetail.querySelector('img.preview-top');
      if (!topImg) {
        topImg = document.createElement('img');
        topImg.className = 'img-fluid rounded mb-2 preview-top';
        topImg.style.maxHeight = '180px';
        productDetail.insertBefore(topImg, productDetail.firstChild);
      }
      topImg.src = img.src;
      topImg.alt = img.alt || title;
    }
  }

  function render() {
    productsGrid.innerHTML = '';

    const totalItems = filteredCards.length;
    const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 1) / itemsPerPage));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredCards.slice(start, end);

    pageItems.forEach((card, i) => {
      const clone = card.cloneNode(true);

      clone.classList.add('fade-in-up');
      clone.style.animationDelay = `${i * 80}ms`;
      if (!clone.hasAttribute('tabindex')) clone.setAttribute('tabindex', '0');

      productsGrid.appendChild(clone);
    });

    if (filteredCards.length === 0) {
      productsGrid.innerHTML =
        '<div class="col-12 text-center text-muted py-5">No se encontraron productos.</div>';
    }

    setTimeout(() => {
      const active = document.activeElement;
      if (active && productsGrid.contains(active)) {
        try {
          active.blur();
        } catch (e) {}
      }
    }, 0);

    if (filteredCards.length === 0) {
      metaShown.textContent = '0';
      metaTotal.textContent = '0';
    } else {
      metaShown.textContent = String(currentPage);
      metaTotal.textContent = String(totalPages);
    }

    buildPagination(totalPages);

    const currentDisplayed = Array.from(productsGrid.querySelectorAll('.product-card'));
    currentDisplayed.forEach((card) => {
      card.onclick = () => showPreviewFromCard(card);
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showPreviewFromCard(card);
        }
      };
    });
  }

  function buildPagination(totalPages) {
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    paginationContainer.appendChild(createPageItem('prev', 'Anterior', currentPage === 1));

    const isSmallScreen = window.innerWidth <= 576;

    if (isSmallScreen) {
      if (totalPages <= 3) {
        for (let i = 1; i <= totalPages; i++) paginationContainer.appendChild(createNumberItem(i));
      } else {
        paginationContainer.appendChild(createNumberItem(1));
        paginationContainer.appendChild(createEllipsis({ hideOnXs: false }));
        paginationContainer.appendChild(createNumberItem(totalPages));
      }

      paginationContainer.appendChild(
        createPageItem('next', 'Siguiente', currentPage === totalPages),
      );

      paginationContainer.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const action = link.getAttribute('data-action');
          if (!action) return;
          if (action === 'prev') {
            if (currentPage > 1) currentPage--;
          } else if (action === 'next') {
            if (currentPage < totalPages) currentPage++;
          } else {
            const pageNum = Number(action);
            if (!isNaN(pageNum)) currentPage = pageNum;
          }
          render();
          const first = productsGrid.querySelector('.product-card');
          if (first) first.focus();
        });
      });

      return;
    }

    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) paginationContainer.appendChild(createNumberItem(i));
    } else {
      const firstBlock = [1, 2, 3];
      const lastBlock = [totalPages - 2, totalPages - 1, totalPages];

      if (currentPage <= 4) {
        for (let i = 1; i <= Math.max(4, currentPage + 1); i++)
          paginationContainer.appendChild(createNumberItem(i));
        paginationContainer.appendChild(createEllipsis({ hideOnXs: true }));
        lastBlock.forEach((p) => paginationContainer.appendChild(createNumberItem(p)));
      } else if (currentPage >= totalPages - 3) {
        firstBlock.forEach((p) => paginationContainer.appendChild(createNumberItem(p)));
        paginationContainer.appendChild(createEllipsis({ hideOnXs: true }));
        for (let i = totalPages - 4; i <= totalPages; i++)
          paginationContainer.appendChild(createNumberItem(i));
      } else {
        firstBlock.forEach((p) => paginationContainer.appendChild(createNumberItem(p)));
        paginationContainer.appendChild(createEllipsis({ hideOnXs: true }));
        for (let i = currentPage - 1; i <= currentPage + 1; i++)
          paginationContainer.appendChild(createNumberItem(i));
        paginationContainer.appendChild(createEllipsis({ hideOnXs: true }));
        lastBlock.forEach((p) => paginationContainer.appendChild(createNumberItem(p)));
      }
    }

    paginationContainer.appendChild(
      createPageItem('next', 'Siguiente', currentPage === totalPages),
    );

    paginationContainer.querySelectorAll('.page-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const action = link.getAttribute('data-action');
        if (!action) return;
        if (action === 'prev') {
          if (currentPage > 1) currentPage--;
        } else if (action === 'next') {
          if (currentPage < totalPages) currentPage++;
        } else {
          const pageNum = Number(action);
          if (!isNaN(pageNum)) currentPage = pageNum;
        }
        render();
        const first = productsGrid.querySelector('.product-card');
        if (first) first.focus();
      });
    });
  }

  function createPageItem(action, text, disabled) {
    const li = document.createElement('li');
    li.className = 'page-item' + (disabled ? ' disabled' : '');
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.setAttribute('aria-label', text);
    a.setAttribute('data-action', action);
    a.innerHTML = text;
    li.appendChild(a);
    return li;
  }

  function createNumberItem(pageNumber) {
    const li = document.createElement('li');
    li.className = 'page-item' + (pageNumber === currentPage ? ' active' : '');
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.setAttribute('data-action', String(pageNumber));
    a.textContent = String(pageNumber);
    if (pageNumber === currentPage) a.setAttribute('aria-current', 'page');
    li.appendChild(a);
    return li;
  }

  function createEllipsis(options = { hideOnXs: true }) {
    const li = document.createElement('li');
    li.className = 'page-item disabled' + (options.hideOnXs ? ' d-none d-sm-flex' : '');
    const span = document.createElement('span');
    span.className = 'page-link';
    span.textContent = '…';
    li.appendChild(span);
    return li;
  }

  function computeItemsPerPage() {
    try {
      const w = window.innerWidth;
      if (w <= 576) return 4;

      if (w >= 992) return 6;

      return 9;
    } catch (e) {
      return 9;
    }
  }

  window.catalog = { render, getFiltered: () => filteredCards, getAll: () => productCards };
})();
