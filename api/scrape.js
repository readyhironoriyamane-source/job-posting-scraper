// Vercel Serverless Function for scraping job sites - Version 2.0
// 精度向上版：より多くのセレクターパターンと動的待機を実装

const { chromium } = require('playwright-chromium');

// サイト別セレクタ定義（優先順位順に複数パターン）
const SELECTORS = {
  'indeed.com': {
    title: [
      'h1[data-testid="job-title"]',
      'h1.jobsearch-JobInfoHeader-title',
      'h1.icl-u-xs-mb--xs',
      'h1 span[title]',
      'h1.jobTitle > span',
      '.jobsearch-JobInfoHeader-title-container h1'
    ],
    company: [
      '[data-testid="company-name"]',
      'div[data-testid="inlineHeader-companyName"] a',
      'a[data-testid="company-name-link"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-CompanyInfoContainer a'
    ],
    salary: [
      '#salaryInfoAndJobType span.css-19j1a75',
      '[data-testid="job-salary"]',
      '.metadata.salary-snippet-container',
      '.attribute_snippet .css-19j1a75',
      '.jobsearch-JobMetadataHeader-salary span'
    ],
    description: [
      '#jobDescriptionText',
      'div[id="jobDescriptionText"]',
      '.jobsearch-jobDescriptionText',
      '.jobsearch-JobComponent-description'
    ],
    location: [
      '[data-testid="job-location"]',
      '[data-testid="inlineHeader-companyLocation"]',
      '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
      '.locationsContainer > div'
    ],
    workType: [
      '.jobsearch-JobMetadataHeader-item',
      '[data-testid="job-type"]',
      '.metadata:not(.salary-snippet-container)'
    ]
  },
  
  'jp.indeed.com': {
    title: [
      'h1.jobsearch-JobInfoHeader-title span',
      'h1.icl-u-xs-mb--xs span',
      '.jobsearch-JobInfoHeader-title',
      'h1[class*="JobInfoHeader"] span'
    ],
    company: [
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.jobsearch-CompanyInfoContainer a',
      'div[class*="CompanyName"] a',
      '[data-testid="company-name"]'
    ],
    salary: [
      '.attribute_snippet',
      '.salary-snippet-container',
      'span[class*="salary"]',
      '.jobsearch-JobMetadataHeader-salary'
    ],
    description: [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      'div[id="jobDescriptionText"]'
    ],
    location: [
      '.jobsearch-JobInfoHeader-subtitle > div:contains("〒")',
      '.jobsearch-JobInfoHeader-subtitle > div:contains("県")',
      '.jobsearch-JobInfoHeader-subtitle > div:contains("市")',
      '[data-testid="job-location"]'
    ],
    workHours: [
      '.jobsearch-JobDescriptionSection:contains("勤務時間")',
      '.jobsearch-JobDescriptionSection:contains("シフト")'
    ],
    benefits: [
      '.jobsearch-JobDescriptionSection:contains("福利厚生")',
      '.jobsearch-JobDescriptionSection:contains("待遇")'
    ]
  },
  
  'townwork.net': {
    title: [
      'h1.jsc-job-header-ttl',
      'h1.job-header__title',
      '.job-detail-header h1',
      'h1[class*="job-title"]',
      '.jsc-job-ttl'
    ],
    company: [
      '.jsc-company-txt',
      '.job-header__company',
      '.company-name a',
      '.job-detail-company',
      'h2.jsc-company-name'
    ],
    salary: [
      '.job-detail-table-inner:contains("給与") + dd',
      'th:contains("給与") + td',
      '.jsc-salary-txt',
      '.job-salary__text',
      'dl.job-detail-table dt:contains("給与") + dd'
    ],
    description: [
      '.job-detail-table-inner:contains("仕事内容") + dd',
      'th:contains("仕事内容") + td',
      '.jsc-job-txt',
      '.job-description__text',
      'dl.job-detail-table dt:contains("仕事内容") + dd'
    ],
    location: [
      '.job-detail-table-inner:contains("勤務地") + dd',
      'th:contains("勤務地") + td',
      '.jsc-work-location',
      '.job-location__text',
      'dl.job-detail-table dt:contains("勤務地") + dd'
    ],
    workHours: [
      '.job-detail-table-inner:contains("勤務時間") + dd',
      'th:contains("勤務時間") + td',
      '.jsc-work-time',
      'dl.job-detail-table dt:contains("勤務時間") + dd',
      'dl.job-detail-table dt:contains("時間") + dd'
    ],
    requirements: [
      '.job-detail-table-inner:contains("応募資格") + dd',
      'th:contains("応募資格") + td',
      '.jsc-qualification',
      'dl.job-detail-table dt:contains("応募資格") + dd',
      'dl.job-detail-table dt:contains("資格") + dd'
    ],
    benefits: [
      '.job-detail-table-inner:contains("待遇") + dd',
      'th:contains("待遇") + td',
      '.jsc-treatment',
      'dl.job-detail-table dt:contains("待遇") + dd',
      'dl.job-detail-table dt:contains("福利厚生") + dd'
    ],
    transport: [
      '.job-detail-table-inner:contains("交通") + dd',
      'th:contains("交通") + td',
      '.jsc-access',
      'dl.job-detail-table dt:contains("交通") + dd',
      'dl.job-detail-table dt:contains("アクセス") + dd'
    ],
    station: [
      '.job-detail-table-inner:contains("最寄駅") + dd',
      'th:contains("最寄駅") + td',
      '.jsc-station',
      'dl.job-detail-table dt:contains("最寄") + dd'
    ]
  },
  
  // バイトル対応（将来用）
  'baitoru.com': {
    title: [
      '.detail-work h1',
      'h1.work-title',
      '.job-title-text'
    ],
    company: [
      '.company-name-text',
      '.detail-company-name'
    ],
    salary: [
      'dt:contains("給与") + dd',
      '.detail-salary-text'
    ]
  },
  
  // マイナビバイト対応（将来用）
  'baito.mynavi.jp': {
    title: [
      'h1.jobname',
      '.job-header-title'
    ],
    company: [
      '.company-name',
      '.shop-name'
    ],
    salary: [
      '.salary-text',
      'th:contains("給与") + td'
    ]
  }
};

// セレクター検索用ヘルパー関数
async function findElementBySelectors(page, selectors) {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  }
  
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim()) {
          return text.trim();
        }
      }
    } catch (e) {
      // セレクターが無効な場合は次を試す
      continue;
    }
  }
  return null;
}

// テキスト抽出の改善版
async function extractText(page, selectors) {
  const text = await findElementBySelectors(page, selectors);
  if (text) {
    // 改行や余分な空白を整理
    return text.replace(/\s+/g, ' ').trim();
  }
  return '';
}

// 動的待機とリトライ
async function waitForContentWithRetry(page, selectors, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    for (const selector of (Array.isArray(selectors) ? selectors : [selectors])) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        return true;
      } catch (e) {
        // このセレクターは存在しない、次を試す
      }
    }
    // 少し待ってからリトライ
    await page.waitForTimeout(1000);
  }
  return false;
}

module.exports = async (req, res) => {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;

  try {
    console.log('スクレイピング開始 (v2):', url);
    
    // ブラウザ起動（最適化された設定）
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP'
    });

    const page = await context.newPage();
    
    // より詳細なエラーハンドリング
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // ページ読み込み（ネットワーク待機を含む）
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // サイト判定
    const domain = new URL(url).hostname;
    let selectors = null;
    let siteName = '';

    if (domain.includes('indeed.com')) {
      selectors = domain.includes('jp.indeed') ? SELECTORS['jp.indeed.com'] : SELECTORS['indeed.com'];
      siteName = 'Indeed';
      // Indeed特有の待機（動的コンテンツ）
      await waitForContentWithRetry(page, selectors.title);
    } else if (domain.includes('townwork.net')) {
      selectors = SELECTORS['townwork.net'];
      siteName = 'タウンワーク';
      // タウンワーク特有の待機
      await waitForContentWithRetry(page, selectors.title);
    } else if (domain.includes('baitoru.com')) {
      selectors = SELECTORS['baitoru.com'];
      siteName = 'バイトル';
    } else if (domain.includes('baito.mynavi.jp')) {
      selectors = SELECTORS['baito.mynavi.jp'];
      siteName = 'マイナビバイト';
    }

    if (!selectors) {
      throw new Error('未対応のサイトです: ' + domain);
    }

    // データ抽出（改善版）
    const jobData = {};
    
    // 各フィールドを順番に取得
    for (const [key, selectorList] of Object.entries(selectors)) {
      try {
        const value = await extractText(page, selectorList);
        if (value) {
          jobData[key] = value;
          console.log(`✓ ${key}: ${value.substring(0, 50)}...`);
        } else {
          console.log(`✗ ${key}: 取得失敗`);
        }
      } catch (e) {
        console.log(`✗ ${key}: エラー - ${e.message}`);
      }
    }

    // 追加情報の取得（構造化データ）
    try {
      const structuredData = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const data = {};
        scripts.forEach(script => {
          try {
            const json = JSON.parse(script.textContent);
            if (json['@type'] === 'JobPosting') {
              data.structured = json;
            }
          } catch (e) {
            // JSON解析エラーは無視
          }
        });
        return data;
      });
      
      if (structuredData.structured) {
        console.log('構造化データを検出');
        jobData.structured = structuredData.structured;
      }
    } catch (e) {
      console.log('構造化データ取得エラー:', e.message);
    }

    // データ整形（改善版）
    const formattedData = formatJobDataV2(jobData, siteName);

    await browser.close();

    return res.status(200).json({
      success: true,
      source: siteName,
      data: formattedData,
      rawData: jobData,
      extractedCount: Object.keys(jobData).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    
    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      url: url,
      timestamp: new Date().toISOString()
    });
  }
};

// データ整形関数（改善版）
function formatJobDataV2(data, source) {
  const formatted = {
    source: source,
    companyName: '',
    storeName: [],
    jobType: '',
    jobDescription: '',
    workHours: '',
    workDays: '',
    salary: '',
    transportation: '',
    benefits: '',
    requirements: '',
    targetAudience: '',
    location: '',
    nearStation: '',
    additionalInfo: ''
  };

  // 基本情報のマッピング
  formatted.companyName = data.company || '';
  formatted.jobType = data.title || '';
  formatted.salary = data.salary || '';
  formatted.jobDescription = data.description || '';
  formatted.location = data.location || '';
  formatted.nearStation = data.station || '';
  formatted.workHours = data.workHours || data.workType || '';
  formatted.workDays = data.workDays || '';
  formatted.benefits = data.benefits || '';
  formatted.requirements = data.requirements || '';
  formatted.transportation = data.transport || data.transportation || '';
  
  // 構造化データから補完
  if (data.structured) {
    const s = data.structured;
    if (!formatted.companyName && s.hiringOrganization?.name) {
      formatted.companyName = s.hiringOrganization.name;
    }
    if (!formatted.jobType && s.title) {
      formatted.jobType = s.title;
    }
    if (!formatted.salary && s.baseSalary?.value) {
      formatted.salary = `${s.baseSalary.value.minValue}〜${s.baseSalary.value.maxValue}`;
    }
    if (!formatted.location && s.jobLocation?.address) {
      const addr = s.jobLocation.address;
      formatted.location = `${addr.addressRegion}${addr.addressLocality}`;
    }
    if (!formatted.jobDescription && s.description) {
      formatted.jobDescription = s.description;
    }
  }

  // サイト別の追加処理
  if (source === 'Indeed' || source === 'Indeed Japan') {
    // 給与の整形
    if (formatted.salary) {
      formatted.salary = formatted.salary
        .replace(/\s+/g, ' ')
        .replace('時給', '時給')
        .replace('月給', '月給')
        .trim();
    }
    
    // 会社名から「株式会社」などを含める
    if (formatted.companyName && !formatted.companyName.includes('株式会社')) {
      if (!formatted.companyName.includes('合同会社') && !formatted.companyName.includes('有限会社')) {
        // 推測で追加しない（正確性重視）
      }
    }
  }
  
  if (source === 'タウンワーク') {
    // 店舗名の抽出
    if (formatted.location && formatted.location.includes('店')) {
      const storeMatch = formatted.location.match(/([^店]+店)/);
      if (storeMatch) {
        formatted.storeName = [storeMatch[1]];
      }
    }
    
    // 勤務日数の整形
    if (formatted.workDays) {
      formatted.workDays = formatted.workDays
        .replace('週', '週')
        .replace('日', '日')
        .trim();
    }
  }

  // 空の値を削除
  Object.keys(formatted).forEach(key => {
    if (formatted[key] === '' || 
        (Array.isArray(formatted[key]) && formatted[key].length === 0)) {
      delete formatted[key];
    }
  });

  return formatted;
}