// Enhanced Analysis Types for @chartsignl/core
// These types define the structure of the enhanced technical analysis system

// ============================================================================
// INDICATOR TYPES (from technical calculator)
// ============================================================================

export const EMAValues {
  period;
  value;
  pricePosition: 'above' | 'below';
}

export const EMAData {
  ema9;
  ema21;
  ema65;
  ema100;
  ema200;
  values: EMAValues[];
}

export const TrendState {
  direction:
    | 'strong_uptrend'
    | 'uptrend'
    | 'weak_uptrend'
    | 'ranging'
    | 'weak_downtrend'
    | 'downtrend'
    | 'strong_downtrend';
  emaAlignment:
    | 'perfectly_bullish'
    | 'mostly_bullish'
    | 'mixed'
    | 'mostly_bearish'
    | 'perfectly_bearish';
  strength;
  tradingBias: 'long' | 'neutral' | 'short';
  biasReason;
}

export const ATRData {
  atr;
  atrPercent;
  volatilityRegime: 'low' | 'medium' | 'high';
  atrMultiplier;
}

export const BollingerData {
  upperBand;
  middleBand;
  lowerBand;
  bandWidth;
  percentB;
  squeeze;
  position: 'above_upper' | 'upper_half' | 'lower_half' | 'below_lower';
}

export const OverextensionData {
  distanceFromEma21;
  distanceFromEma21Percent;
  atrNormalizedDistance;
  status: 'normal' | 'moderately_extended' | 'overextended' | 'extremely_extended';
  direction: 'above' | 'below';
  meanReversionSignal;
  signalType: 'none' | 'pullback_expected' | 'reversal_candidate' | 'strong_reversal';
}

export const FibonacciLevel {
  level;
  price;
  label;
  weight;
}

export const FibonacciData {
  swingHigh;
  swingHighDate;
  swingLow;
  swingLowDate;
  swingDirection: 'up' | 'down';
  levels: FibonacciLevel[];
  currentRetracement;
}

export const VolumeNode {
  priceRangeLow;
  priceRangeHigh;
  priceMid;
  volumePercent;
}

export const VolumeProfile {
  highVolumeNodes: VolumeNode[];
  pointOfControl;
  averageVolume;
}

// ============================================================================
// CONFLUENCE SCORING TYPES
// ============================================================================

export const ConfluenceFactors {
  historicalTouches: { count; points };
  fibonacciAlignment: { level | null; distance; points };
  emaProximity: { ema | null; distance; points };
  volumeNode: { isHighVolume; volumePercent; points };
  roundNumber: { isRound; nearestRound | null; points };
  recentRelevance: { isRecent; points };
}

export const ScoredLevel {
  id;
  price;
  type: 'support' | 'resistance';
  confluenceScore;
  strength: 'strong' | 'medium' | 'weak';
  factors: ConfluenceFactors;
  description;
  zone: {
    high;
    low;
  };
  distanceFromPrice;
  distancePercent;
}

export const ConfidenceFactor {
  name;
  impact;
  reason;
}

export const ConfidenceScoring {
  overall;
  label: 'high' | 'moderate' | 'low' | 'very_low';
  factors: ConfidenceFactor[];
}

// ============================================================================
// TECHNICAL DETAILS (for expandable section)
// ============================================================================

export const TechnicalDetailItem {
  indicator;
  value;
  status: 'bullish' | 'bearish' | 'neutral' | 'warning';
  statusLabel;
}

export const TechnicalDetails {
  summary: TechnicalDetailItem[];
  raw: {
    ema: EMAData;
    atr: ATRData;
    bollinger: BollingerData;
    overextension: OverextensionData;
    fibonacci: FibonacciData | null;
    volumeProfile: VolumeProfile;
  };
}

// ============================================================================
// TRADE IDEAS
// ============================================================================

export const TradeIdea {
  direction: 'long' | 'short';
  scenario;
  entryZone: {
    low;
    high;
  };
  target;
  stop;
  riskRewardRatio;
  confidence;
  invalidation;
}

// ============================================================================
// MAIN ANALYSIS RESPONSE
// ============================================================================

export const EnhancedAIAnalysis {
  // Metadata
  symbol;
  timeframe;
  analyzedAt;

  // Price info
  currentPrice;
  priceChange;
  priceChangePercent;

  // Confidence
  overallConfidence;
  confidenceLabel: 'high' | 'moderate' | 'low' | 'very_low';
  confidenceFactors: ConfidenceFactor[];

  // Trend
  trend: {
    direction;
    strength;
    bias: 'long' | 'neutral' | 'short';
    summary;
  };

  // Levels - default display (max 4)
  supportLevels: ScoredLevel[];
  resistanceLevels: ScoredLevel[];

  // Levels - expanded (for "show more")
  allSupportLevels: ScoredLevel[];
  allResistanceLevels: ScoredLevel[];

  // Mean reversion
  overextension: {
    status;
    signal | null;
    description;
  };

  // AI-generated content
  headline;
  summary;
  keyObservations[];

  // Trade ideas
  tradeIdeas: TradeIdea[];

  // Risk factors
  riskFactors[];

  // Technical details for expandable section
  technicalDetails: TechnicalDetails;
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export const EnhancedAnalysisResponse {
  success;
  error?;
  analysis?: EnhancedAIAnalysis;
  analysisId?;
}

