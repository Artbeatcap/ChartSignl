import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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

// Start server
const port = parseInt(process.env.PORT || '4000');

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
