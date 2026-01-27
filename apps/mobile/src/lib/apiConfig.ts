// Shared API configuration
// This ensures consistent API URL usage across the app
// Auto-detect local development: if running on localhost, use local backend
const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 
  (isLocalDev ? 'http://localhost:4000' : 'https://api.chartsignl.com');
