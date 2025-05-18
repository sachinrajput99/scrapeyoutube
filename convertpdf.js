const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Read all files in current directory
    const files = fs.readdirSync(process.cwd());

    // Filter only .html files
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    for (const file of htmlFiles) {
      const filePath = 'file://' + path.join(process.cwd(), file);

      // Load the HTML file
      await page.goto(filePath, { waitUntil: 'networkidle0' });

      // Inject CSS to help table formatting
      await page.addStyleTag({
        content: `
          table {
            table-layout: fixed;
            width: 100%;
            border-collapse: collapse;
            word-wrap: break-word;
          }
          th, td {
            padding: 8px;
            border: 1px solid #ccc;
            overflow-wrap: break-word;
          }
          body {
            margin: 10px;
          }
        `
      });

      // Generate PDF with landscape, scale and margin tweaks
      const pdfPath = file.replace('.html', '.pdf');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        scale: 0.8,
        margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
      });

      console.log(`✅ Generated PDF: ${pdfPath}`);
    }

    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
