(function () {
  const CATEGORY_MAP = [
    { slug: 'edredones', label: 'Edredones' },
    { slug: 'frazadas', label: 'Frazadas' },
    { slug: 'manteleria', label: 'Mantelería' },
    { slug: 'mosquiteros', label: 'Mosquiteros' },
    { slug: 'protectores', label: 'Protectores de Colchón' },
    { slug: 'sabanas', label: 'Sábanas' },
    { slug: 'salidas-de-bano', label: 'Salidas de baño' },
    { slug: 'tela-bramante', label: 'Tela Bramante' },
    { slug: 'toallas-y-batas', label: 'Toallas y Batas' },
    { slug: 'pantuflas', label: 'Pantuflas' }, 
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const DEFAULT_PAYMENT_METHODS = 'Depósito / Transferencia / Yape / Plin';
  const DEFAULT_BANK_ACCOUNTS = [
    {
      name: 'BCP - EQUIPAMIENTO HOTELERO PERÚ E.I.R.L',
      info: 'Cuenta: 191 2440031 0 77\nCCI: 002 19100244003107757',
    },
    { name: 'BBVA - EQUIPAMIENTO HOTELERO PERÚ E.I.R.L', info: 'Cuenta: 0011 0659 0100016536' },
    { name: 'BBVA - CASAS Y ESTILOS PERÚ E.I.R.L', info: 'Cuenta: 0011 06590100007987' },
    {
      name: 'BCP - CASAS Y ESTILOS PERÚ E.I.R.L',
      info: 'Cuenta: 191 2399080 0 30\nCCI: 002 19100239908003054',
    },
  ];

  const FIELD_HINTS = {
    id: 'Identificador único (ej. edredones-producto-001)',
    nombre: 'Nombre visible del producto',
    subnombre: 'Línea breve o subtítulo',
    marca: 'Marca o fabricante',
    img: 'URL de la imagen principal (arrastra imagen)',
    img2: 'URL de la segunda imagen (arrastra 2 imágenes)',
    precio_desde: 'Precio base (número)',
    descripcion_corta: 'Resumen breve para listados',
    descripcion: 'Descripción larga y técnica',
    features: 'Lista separada por comas con puntos clave',
    specs: 'Ficha técnica (clave:valor) — opcional',
    models: 'Variantes (model,length,spec) — opcional',
    categorias: 'Categorías separadas por coma',
    tags: 'Tags separados por coma',
    payment_methods: 'Métodos de pago que quieres mostrar',
    bank_accounts: 'Cuentas bancarias (se añaden automáticamente)',
  };

  function objectWithIdFirst(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    if (!Object.prototype.hasOwnProperty.call(obj, 'id')) return obj;
    const id = obj.id;
    const restKeys = Object.keys(obj).filter((k) => k !== 'id');
    const out = { id: id };
    restKeys.forEach((k) => {
      out[k] = obj[k];
    });
    return out;
  }

  const loginBox = $('#loginBox');
  const adminPanel = $('#adminPanel');
  const btnLogin = $('#btnLogin');
  const btnClearToken = $('#btnClearToken');
  const btnLogout = $('#btnLogout');
  const adminPassword = $('#adminPassword');
  const loginStatus = $('#loginStatus');

  const categorySelect = $('#categorySelect');
  const productsList = $('#productsList');
  const filterInput = $('#filterInput');

  const productForm = $('#productForm');
  const btnSave = $('#btnSave');
  const btnCancelEdit = $('#btnCancelEdit');
  const btnRefresh = $('#btnRefresh');
  const formTitle = $('#formTitle');
  const formStatus = $('#formStatus');
  const adminHint = $('#adminHint');

  const f_id = $('#p_id');
  const f_nombre = $('#p_nombre');
  const f_subnombre = $('#p_subnombre');
  const f_marca = $('#p_marca');
  const f_img = $('#p_img');
  const f_img2 = $('#p_img2');
  const f_precio = $('#p_precio');
  const f_desc_c = $('#p_desc_corta');
  const f_desc = $('#p_desc');
  const f_features = $('#p_features');
  const f_tags = $('#p_tags');
  const f_categorias = $('#p_categorias');

  const dropzone = $('#imageDropzone');
  const fileInput = $('#fileInput');
  const previewList = $('#imagePreviewList');
  const btnSelectImage = $('#btnSelectImage');
  const btnClearImages = $('#btnClearImages');

  let formStatusTimer = null;
  let formStatusFadeTimer = null;
  if (formStatus) {
    formStatus.style.transition = 'opacity 350ms ease';
    formStatus.style.opacity = '1';
  }

  function clearFormStatus() {
    if (!formStatus) return;
    if (formStatusTimer) {
      clearTimeout(formStatusTimer);
      formStatusTimer = null;
    }
    if (formStatusFadeTimer) {
      clearTimeout(formStatusFadeTimer);
      formStatusFadeTimer = null;
    }
    formStatus.style.opacity = '1';
    formStatus.innerHTML = '';
  }

  function showFormStatus(message, type = 'success', autoClear = true) {
    if (!formStatus) return;
    if (formStatusTimer) {
      clearTimeout(formStatusTimer);
      formStatusTimer = null;
    }
    if (formStatusFadeTimer) {
      clearTimeout(formStatusFadeTimer);
      formStatusFadeTimer = null;
    }

    let cls = 'text-muted';
    if (type === 'success') cls = 'text-success';
    if (type === 'danger') cls = 'text-danger';
    if (type === 'info') cls = 'text-info';

    formStatus.style.opacity = '0';
    setTimeout(() => {
      formStatus.innerHTML = `<div class="${cls}">${message}</div>`;
      formStatus.offsetHeight;
      formStatus.style.opacity = '1';
    }, 10);

    if (autoClear) {
      formStatusTimer = setTimeout(() => {
        formStatus.style.opacity = '0';
        formStatusFadeTimer = setTimeout(() => {
          formStatus.innerHTML = '';
          formStatus.style.opacity = '1';
          formStatusTimer = null;
          formStatusFadeTimer = null;
        }, 420);
      }, 2600);
    }
  }

  let imageControlsContainer = null;
  let imageHintElement = null;
  (function locateImageControlsAndHint() {
    if (!productForm) return;
    if (btnSelectImage && btnSelectImage.parentElement) {
      const parent = btnSelectImage.parentElement.parentElement;
      if (parent) {
        imageControlsContainer = parent;
        imageHintElement = parent.querySelector('.hint') || null;
      }
    }
    if (!imageControlsContainer) {
      const maybeHint = productForm.querySelector('.hint');
      if (maybeHint) {
        imageHintElement = maybeHint;
        imageControlsContainer = maybeHint.closest('div') || null;
      }
    }
    if (!imageControlsContainer && fileInput && fileInput.parentElement) {
      imageControlsContainer = fileInput.parentElement;
    }
  })();

  function showImageHint(show) {
    if (!imageHintElement) return;
    imageHintElement.style.display = show ? '' : 'none';
  }
  function showImageControls(show) {
    if (!imageControlsContainer) return;
    imageControlsContainer.style.display = show ? '' : 'none';
  }

  if (f_id) f_id.placeholder = FIELD_HINTS.id;
  if (f_nombre) f_nombre.placeholder = FIELD_HINTS.nombre;
  if (f_subnombre) f_subnombre.placeholder = FIELD_HINTS.subnombre;
  if (f_marca) f_marca.placeholder = FIELD_HINTS.marca;
  if (f_img) f_img.placeholder = FIELD_HINTS.img;
  if (f_img2) f_img2.placeholder = FIELD_HINTS.img2;
  if (f_precio) f_precio.placeholder = FIELD_HINTS.precio_desde;
  if (f_desc_c) f_desc_c.placeholder = FIELD_HINTS.descripcion_corta;
  if (f_desc) f_desc.placeholder = FIELD_HINTS.descripcion;
  if (f_features) f_features.placeholder = FIELD_HINTS.features;
  if (f_tags) f_tags.placeholder = FIELD_HINTS.tags;
  if (f_categorias) f_categorias.placeholder = FIELD_HINTS.categorias;

  let specsContainer = null;
  let modelsContainer = null;

  function ensureSpecsModelsUI() {
    if (!productForm) return;
    if (specsContainer && modelsContainer) return;

    const saveContainer = btnSave ? btnSave.closest('.btn-edit-container') : null;
    const insertParent = saveContainer ? saveContainer.parentElement : productForm;

    specsContainer = document.createElement('div');
    specsContainer.id = 'specsContainer';
    specsContainer.style.marginTop = '12px';
    specsContainer.innerHTML = `
      <label style="font-weight:600;display:block;margin-bottom:6px">Specs (ficha técnica)</label>
      <div id="specsRows" style="display:flex;flex-direction:column;gap:6px"></div>
      <div style="margin-top:6px">
        <button type="button" id="btnAddSpec" class="btn btn-sm btn-outline-secondary">Añadir especificación</button>
      </div>
    `;

    modelsContainer = document.createElement('div');
    modelsContainer.id = 'modelsContainer';
    modelsContainer.style.marginTop = '12px';
    modelsContainer.innerHTML = `
      <label style="font-weight:600;display:block;margin-bottom:6px">Models (variantes)</label>
      <div id="modelsRows" style="display:flex;flex-direction:column;gap:6px"></div>
      <div style="margin-top:6px">
        <button type="button" id="btnAddModel" class="btn btn-sm btn-outline-secondary">Añadir variante</button>
      </div>
    `;

    if (insertParent && saveContainer) {
      insertParent.insertBefore(specsContainer, saveContainer);
      insertParent.insertBefore(modelsContainer, saveContainer);
    } else {
      productForm.appendChild(specsContainer);
      productForm.appendChild(modelsContainer);
    }

    const btnAddSpec = $('#btnAddSpec');
    const btnAddModel = $('#btnAddModel');

    btnAddSpec && btnAddSpec.addEventListener('click', (e) => addSpecRow());
    btnAddModel && btnAddModel.addEventListener('click', (e) => addModelRow());

    addSpecRow();
    addModelRow();
  }

  function addSpecRow(key = '', value = '') {
    const rows = $('#specsRows');
    if (!rows) return;
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.style.display = 'flex';
    row.style.gap = '6px';
    row.style.alignItems = 'center';

    const k = document.createElement('input');
    k.type = 'text';
    k.className = 'spec-key form-control form-control-sm';
    k.placeholder = 'Nombre (ej. Material)';
    k.value = key;

    const v = document.createElement('input');
    v.type = 'text';
    v.className = 'spec-value form-control form-control-sm';
    v.placeholder = 'Valor (ej. Microfibra)';
    v.value = value;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn btn-sm btn-outline-danger';
    del.innerText = '✕';
    del.title = 'Eliminar';
    del.addEventListener('click', () => {
      row.remove();
      if ((rows.querySelectorAll('.spec-row') || []).length === 0) addSpecRow();
    });

    k.style.flex = '0 0 40%';
    v.style.flex = '1';

    row.appendChild(k);
    row.appendChild(v);
    row.appendChild(del);
    rows.appendChild(row);
  }

  function addModelRow(model = '', length = '', spec = '') {
    const rows = $('#modelsRows');
    if (!rows) return;
    const row = document.createElement('div');
    row.className = 'model-row';
    row.style.display = 'flex';
    row.style.gap = '6px';
    row.style.alignItems = 'center';

    const m = document.createElement('input');
    m.type = 'text';
    m.className = 'model-name form-control form-control-sm';
    m.placeholder = 'Model (ej. 1 plaza)';
    m.value = model;

    const l = document.createElement('input');
    l.type = 'text';
    l.className = 'model-length form-control form-control-sm';
    l.placeholder = 'Medidas (ej. 160 x 220 cm)';
    l.value = length;

    const s = document.createElement('input');
    s.type = 'text';
    s.className = 'model-spec form-control form-control-sm';
    s.placeholder = 'Spec breve (ej. relleno 350 g/m²)';
    s.value = spec;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn btn-sm btn-outline-danger';
    del.innerText = '✕';
    del.title = 'Eliminar';
    del.addEventListener('click', () => {
      row.remove();
      if ((rows.querySelectorAll('.model-row') || []).length === 0) addModelRow();
    });

    m.style.flex = '0 0 26%';
    l.style.flex = '0 0 36%';
    s.style.flex = '1';

    row.appendChild(m);
    row.appendChild(l);
    row.appendChild(s);
    row.appendChild(del);
    rows.appendChild(row);
  }

  function collectSpecsFromUI() {
    const rows = $('#specsRows');
    const out = {};
    if (!rows) return out;
    const specRows = rows.querySelectorAll('.spec-row');
    specRows.forEach((r) => {
      const k = ((r.querySelector('.spec-key') && r.querySelector('.spec-key').value) || '').trim();
      const v = (
        (r.querySelector('.spec-value') && r.querySelector('.spec-value').value) ||
        ''
      ).trim();
      if (k) out[k] = v;
    });
    return out;
  }

  function collectModelsFromUI() {
    const rows = $('#modelsRows');
    const out = [];
    if (!rows) return out;
    const modelRows = rows.querySelectorAll('.model-row');
    modelRows.forEach((r) => {
      const m = (
        (r.querySelector('.model-name') && r.querySelector('.model-name').value) ||
        ''
      ).trim();
      const l = (
        (r.querySelector('.model-length') && r.querySelector('.model-length').value) ||
        ''
      ).trim();
      const s = (
        (r.querySelector('.model-spec') && r.querySelector('.model-spec').value) ||
        ''
      ).trim();
      if (m) out.push({ model: m, length: l, spec: s });
    });
    return out;
  }

  function populateSpecsUI(specsObj) {
    const rows = $('#specsRows');
    if (!rows) return;
    rows.innerHTML = '';
    if (specsObj && typeof specsObj === 'object' && Object.keys(specsObj).length) {
      Object.entries(specsObj).forEach(([k, v]) => addSpecRow(k, v));
    } else {
      addSpecRow();
    }
  }

  function populateModelsUI(modelsArr) {
    const rows = $('#modelsRows');
    if (!rows) return;
    rows.innerHTML = '';
    if (Array.isArray(modelsArr) && modelsArr.length) {
      modelsArr.forEach((m) => addModelRow(m.model || '', m.length || '', m.spec || ''));
    } else {
      addModelRow();
    }
  }

  function getToken() {
    return sessionStorage.getItem('admin_token') || null;
  }

  function setToken(t) {
    if (t) sessionStorage.setItem('admin_token', t);
    else sessionStorage.removeItem('admin_token');
  }

  function authHeader() {
    const t = getToken();
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  async function apiFetch(url, options = {}) {
    options = Object.assign({}, options);
    options.method = options.method ? options.method.toUpperCase() : 'GET';

    options.credentials = 'include';

    options.headers = Object.assign({}, options.headers || {}, authHeader());

    if (
      ['POST', 'PUT', 'PATCH'].includes(options.method) &&
      !(options.body instanceof FormData) &&
      !options.headers['Content-Type']
    ) {
      options.headers['Content-Type'] = 'application/json';
    }

    console.log('[apiFetch] ->', options.method, url);
    const res = await fetch(url, options);

    if (res.status === 401 || res.status === 403) {
      setToken(null);
      updateUIAuth();
      try {
        const body = await res.json();
        throw new Error(body && body.error ? body.error : 'No autorizado');
      } catch (e) {
        throw new Error('No autorizado');
      }
    }

    return res;
  }

  function populateCategories() {
    if (!categorySelect) return;
    categorySelect.innerHTML = CATEGORY_MAP.map(
      (c) => `<option value="${c.slug}">${c.label}</option>`,
    ).join('');
    const exists = CATEGORY_MAP.some((c) => c.slug === currentSlug);
    categorySelect.value = exists ? currentSlug : CATEGORY_MAP[0].slug;
  }

  function updateUIAuth() {
    if (loginBox && adminPanel) {
      if (getToken()) {
        loginBox.style.display = 'none';
        adminPanel.style.display = 'block';
        adminHint.innerText = `Autenticado (token activo)`;
      } else {
        loginBox.style.display = 'block';
        adminPanel.style.display = 'none';
        adminHint.innerText = ``;
      }
    }
  }

  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      const pass = ((adminPassword && adminPassword.value) || '').trim();
      if (!pass) {
        if (loginStatus)
          loginStatus.innerHTML = '<div class="text-danger">Ingresa la contraseña</div>';
        return;
      }
      if (loginStatus) loginStatus.innerHTML = 'Iniciando...';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', 
          body: JSON.stringify({ password: pass }),
        });
        const json = await res.json();
        if (!json.ok) {
          if (loginStatus)
            loginStatus.innerHTML = `<div class="text-danger">Error: ${
              json.error || 'contraseña incorrecta'
            }</div>`;
          return;
        }
        
        if (json.token) setToken(json.token);
        if (loginStatus) loginStatus.innerHTML = `<div class="text-success">Autenticado ✅</div>`;
        if (adminPassword) adminPassword.value = '';
        updateUIAuth();
        await loadProducts();
      } catch (err) {
        console.error(err);
        if (loginStatus) loginStatus.innerHTML = '<div class="text-danger">Error al conectar</div>';
      }
    });
  }

  if (btnClearToken) {
    btnClearToken.addEventListener('click', () => {
      setToken(null);
      if (loginStatus) loginStatus.innerHTML = '<div class="text-muted">Sesión limpiada</div>';
      updateUIAuth();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      setToken(null);
      updateUIAuth();
      resetForm();
      productosCache = [];
      lastCreatedId = null;
      lastCreatedName = null;
      loadProducts().catch(() => {});
      if (loginStatus) {
        loginStatus.innerHTML = '<div class="text-success">Has cerrado sesión con éxito</div>';
        setTimeout(() => {
          if (loginStatus) loginStatus.innerHTML = '';
        }, 4000);
      }
      if (adminHint) adminHint.innerText = '';
      if (loginBox) loginBox.scrollIntoView({ behavior: 'smooth' });
    });
  }

  let selectedImages = [];

  function makeThumb(url, idx, uploading = false, error = null) {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.style.width = '96px';
    wrap.style.height = '96px';
    wrap.style.borderRadius = '8px';
    wrap.style.overflow = 'hidden';
    wrap.style.background = '#f6f6f4';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';

    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.src = url || '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerText = '✕';
    btn.title = 'Eliminar';
    btn.style.position = 'absolute';
    btn.style.top = '6px';
    btn.style.right = '6px';
    btn.style.background = 'rgba(255,255,255,0.95)';
    btn.style.border = '1px solid #ddd';
    btn.style.borderRadius = '50%';
    btn.style.width = '26px';
    btn.style.height = '26px';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => removeImageAt(idx));

    wrap.appendChild(img);
    if (uploading) {
      const s = document.createElement('div');
      s.innerText = 'subiendo…';
      s.style.position = 'absolute';
      s.style.bottom = '6px';
      s.style.left = '6px';
      s.style.fontSize = '11px';
      s.style.background = 'rgba(255,255,255,0.9)';
      s.style.padding = '2px 6px';
      s.style.borderRadius = '6px';
      wrap.appendChild(s);
    }
    if (error) {
      const e = document.createElement('div');
      e.innerText = 'Error';
      e.title = error;
      e.style.position = 'absolute';
      e.style.bottom = '6px';
      e.style.left = '6px';
      e.style.fontSize = '11px';
      e.style.background = 'rgba(255,200,200,0.95)';
      e.style.padding = '2px 6px';
      e.style.borderRadius = '6px';
      wrap.appendChild(e);
    }
    wrap.appendChild(btn);
    return wrap;
  }

  function renderPreviews() {
    if (!previewList) return;
    previewList.innerHTML = '';
    selectedImages.forEach((it, i) => {
      const thumb = makeThumb(it.previewUrl || it.url || '', i, it.uploading, it.error);
      previewList.appendChild(thumb);
    });
    updateHiddenInputs();
    const hasImages = selectedImages.length > 0;
    showImageHint(!hasImages);
    showImageControls(!hasImages);
  }

  function removeImageAt(i) {
    if (i < 0 || i >= selectedImages.length) return;
    const it = selectedImages[i];
    if (it && it.previewUrl && it.previewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(it.previewUrl);
      } catch (e) {}
    }
    selectedImages.splice(i, 1);
    renderPreviews();
  }

  function updateHiddenInputs() {
    const v1 = selectedImages[0] && selectedImages[0].url ? selectedImages[0].url : '';
    const v2 = selectedImages[1] && selectedImages[1].url ? selectedImages[1].url : '';
    if (f_img) f_img.value = v1;
    if (f_img2) f_img2.value = v2;
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = (e) => reject(e);
      r.readAsDataURL(file);
    });
  }

  async function uploadImageToServer(file) {
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      throw new Error('Error upload: ' + res.status + ' ' + bodyText);
    }
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'error servidor upload');
    return json.url;
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (selectedImages.length >= 2) break;
      const entry = {
        file,
        url: null,
        previewUrl: URL.createObjectURL(file),
        uploading: true,
        error: null,
      };
      selectedImages.push(entry);
      renderPreviews();
      try {
        const url = await uploadImageToServer(file);
        entry.url = url;
        entry.uploading = false;
        entry.previewUrl = url;
      } catch (err) {
        console.warn('upload failed, fallback to dataURL', err);
        try {
          const dataUrl = await readFileAsDataURL(file);
          entry.url = dataUrl;
          entry.uploading = false;
          entry.previewUrl = dataUrl;
          entry.error = 'Guardado local (fallback)';
        } catch (e2) {
          entry.uploading = false;
          entry.error = (e2 && e2.message) || 'error lectura';
        }
      } finally {
        renderPreviews();
      }
    }
  }

  if (dropzone) {
    dropzone.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      dropzone.style.border = '2px dashed var(--olive)';
      dropzone.style.background = '#fbfff6';
    });
    dropzone.addEventListener('dragleave', (ev) => {
      ev.preventDefault();
      dropzone.style.border = '';
      dropzone.style.background = '';
    });
    dropzone.addEventListener('drop', (ev) => {
      ev.preventDefault();
      dropzone.style.border = '';
      dropzone.style.background = '';
      handleFiles(ev.dataTransfer.files);
    });
  }

  if (btnSelectImage && fileInput)
    btnSelectImage.addEventListener('click', () => fileInput.click());
  if (fileInput)
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      fileInput.value = '';
    });
  if (btnClearImages)
    btnClearImages.addEventListener('click', () => {
      selectedImages = [];
      renderPreviews();
    });

  function setPreviewsFromProduct(prod) {
    selectedImages = [];
    if (prod && prod.img)
      selectedImages.push({
        file: null,
        url: prod.img,
        previewUrl: prod.img,
        uploading: false,
        error: null,
      });
    if (prod && prod.img2)
      selectedImages.push({
        file: null,
        url: prod.img2,
        previewUrl: prod.img2,
        uploading: false,
        error: null,
      });
    renderPreviews();
  }

  let currentSlug = CATEGORY_MAP[0].slug;
  let productosCache = [];

  let lastCreatedId = null;
  let lastCreatedName = null;

  async function loadProducts() {
    clearFormStatus();

    if (categorySelect) currentSlug = categorySelect.value;
    productsList &&
      (productsList.innerHTML = '<div class="small-muted">Cargando productos...</div>');
    try {
      const res = await apiFetch(`/api/productos/${encodeURIComponent(currentSlug)}`);
      const json = await res.json();
      if (!json.ok) {
        productsList &&
          (productsList.innerHTML = `<div class="text-danger">Error: ${
            json.error || 'No se pudo leer'
          }</div>`);
        return;
      }
      productosCache = Array.isArray(json.productos) ? json.productos : [];
      renderProductsList(productosCache);
      if (lastCreatedId || lastCreatedName) moveCreatedToEnd();
    } catch (err) {
      console.error(err);
      productsList &&
        (productsList.innerHTML = `<div class="text-danger">Error conectando al servidor</div>`);
    }
  }

  function renderProductsList(items) {
    if (!productsList) return;
    const q = ((filterInput && filterInput.value) || '').toLowerCase().trim();
    const filtered = items.filter((p) => {
      if (!q) return true;
      return (
        (p.nombre || '').toLowerCase().includes(q) ||
        (Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : p.tags || '')
          .toLowerCase()
          .includes(q)
      );
    });

    if (!filtered.length) {
      productsList.innerHTML = '<div class="small-muted">No hay productos.</div>';
      return;
    }

    productsList.innerHTML = '';
    filtered.forEach((p) => {
      const imgSrc = escapeHtml(p.img || p.image || '/img/Edredones/Edredon-beta.jpg');
      const nombre = escapeHtml(p.nombre || 'Sin nombre');
      const subnombre = escapeHtml(p.subnombre || '');
      const id = escapeHtml(p.id || '');

      const div = document.createElement('div');
      div.className = 'product-row';
      if (id) div.dataset.id = id;

      div.innerHTML = `
      <div class="product-row-img"><img src="${imgSrc}" alt="${nombre}" /></div>

      <div class="product-row-main">
        <div class="product-meta">
          <div style="min-width:0">
            <span class="product-title" title="${nombre}">${nombre}</span>
            <span class="product-sub" title="${subnombre}">${subnombre}</span>
          </div>
          <span class="product-id">ID: ${id}</span>
        </div>

        <div class="product-actions" style="display:none"></div>
      </div>

      <div class="product-actions">
        <div><button class="btn btn-sm btn-outline-primary btn-edit" data-id="${id}">Editar</button></div>
        <div><button class="btn btn-sm btn-outline-danger btn-delete" data-id="${id}">Eliminar</button></div>
      </div>
    `;
      productsList.appendChild(div);
    });

    const productEditButtons = productsList.querySelectorAll('.btn-edit[data-id]');
    productEditButtons.forEach((b) =>
      b.addEventListener('click', (ev) => startEditProduct(ev.currentTarget.dataset.id)),
    );

    const productDeleteButtons = productsList.querySelectorAll('.btn-delete[data-id]');
    productDeleteButtons.forEach((b) =>
      b.addEventListener('click', (ev) => confirmDelete(ev.currentTarget.dataset.id)),
    );
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function resetForm() {
    clearFormStatus();

    if (!f_id) return;
    f_id.value = '';
    f_nombre.value = '';
    f_subnombre.value = '';
    f_marca.value = '';
    f_img.value = '';
    f_img2.value = '';
    f_precio.value = '';
    f_desc_c.value = '';
    f_desc.value = '';
    f_features.value = '';
    f_tags.value = '';
    f_categorias.value = '';
    formTitle && (formTitle.innerText = 'Agregar producto');
    btnCancelEdit && (btnCancelEdit.style.display = 'none');

    selectedImages = [];
    renderPreviews();

    if ($('#specsRows')) {
      $('#specsRows').innerHTML = '';
      addSpecRow();
    }
    if ($('#modelsRows')) {
      $('#modelsRows').innerHTML = '';
      addModelRow();
    }
  }

  function startEditProduct(id) {
    clearFormStatus();

    if (!id && id !== 0) {
      console.warn('startEditProduct called without id:', id);
      return;
    }
    const prod = productosCache.find((p) => String(p.id) === String(id));
    if (!prod) {
      console.warn('Producto no encontrado (id):', id);
      return;
    }

    ensureSpecsModelsUI();

    f_id.value = prod.id;
    f_nombre.value = prod.nombre || '';
    f_subnombre.value = prod.subnombre || '';
    f_marca.value = prod.marca || '';
    f_img.value = prod.img || '';
    f_img2.value = prod.img2 || '';
    f_precio.value = prod.precio_desde || '';
    f_desc_c.value = prod.descripcion_corta || '';
    f_desc.value = prod.descripcion || '';
    f_features.value = Array.isArray(prod.features)
      ? prod.features.join(', ')
      : prod.features || '';
    f_tags.value = Array.isArray(prod.tags) ? prod.tags.join(', ') : prod.tags || '';
    f_categorias.value = Array.isArray(prod.categorias)
      ? prod.categorias.join(', ')
      : prod.categorias || '';

    populateSpecsUI(prod.specs || {});
    populateModelsUI(prod.models || []);

    formTitle && (formTitle.innerText = 'Editar producto');
    btnCancelEdit && (btnCancelEdit.style.display = 'inline-block');
    setPreviewsFromProduct(prod);
    f_nombre.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', (e) => {
      e.preventDefault();
      resetForm();
    });
  }

  async function confirmDelete(id) {
    clearFormStatus();

    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer?')) return;
    try {
      const res = await apiFetch(
        `/api/productos/${encodeURIComponent(currentSlug)}/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      );
      const json = await res.json();
      if (!json.ok) {
        showFormStatus('Error: ' + (json.error || 'no se pudo eliminar'), 'danger');
        return;
      }
      await loadProducts();
      showFormStatus('Producto eliminado', 'success');
    } catch (err) {
      console.error(err);
      showFormStatus('Error al eliminar: ' + (err.message || ''), 'danger');
    }
  }

  if (productForm) {
    productForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      btnSave && (btnSave.disabled = true);
      showFormStatus('Guardando...', 'info', false);

      updateHiddenInputs();

      const raw = {
        nombre: ((f_nombre && f_nombre.value) || '').trim(),
        subnombre: ((f_subnombre && f_subnombre.value) || '').trim(),
        marca: ((f_marca && f_marca.value) || '').trim(),
        img: ((f_img && f_img.value) || '').trim(),
        img2: ((f_img2 && f_img2.value) || '').trim(),
        precio_desde: f_precio && f_precio.value ? Number(f_precio.value) : undefined,
        descripcion_corta: ((f_desc_c && f_desc_c.value) || '').trim(),
        descripcion: ((f_desc && f_desc.value) || '').trim(),
        features:
          f_features && f_features.value
            ? f_features.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        tags:
          f_tags && f_tags.value
            ? f_tags.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        categorias:
          f_categorias && f_categorias.value
            ? f_categorias.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
      };

      if (!raw.nombre) {
        showFormStatus('El nombre es obligatorio', 'danger');
        btnSave && (btnSave.disabled = false);
        return;
      }

      if (!raw.img) raw.img = '/img/placeholder.jpg';
      if (!raw.img2) raw.img2 = '';

      ensureSpecsModelsUI();
      const specs = collectSpecsFromUI();
      const models = collectModelsFromUI();

      const finalPayload = {};
      const editingId = f_id && f_id.value ? String(f_id.value).trim() : '';

      if (editingId) finalPayload.id = editingId;
      finalPayload.nombre = raw.nombre;
      finalPayload.subnombre = raw.subnombre;
      finalPayload.marca = raw.marca;
      finalPayload.img = raw.img;
      finalPayload.img2 = raw.img2;
      finalPayload.precio_desde = raw.precio_desde !== undefined ? raw.precio_desde : undefined;
      finalPayload.descripcion_corta = raw.descripcion_corta;
      finalPayload.descripcion = raw.descripcion;
      finalPayload.features = Array.isArray(raw.features) ? raw.features : [];
      finalPayload.specs = Object.keys(specs).length ? specs : {};
      finalPayload.models = Array.isArray(models) ? models : [];
      finalPayload.categorias = Array.isArray(raw.categorias) ? raw.categorias : [];
      finalPayload.tags = Array.isArray(raw.tags) ? raw.tags : [];
      finalPayload.payment_methods = DEFAULT_PAYMENT_METHODS;
      finalPayload.bank_accounts = DEFAULT_BANK_ACCOUNTS;

      try {
        let res, json;
        const id = editingId;
        if (id) {
          res = await apiFetch(
            `/api/productos/${encodeURIComponent(currentSlug)}/${encodeURIComponent(id)}`,
            {
              method: 'PUT',
              body: JSON.stringify(finalPayload),
            },
          );
          json = await res.json();
          if (!json.ok) throw new Error(json.error || 'no se pudo actualizar');
          showFormStatus('Producto actualizado', 'success');
        } else {
          res = await apiFetch(`/api/productos/${encodeURIComponent(currentSlug)}`, {
            method: 'POST',
            body: JSON.stringify(finalPayload),
          });
          json = await res.json();
          if (!json.ok) throw new Error(json.error || 'no se pudo crear');

          lastCreatedId = (json.producto && json.producto.id) || json.id || json.createdId || null;
          lastCreatedName = finalPayload.nombre || null;

          showFormStatus('Producto creado', 'success');

          let productoRecibido = null;
          if (json.producto && typeof json.producto === 'object') {
            productoRecibido = json.producto;
          } else {
            const returnedId = json.id || json.createdId || lastCreatedId || null;
            productoRecibido = Object.assign({}, finalPayload);
            if (returnedId) productoRecibido.id = returnedId;
          }

          const productoOrdenado = objectWithIdFirst(productoRecibido);
          console.log('Producto creado (id first):\n', JSON.stringify(productoOrdenado, null, 2));
        }
        resetForm();
        await loadProducts();
      } catch (err) {
        console.error(err);
        showFormStatus(`Error: ${err.message || 'no se pudo guardar'}`, 'danger');
      } finally {
        btnSave && (btnSave.disabled = false);
      }
    });
  }

  if (filterInput) {
    filterInput.addEventListener('input', () => {
      clearFormStatus();
      renderProductsList(productosCache);
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      lastCreatedId = null;
      lastCreatedName = null;
      clearFormStatus();
      await loadProducts();
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', async () => {
      clearFormStatus();
      resetForm();
      currentSlug = categorySelect.value;
      lastCreatedId = null;
      lastCreatedName = null;
      try {
        window.history.replaceState(null, '', '?cat=' + encodeURIComponent(currentSlug));
      } catch (e) {}
      await loadProducts();
    });
  }

  function moveCreatedToEnd() {
    if (!productsList) {
      lastCreatedId = null;
      lastCreatedName = null;
      return;
    }

    let row = null;
    if (lastCreatedId) {
      try {
        row = productsList.querySelector(`.product-row[data-id="${CSS.escape(lastCreatedId)}"]`);
      } catch (e) {
        row = Array.from(productsList.querySelectorAll('.product-row')).find(
          (r) => r.dataset.id === lastCreatedId,
        );
      }
    }
    if (!row && lastCreatedName) {
      const rows = Array.from(productsList.querySelectorAll('.product-row'));
      row = rows.find((r) => {
        const titleEl = r.querySelector('.product-title');
        const title = titleEl ? titleEl.textContent.trim() : '';
        return title === lastCreatedName;
      });
    }

    if (row) {
      productsList.appendChild(row);
      row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    lastCreatedId = null;
    lastCreatedName = null;
  }

  (function init() {
    try {
      const params = new URLSearchParams(location.search);
      const qcat = params.get('cat');
      if (qcat && CATEGORY_MAP.some((c) => c.slug === qcat)) currentSlug = qcat;
    } catch (e) {}

    populateCategories();
    if (categorySelect) currentSlug = categorySelect.value;

    ensureSpecsModelsUI();

    updateUIAuth();
    loadProducts();

    showImageHint(selectedImages.length === 0);
    showImageControls(selectedImages.length === 0);
  })();
})();
