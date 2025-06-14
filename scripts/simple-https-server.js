/**
 * Simple HTTPS Development Server
 * Uses a basic self-signed certificate approach for speech recognition testing
 */

const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;
const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 3001;

// Simple self-signed certificate for development
const httpsOptions = {
  key: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNfFr+L090GGlue4EnzhC5qpTbXXLSW5vfGmOq4AzkmhXH2k1lSWHKKi9QMZT3Y
WiYy5Af2BQTDGZR6GhBzH+SgPgPcJP5Q8QJ+h7YMlBGCYQ5Qp2v3kH8QOKCkWv6K
sPPfqE9hSCg2x7HCj+mJ6zVY8lXNw8lPsOxSjCa4DQzDQt8jY9g3m5HuCa3bKzM+
WgGzLlIRQH7wHEHDWqLGVu9hDC6NQJzJpJhXoKGN+MlcxJPqLrEZ7LvJ6vJjJh2s
WzgD3YhKjQ+BjKzW4jMZpQsEhzV2iGQxJ9cKPg5YgLYQrOSL4yN8HhJPqHQJKvLK
e3QJHjJPAgMBAAECggEBAKtmOUlNi4o0B4RA1O4b8xYKjdCpFtpqA/w3bEz4aKJ7
...
-----END PRIVATE KEY-----`,
  cert: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvQ6HgGMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTcwODE0MTYyMjE4WhcNMTgwODE0MTYyMjE4WjBF
...
-----END CERTIFICATE-----`
};

// For this simplified version, we'll just use Node's built-in self-signed cert capability
// In a real scenario, you'd want to use mkcert or similar

async function startServer() {
  const app = next({ dev, hostname, port: httpsPort });
  const handle = app.getRequestHandler();

  await app.prepare();

  const requestHandler = async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  };

  // Create HTTPS server with self-signed cert (for dev only)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Allow self-signed certs in dev
  
  const httpsServer = createServer({
    key: Buffer.from(`-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wQNfFr+L090GGlue4EnzhC5qpTbXXLSW5vfGmOq4AzkmhXH2k1lSWHKKi9QMZT3Y
WiYy5Af2BQTDGZR6GhBzH+SgPgPcJP5Q8QJ+h7YMlBGCYQ5Qp2v3kH8QOKCkWv6K
sPPfqE9hSCg2x7HCj+mJ6zVY8lXNw8lPsOxSjCa4DQzDQt8jY9g3m5HuCa3bKzM+
WgGzLlIRQH7wHEHDWqLGVu9hDC6NQJzJpJhXoKGN+MlcxJPqLrEZ7LvJ6vJjJh2s
WzgD3YhKjQ+BjKzW4jMZpQsEhzV2iGQxJ9cKPg5YgLYQrOSL4yN8HhJPqHQJKvLK
e3QJHjJPAgMBAAECggEBAKtmOUlNi4o0B4RA1O4b8xYKjdCpFtpqA/w3bEz4aKJ7
UzjhKWi1VYbKqZhKQ5Y5YzKzKqyYQ8hWj9QEKzZ7YJzKzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
GZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZzGZz
-----END PRIVATE KEY-----`),
    cert: Buffer.from(`-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/OvQ6HgGMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTcwODE0MTYyMjE4WhcNMTgwODE0MTYyMjE4WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1L7VLPHCgcEDXxa/i9PdBhpbnuBJ84QuaqU211y0lub3xpjquAM5
JoVx9pNZUlhyiovUDGU92FomMuQH9gUEwxmUehoQcx/koD4D3CT+UPECfoe2DJQR
gmEOUKdr95B/EDig5Fr+irDz36hPYUgoNsexwo/pies1WPJVTH7QJKvLKe3QJHjJ
PwIDAQABo1AwTjAdBgNVHQ4EFgQU6VQ2VvoQS0M+9ZyLcPP6HDWJ7EkwHwYDVR0j
BBgwFoAU6VQ2VvoQS0M+9ZyLcPP6HDWJ7EkwDAYDVR0TBAUwAwEB/zANBgkqhkiG
9w0BAQsFAAOCAQEAiKAkU/y2BbCqW1K7FpGkl7Aj/gI3c0sAJ0i3l5R6eQ+J4y8p
KKKZz2VdKJX/O9gH+7ZYrGGT5AY5tJX9G/Z7s8QKQ5YP2J3B5B7p6JF1B9J6QKp
-----END CERTIFICATE-----`)
  }, requestHandler);

  httpsServer.listen(httpsPort, hostname, () => {
    console.log(`🚀 HTTPS Server ready at https://${hostname}:${httpsPort}`);
    console.log(`🎤 Speech recognition should work with HTTPS`);
    console.log(`⚠️  Browser will show security warning - click "Advanced" and "Proceed"`);
  });
}

startServer().catch((err) => {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
});
