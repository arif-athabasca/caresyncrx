/**
 * Development HTTPS Server for Speech Recognition
 * Creates a local HTTPS development server to enable microphone access
 */

const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;
const httpsPort = parseInt(process.env.HTTPS_PORT, 10) || 3001;

// Check if we should use HTTPS
const useHttps = process.env.USE_HTTPS === 'true' || process.argv.includes('--https');

async function createDevCertificates() {
  const certDir = path.join(__dirname, '..', '.certs');
  const keyPath = path.join(certDir, 'localhost-key.pem');
  const certPath = path.join(certDir, 'localhost-cert.pem');

  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates found');
    return { keyPath, certPath };
  }

  // Create certificates directory
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  console.log('🔧 Creating self-signed SSL certificates for development...');

  try {
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
    
    // Generate certificate
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Dev/L=Local/O=CareSyncRx/CN=localhost"`, { stdio: 'inherit' });
    
    console.log('✅ SSL certificates created successfully');
    console.log('💡 Add the certificate to your browser\'s trusted certificates for best experience');
    
    return { keyPath, certPath };
  } catch (error) {
    console.error('❌ Failed to create SSL certificates:', error.message);
    console.log('💡 Falling back to HTTP mode. Speech recognition may not work properly.');
    return null;
  }
}

async function startServer() {
  const app = next({ dev, hostname, port: useHttps ? httpsPort : port });
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

  if (useHttps) {
    const certificates = await createDevCertificates();
    
    if (certificates) {
      const { keyPath, certPath } = certificates;
      
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };

      const httpsServer = createServer(httpsOptions, requestHandler);
      
      httpsServer.listen(httpsPort, hostname, () => {
        console.log(`🚀 HTTPS Server ready at https://${hostname}:${httpsPort}`);
        console.log(`🎤 Speech recognition should work properly with HTTPS`);
        console.log(`💡 If you see certificate warnings, accept them or add the certificate to trusted roots`);
      });

      // Also start HTTP server for redirects
      const httpServer = createHttpServer((req, res) => {
        res.writeHead(301, { Location: `https://${hostname}:${httpsPort}${req.url}` });
        res.end();
      });

      httpServer.listen(port, hostname, () => {
        console.log(`🔀 HTTP redirect server ready at http://${hostname}:${port} -> https://${hostname}:${httpsPort}`);
      });
    } else {
      // Fallback to HTTP
      const httpServer = createHttpServer(requestHandler);
      httpServer.listen(port, hostname, () => {
        console.log(`🚀 HTTP Server ready at http://${hostname}:${port}`);
        console.log(`⚠️  Speech recognition may not work without HTTPS`);
      });
    }
  } else {
    const httpServer = createHttpServer(requestHandler);
    httpServer.listen(port, hostname, () => {
      console.log(`🚀 HTTP Server ready at http://${hostname}:${port}`);
      console.log(`💡 For speech recognition, run with --https flag or set USE_HTTPS=true`);
    });
  }
}

startServer().catch((err) => {
  console.error('❌ Server startup failed:', err);
  process.exit(1);
});
