# Node.js 18を使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# uploadsディレクトリを作成（ローカルフォールバック用）
RUN mkdir -p /app/uploads

# ポート3005を公開
EXPOSE 3005

# アプリケーションを起動
CMD ["node", "index.js"]
