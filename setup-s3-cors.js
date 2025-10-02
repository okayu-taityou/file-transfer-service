require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

const corsParams = {
  Bucket: process.env.S3_BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000
      }
    ]
  }
};

// バケットのパブリックアクセスブロック設定を無効にする
const publicAccessParams = {
  Bucket: process.env.S3_BUCKET_NAME,
  PublicAccessBlockConfiguration: {
    BlockPublicAcls: false,
    IgnorePublicAcls: false,
    BlockPublicPolicy: false,
    RestrictPublicBuckets: false
  }
};

console.log('S3バケットの設定を開始します...');

// 1. パブリックアクセスブロックを無効にする
s3.putPublicAccessBlock(publicAccessParams, (err, data) => {
  if (err) {
    console.error('パブリックアクセスブロック設定エラー:', err.message);
  } else {
    console.log('✅ パブリックアクセスブロックを無効にしました');
  }
  
  // 2. CORS設定を適用
  s3.putBucketCors(corsParams, (err, data) => {
    if (err) {
      console.error('CORS設定エラー:', err.message);
    } else {
      console.log('✅ CORS設定が完了しました');
    }
    
    // 3. バケットポリシーを設定（パブリック読み取り許可）
    const bucketPolicy = {
      Bucket: process.env.S3_BUCKET_NAME,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${process.env.S3_BUCKET_NAME}/*`
          }
        ]
      })
    };
    
    s3.putBucketPolicy(bucketPolicy, (err, data) => {
      if (err) {
        console.error('バケットポリシー設定エラー:', err.message);
      } else {
        console.log('✅ バケットポリシーを設定しました（パブリック読み取り許可）');
      }
      
      console.log('\n🎉 S3バケットの設定が完了しました！');
      console.log('次のコマンドでサーバーを起動してください: npm start');
    });
  });
});
