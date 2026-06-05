const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
    // 1. Sanitize the path to prevent directory traversal
    let safeUrl = req.url.split('?')[0];
    let safeSuffix = path.normalize(safeUrl).replace(/^(\.\.[\/\\])+/, '');
    
    // Default to index.html for root path
    if (safeSuffix === '/' || safeSuffix === '\\') {
        safeSuffix = '/index.html';
    }
    
    let filePath = path.join(__dirname, safeSuffix);
    
    // Check if the file exists and is a file
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Check if request looks like a file/asset request (has extension)
            const ext = path.extname(safeSuffix);
            if (ext && ext !== '.html') {
                // Return 404 for missing static assets (images, CSS, JS, etc.)
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
            
            // For routing/navigation requests, fall back to serving index.html
            filePath = path.join(__dirname, 'index.html');
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        // Read file stats to set content-length
        fs.stat(filePath, (statErr, finalStats) => {
            if (statErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }
            
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': finalStats.size,
                'Cache-Control': 'public, max-age=3600'
            });
            
            const stream = fs.createReadStream(filePath);
            stream.on('error', (streamErr) => {
                console.error(`Stream error serving ${filePath}:`, streamErr);
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                }
            });
            stream.pipe(res);
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Production-safe frontend server running on port ${PORT}`);
});
