import type { MarketDataPoint, ChartInterval } from '@chartsignl/core';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Fetch market data from our backend (which proxies to Yahoo Finance)
export async function fetchMarketData(
  symbol: string,
  interval: ChartInterval = '3mo'
): Promise<MarketDataPoint[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:9',message:'fetchMarketData entry',data:{symbol,interval,apiUrl:API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const url = `${API_URL}/api/market-data/${encodeURIComponent(symbol)}?interval=${interval}`;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:12',message:'fetchMarketData before request',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const response = await fetch(url);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:15',message:'fetchMarketData response received',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:18',message:'fetchMarketData error response',data:{status:response.status,error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw new Error(error.error || 'Failed to fetch market data');
  }

  const data = await response.json();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:22',message:'fetchMarketData response parsed',data:{hasData:!!data.data,dataLength:data.data?.length,dataKeys:Object.keys(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:23',message:'fetchMarketData exit',data:{returnLength:data.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:47',message:'addIndicators entry',data:{dataLength:data.length,firstPoint:data[0]?{timestamp:data[0].timestamp,close:data[0].close}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  const closes = data.map((d) => d.close);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:50',message:'addIndicators closes extracted',data:{closesLength:closes.length,firstClose:closes[0],hasNaN:closes.some(c=>isNaN(c))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:54',message:'addIndicators EMAs calculated',data:{ema9Length:ema9.length,ema21Length:ema21.length,ema50Length:ema50.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  const result = data.map((point, i) => ({
    ...point,
    ema9: ema9[i],
    ema21: ema21[i],
    ema50: ema50[i],
  }));
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'marketData.ts:61',message:'addIndicators exit',data:{resultLength:result.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
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
