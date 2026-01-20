import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { createServer } from 'net';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Load .env file from apps/backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config(); // Fallback to default dotenv behavior
}

// Routes
import analyzeDataRoute from './routes/analyzeData.js';
import historyRoute from './routes/history.js';
import userRoute from './routes/user.js';
import marketDataRoute from './routes/marketData.js';

const app = new Hono();

// Middleware
app.use('*', logger());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'https://app.chartsignl.com',
  'https://chartsignl.com',
];

app.use('*', cors({
  origin: corsOrigins,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.route('/api/analyze-data', analyzeDataRoute);
app.route('/api/analyses', historyRoute);
app.route('/api/user', userRoute);
app.route('/api/market-data', marketDataRoute);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500);
});

// Helper function to check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Find an available port starting from the base port
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const testPort = startPort + i;
    const available = await isPortAvailable(testPort);
    if (available) {
      if (i > 0) {
        console.warn(`⚠️  Port ${startPort} is already in use, using port ${testPort} instead`);
      }
      return testPort;
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
}

// Start server
const basePort = parseInt(process.env.PORT || '4000');
const port = await findAvailablePort(basePort);

console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 ChartSignl API Server                       ║
║                                                   ║
║   Running on: http://localhost:${port}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
