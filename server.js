const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const WATCH_DIR = __dirname;

const IS_PROD = process.env.NODE_ENV === 'production';
const FORCE_HTTPS_COOKIE = process.env.FORCE_HTTPS_COOKIE === 'true';

const ADMIN_PASS = process.env.ADMIN_PASS || 'casasyestilos123!';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 6;
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const CATEGORIES = {
  edredones: 'edredones.json',
  frazadas: 'frazadas.json',
  manteleria: 'manteleria.json',
  mosquiteros: 'mosquiteros.json',
  protectores: 'protectores.json',
  sabanas: 'sabanas.json',
  'salidas-de-bano': 'salidas-de-bano.json',
  'tela-bramante': 'tela-bramante.json',
  'toallas-y-batas': 'toallas-y-batas.json',
  pantuflas: 'pantuflas.json',
};

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

const allowedOrigins = [
  'https://casasyestilos.com',
  'https://www.casasyestilos.com',
  'https://casasyestilos.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, cb) => {
      // sin origin (curl, servidores) permitir
      if (!origin) return cb(null, true);
      if (IS_PROD) {
        return allowedOrigins.includes(origin)
          ? cb(null, true)
          : cb(new Error('Not allowed'), false);
      }
      cb(null, true);
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Admin-Token',
      'X-Admin-Password',
    ],
  }),
);

app.use('/', express.static(__dirname));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/js', express.static(path.join(__dirname, 'js')));

let watcher = { on: () => {} }; 
if (!IS_PROD) {
  watcher = chokidar.watch(WATCH_DIR, {
    ignored: [/node_modules/, /\.git/, /server\.js/],
    ignoreInitial: true,
  });

  let reloadTimeout = null;
  watcher.on('all', (_, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.html', '.css', '.js', '.json', '.jpg', '.png', '.webp'].includes(ext)) return;
    clearTimeout(reloadTimeout);
    reloadTimeout = setTimeout(() => io.emit('reload'), 200);
  });

  io.on('connection', () => console.log('→ Cliente conectado (reload)'));
} else {
  // en producción no necesitamos logs del watcher
  io.on('connection', () => {});
}

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

function getDataFileForSlug(slug) {
  return CATEGORIES[slug] ? path.join(DATA_DIR, CATEGORIES[slug]) : null;
}

async function readCategory(slug) {
  const file = getDataFileForSlug(slug);
  if (!file) throw new Error('Categoría no encontrada');

  try {
    const content = await fs.readFile(file, 'utf8');
    const json = JSON.parse(content);
    const key = Object.keys(json)[0] || slug.toUpperCase();
    return { key, productos: json[key] || [] };
  } catch (err) {
    console.error('ERROR reading category', slug, err && err.message ? err.message : err);
    const key = slug.toUpperCase();
    if (!fsSync.existsSync(file)) {
      await writeCategory(slug, [], key);
    }
    return { key, productos: [] };
  }
}

async function writeCategory(slug, productos, key) {
  const file = getDataFileForSlug(slug);
  await ensureBackupDir();

  if (fsSync.existsSync(file)) {
    const backup = path.join(BACKUP_DIR, `${slug}-${Date.now()}.json`);
    try {
      await fs.copyFile(file, backup);
    } catch (err) {
      console.warn(
        'No se pudo crear backup antes de escribir categoria:',
        slug,
        err && err.message,
      );
    }
  }

  const data = {};
  data[key] = productos;
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

function generateId(slug, productos) {
  const nums = productos.map((p) => Number(p.id?.split('-').pop()) || 0);
  return `${slug}-producto-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`;
}

const tokens = new Map();

function createToken() {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, Date.now());
  setTimeout(() => tokens.delete(token), TOKEN_TTL_MS);
  return token;
}

function requireAdmin(req, res, next) {
  const headerToken =
    req.headers.authorization?.replace(/^Bearer /i, '') || req.headers['x-admin-token'];
  const cookieToken = req.cookies && req.cookies.admin_token;
  const passHeader = req.headers['x-admin-password'];

  const token = headerToken || cookieToken;

  if (passHeader === ADMIN_PASS) return next();

  if (token && tokens.has(token)) return next();

  if (token === ADMIN_PASS) return next();

  return res.status(401).json({ ok: false });
}

app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASS) return res.status(401).json({ ok: false });

  const token = createToken();

  const cookieOpts = {
    httpOnly: true,
    secure: IS_PROD || FORCE_HTTPS_COOKIE,
    sameSite: 'lax',
    maxAge: TOKEN_TTL_MS,
  };

  res.cookie('admin_token', token, cookieOpts);

  res.json({ ok: true, token });
});

app.get('/api/productos/:categoria', async (req, res) => {
  const { productos } = await readCategory(req.params.categoria);
  res.json({ ok: true, productos });
});

app.post('/api/productos/:categoria', requireAdmin, async (req, res) => {
  const { key, productos } = await readCategory(req.params.categoria);
  const nuevo = { ...req.body, id: generateId(req.params.categoria, productos) };
  productos.unshift(nuevo);
  await writeCategory(req.params.categoria, productos, key);
  res.json({ ok: true, producto: nuevo });
});

app.put('/api/productos/:categoria/:id', requireAdmin, async (req, res) => {
  const { key, productos } = await readCategory(req.params.categoria);
  const i = productos.findIndex((p) => p.id === req.params.id);
  productos[i] = { ...productos[i], ...req.body };
  await writeCategory(req.params.categoria, productos, key);
  res.json({ ok: true });
});

app.delete('/api/productos/:categoria/:id', requireAdmin, async (req, res) => {
  const { key, productos } = await readCategory(req.params.categoria);
  const i = productos.findIndex((p) => p.id === req.params.id);
  productos.splice(i, 1);
  await writeCategory(req.params.categoria, productos, key);
  res.json({ ok: true });
});

const UPLOAD_DIR = path.join(__dirname, 'img', 'uploads');
fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Tipo no permitido')),
});

app.post('/api/admin/upload-image', requireAdmin, upload.single('file'), async (req, res) => {
  console.log('🔥 UPLOAD IMAGE ENDPOINT EJECUTADO');

  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'No se recibió archivo' });
  }

  console.log('📸 Archivo:', req.file.originalname);

  const base = req.file.originalname.replace(/\.[^/.]+$/, '').replace(/\W+/g, '-');

  const name = `${Date.now()}-${base}.jpg`;
  const out = path.join(UPLOAD_DIR, name);

  try {
    await sharp(req.file.buffer)
      .resize(813, 615, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toFile(out);

    res.json({ ok: true, url: `/img/uploads/${name}` });
  } catch (err) {
    console.error('Error procesando imagen:', err && err.message ? err.message : err);
    res.status(500).json({ ok: false, error: 'Error al procesar imagen' });
  }
});

app.use('/admin', express.static(path.join(__dirname, 'pages')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'admin.html'));
});

server.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🔐 Admin: /admin`);
});
