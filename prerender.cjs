const fs = require('fs');
const path = require('path');
const http = require('http');

// Try to load puppeteer — if it's not available or can't launch,
// the build continues without prerendering (non-fatal).
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  console.warn('⚠️ Puppeteer not installed — skipping prerender. Build continues normally.');
  process.exit(0);
}

const PORT = 8089;
const DIST_DIR = path.resolve(__dirname, 'dist');

// The critical routes we want perfectly indexed by Google
const ROUTES_TO_PRERENDER = [
  '/',
  '/founder',
  '/about',
  '/pricing',
  '/chatbot',
  '/docs',
  '/faq',
  '/blog',
  '/changelog',
  '/security',
  '/benchmarks',
  '/contact',
  '/help'
];

// Simple static file server
const server = http.createServer((req, res) => {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  // Strip query strings
  reqPath = reqPath.split('?')[0];
  let filePath = path.join(DIST_DIR, reqPath);

  // If the path doesn't exist, or it's a directory, try serving index.html
  // from that directory (SPA fallback). If that doesn't exist either, fall
  // back to the root index.html.
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Try /directory/index.html first
    const indexInDir = path.join(filePath, 'index.html');
    if (fs.existsSync(indexInDir)) {
      filePath = indexInDir;
    } else {
      filePath = path.join(DIST_DIR, 'index.html');
    }
  }

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.json') contentType = 'application/json';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Error: ${err.code}`);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

async function runPrerender() {
  console.log('Starting prerender static server...');
  server.listen(PORT);

  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Speed up by aborting unnecessary requests
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const rType = req.resourceType();
    if (['image', 'media', 'font', 'websocket'].includes(rType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  for (const route of ROUTES_TO_PRERENDER) {
    console.log(`Prerendering route: ${route}`);
    const url = `http://localhost:${PORT}${route}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Give react-helmet and React rendering time to settle
      // since networkidle0 will timeout if there are open websockets
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));

      let html = await page.content();
      
      let outDir = DIST_DIR;
      if (route !== '/') {
        outDir = path.join(DIST_DIR, route.substring(1));
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
      }
      
      const outPath = path.join(outDir, 'index.html');
      fs.writeFileSync(outPath, html);
      console.log(`✅ Saved: ${outPath}`);
    } catch (e) {
      console.error(`❌ Failed to prerender ${route}:`, e.message);
    }
  }

  await browser.close();
  server.close();
  console.log('Prerendering complete!');
}

runPrerender().catch(err => {
  console.warn('⚠️ Prerender skipped (non-fatal):', err.message);
  console.warn('Build continues without prerendered pages. This is expected in environments without Chromium (e.g., Lovable, CI).');
  // Exit 0 so the build doesn't fail — prerendering is optional.
  process.exit(0);
});
