// Enhanced Analysis Route
// Uses server-side technical calculations + AI interpretation

import { Hono } from 'hono';
import OpenAI from 'openai';
import { supabaseAdmin, getUserFromToken } from '../lib/supabase';
import { FREE_ANALYSIS_LIMIT } from '@chartsignl/core';

// Import our new modules
import {
  calculateAllIndicators,
  type MarketDataPoint,
  type TechnicalIndicators,
} from '../lib/technicalCalculator';

import {
  scoreLevels,
  getExpandedLevels,
  type ScoredAnalysis,
  type ScoredLevel,
} from '../lib/confluenceScorer';

import type {
  EnhancedAIAnalysis,
  TechnicalDetails,
  TechnicalDetailItem,
  TradeIdea,
} from '@chartsignl/core';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeDataRoute = new Hono();

// ============================================================================
// AI PROMPT TEMPLATES
// ============================================================================

const SYSTEM_PROMPT = `You are a technical analysis expert for ChartSignl. You receive pre-calculated technical indicators and scored support/resistance levels. Your job is to:

1. INTERPRET the data - explain what it means in plain English
2. SYNTHESIZE - connect the indicators to form a cohesive market view
3. IDENTIFY the highest-probability trade setups based on the scored levels
4. PROVIDE context using the pre-calculated entry/exit zones

IMPORTANT: You are NOT calculating indicators - they are provided. Focus on interpretation and actionable insights.

Rules:
- Be concise and actionable
- Lead with the most important insight
- Always include risk context
- Use the provided zones and levels, don't make up new numbers
- Reference specific indicator values to support your analysis
- If signals conflict, acknowledge the uncertainty
- Keep the headline under 15 words
- Keep observations to 3-5 bullet points max

Return your analysis as JSON with this exact structure:
{
  "headline": "One sentence summary",
  "summary": "2-3 sentence market overview",
  "keyObservations": ["observation 1", "observation 2", "observation 3"],
  "tradeIdeas": [
    {
      "direction": "long" or "short",
      "scenario": "Description of the trade setup",
      "confidence": 0-100,
      "invalidation": "What would make this setup invalid"
    }
  ],
  "riskFactors": ["risk 1", "risk 2"]
}

Return ONLY valid JSON, no other text.`;

function buildUserPrompt(
  symbol: string,
  timeframe: string,
  indicators: TechnicalIndicators,
  scoredAnalysis: ScoredAnalysis
): string {
  const { currentPrice, priceChangePercent, trend, ema, atr, bollinger, overextension, fibonacci } =
    indicators;

  const { supportLevels, resistanceLevels, confidence } = scoredAnalysis;

  // Format top levels for the prompt
  const topSupport = supportLevels.slice(0, 3);
  const topResistance = resistanceLevels.slice(0, 3);

  return `Analyze ${symbol} on the ${timeframe} timeframe.

## CURRENT STATE
- Price: $${currentPrice.toFixed(2)}
- Period Change: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%

## TREND ANALYSIS
- Direction: ${trend.direction}
- Strength: ${trend.strength}/100
- Trading Bias: ${trend.tradingBias}
- Reason: ${trend.biasReason}
- EMA Alignment: ${trend.emaAlignment}

## KEY MOVING AVERAGES
- EMA 9: $${ema.ema9.toFixed(2)} (price ${ema.values.find((v) => v.period === 9)?.pricePosition})
- EMA 21: $${ema.ema21.toFixed(2)} (price ${ema.values.find((v) => v.period === 21)?.pricePosition})
- EMA 200: $${ema.ema200.toFixed(2)} (price ${ema.values.find((v) => v.period === 200)?.pricePosition})

## VOLATILITY
- ATR(10): $${atr.atr.toFixed(2)} (${atr.atrPercent.toFixed(2)}% of price)
- Regime: ${atr.volatilityRegime}

## BOLLINGER BANDS
- Upper: $${bollinger.upperBand.toFixed(2)}
- Middle: $${bollinger.middleBand.toFixed(2)}
- Lower: $${bollinger.lowerBand.toFixed(2)}
- %B: ${(bollinger.percentB * 100).toFixed(1)}%
- Squeeze: ${bollinger.squeeze ? 'YES - low volatility, breakout pending' : 'No'}

## EXTENSION STATUS
- Distance from 21 EMA: ${overextension.distanceFromEma21Percent >= 0 ? '+' : ''}${overextension.distanceFromEma21Percent.toFixed(2)}%
- ATR-Normalized: ${overextension.atrNormalizedDistance.toFixed(2)}
- Status: ${overextension.status}
- Signal: ${overextension.signalType}

${
  fibonacci
    ? `## FIBONACCI LEVELS
- Swing: $${fibonacci.swingLow.toFixed(2)} to $${fibonacci.swingHigh.toFixed(2)} (${fibonacci.swingDirection} move)
- Current Retracement: ${(fibonacci.currentRetracement * 100).toFixed(1)}%
- Key Fib Levels: ${fibonacci.levels.map((l) => `${l.label}: $${l.price.toFixed(2)}`).join(', ')}`
    : '## FIBONACCI: Not calculated (timeframe too short)'
}

## TOP SUPPORT LEVELS (scored by confluence)
${topSupport
  .map(
    (l, i) =>
      `${i + 1}. $${l.price.toFixed(2)} - Score: ${l.confluenceScore}/100 (${l.strength})
   Zone: $${l.zone.low.toFixed(2)} - $${l.zone.high.toFixed(2)}
   ${l.description}`
  )
  .join('\n')}

## TOP RESISTANCE LEVELS (scored by confluence)
${topResistance
  .map(
    (l, i) =>
      `${i + 1}. $${l.price.toFixed(2)} - Score: ${l.confluenceScore}/100 (${l.strength})
   Zone: $${l.zone.low.toFixed(2)} - $${l.zone.high.toFixed(2)}
   ${l.description}`
  )
  .join('\n')}

## OVERALL ANALYSIS CONFIDENCE: ${confidence.overall}% (${confidence.label})
Factors: ${confidence.factors.map((f) => `${f.name}: ${f.impact > 0 ? '+' : ''}${f.impact}`).join(', ')}

Based on this data, provide your analysis as JSON.`;
}

// ============================================================================
// TECHNICAL DETAILS BUILDER
// ============================================================================

function buildTechnicalDetails(indicators: TechnicalIndicators): TechnicalDetails {
  const { ema, atr, bollinger, overextension, fibonacci, volumeProfile, currentPrice } = indicators;

  const summary: TechnicalDetailItem[] = [];

  // Trend
  const trendStatus =
    indicators.trend.tradingBias === 'long'
      ? 'bullish'
      : indicators.trend.tradingBias === 'short'
      ? 'bearish'
      : 'neutral';
  summary.push({
    indicator: 'Trend',
    value: indicators.trend.direction.replace(/_/g, ' '),
    status: trendStatus,
    statusLabel: indicators.trend.tradingBias === 'long' ? '🟢 Bullish' : indicators.trend.tradingBias === 'short' ? '🔴 Bearish' : '🟡 Neutral',
  });

  // EMA 21
  const ema21Status = currentPrice > ema.ema21 ? 'bullish' : 'bearish';
  summary.push({
    indicator: 'EMA 21',
    value: `$${ema.ema21.toFixed(2)}`,
    status: ema21Status,
    statusLabel: currentPrice > ema.ema21 ? '🟢 Price above' : '🔴 Price below',
  });

  // EMA 200
  const ema200Status = currentPrice > ema.ema200 ? 'bullish' : 'bearish';
  summary.push({
    indicator: 'EMA 200',
    value: `$${ema.ema200.toFixed(2)}`,
    status: ema200Status,
    statusLabel: currentPrice > ema.ema200 ? '🟢 Price above' : '🔴 Price below',
  });

  // ATR
  const atrStatus = atr.volatilityRegime === 'high' ? 'warning' : 'neutral';
  summary.push({
    indicator: 'ATR (10)',
    value: `$${atr.atr.toFixed(2)} (${atr.atrPercent.toFixed(1)}%)`,
    status: atrStatus,
    statusLabel:
      atr.volatilityRegime === 'low'
        ? '🟢 Low volatility'
        : atr.volatilityRegime === 'high'
        ? '🟡 High volatility'
        : '⚪ Medium volatility',
  });

  // Bollinger
  const bbStatus = bollinger.squeeze ? 'warning' : 'neutral';
  summary.push({
    indicator: 'Bollinger',
    value: `${(bollinger.percentB * 100).toFixed(0)}% B`,
    status: bbStatus,
    statusLabel: bollinger.squeeze
      ? '🟡 Squeeze'
      : bollinger.position === 'upper_half'
      ? '🟢 Upper half'
      : bollinger.position === 'lower_half'
      ? '🔴 Lower half'
      : '⚪ Mid-range',
  });

  // Extension
  const extStatus =
    overextension.status === 'normal'
      ? 'neutral'
      : overextension.status === 'moderately_extended'
      ? 'warning'
      : 'bearish';
  summary.push({
    indicator: 'Extension',
    value: `${overextension.distanceFromEma21Percent >= 0 ? '+' : ''}${overextension.distanceFromEma21Percent.toFixed(1)}% from 21 EMA`,
    status: extStatus,
    statusLabel:
      overextension.status === 'normal'
        ? '🟢 Normal'
        : overextension.status === 'moderately_extended'
        ? '🟡 Extended'
        : '🔴 Overextended',
  });

  return {
    summary,
    raw: {
      ema,
      atr,
      bollinger,
      overextension,
      fibonacci,
      volumeProfile,
    },
  };
}

// ============================================================================
// TRADE IDEAS BUILDER
// ============================================================================

function buildTradeIdeas(
  indicators: TechnicalIndicators,
  scoredAnalysis: ScoredAnalysis,
  aiTradeIdeas: any[]
): TradeIdea[] {
  const { currentPrice, atr, trend } = indicators;
  const { displayLevels, confidence } = scoredAnalysis;

  const tradeIdeas: TradeIdea[] = [];

  // Get the closest support and resistance
  const primarySupport = displayLevels.support[0];
  const primaryResistance = displayLevels.resistance[0];

  // Build trade ideas based on trend and levels
  if (trend.tradingBias === 'long' && primarySupport) {
    const entryZone = primarySupport.zone;
    const target = primaryResistance?.price || currentPrice * 1.05;
    const stop = entryZone.low - atr.atr * 0.5;
    const risk = entryZone.high - stop;
    const reward = target - entryZone.high;
    const rrRatio = risk > 0 ? reward / risk : 0;

    tradeIdeas.push({
      direction: 'long',
      scenario: aiTradeIdeas[0]?.scenario || `Buy pullback to $${primarySupport.price.toFixed(2)} support`,
      entryZone: {
        low: Math.round(entryZone.low * 100) / 100,
        high: Math.round(entryZone.high * 100) / 100,
      },
      target: Math.round(target * 100) / 100,
      stop: Math.round(stop * 100) / 100,
      riskRewardRatio: Math.round(rrRatio * 10) / 10,
      confidence: aiTradeIdeas[0]?.confidence || confidence.overall,
      invalidation: aiTradeIdeas[0]?.invalidation || `Daily close below $${stop.toFixed(2)}`,
    });
  }

  if (trend.tradingBias === 'short' && primaryResistance) {
    const entryZone = primaryResistance.zone;
    const target = primarySupport?.price || currentPrice * 0.95;
    const stop = entryZone.high + atr.atr * 0.5;
    const risk = stop - entryZone.low;
    const reward = entryZone.low - target;
    const rrRatio = risk > 0 ? reward / risk : 0;

    tradeIdeas.push({
      direction: 'short',
      scenario: aiTradeIdeas[0]?.scenario || `Sell rally to $${primaryResistance.price.toFixed(2)} resistance`,
      entryZone: {
        low: Math.round(entryZone.low * 100) / 100,
        high: Math.round(entryZone.high * 100) / 100,
      },
      target: Math.round(target * 100) / 100,
      stop: Math.round(stop * 100) / 100,
      riskRewardRatio: Math.round(rrRatio * 10) / 10,
      confidence: aiTradeIdeas[0]?.confidence || confidence.overall,
      invalidation: aiTradeIdeas[0]?.invalidation || `Daily close above $${stop.toFixed(2)}`,
    });
  }

  // If neutral, provide both directions
  if (trend.tradingBias === 'neutral' && primarySupport && primaryResistance) {
    tradeIdeas.push({
      direction: 'long',
      scenario: `Range trade: Buy at $${primarySupport.price.toFixed(2)} support`,
      entryZone: primarySupport.zone,
      target: primaryResistance.price,
      stop: primarySupport.zone.low - atr.atr * 0.5,
      riskRewardRatio: 2,
      confidence: confidence.overall - 10,
      invalidation: `Break below $${primarySupport.zone.low.toFixed(2)}`,
    });

    tradeIdeas.push({
      direction: 'short',
      scenario: `Range trade: Sell at $${primaryResistance.price.toFixed(2)} resistance`,
      entryZone: primaryResistance.zone,
      target: primarySupport.price,
      stop: primaryResistance.zone.high + atr.atr * 0.5,
      riskRewardRatio: 2,
      confidence: confidence.overall - 10,
      invalidation: `Break above $${primaryResistance.zone.high.toFixed(2)}`,
    });
  }

  return tradeIdeas;
}

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

analyzeDataRoute.post('/', async (c) => {
  try {
    // Auth check
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing authorization token' }, 401);
    }

    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);

    if (!userId) {
      return c.json({ success: false, error: 'Invalid authorization token' }, 401);
    }

    // Usage check
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .single();

    const { data: usage } = await supabaseAdmin
      .from('usage_counters')
      .select('free_analyses_used')
      .eq('user_id', userId)
      .single();

    const canAnalyze = profile?.is_pro || (usage?.free_analyses_used || 0) < FREE_ANALYSIS_LIMIT;
    if (!canAnalyze) {
      return c.json({ success: false, error: 'Free analysis limit reached' }, 403);
    }

    // Get request body
    const body = await c.req.json();
    const { symbol, interval, data } = body as {
      symbol: string;
      interval: string;
      data: MarketDataPoint[];
    };

    if (!data || data.length < 20) {
      return c.json({ success: false, error: 'Insufficient data for analysis (need at least 20 bars)' }, 400);
    }

    console.log(`[Analysis] Starting enhanced analysis for ${symbol} (${interval}), ${data.length} bars`);

    // ========================================================================
    // STEP 1: Calculate all technical indicators
    // ========================================================================
    const indicators = calculateAllIndicators(data, symbol, interval);

    if (!indicators) {
      return c.json({ success: false, error: 'Failed to calculate technical indicators' }, 500);
    }

    console.log(`[Analysis] Indicators calculated:`, {
      trend: indicators.trend.direction,
      atr: indicators.atr.atr.toFixed(2),
      swingPoints: indicators.swingPoints.length,
    });

    // ========================================================================
    // STEP 2: Score and select support/resistance levels
    // ========================================================================
    const scoredAnalysis = scoreLevels(indicators);

    console.log(`[Analysis] Levels scored:`, {
      support: scoredAnalysis.supportLevels.length,
      resistance: scoredAnalysis.resistanceLevels.length,
      confidence: scoredAnalysis.confidence.overall,
    });

    // ========================================================================
    // STEP 3: Call OpenAI for interpretation
    // ========================================================================
    let aiResponse: {
      headline: string;
      summary: string;
      keyObservations: string[];
      tradeIdeas: any[];
      riskFactors: string[];
    } = {
      headline: '',
      summary: '',
      keyObservations: [],
      tradeIdeas: [],
      riskFactors: [],
    };

    try {
      const userPrompt = buildUserPrompt(symbol, interval, indicators, scoredAnalysis);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Using GPT-4o for better interpretation
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;

      if (content) {
        // Parse JSON response
        let cleaned = content.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

        try {
          aiResponse = JSON.parse(cleaned.trim());
        } catch (parseError) {
          console.error('[Analysis] Failed to parse AI response:', content);
          // Continue with defaults
        }
      }
    } catch (aiError) {
      console.error('[Analysis] OpenAI error:', aiError);
      // Continue with defaults - we still have the calculated data
    }

    // ========================================================================
    // STEP 4: Build the final response
    // ========================================================================
    const technicalDetails = buildTechnicalDetails(indicators);
    const tradeIdeas = buildTradeIdeas(indicators, scoredAnalysis, aiResponse.tradeIdeas || []);
    const expandedLevels = getExpandedLevels(scoredAnalysis, indicators.currentPrice);

    // Build overextension description
    let overextensionDescription = '';
    if (indicators.overextension.status === 'normal') {
      overextensionDescription = 'Price is within normal range of the 21 EMA.';
    } else if (indicators.overextension.status === 'moderately_extended') {
      overextensionDescription = `Price is moderately extended ${indicators.overextension.direction} the 21 EMA. A pullback may be healthy.`;
    } else if (indicators.overextension.status === 'overextended') {
      overextensionDescription = `Price is overextended ${indicators.overextension.direction} the 21 EMA. Mean reversion is likely.`;
    } else {
      overextensionDescription = `Price is extremely extended ${indicators.overextension.direction} the 21 EMA. High probability of reversal.`;
    }

    const analysis: EnhancedAIAnalysis = {
      symbol,
      timeframe: interval,
      analyzedAt: new Date().toISOString(),

      currentPrice: indicators.currentPrice,
      priceChange: indicators.priceChange,
      priceChangePercent: indicators.priceChangePercent,

      overallConfidence: scoredAnalysis.confidence.overall,
      confidenceLabel: scoredAnalysis.confidence.label,
      confidenceFactors: scoredAnalysis.confidence.factors,

      trend: {
        direction: indicators.trend.direction,
        strength: indicators.trend.strength,
        bias: indicators.trend.tradingBias,
        summary: indicators.trend.biasReason,
      },

      supportLevels: scoredAnalysis.displayLevels.support,
      resistanceLevels: scoredAnalysis.displayLevels.resistance,
      allSupportLevels: expandedLevels.support,
      allResistanceLevels: expandedLevels.resistance,

      overextension: {
        status: indicators.overextension.status,
        signal: indicators.overextension.signalType === 'none' ? null : indicators.overextension.signalType,
        description: overextensionDescription,
      },

      headline: aiResponse.headline || `${symbol} in ${indicators.trend.direction.replace(/_/g, ' ')}`,
      summary: aiResponse.summary || indicators.trend.biasReason,
      keyObservations: aiResponse.keyObservations || [],

      tradeIdeas,
      riskFactors: aiResponse.riskFactors || [],

      technicalDetails,
    };

    // ========================================================================
    // STEP 5: Update usage counter
    // ========================================================================
    if (!profile?.is_pro) {
      await supabaseAdmin
        .from('usage_counters')
        .update({
          free_analyses_used: (usage?.free_analyses_used || 0) + 1,
          last_analysis_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    console.log(`[Analysis] Complete for ${symbol}:`, {
      confidence: analysis.overallConfidence,
      supportLevels: analysis.supportLevels.length,
      resistanceLevels: analysis.resistanceLevels.length,
    });

    return c.json({ success: true, analysis });
  } catch (error) {
    console.error('[Analysis] Error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      500
    );
  }
});

export default analyzeDataRoute;
