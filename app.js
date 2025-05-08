import https from 'https';
import net from 'net';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});

const server = https.createServer((req, res) => {
    if (req.url === '/test') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Proxy is working!');
        return;
    }

    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
        console.log('Proxying to:', req.url);
        proxy.web(req, res, {
            target: req.url,
            changeOrigin: true,
        });
    } else {
        console.log('Invalid target:', req.url);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad request: Please provide a full URL');
    }
});

proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error occurred');
    }
});

server.on('connect', (req, clientSocket, head) => {
    const { port, hostname } = new URL(`https://${req.url}`);
    const serverSocket = net.connect({ port: port || 443, host: hostname, timeout: 10000 }, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
    });

    serverSocket.on('error', (err) => {
        console.error('Server socket error:', err.message);
        if (err.code === 'ETIMEDOUT') {
            clientSocket.write('HTTP/1.1 504 Gateway Timeout\r\n\r\n');
        }
        if (!clientSocket.writableEnded) clientSocket.end();
    });

    serverSocket.on('timeout', () => {
        console.error(`Connection to ${hostname}:${port} timed out`);
        serverSocket.destroy();
        clientSocket.write('HTTP/1.1 504 Gateway Timeout\r\n\r\n');
        clientSocket.end();
    });

    clientSocket.on('error', (err) => {
        console.error('Client socket error:', err.message);
        if (!serverSocket.writableEnded) serverSocket.end();
    });
});

server.listen(8080, () => {
    console.log('Proxy server is running on port 8080');
});