const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');
const fs = require('fs');

const proxy = httpProxy.createProxyServer({});
const PORT = 8080;

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    proxy.web(req, res, {
      target: 'http://localhost:3000',
      changeOrigin: true,
    });
  } else if (req.url.startsWith('/uploads')) {
    proxy.web(req, res, {
      target: 'http://localhost:3000',
      changeOrigin: true,
    });
  } else {
    let filePath = path.join(__dirname, 'web-admin/dist', req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'web-admin/dist', 'index.html');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API proxy: http://localhost:${PORT}/api -> http://localhost:3000/api`);
});
