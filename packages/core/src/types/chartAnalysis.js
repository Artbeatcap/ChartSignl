// Chart Analysis Domain Types
// These define the contract between OpenAI Vision output and the app

export TrendType = 'uptrend' | 'downtrend' | 'range' | 'mixed';
export TimeframeType = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | 'D' | 'W' | 'M' | null;
export LevelRole = 'support' | 'resistance' | 'demand_zone' | 'supply_zone';
export StrengthLevel = 'strong' | 'medium' | 'weak';

export const ImageRegion {
  x0; // 0-1 normalized
  y0; // 0-1 normalized
  x1; // 0-1 normalized
  y1; // 0-1 normalized
}

export const ChartLevel {
  id;
  role: LevelRole;
  label;
  approxPrice | null;
  strength: StrengthLevel;
  confidence; // 0-1
  touchCount;
  isRecent;
  reasonTags: ReasonTag[];
  imageRegion: ImageRegion;
}

export ReasonTag =
  | 'multiple_touches'
  | 'gap_edge'
  | 'prior_high'
  | 'prior_low'
  | 'pre_market_level'
  | 'round_number'
  | 'volume_cluster'
  | 'swing_point'
  | 'moving_average'
  | 'fibonacci_level';

export PatternType =
  | 'flag'
  | 'pennant'
  | 'triangle'
  | 'wedge'
  | 'channel'
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'cup_and_handle'
  | 'ascending_triangle'
  | 'descending_triangle';

export PatternBias = 'bullish' | 'bearish' | 'neutral';

export const ChartPattern {
  id;
  type: PatternType;
  bias: PatternBias;
  confidence; // 0-1
  imageRegion: ImageRegion;
  notes;
}

export BreakoutDirection = 'breakout' | 'breakdown';

export const BreakoutZone {
  id;
  direction: BreakoutDirection;
  approxPrice | null;
  confidence; // 0-1
  imageRegion: ImageRegion;
  notes;
}

export const TrendInfo {
  type: TrendType;
  confidence; // 0-1
  notes;
}

export const ChartMeta {
  symbol | null;
  timeframe: TimeframeType;
  trend: TrendInfo;
}

export const TradingIdea {
  idea;
  riskNote;
}

export const ChartSummary {
  headline;
  keyLevelsCommentary[];
  tradingIdeas: TradingIdea[];
}

// Markup Instructions for Frontend Rendering
export LineStyle = 'solid' | 'dashed' | 'dotted';
export LineThickness = 'thin' | 'normal' | 'thick';
export ColorRole =
  | 'support_strong'
  | 'support_medium'
  | 'support_weak'
  | 'resistance_strong'
  | 'resistance_medium'
  | 'resistance_weak'
  | 'breakout'
  | 'breakdown'
  | 'pattern';

export const MarkupLine {
  sourceId;
  role: LevelRole;
  style: LineStyle;
  thickness: LineThickness;
  colorRole: ColorRole;
  imageY; // 0-1 normalized
}

export const MarkupLabel {
  sourceId;
  text;
  anchor: {
    x; // 0-1
    y; // 0-1
  };
}

export HighlightStyle = 'box' | 'halo' | 'gradient';

export const MarkupHighlight {
  sourceId;
  style: HighlightStyle;
  imageRegion: ImageRegion;
}

export const MarkupInstructions {
  lines: MarkupLine[];
  labels: MarkupLabel[];
  highlights: MarkupHighlight[];
}

// The main analysis object returned by the API
export const ChartAnalysis {
  meta: ChartMeta;
  levels: ChartLevel[];
  patterns: ChartPattern[];
  breakoutZones: BreakoutZone[];
  markupInstructions: MarkupInstructions;
  summary: ChartSummary;
}

// API Response wrapper
export const AnalysisResponse {
  success;
  data?: ChartAnalysis;
  analysisId?;
  error?;
}

// Analysis history item
export const AnalysisHistoryItem {
  id;
  createdAt;
  symbol | null;
  timeframe: TimeframeType;
  headline;
}
