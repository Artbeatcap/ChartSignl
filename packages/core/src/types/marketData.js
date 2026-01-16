// Market Data Types for Chart Display

export const OHLCV {
  timestamp; // Unix timestamp in ms
  date; // ISO date string
  open;
  high;
  low;
  close;
  volume;
}

export const MarketDataPoint {
  timestamp;
  date;
  open;
  high;
  low;
  close;
  volume;
  // Calculated indicators
  ema9?;
  ema21?;
  ema50?;
}

export const AILevel {
  id;
  type: 'support' | 'resistance';
  price;
  strength: 'strong' | 'medium' | 'weak';
  touches;
  description;
}

export const AITrendLine {
  id;
  type: 'uptrend' | 'downtrend';
  startPrice;
  endPrice;
  startIndex;
  endIndex;
  description;
}

export const AIChartAnalysis {
  symbol;
  timeframe;
  analyzedAt;
  
  // Current price context
  currentPrice;
  priceChange;
  priceChangePercent;
  
  // Detected levels
  supportLevels: AILevel[];
  resistanceLevels: AILevel[];
  
  // Trend analysis
  overallTrend: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  trendStrength; // 0-1
  trendLines: AITrendLine[];
  
  // Key observations
  keyObservations[];
  
  // Trading ideas (educational only)
  tradingIdeas: {
    scenario;
    entry?;
    target?;
    stop?;
    riskNote;
  }[];
}

export ChartViewType = 'line' | 'candle';

export ChartInterval = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';

export const CHART_INTERVAL_OPTIONS: { label; value: ChartInterval }[] = [
  { label: '1D', value: '1d' },
  { label: '5D', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
];
