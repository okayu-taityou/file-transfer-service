# ファイル転送サービス

AWS S3と連携したファイルアップロード・ダウンロードサービスです。

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定

#### オプション A: AWS S3を使用する場合
`.env`ファイルを作成：
```bash
cp .env.example .env
```

`.env`ファイルを編集して、AWS認証情報を設定：
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=your_s3_bucket_name
```

#### オプション B: ローカルファイルモード（AWS設定なし）
`.env`ファイルを作成せずに起動すると、ローカルファイルモードで動作します。

### 3. サーバー起動
```bash
npm start
# または
node index.js
```

### 4. アクセス
ブラウザで http://localhost:3005 にアクセス

## 📁 機能

- ✅ ファイルアップロード（ドラッグ&ドロップ対応）
- ✅ 期限付きダウンロードURL生成
- ✅ ファイル一覧表示・検索
- ✅ ファイル削除機能
- ✅ 画像プレビュー
- ✅ レスポンシブデザイン
- ✅ AWS S3 / ローカルファイル両対応

## 🛠️ AWS S3設定（オプション）

S3バケットを使用する場合は、CORSを設定してください：

```bash
node setup-s3-cors.js
```

## 📝 注意事項

- ファイルサイズ制限: 10MB
- AWS S3使用時: 署名付きURL有効期限24時間
- ローカルモード: `uploads/`フォルダに保存

## 🔧 開発者向け

### ディレクトリ構造
```
├── index.js              # メインサーバーファイル
├── package.json          # 依存関係定義
├── .env.example          # 環境変数設定例
├── setup-s3-cors.js      # S3 CORS設定スクリプト
├── public/               # 静的ファイル
│   ├── index.html        # メインページ
│   └── style.css         # スタイルシート
├── views/                # テンプレートファイル
│   ├── files.html        # ファイル一覧ページ
│   └── success.html      # アップロード成功ページ
└── uploads/              # ローカルアップロードフォルダ
```

### 環境
- Node.js 14以上推奨
- Express.js
- AWS SDK v2