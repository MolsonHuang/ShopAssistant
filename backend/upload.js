const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.resolve(__dirname, 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(uploadRoot);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const dir = path.join(uploadRoot, req.params.kind || 'files');
    ensureDir(dir);
    callback(null, dir);
  },
  filename(req, file, callback) {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    callback(null, safeName);
  }
});

const upload = multer({ storage });

function toPublicPath(filePath) {
  const relative = path.relative(uploadRoot, filePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
}

function toAbsolutePath(publicPath) {
  if (!publicPath) return '';
  if (path.isAbsolute(publicPath)) return publicPath;
  return path.join(uploadRoot, publicPath.replace(/^\/uploads\//, ''));
}

module.exports = {
  upload,
  uploadRoot,
  toPublicPath,
  toAbsolutePath
};
