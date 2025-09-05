// Vercel Serverless Function for scraping job sites
const { chromium } = require('playwright-chromium');

// サイト別セレクタ定義
const SELECTORS = {
  'indeed.com': {
    title: '[data-testid="job-title"], .jobsearch-JobInfoHeader-title, h1.jobTitle',
    company: '[data-testid="company-name"], .jobsearch-InlineCompanyRating > div:first-child, [data-testid="job-company-name"]',
    salary: '.salary-snippet, [data-testid="job-salary"], .jobsearch-JobMetadataHeader-salary',
    description: '#jobDescriptionText, .jobsearch-jobDescriptionText, [data-testid="job-description"]',
    location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
    type: '.jobsearch-JobMetadataHeader-item:contains("契約"), .jobsearch-JobMetadataHeader-item:contains("正社員")'
  },
  'jp.indeed.com': {
    title: '.jobsearch-JobInfoHeader-title, h1[class*="jobTitle"]',
    company: '.jobsearch-InlineCompanyRating-companyHeader a, [data-testid="company-name"]',
    salary: '.attribute_snippet, .salary-snippet-container, .jobsearch-JobMetadataHeader-salary',
    description: '#jobDescriptionText, .jobsearch-jobDescriptionText',
    location: '.jobsearch-JobInfoHeader-subtitle > div:last-child, [data-testid="job-location"]',
    benefits: '.jobsearch-JobDescriptionSection-sectionItem'
  },
  'townwork.net': {
    title: 'h1.job-offer-title, .job-header-title, .job-main-title',
    company: '.company-name, .job-offer-company, .job-company-name',
    salary: '.job-offer-salary, .salary-text, .job-main-salary',
    description: '.job-description-text, .job-offer-description, .job-main-description',
    location: '.job-location, .job-offer-location, .access-text',
    workHours: '.work-hours, .job-time-text, .shift-text',
    requirements: '.job-requirements, .qualification-text'
  }
};

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
    console.log('スクレイピング開始:', url);
    
    // ブラウザ起動
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();
    
    // ページ読み込み
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });

    // サイト判定
    const domain = new URL(url).hostname;
    let selectors = null;
    let siteName = '';

    if (domain.includes('indeed.com')) {
      selectors = domain.includes('jp.indeed') ? SELECTORS['jp.indeed.com'] : SELECTORS['indeed.com'];
      siteName = 'Indeed';
      // Indeed特有の待機
      await page.waitForTimeout(2000);
    } else if (domain.includes('townwork.net')) {
      selectors = SELECTORS['townwork.net'];
      siteName = 'タウンワーク';
      await page.waitForTimeout(1500);
    }

    if (!selectors) {
      throw new Error('未対応のサイトです');
    }

    // データ抽出
    const jobData = {};

    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          jobData[key] = text?.trim() || '';
        }
      } catch (e) {
        console.log(`${key}の取得失敗:`, e.message);
      }
    }

    // データ整形
    const formattedData = formatJobData(jobData, siteName);

    await browser.close();

    return res.status(200).json({
      success: true,
      source: siteName,
      data: formattedData,
      rawData: jobData
    });

  } catch (error) {
    console.error('スクレイピングエラー:', error);
    
    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      url: url
    });
  }
};

// データ整形関数
function formatJobData(data, source) {
  const formatted = {
    source: source,
    companyName: data.company || '',
    jobType: data.title || '',
    salary: data.salary || '',
    jobDescription: data.description || '',
    location: data.location || '',
    workHours: data.workHours || data.type || '',
    benefits: data.benefits || '',
    requirements: data.requirements || ''
  };

  // サイト別の追加処理
  if (source === 'Indeed') {
    // Indeed特有の処理
    if (formatted.salary.includes('月給')) {
      formatted.salary = formatted.salary.replace('月給', '月給');
    }
    if (formatted.salary.includes('時給')) {
      formatted.salary = formatted.salary.replace('a', '');
    }
  } else if (source === 'タウンワーク') {
    // タウンワーク特有の処理
    if (data.workHours) {
      formatted.workHours = data.workHours.replace(/\s+/g, ' ');
    }
  }

  // 空白や改行の整理
  Object.keys(formatted).forEach(key => {
    if (typeof formatted[key] === 'string') {
      formatted[key] = formatted[key]
        .replace(/\n\s*\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();
    }
  });

  return formatted;
}