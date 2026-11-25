const fs = require('fs');
const path = require('path');
const http = require('http');

/** Blog post routes from content/blog/*.md — same source the sitemap uses.
 *  The marketing pipeline commits one file per post; each gets prerendered
 *  so AI crawlers and social scrapers see full HTML without running JS. */
function blogPostRoutes() {
  const dir = path.resolve(__dirname, 'content', 'blog');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = fs.readFileSync(path.join(dir, f), 'utf-8').slice(0, 800);
      const slug = (fm.match(/^slug:\s*"?([^"\n]+)"?\s*$/m) || [])[1];
      return `/blog/${(slug || f.replace(/\.md$/, '')).trim()}`;
    });
}

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
  '/home',
  '/founder',
  '/about',
  '/pricing',
  '/chatbot',
  '/prompt-library',
  '/themes',
  '/docs',
  '/faq',
  '/changelog',
  '/security',
  '/benchmarks',
  '/contact',
  '/downloads',
  '/ide',
  '/proofloop',
  '/status',
  '/privacy',
  '/terms',
  '/cookies',
  '/gdpr',
  '/offline-ai-chat',
  '/private-ai-chat',
  '/run-llm-in-browser',
  '/what-is-on-device-ai',
  '/best-offline-ai-chat',
  '/ai-chat-without-account',
  '/free-ai-chat',
  '/mobile-offline-ai',
  '/webgpu-ai-chat',
  '/local-vs-cloud-ai',
  '/chatgpt-down',
  '/ai-chat-for-travel',
  '/ai-chat-for-students',
  '/who-can-read-your-ai-chats',
  '/is-chatgpt-plus-worth-it',
  '/byok-ai-chat',
  '/blog',
  '/guides',
  '/compare',
  '/vs/chatgpt',
  '/vs/gemini',
  '/vs/claude',
  '/vs/lm-studio',
  '/vs/proton-lumo',
  '/vs/web-llm-chat',
  '/vs/ollama',
  '/vs/jan',
  '/vs/perplexity',
  '/vs/pocketpal',
  '/vs/deepseek',
  '/vs/copilot',
  '/vs/duckduckgo-ai',
  '/vs/brave-leo',
  '/vs/grok',
  '/vs/poe',
];

// Dynamic blog post routes (kept separate so the seoGrowth test can pin the
// static hub list while posts flow in automatically from content/blog/).
for (const route of blogPostRoutes()) {
  if (!ROUTES_TO_PRERENDER.includes(route)) ROUTES_TO_PRERENDER.push(route);
}

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
