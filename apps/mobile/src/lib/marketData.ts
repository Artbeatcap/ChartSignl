import type { MarketDataPoint, ChartInterval } from '@chartsignl/core';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// #region agent log
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:3',message:'marketData API_URL initialized',data:{apiUrl:API_URL,hasEnvVar:!!process.env.EXPO_PUBLIC_API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

// Fetch market data from our backend (which proxies to Yahoo Finance)
export async function fetchMarketData(
  symbol: string,
  interval: ChartInterval = '3mo'
): Promise<MarketDataPoint[]> {
  const url = `${API_URL}/api/market-data/${encodeURIComponent(symbol)}?interval=${interval}`;
  
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:10',message:'fetchMarketData request',data:{url,apiUrl:API_URL,symbol,interval},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  }
  // #endregion
  
  let response: Response;
  try {
    response = await fetch(url);
  } catch (fetchError) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:16',message:'fetchMarketData network error',data:{error:fetchError instanceof Error?fetchError.message:String(fetchError),url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
    // #endregion
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to fetch'}`);
  }

  if (!response.ok) {
    let error: any;
    try {
      error = await response.json();
    } catch (parseError) {
      error = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw new Error(error.error || 'Failed to fetch market data');
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('Failed to parse response');
  }

  if (!data.data) {
    throw new Error('Response missing data property');
  }

  if (!Array.isArray(data.data)) {
    throw new Error('Response data is not an array');
  }

  return data.data;
}

// Calculate EMA (Exponential Moving Average)
export function calculateEMA(data: number[], period: number): (number | undefined)[] {
  const ema: (number | undefined)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(undefined);
    } else if (i === period - 1) {
      // First EMA is SMA
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      ema.push(sum / period);
    } else {
      const prevEma = ema[i - 1] as number;
      ema.push((data[i] - prevEma) * multiplier + prevEma);
    }
  }

  return ema;
}

// Add EMAs to market data
export function addIndicators(data: MarketDataPoint[]): MarketDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  const closes = data.map((d) => d.close);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);

  const result = data.map((point, i) => ({
    ...point,
    ema9: ema9[i],
    ema21: ema21[i],
    ema50: ema50[i],
  }));
  
  return result;
}

// Format price for display
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (price >= 1) {
    return price.toFixed(2);
  } else {
    return price.toFixed(4);
  }
}

// Format volume for display
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return (volume / 1_000_000_000).toFixed(1) + 'B';
  } else if (volume >= 1_000_000) {
    return (volume / 1_000_000).toFixed(1) + 'M';
  } else if (volume >= 1_000) {
    return (volume / 1_000).toFixed(1) + 'K';
  }
  return volume.toString();
}

// Format date based on interval
export function formatChartDate(timestamp: number, interval: ChartInterval): string {
  const date = new Date(timestamp);

  if (interval === '1d' || interval === '5d') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (interval === '1mo') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}

// Calculate price change
export function calculatePriceChange(data: MarketDataPoint[]): {
  change: number;
  changePercent: number;
  isPositive: boolean;
} {
  if (data.length < 2) {
    return { change: 0, changePercent: 0, isPositive: true };
  }

  const firstClose = data[0].close;
  const lastClose = data[data.length - 1].close;
  const change = lastClose - firstClose;
  const changePercent = (change / firstClose) * 100;

  return {
    change,
    changePercent,
    isPositive: change >= 0,
  };
}
