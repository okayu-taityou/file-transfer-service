const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3005;

// アップロードされたファイルを保存するディレクトリ
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER);
}

// Multerの設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// ファイルアップロードエンドポイント
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).send(`
    <p>File ${req.file.originalname} uploaded successfully!</p>
    <p>Download link: <a href="${fileUrl}" target="_blank">${fileUrl}</a></p>
    <a href="/">Go back</a>
  `);
});

// アップロードされたファイルをダウンロード可能にする
app.use('/uploads', express.static(UPLOAD_FOLDER));

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});