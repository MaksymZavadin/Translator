const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function sendJson(res, status, body) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': payload.length
  });
  res.end(payload);
}

async function serveStatic(req, res) {
  const requestedPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.slice(1);
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  try {
    const data = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    res.writeHead(200, {
      'content-type': MIME_TYPES[extension] || 'application/octet-stream',
      'content-length': data.length,
      'cache-control': ['.html', '.css', '.js'].includes(extension) ? 'no-store' : 'public, max-age=3600'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'Not found.' });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed.' });
});

server.listen(PORT, HOST, () => {
  console.log(`Translator static app running at http://${HOST}:${PORT}`);
});
