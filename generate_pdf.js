const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const htmlPath = `file://${path.resolve(__dirname, 'manual.html')}`;
  
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: '/Users/matsuchannel/Desktop/OralNoteAI_Manual.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px'
    }
  });

  await browser.close();
  console.log('PDF generated at /Users/matsuchannel/Desktop/OralNoteAI_Manual.pdf');
})();
