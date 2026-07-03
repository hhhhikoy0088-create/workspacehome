const { chromium } = require('puppeteer');
const { buildHTML } = require('./html-exporter.ts');

async function exportPDF(doc) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(buildHTML(doc), { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
}

module.exports = { exportPDF };
