require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const AWS = require('aws-sdk');

const app = express();
const PORT = 3005;

// アップロードされたファイルを保存するディレクトリ
const UPLOAD_FOLDER = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER);
}

// AWS設定チェック
const AWS_CONFIGURED = process.env.AWS_ACCESS_KEY_ID && 
                      process.env.AWS_SECRET_ACCESS_KEY && 
                      process.env.S3_BUCKET_NAME;

// AWS S3の設定（設定されている場合のみ）
let s3;
if (AWS_CONFIGURED) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-southeast-2',
  });
  console.log('AWS S3 configured successfully');
} else {
  console.log('AWS S3 not configured - using local file mode only');
}

// Multerの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_FOLDER);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB制限
  }
});

// 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_FOLDER));

// ファイルアップロードエンドポイント
app.post('/upload', upload.array('file'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const uploadedFiles = await Promise.all(req.files.map(async file => {
      const contentType = mime.lookup(file.originalname) || 'application/octet-stream';
      
      // ユニークなファイル名を生成（同名ファイル対策）
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      
      let signedUrl;
      
      if (AWS_CONFIGURED) {
        // AWS S3にアップロード
        const fileContent = fs.readFileSync(file.path);
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: fileContent,
          ContentType: contentType,
          CacheControl: 'max-age=31536000'
        };
        
        // S3アップロード
        const data = await new Promise((resolve, reject) => {
          s3.upload(params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        
        // ローカルファイルを削除
        fs.unlinkSync(file.path);
        
        // 署名付きURL生成（24時間有効）
        signedUrl = s3.getSignedUrl('getObject', {
          Bucket: params.Bucket,
          Key: params.Key,
          Expires: 86400,
          ResponseContentType: contentType
        });
      } else {
        // ローカルファイルモード - ファイル名を変更
        const newFilePath = path.join(UPLOAD_FOLDER, fileName);
        fs.renameSync(file.path, newFilePath);
        
        // ローカルURL生成
        signedUrl = `http://localhost:${PORT}/uploads/${fileName}`;
      }
      
      // ファイルタイプを判定
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.originalname);
      
      return {
        filename: file.originalname,
        key: fileName,
        url: signedUrl,
        isImage: isImage,
        contentType: contentType
      };
    }));

    // テンプレートファイルを読み込んで埋め込み
    const templatePath = path.join(__dirname, 'views', 'success.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    
    // 複数ファイル表示用に置換
    const filesHtml = uploadedFiles.map(f => `
      <div class="success-file-block">
        <div class="success-file-label">ファイル名</div>
        <div class="success-file-url">${f.filename}</div>
        ${f.isImage ? `
          <div class="success-file-label">プレビュー</div>
          <img src="${f.url}" alt="${f.filename}" class="image-preview" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
               onload="this.style.display='block';">
          <div style="display:none; color: #ffcccb;">画像を読み込めませんでした</div>
        ` : ''}
        <div class="success-file-label">共有用URL</div>
        <div class="success-file-url">${f.url}</div>
        <div class="share-url-box" style="margin-bottom:0;">
          <button class="copy-url-btn" data-url="${f.url}">コピー</button>
          <button class="preview-btn" onclick="window.open('${f.url}', '_blank')">プレビュー</button>
        </div>
      </div>
    `).join('');
    
    html = html.replace('{{filesHtml}}', filesHtml);
    res.send(html);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// アップロード済みファイル一覧ページ
app.get('/files', async (req, res) => {
  try {
    let files = [];
    
    if (AWS_CONFIGURED) {
      // S3からファイル一覧を取得
      const data = await new Promise((resolve, reject) => {
        s3.listObjectsV2({ Bucket: process.env.S3_BUCKET_NAME }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      files = data.Contents || [];
    } else {
      // ローカルファイル一覧を取得
      const localFiles = fs.readdirSync(UPLOAD_FOLDER);
      files = localFiles.map(filename => ({
        Key: filename,
        LastModified: fs.statSync(path.join(UPLOAD_FOLDER, filename)).mtime,
        Size: fs.statSync(path.join(UPLOAD_FOLDER, filename)).size
      }));
    }
    
    // ファイル情報を拡張子・MIMEで判定
    function getIcon(key) {
      const ext = key.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) return `<span class='file-card-icon'>🖼️</span>`;
      if (["pdf"].includes(ext)) return `<span class='file-card-icon'>📄</span>`;
      if (["zip","rar","7z"].includes(ext)) return `<span class='file-card-icon'>🗜️</span>`;
      if (["mp3","wav","ogg"].includes(ext)) return `<span class='file-card-icon'>🎵</span>`;
      if (["mp4","mov","avi","wmv","webm"].includes(ext)) return `<span class='file-card-icon'>🎬</span>`;
      if (["doc","docx"].includes(ext)) return `<span class='file-card-icon'>📃</span>`;
      if (["xls","xlsx"].includes(ext)) return `<span class='file-card-icon'>📊</span>`;
      if (["ppt","pptx"].includes(ext)) return `<span class='file-card-icon'>📈</span>`;
      return `<span class='file-card-icon'>📁</span>`;
    }
    
    // 検索ボックス
    let searchBox = `<input type='text' id='fileSearchBox' placeholder='ファイル名で検索' style='margin-bottom:24px;padding:8px 16px;font-size:1em;border-radius:8px;border:1px solid #6dd5ed;width:320px;'>`;
    
    // ファイルカード生成
    const fileCards = await Promise.all(files.map(async f => {
      let previewUrl, downloadUrl;
      
      if (AWS_CONFIGURED) {
        previewUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: f.Key,
          Expires: 3600,
          ResponseContentType: mime.lookup(f.Key) || 'application/octet-stream'
        });
        
        downloadUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: f.Key,
          Expires: 3600,
          ResponseContentDisposition: `attachment; filename="${f.Key}"`
        });
      } else {
        previewUrl = `http://localhost:${PORT}/uploads/${f.Key}`;
        downloadUrl = `http://localhost:${PORT}/uploads/${f.Key}`;
      }
      
      // ファイル名から元の名前を抽出（タイムスタンプを除去）
      const displayName = f.Key.includes('_') ? f.Key.substring(f.Key.indexOf('_') + 1) : f.Key;
      
      return `
        <div class="file-card" data-key="${f.Key}">
          ${getIcon(f.Key)}
          <span class="file-card-name" title="${displayName}">${displayName}</span>
          <button class="preview-btn" onclick="window.open('${previewUrl}', '_blank')">プレビュー</button>
          <button class="download-url-btn" data-url="${downloadUrl}">ダウンロードURL表示</button>
          <button class="delete-file-btn" data-key="${f.Key}">削除</button>
        </div>
      `;
    }));
    
    const fileList = fileCards.length ? fileCards.join('') : '<p>アップロードされたファイルはありません。</p>';
    const templatePath = path.join(__dirname, 'views', 'files.html');
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('{{fileList}}', searchBox + `<div id='fileCardsArea'>${fileList}</div>`);
    
    // 検索・削除・ダウンロードURL表示のJS
    html += `
    <script>
      // 検索
      document.getElementById('fileSearchBox').addEventListener('input', function() {
        const val = this.value.toLowerCase();
        document.querySelectorAll('.file-card').forEach(card => {
          const key = card.getAttribute('data-key').toLowerCase();
          card.style.display = key.includes(val) ? '' : 'none';
        });
      });
      // ダウンロードURL表示
      document.querySelectorAll('.download-url-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const url = this.getAttribute('data-url');
          document.getElementById('downloadUrlInput').value = url;
          document.getElementById('download-url-modal').style.display = 'flex';
        });
      });
      document.getElementById('closeDownloadUrlBtn').onclick = function() {
        document.getElementById('download-url-modal').style.display = 'none';
        document.getElementById('downloadUrlMsg').textContent = '';
      };
      document.getElementById('copyDownloadUrlBtn').onclick = function() {
        const input = document.getElementById('downloadUrlInput');
        input.select();
        document.execCommand('copy');
        document.getElementById('downloadUrlMsg').textContent = 'コピーしました！';
        setTimeout(() => document.getElementById('downloadUrlMsg').textContent = '', 2000);
      };
      // 削除
      document.querySelectorAll('.delete-file-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          if (!confirm('本当に削除しますか？')) return;
          const key = this.getAttribute('data-key');
          fetch('/delete-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
          }).then(res => res.json()).then(result => {
            if (result.success) {
              this.closest('.file-card').remove();
            } else {
              alert('削除失敗: ' + result.error);
            }
          });
        });
      });
    </script>
    `;
    res.send(html);
  } catch (error) {
    console.error('Files listing error:', error);
    res.status(500).send('Failed to list files: ' + error.message);
  }
});

// S3ファイル削除API
app.post('/delete-file', express.json(), (req, res) => {
  const key = req.body.key;
  if (!key) return res.json({ success: false, error: 'No key' });
  
  if (AWS_CONFIGURED) {
    s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }, (err, data) => {
      if (err) return res.json({ success: false, error: err.message });
      res.json({ success: true });
    });
  } else {
    // ローカルファイル削除
    try {
      const filePath = path.join(UPLOAD_FOLDER, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true });
      } else {
        res.json({ success: false, error: 'File not found' });
      }
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  if (!AWS_CONFIGURED) {
    console.log('💡 AWS S3 not configured. Files will be stored locally.');
    console.log('   To use S3, create a .env file with AWS credentials.');
  }
});