import http from 'http';
import net from 'net';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
	console.log(req.url);
	proxy.web(req, res, {
		target: req.url,
		changeOrigin: true,
	});
});

server.on('connect', (req, clientSocket, head) => {
	// Extract the destination host and port from the request
	const { port, hostname } = new URL(`https://${req.url}`);
 
	// Establish a connection to the destination server
	const serverSocket = net.connect(port || 443, hostname, () => {
	  // Inform the client that the connection is established
	  clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
	  // Pipe data between the client and the server
	  serverSocket.write(head);
	  serverSocket.pipe(clientSocket);
	  clientSocket.pipe(serverSocket);
	});
 
	// Handle errors
	serverSocket.on('error', (err) => {
	  console.error('Server socket error:', err);
	  clientSocket.end();
	});
 
	clientSocket.on('error', (err) => {
	  console.error('Client socket error:', err);
	  serverSocket.end();
	});
 });
 
 // Start the server
 server.listen(38945, () => {
	console.log('Proxy server is running on port 38945');
 });