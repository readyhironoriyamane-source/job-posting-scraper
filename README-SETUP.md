# 🚀 他媒体情報取り込み機能 - セットアップガイド

## 📋 必要な準備

### 1. アカウント作成（約10分）
- [ ] GitHubアカウント作成: https://github.com/signup
- [ ] Vercelアカウント作成: https://vercel.com/signup（GitHubでログイン）

### 2. プロジェクト準備（約5分）

#### Step 1: GitHubリポジトリ作成
1. GitHubにログイン
2. 「New repository」をクリック
3. リポジトリ名: `job-form-system`
4. Public/Privateどちらでも可
5. 「Create repository」

#### Step 2: ファイルアップロード
1. 現在のHTMLファイル群を`public`フォルダに配置
2. このセットアップファイルの内容をコピー

## 📁 プロジェクト構造

```
job-form-system/
├── public/               # 既存のファイルをここに移動
│   ├── index.html
│   ├── multi-store.html
│   ├── menu.html
│   ├── css/
│   │   ├── style.css
│   │   └── multi-store.css
│   └── js/
│       ├── main.js
│       └── multi-store.js
├── api/
│   └── scrape.js        # 提供ファイルをコピー
├── package.json         # 提供ファイルをコピー
└── vercel.json          # 提供ファイルをコピー
```

## 🔧 セットアップ手順

### Step 1: ローカル環境準備
```bash
# Node.jsがインストールされていない場合
# https://nodejs.org/ からLTS版をダウンロード

# プロジェクトフォルダで実行
npm install
```

### Step 2: Vercelデプロイ
```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ実行
vercel

# 質問に答える:
# - Set up and deploy? → Y
# - Which scope? → 自分のアカウント選択
# - Link to existing project? → N
# - Project name? → job-form-system
# - Directory? → ./
# - Override settings? → N
```

### Step 3: フロントエンド更新

`public/js/main.js`の196行目付近を更新:

```javascript
// 変更前（シミュレーション）
setTimeout(() => {
    const simulatedData = extractDataFromUrl(url);
    // ...
}, 1500);

// 変更後（実API）
try {
    const API_ENDPOINT = 'https://job-form-system.vercel.app/api/scrape';
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ url: url })
    });
    const result = await response.json();
    // ...
} catch (error) {
    // フォールバック処理
}
```

## ✅ 動作確認

### テストURL
```
Indeed:
https://jp.indeed.com/viewjob?jk=abc123def456

タウンワーク:
https://townwork.net/tokyo/job-12345678
```

### 確認手順
1. デプロイされたURL（例: https://job-form-system.vercel.app）にアクセス
2. フォームの「他媒体情報の取り込み」にテストURLを入力
3. 「情報を取得」をクリック
4. 実際のデータが取得されることを確認

## 🔍 トラブルシューティング

### よくある問題と解決策

#### 1. "Module not found: playwright"
```bash
npm install playwright-chromium
```

#### 2. CORS エラー
`vercel.json`の設定を確認:
```json
"headers": [
  {
    "source": "/api/(.*)",
    "headers": [
      {"key": "Access-Control-Allow-Origin", "value": "*"}
    ]
  }
]
```

#### 3. タイムアウトエラー
`vercel.json`で実行時間を延長:
```json
"functions": {
  "api/scrape.js": {
    "maxDuration": 30
  }
}
```

## 💰 コスト

### Vercel無料プラン
- 月間100GBの帯域幅
- 月間100時間の実行時間
- 求人取得なら**月5,000回**程度は無料枠内

### 有料プラン（必要な場合）
- Pro: $20/月（商用利用可）
- 実行時間・帯域幅の上限緩和

## 📞 サポート

問題が発生した場合:
1. Vercelのログを確認: `vercel logs`
2. ブラウザのコンソールでエラー確認
3. このREADMEのトラブルシューティング参照

## 🎯 次のステップ

### Phase 1（今回）
- [x] Indeed対応
- [x] タウンワーク対応

### Phase 2（将来）
- [ ] バイトル対応
- [ ] マイナビバイト対応
- [ ] フロムエー対応
- [ ] リクナビ対応
- [ ] エン転職対応

### Phase 3（オプション）
- [ ] Google Sheets連携
- [ ] Slack通知
- [ ] 定期実行バッチ