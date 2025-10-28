# 🚀 AWS App Runnerへのデプロイ手順（無料枠対応）

このガイドでは、アクセスキーを使わない安全な方法でファイル転送サービスをデプロイします。

## 📋 前提条件

- AWSアカウント（無料枠あり）
- GitHubアカウント（このリポジトリをpush済み）
- S3バケット作成済み

---

## 🔧 ステップ1: S3バケットの準備

### 1.1 S3バケットを作成（まだの場合）

```bash
# AWS CLIで作成する場合
aws s3 mb s3://your-unique-bucket-name --region ap-southeast-2
```

または、AWSコンソールから：
1. S3コンソールを開く
2. 「バケットを作成」をクリック
3. バケット名を入力（グローバルで一意な名前）
4. リージョンを選択（ap-southeast-2推奨）
5. 作成

### 1.2 CORSを設定

```bash
node setup-s3-cors.js
```

---

## 🚀 ステップ2: AWS App Runnerでデプロイ

### 2.1 IAMロールの作成

1. **IAMコンソール**を開く
2. 「ロール」→「ロールを作成」
3. 「AWSサービス」→「App Runner」を選択
4. 次へ進む
5. 「ポリシーをアタッチ」で以下を追加：
   - `AmazonS3FullAccess`（または制限されたカスタムポリシー）
6. ロール名: `AppRunnerS3AccessRole`
7. 作成完了

#### より安全なカスタムポリシー（推奨）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### 2.2 App Runnerサービスの作成

1. **App Runnerコンソール**を開く
2. 「サービスの作成」をクリック

#### ソース設定
- **リポジトリタイプ**: ソースコードリポジトリ
- **プロバイダー**: GitHub
- **GitHubに接続**（初回のみ）
- **リポジトリ**: `okayu-taityou/file-transfer-service`
- **ブランチ**: `main`

#### ビルド設定
- **ランタイム**: Docker
- **Dockerfileのパス**: `Dockerfile`
- **ポート**: `3005`

#### サービス設定
- **サービス名**: `file-transfer-service`
- **CPU**: 1 vCPU（無料枠対応）
- **メモリ**: 2 GB（無料枠対応）

#### セキュリティ設定
- **インスタンスロール**: 先ほど作成した `AppRunnerS3AccessRole` を選択

#### 環境変数
以下を設定：
- `S3_BUCKET_NAME`: あなたのS3バケット名
- `AWS_REGION`: `ap-southeast-2`

3. 「作成とデプロイ」をクリック

### 2.3 デプロイ完了を待つ

- 5-10分程度でデプロイ完了
- 完了後、App RunnerのURLが表示されます
  - 例: `https://xxxxx.ap-southeast-2.awsapprunner.com`

---

## 🎯 ステップ3: 動作確認

1. App RunnerのURLにアクセス
2. ファイルをアップロードしてテスト
3. S3バケットを確認してファイルが保存されているか確認

---

## 💰 コスト見積もり

### 無料枠（1年間）
- **App Runner**: 
  - 1 vCPU、2GB メモリ
  - 月間2,000ビルド分（約33時間）無料
- **S3**:
  - 5GB ストレージ
  - 20,000 GETリクエスト
  - 2,000 PUTリクエスト

### 無料枠超過後の概算
- **App Runner**: 
  - 月間100時間稼働: 約$5-10
  - 停止時: $0
- **S3**: ストレージ+リクエスト従量課金

---

## 🔒 セキュリティのポイント

✅ **アクセスキー不要**: IAM Roleで自動認証  
✅ **GitHubに機密情報なし**: 環境変数はApp Runnerで設定  
✅ **最小権限**: S3のみアクセス可能なIAMロール  
✅ **HTTPS自動**: App Runnerが自動でHTTPS化  

---

## 🛠️ トラブルシューティング

### エラー: "Access Denied"
→ IAMロールのS3権限を確認

### エラー: "Bucket not found"
→ 環境変数 `S3_BUCKET_NAME` が正しいか確認

### アプリが起動しない
→ App Runnerのログを確認

---

## 📱 代替案: 完全無料のRender.com

App Runnerの無料枠が終了した場合、Render.comも検討できます：

### Render.comの場合
1. Render.comアカウント作成
2. GitHubリポジトリを接続
3. Web Serviceを作成
4. 環境変数に以下を設定：
   - `S3_BUCKET_NAME`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`（必要）
   - `AWS_SECRET_ACCESS_KEY`（必要）

**注意**: Render.comにはIAM Role機能がないため、アクセスキーが必要です。
Renderの環境変数は暗号化されているので比較的安全ですが、App RunnerのIAM Roleの方がより安全です。

---

## 🔄 自動デプロイ

GitHubにpushすると自動的にApp Runnerがデプロイします！

```bash
git add .
git commit -m "feat: 新機能追加"
git push origin main
# → 自動的にApp Runnerがデプロイ開始
```
