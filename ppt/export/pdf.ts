let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  puppeteer = null;
}
const { exportHTML } = require('./html.ts');

async function exportPDF(doc) {
  if (!puppeteer) {
    throw new Error('PDF export unavailable (puppeteer not installed), please use HTML or PPTX format');
  }
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setContent(exportHTML(doc), { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
}

module.exports = { exportPDF };
