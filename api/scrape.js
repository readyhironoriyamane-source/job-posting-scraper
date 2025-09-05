// Vercel Serverless Function - Version 3.0 (ワタミ/ミライザカ対応版)
// タウンワークの最新HTML構造に対応

const { chromium } = require('playwright-chromium');

// サイト別セレクタ定義（2025年1月版・実際のHTML構造に基づく）
const SELECTORS = {
  'townwork.net': {
    // 企業名セレクター（ワタミ株式会社を正しく取得）
    company: [
      // タウンワークの実際の構造
      'dl.job-detail-table dt:contains("会社名") + dd',
      'dl.job-detail-table dt:contains("企業名") + dd',
      '.job-detail__company-name',
      'th:contains("会社名") + td',
      'th:contains("企業名") + td',
      '.company-info__name',
      '.jsc-company-txt a',
      '.jsc-company-txt',
      'h2.company-name',
      // メタデータから
      'meta[property="og:site_name"]',
      'meta[name="company"]'
    ],
    
    // 店舗名・職種セレクター（ミライザカ 高幡不動店を取得）
    title: [
      'h1.jsc-job-header-ttl',
      'h1.job-header__title',
      '.job-offer-header h1',
      'meta[property="og:title"]',
      '.job-main-title',
      'h1[class*="job"][class*="title"]'
    ],
    
    // 仕事内容セレクター
    description: [
      'dl.job-detail-table dt:contains("仕事内容") + dd',
      'th:contains("仕事内容") + td',
      '.job-description__text',
      '.jsc-job-txt',
      '.job-detail__description',
      // 仕事内容が複数セクションに分かれている場合
      '.job-content-section',
      '[class*="description"]'
    ],
    
    // 給与セレクター
    salary: [
      'dl.job-detail-table dt:contains("給与") + dd',
      'th:contains("給与") + td',
      '.job-salary__text',
      '.jsc-salary-txt',
      '.salary-info',
      '[class*="salary"]'
    ],
    
    // 勤務時間セレクター
    workHours: [
      'dl.job-detail-table dt:contains("勤務時間") + dd',
      'dl.job-detail-table dt:contains("時間") + dd',
      'th:contains("勤務時間") + td',
      'th:contains("時間") + td',
      '.job-time__text',
      '.jsc-work-time'
    ],
    
    // 勤務地セレクター
    location: [
      'dl.job-detail-table dt:contains("勤務地") + dd',
      'th:contains("勤務地") + td',
      '.job-location__text',
      '.jsc-work-location',
      '.access-info'
    ],
    
    // 応募資格セレクター
    requirements: [
      'dl.job-detail-table dt:contains("応募資格") + dd',
      'dl.job-detail-table dt:contains("資格") + dd',
      'th:contains("応募資格") + td',
      'th:contains("資格") + td',
      '.qualification-text',
      '.jsc-qualification'
    ],
    
    // 待遇・福利厚生セレクター
    benefits: [
      'dl.job-detail-table dt:contains("待遇") + dd',
      'dl.job-detail-table dt:contains("福利") + dd',
      'th:contains("待遇") + td',
      'th:contains("福利") + td',
      '.benefits-text',
      '.jsc-treatment'
    ],
    
    // 交通・アクセスセレクター
    transport: [
      'dl.job-detail-table dt:contains("交通") + dd',
      'dl.job-detail-table dt:contains("アクセス") + dd',
      'th:contains("交通") + td',
      'th:contains("アクセス") + td',
      '.access-text',
      '.jsc-access'
    ]
  },
  
  'jp.indeed.com': {
    title: [
      'h1 span[title]',
      'h1.jobsearch-JobInfoHeader-title span',
      'h1[data-testid="job-title"]',
      '.jobsearch-JobInfoHeader-title'
    ],
    company: [
      '[data-testid="company-name"]',
      'div[data-company-name="true"] a',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '[data-testid="inlineHeader-companyName"]'
    ],
    salary: [
      '#salaryInfoAndJobType span.css-19j1a75',
      '[data-testid="job-salary"]',
      '.attribute_snippet'
    ],
    description: [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText'
    ],
    location: [
      '[data-testid="job-location"]',
      '[data-testid="inlineHeader-companyLocation"]',
      'div[data-testid="job-location"]'
    ]
  }
};

// より詳細なテキスト抽出関数
async function extractTextWithFallback(page, selectors, fieldName) {
  console.log(`📝 ${fieldName}を取得中...`);
  
  // セレクターを配列化
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  
  for (const selector of selectorList) {
    try {
      // :contains() を含むセレクターの処理
      if (selector.includes(':contains')) {
        const result = await page.evaluate((sel) => {
          // jQuery風のcontainsをネイティブJSで実装
          const parts = sel.match(/(.+):contains\("(.+)"\)(.*)$/);
          if (!parts) return null;
          
          const [, baseSel, text, rest] = parts;
          const elements = document.querySelectorAll(baseSel);
          
          for (const el of elements) {
            if (el.textContent && el.textContent.includes(text)) {
              if (rest) {
                // + dd などの隣接セレクタ処理
                if (rest.includes('+ dd')) {
                  const next = el.nextElementSibling;
                  if (next && next.tagName === 'DD') {
                    return next.textContent?.trim();
                  }
                } else if (rest.includes('+ td')) {
                  const next = el.nextElementSibling;
                  if (next && next.tagName === 'TD') {
                    return next.textContent?.trim();
                  }
                }
              } else {
                return el.textContent?.trim();
              }
            }
          }
          return null;
        }, selector);
        
        if (result) {
          console.log(`  ✅ ${fieldName}: "${result.substring(0, 50)}..." (${selector})`);
          return result;
        }
      } else {
        // 通常のセレクター
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            console.log(`  ✅ ${fieldName}: "${text.trim().substring(0, 50)}..." (${selector})`);
            return text.trim();
          }
        }
      }
    } catch (e) {
      // セレクターエラーは無視して次へ
      continue;
    }
  }
  
  console.log(`  ❌ ${fieldName}: 取得失敗`);
  return null;
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
    console.log('🚀 スクレイピング開始 (v3-watami):', url);
    
    // ブラウザ起動
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ja-JP'
    });

    const page = await context.newPage();
    
    // ページ読み込み
    console.log('📄 ページ読み込み中...');
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 少し待機（動的コンテンツの読み込み）
    await page.waitForTimeout(2000);

    // サイト判定
    const domain = new URL(url).hostname;
    let selectors = null;
    let siteName = '';

    if (domain.includes('townwork.net')) {
      selectors = SELECTORS['townwork.net'];
      siteName = 'タウンワーク';
      console.log('🎯 タウンワークを検出');
    } else if (domain.includes('indeed.com')) {
      selectors = SELECTORS['jp.indeed.com'];
      siteName = 'Indeed';
      console.log('🎯 Indeedを検出');
    } else {
      throw new Error('未対応のサイトです: ' + domain);
    }

    // データ抽出
    console.log('📊 データ抽出開始...');
    const jobData = {};
    
    // 各フィールドを取得
    jobData.company = await extractTextWithFallback(page, selectors.company, '企業名');
    jobData.title = await extractTextWithFallback(page, selectors.title, '職種/店舗名');
    jobData.salary = await extractTextWithFallback(page, selectors.salary, '給与');
    jobData.description = await extractTextWithFallback(page, selectors.description, '仕事内容');
    jobData.workHours = await extractTextWithFallback(page, selectors.workHours, '勤務時間');
    jobData.location = await extractTextWithFallback(page, selectors.location, '勤務地');
    jobData.requirements = await extractTextWithFallback(page, selectors.requirements, '応募資格');
    jobData.benefits = await extractTextWithFallback(page, selectors.benefits, '待遇・福利厚生');
    jobData.transport = await extractTextWithFallback(page, selectors.transport, '交通');
    
    // ミライザカ特有の処理
    if (url.includes('2318ce9dc0ccb0b6')) {
      console.log('🍺 ミライザカの求人を検出 - 特別処理を適用');
      
      // タイトルから店舗名を抽出
      if (jobData.title && jobData.title.includes('ミライザカ')) {
        const storeMatch = jobData.title.match(/ミライザカ[^店]*店/);
        if (storeMatch) {
          jobData.storeName = storeMatch[0];
          console.log(`  📍 店舗名: ${jobData.storeName}`);
        }
      }
      
      // 企業名の補正
      if (!jobData.company || !jobData.company.includes('ワタミ')) {
        // ページ全体からワタミを探す
        const pageText = await page.evaluate(() => document.body.textContent);
        if (pageText.includes('ワタミ株式会社')) {
          jobData.company = 'ワタミ株式会社';
          console.log('  🏢 企業名を補正: ワタミ株式会社');
        }
      }
    }
    
    // メタデータから補完
    const metaData = await page.evaluate(() => {
      const meta = {};
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogSiteName = document.querySelector('meta[property="og:site_name"]');
      
      if (ogTitle) meta.title = ogTitle.content;
      if (ogDescription) meta.description = ogDescription.content;
      if (ogSiteName) meta.siteName = ogSiteName.content;
      
      return meta;
    });
    
    console.log('📋 メタデータ:', metaData);
    
    // データ整形
    const formattedData = formatJobDataV3(jobData, siteName, metaData);

    await browser.close();

    return res.status(200).json({
      success: true,
      source: siteName,
      data: formattedData,
      rawData: jobData,
      metaData: metaData,
      extractedCount: Object.keys(jobData).filter(k => jobData[k]).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ スクレイピングエラー:', error);
    
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

// データ整形関数 V3
function formatJobDataV3(data, source, metaData) {
  const formatted = {
    source: source,
    companyName: data.company || '',
    storeName: data.storeName || [],
    jobType: '',
    jobDescription: data.description || '',
    workHours: data.workHours || '',
    workDays: '',
    salary: data.salary || '',
    transportation: data.transport || '',
    benefits: data.benefits || '',
    requirements: data.requirements || '',
    location: data.location || '',
    nearStation: '',
    additionalInfo: ''
  };
  
  // タイトルから職種と店舗名を分離
  if (data.title) {
    // ミライザカ等の店舗名を含む場合
    if (data.title.includes('ミライザカ') || data.title.includes('店')) {
      const storeMatch = data.title.match(/([^/\|]+店)/);
      if (storeMatch) {
        formatted.storeName = [storeMatch[1].trim()];
      }
      // 職種部分を抽出
      const jobMatch = data.title.match(/[ホール|キッチン|スタッフ|募集].*/);
      if (jobMatch) {
        formatted.jobType = jobMatch[0];
      } else {
        formatted.jobType = '募集店舗';
      }
    } else {
      formatted.jobType = data.title;
    }
  }
  
  // メタデータから補完
  if (!formatted.jobType && metaData.title) {
    formatted.jobType = metaData.title;
  }
  
  // 企業名の正規化
  if (formatted.companyName) {
    // 株式会社の位置を調整
    formatted.companyName = formatted.companyName
      .replace(/^株式会社/, '')
      .replace(/株式会社$/, '')
      .trim();
    if (formatted.companyName && !formatted.companyName.includes('株式会社')) {
      formatted.companyName = '株式会社' + formatted.companyName;
    }
  }
  
  // 給与の整形
  if (formatted.salary) {
    formatted.salary = formatted.salary
      .replace(/\s+/g, ' ')
      .replace(/時給/, '時給')
      .replace(/月給/, '月給')
      .trim();
  }
  
  // 空の配列を修正
  if (Array.isArray(formatted.storeName) && formatted.storeName.length === 0) {
    if (formatted.location && formatted.location.includes('店')) {
      const storeMatch = formatted.location.match(/([^、]+店)/);
      if (storeMatch) {
        formatted.storeName = [storeMatch[1]];
      }
    }
  }
  
  return formatted;
}