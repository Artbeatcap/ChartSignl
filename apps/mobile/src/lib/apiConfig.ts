// Shared API configuration
// This ensures consistent API URL usage across the app
// Auto-detect local development: if running on localhost, use local backend
const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Determine API URL: env var takes precedence, then check if we're on localhost
// In production builds, EXPO_PUBLIC_API_URL should be set to https://api.chartsignl.com
// If env var is set to localhost but we're on a production domain, override it
let API_URL = process.env.EXPO_PUBLIC_API_URL || 
  (isLocalDev ? 'http://localhost:4000' : 'https://api.chartsignl.com');

// Safety check: if we're on a production domain but API_URL is localhost, override it
// This handles cases where the build was created with localhost but deployed to production
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const isProductionDomain = hostname.includes('chartsignl.com') || hostname.includes('app.chartsignl.com') || hostname.includes('www.chartsignl.com');
  const isLocalhostUrl = API_URL && (API_URL.includes('localhost') || API_URL.includes('127.0.0.1') || API_URL.startsWith('http://localhost') || API_URL.startsWith('http://127.0.0.1'));
  
  // If we're on production but API_URL is localhost, force override
  if (isProductionDomain && isLocalhostUrl) {
    console.warn('[API Config] Overriding localhost API URL for production domain:', API_URL, '-> https://api.chartsignl.com');
    console.warn('[API Config] Hostname:', hostname, 'Origin:', window.location.origin);
    API_URL = 'https://api.chartsignl.com';
  }
}

// #region agent log
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const isProductionDomain = hostname.includes('chartsignl.com') || hostname.includes('app.chartsignl.com') || hostname.includes('www.chartsignl.com');
  const wasOverridden = isProductionDomain && (process.env.EXPO_PUBLIC_API_URL?.includes('localhost') || process.env.EXPO_PUBLIC_API_URL?.includes('127.0.0.1') || API_URL.includes('localhost') || API_URL.includes('127.0.0.1'));
  fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'apiConfig.ts:30',
      message: 'API_URL determined (final)',
      data: {
        apiUrl: API_URL,
        hasEnvVar: !!process.env.EXPO_PUBLIC_API_URL,
        envValue: process.env.EXPO_PUBLIC_API_URL,
        isLocalDev,
        hostname,
        origin: window.location.origin,
        wasOverridden,
        isProductionDomain,
        protocol: window.location.protocol,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A'
    })
  }).catch(() => {});
}
// #endregion

export { API_URL };
