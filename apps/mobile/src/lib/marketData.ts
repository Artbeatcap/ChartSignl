import type { MarketDataPoint, ChartInterval } from '@chartsignl/core';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Response type from backend with warmup metadata
interface MarketDataResponse {
  symbol: string;
  interval: string;
  resultsCount: number;
  totalBars: number;
  emaWarmupBars: number;
  visibleStartIndex: number;
  data: MarketDataPoint[];
}

// Return type for fetchMarketData
interface FetchMarketDataResult {
  data: MarketDataPoint[];
  visibleStartIndex: number;
  emaWarmupBars: number;
}

// Fetch market data from our backend (which proxies to Massive.com)
// Now returns warmup metadata for EMA calculation
export async function fetchMarketData(
  symbol: string,
  interval: ChartInterval = '3mo'
): Promise<FetchMarketDataResult> {
  const response = await fetch(
    `${API_URL}/api/market-data/${encodeURIComponent(symbol)}?interval=${interval}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
    throw new Error(error.error || 'Failed to fetch market data');
  }

  const json: MarketDataResponse = await response.json();
  
  return {
    data: json.data,
    visibleStartIndex: json.visibleStartIndex || 0,
    emaWarmupBars: json.emaWarmupBars || 0,
  };
}

// Legacy function for backwards compatibility - returns just the data array
export async function fetchMarketDataLegacy(
  symbol: string,
  interval: ChartInterval = '3mo'
): Promise<MarketDataPoint[]> {
  const result = await fetchMarketData(symbol, interval);
  return result.data;
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

// Add EMAs to market data (original function - keeps all data including warmup)
export function addIndicators(data: MarketDataPoint[]): MarketDataPoint[] {
  const closes = data.map((d) => d.close);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);

  return data.map((point, i) => ({
    ...point,
    ema9: ema9[i],
    ema21: ema21[i],
    ema50: ema50[i],
  }));
}

// Add EMAs to market data AND trim warmup period
// This ensures EMAs are calculated with historical data but only visible range is returned
// The EMAs will have values from the first visible bar instead of starting with undefined
export function addIndicatorsAndTrim(
  data: MarketDataPoint[],
  visibleStartIndex: number
): MarketDataPoint[] {
  if (data.length === 0) return [];
  
  const closes = data.map((d) => d.close);

  // Calculate EMAs on the FULL dataset (including warmup)
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);

  // Add indicators to all data points
  const dataWithIndicators = data.map((point, i) => ({
    ...point,
    ema9: ema9[i],
    ema21: ema21[i],
    ema50: ema50[i],
  }));

  // Trim warmup data - only return visible range
  // Now the first visible bar will have EMA values (not undefined)
  return dataWithIndicators.slice(visibleStartIndex);
}

// Convenience function that fetches data and adds indicators in one call
export async function fetchMarketDataWithIndicators(
  symbol: string,
  interval: ChartInterval = '3mo'
): Promise<MarketDataPoint[]> {
  const { data, visibleStartIndex } = await fetchMarketData(symbol, interval);
  return addIndicatorsAndTrim(data, visibleStartIndex);
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
