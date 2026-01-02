import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import Svg, { Rect, Line as SvgLine, G, Path } from 'react-native-svg';
import type { MarketDataPoint, AILevel, ChartViewType, ChartInterval } from '@chartsignl/core';
import { CHART_COLORS } from '@chartsignl/core';
import { formatPrice, formatVolume } from '../lib/marketData';
import { colors, typography, spacing, borderRadius } from '../theme';

interface StockChartProps {
  data: MarketDataPoint[];
  symbol: string;
  interval: ChartInterval;
  viewType: ChartViewType;
  showEMA?: boolean;
  showVolume?: boolean;
  supportLevels?: AILevel[];
  resistanceLevels?: AILevel[];
  height?: number;
}

// Improved date formatting functions
function formatChartDate(timestamp: number, interval: ChartInterval, index?: number): string {
  const date = new Date(timestamp);
  
  // For 1 day intraday, show time only
  if (interval === '1d') {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  
  // For 5 days, we need context of previous tick to decide date vs time
  // This will be handled by a special formatter function
  if (interval === '5d') {
    // Default fallback (will be overridden by smart formatter)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  // For 1 month, show date without year (but only show every few labels to avoid crowding)
  if (interval === '1mo') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  // For 3 months, 6 months, 1 year - show month and day for better clarity
  if (interval === '3mo' || interval === '6mo' || interval === '1y') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  // For 2 years and 5 years, show month and year
  if (interval === '2y' || interval === '5y') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
  }
  
  // Default: show month and day
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTooltipDate(timestamp: number, interval: ChartInterval): string {
  const date = new Date(timestamp);
  
  // For intraday, show date and time
  if (interval === '1d' || interval === '5d') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  
  // For everything else, show full date
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Smart formatter for 5D that shows dates at day changes and times in between
function format5DLabel(timestamp: number, data: MarketDataPoint[], tickIndex: number, allTicks: number[]): string {
  const currentDate = new Date(timestamp);
  const currentDay = currentDate.toDateString();
  
  // Check if this is the first tick or if we've moved to a new day
  if (tickIndex === 0) {
    // First tick - always show date
    return currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  // Get the previous tick's date
  const prevTickTimestamp = allTicks[tickIndex - 1];
  const prevDate = new Date(prevTickTimestamp);
  const prevDay = prevDate.toDateString();
  
  if (currentDay !== prevDay) {
    // New day - show date
    return currentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } else {
    // Same day - show time only
    return currentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}

function getTickCount(interval: ChartInterval, dataLength: number): number {
  if (interval === '1d') return Math.min(6, dataLength);
  if (interval === '5d') return Math.min(10, dataLength); // Increased to show more date+time combinations
  if (interval === '1mo') return Math.min(10, dataLength); // ~3 per week
  if (interval === '3mo') return Math.min(10, dataLength); // Increased from 6
  if (interval === '6mo') return Math.min(10, dataLength); // Increased from 6
  if (interval === '1y') return Math.min(12, dataLength); // Increased from 6
  if (interval === '2y') return Math.min(10, dataLength);
  if (interval === '5y') return Math.min(10, dataLength);
  return 8;
}

function getXAxisTicks(data: MarketDataPoint[], tickCount: number): number[] {
  if (data.length === 0) return [];
  if (data.length <= tickCount) return data.map(d => d.timestamp);
  
  const ticks: number[] = [];
  const interval = Math.floor(data.length / (tickCount - 1));
  
  for (let i = 0; i < tickCount - 1; i++) {
    const index = i * interval;
    if (index < data.length) {
      ticks.push(data[index].timestamp);
    }
  }
  
  // Always include the last data point
  ticks.push(data[data.length - 1].timestamp);
  
  return ticks;
}

// Get tick indices for categorical axis (to avoid weekend gaps)
function getCategoricalTicks(dataLength: number, tickCount: number): number[] {
  if (dataLength === 0) return [];
  if (dataLength <= tickCount) return Array.from({ length: dataLength }, (_, i) => i);
  
  const ticks: number[] = [];
  const interval = Math.floor(dataLength / (tickCount - 1));
  
  for (let i = 0; i < tickCount - 1; i++) {
    const index = i * interval;
    if (index < dataLength) {
      ticks.push(index);
    }
  }
  
  // Always include the last index
  ticks.push(dataLength - 1);
  
  return ticks;
}

// Check if we should use categorical axis (to avoid weekend/after-hours gaps)
function shouldUseCategoricalAxis(interval: ChartInterval): boolean {
  return interval === '1d' || interval === '5d' || interval === '1mo';
}

export function StockChart({
  data,
  symbol,
  interval,
  viewType,
  showEMA = true,
  showVolume = true,
  supportLevels = [],
  resistanceLevels = [],
  height = 300,
}: StockChartProps) {
  // Calculate domain for Y axis
  const { minPrice, maxPrice } = useMemo(() => {
    if (data.length === 0) return { minPrice: 0, maxPrice: 100 };

    const allPrices = data.flatMap((d) => [d.high, d.low]);
    const levelPrices = [...supportLevels, ...resistanceLevels].map((l) => l.price);
    const allValues = [...allPrices, ...levelPrices];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.05;

    return {
      minPrice: min - padding,
      maxPrice: max + padding,
    };
  }, [data, supportLevels, resistanceLevels]);

  // Determine axis type and ticks
  const useCategorical = shouldUseCategoricalAxis(interval);
  const tickCount = getTickCount(interval, data.length);
  
  const xAxisConfig = useMemo(() => {
    if (useCategorical) {
      // Categorical axis - use array indices to avoid gaps
      const ticks = getCategoricalTicks(data.length, tickCount);
      
      // Special formatter for 5D to show dates and times
      if (interval === '5d') {
        return {
          dataKey: 'index' as const,
          type: 'category' as const,
          ticks,
          tickFormatter: (index: number) => {
            const point = data[index];
            if (!point) return '';
            
            const tickIndex = ticks.indexOf(index);
            const tickTimestamps = ticks.map(i => data[i]?.timestamp).filter(Boolean);
            return format5DLabel(point.timestamp, data, tickIndex, tickTimestamps);
          },
        };
      }
      
      return {
        dataKey: 'index' as const,
        type: 'category' as const,
        ticks,
        tickFormatter: (index: number) => {
          const point = data[index];
          return point ? formatChartDate(point.timestamp, interval, index) : '';
        },
      };
    } else {
      // Continuous time axis
      const ticks = getXAxisTicks(data, tickCount);
      return {
        dataKey: 'timestamp' as const,
        type: 'number' as const,
        ticks,
        tickFormatter: (timestamp: number) => formatChartDate(timestamp, interval),
      };
    }
  }, [data, interval, tickCount, useCategorical]);

  // Add index to data for categorical axis
  const chartData = useMemo(() => {
    return data.map((point, index) => ({
      ...point,
      index,
    }));
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload as MarketDataPoint;

    return (
      <View style={styles.tooltip}>
        <Text style={styles.tooltipDate}>
          {formatTooltipDate(point.timestamp, interval)}
        </Text>
        {viewType === 'candle' ? (
          <>
            <TooltipRow label="Open" value={formatPrice(point.open)} />
            <TooltipRow label="High" value={formatPrice(point.high)} />
            <TooltipRow label="Low" value={formatPrice(point.low)} />
            <TooltipRow 
              label="Close" 
              value={formatPrice(point.close)}
              color={point.close >= point.open ? CHART_COLORS.candleUp : CHART_COLORS.candleDown}
            />
          </>
        ) : (
          <TooltipRow label="Price" value={formatPrice(point.close)} />
        )}
        <TooltipRow label="Volume" value={formatVolume(point.volume)} />
        {point.ema9 && showEMA && (
          <TooltipRow label="EMA 9" value={formatPrice(point.ema9)} color={CHART_COLORS.ema9} />
        )}
        {point.ema21 && showEMA && (
          <TooltipRow label="EMA 21" value={formatPrice(point.ema21)} color={CHART_COLORS.ema21} />
        )}
      </View>
    );
  };

  // Render candlestick chart (works on both native and web via react-native-svg)
  if (viewType === 'candle') {
    return (
      <View style={[styles.container, { height }]}>
        <SimpleCandlestickChart
          data={data}
          interval={interval}
          minPrice={minPrice}
          maxPrice={maxPrice}
          height={height - 40}
          showEMA={showEMA}
          supportLevels={supportLevels}
          resistanceLevels={resistanceLevels}
        />
        <View style={styles.legend}>
          <LegendItem color={CHART_COLORS.candleUp} label="Up" />
          <LegendItem color={CHART_COLORS.candleDown} label="Down" />
          {showEMA && (
            <>
              <LegendItem color={CHART_COLORS.ema9} label="EMA 9" />
              <LegendItem color={CHART_COLORS.ema21} label="EMA 21" />
            </>
          )}
          {supportLevels.length > 0 && <LegendItem color={CHART_COLORS.support} label="Support" />}
          {resistanceLevels.length > 0 && (
            <LegendItem color={CHART_COLORS.resistance} label="Resistance" />
          )}
        </View>
      </View>
    );
  }

  // Line chart with Recharts
  return (
    <View style={[styles.container, { height }]}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />

          <XAxis
            dataKey={xAxisConfig.dataKey}
            type={xAxisConfig.type}
            domain={xAxisConfig.type === 'number' ? ['dataMin', 'dataMax'] : undefined}
            ticks={xAxisConfig.ticks}
            tickFormatter={xAxisConfig.tickFormatter}
            stroke={CHART_COLORS.axis}
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            interval={0}
            angle={interval === '1mo' ? -45 : 0}
            textAnchor={interval === '1mo' ? 'end' : 'middle'}
            height={interval === '1mo' ? 60 : 30}
          />

          <YAxis
            domain={[minPrice, maxPrice]}
            tickFormatter={(v) => formatPrice(v)}
            stroke={CHART_COLORS.axis}
            tick={{ fontSize: 11, fill: CHART_COLORS.text }}
            tickLine={false}
            axisLine={false}
            orientation="right"
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Support levels */}
          {supportLevels.map((level) => (
            <ReferenceLine
              key={level.id}
              y={level.price}
              stroke={CHART_COLORS.support}
              strokeDasharray={level.strength === 'strong' ? '0' : '5 5'}
              strokeWidth={level.strength === 'strong' ? 2 : 1.5}
              strokeOpacity={level.strength === 'weak' ? 0.6 : 1}
            />
          ))}

          {/* Resistance levels */}
          {resistanceLevels.map((level) => (
            <ReferenceLine
              key={level.id}
              y={level.price}
              stroke={CHART_COLORS.resistance}
              strokeDasharray={level.strength === 'strong' ? '0' : '5 5'}
              strokeWidth={level.strength === 'strong' ? 2 : 1.5}
              strokeOpacity={level.strength === 'weak' ? 0.6 : 1}
            />
          ))}

          {/* EMAs */}
          {showEMA && (
            <>
              <Line
                type="monotone"
                dataKey="ema9"
                stroke={CHART_COLORS.ema9}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="ema21"
                stroke={CHART_COLORS.ema21}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            </>
          )}

          {/* Main price line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke={CHART_COLORS.lineStroke}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 6,
              fill: CHART_COLORS.lineStroke,
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={CHART_COLORS.lineStroke} label="Price" />
        {showEMA && (
          <>
            <LegendItem color={CHART_COLORS.ema9} label="EMA 9" />
            <LegendItem color={CHART_COLORS.ema21} label="EMA 21" />
          </>
        )}
        {supportLevels.length > 0 && <LegendItem color={CHART_COLORS.support} label="Support" />}
        {resistanceLevels.length > 0 && (
          <LegendItem color={CHART_COLORS.resistance} label="Resistance" />
        )}
        {viewType === 'candle' && (
          <>
            <LegendItem color={CHART_COLORS.candleUp} label="Up" />
            <LegendItem color={CHART_COLORS.candleDown} label="Down" />
          </>
        )}
      </View>
    </View>
  );
}

// Simple candlestick chart using SVG for native
interface SimpleCandlestickChartProps {
  data: MarketDataPoint[];
  interval: ChartInterval;
  minPrice: number;
  maxPrice: number;
  height: number;
  showEMA?: boolean;
  supportLevels?: AILevel[];
  resistanceLevels?: AILevel[];
}

function SimpleCandlestickChart({
  data,
  interval,
  minPrice,
  maxPrice,
  height,
  showEMA = true,
  supportLevels = [],
  resistanceLevels = [],
}: SimpleCandlestickChartProps) {
  const width = Dimensions.get('window').width - 40;
  const chartHeight = height - 60;
  const candleWidth = Math.max(2, Math.min(12, (width - 60) / data.length));
  const candleSpacing = candleWidth * 0.3;

  // Helper to convert price to Y coordinate
  const priceToY = (price: number) => {
    const range = maxPrice - minPrice;
    const ratio = (maxPrice - price) / range;
    return ratio * chartHeight + 10;
  };

  // Calculate which labels to show on x-axis
  const tickCount = getTickCount(interval, data.length);
  const xAxisIndices = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length <= tickCount) return data.map((_, i) => i);
    
    const indices: number[] = [];
    const step = Math.floor(data.length / (tickCount - 1));
    
    for (let i = 0; i < tickCount - 1; i++) {
      indices.push(i * step);
    }
    indices.push(data.length - 1);
    
    return indices;
  }, [data.length, tickCount]);

  const shouldRotateLabels = interval === '1mo';

  return (
    <View style={{ width, height }}>
      {/* Y-axis labels */}
      <View style={styles.yAxisLabels}>
        <Text style={styles.axisLabel}>${formatPrice(maxPrice)}</Text>
        <Text style={styles.axisLabel}>${formatPrice((maxPrice + minPrice) / 2)}</Text>
        <Text style={styles.axisLabel}>${formatPrice(minPrice)}</Text>
      </View>

      <Svg width={width} height={height}>
        {/* Grid lines */}
        <SvgLine
          x1={50}
          y1={priceToY(maxPrice)}
          x2={width - 10}
          y2={priceToY(maxPrice)}
          stroke={CHART_COLORS.grid}
          strokeWidth="1"
          strokeDasharray="3,3"
        />
        <SvgLine
          x1={50}
          y1={priceToY((maxPrice + minPrice) / 2)}
          x2={width - 10}
          y2={priceToY((maxPrice + minPrice) / 2)}
          stroke={CHART_COLORS.grid}
          strokeWidth="1"
          strokeDasharray="3,3"
        />
        <SvgLine
          x1={50}
          y1={priceToY(minPrice)}
          x2={width - 10}
          y2={priceToY(minPrice)}
          stroke={CHART_COLORS.grid}
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* Support levels */}
        {supportLevels.map((level) => {
          const y = priceToY(level.price);
          return (
            <SvgLine
              key={`support-${level.id}`}
              x1={50}
              y1={y}
              x2={width - 10}
              y2={y}
              stroke={CHART_COLORS.support}
              strokeWidth={level.strength === 'strong' ? 2 : 1.5}
              strokeDasharray={level.strength === 'strong' ? '0' : '5,5'}
              strokeOpacity={level.strength === 'weak' ? 0.6 : 1}
            />
          );
        })}

        {/* Resistance levels */}
        {resistanceLevels.map((level) => {
          const y = priceToY(level.price);
          return (
            <SvgLine
              key={`resistance-${level.id}`}
              x1={50}
              y1={y}
              x2={width - 10}
              y2={y}
              stroke={CHART_COLORS.resistance}
              strokeWidth={level.strength === 'strong' ? 2 : 1.5}
              strokeDasharray={level.strength === 'strong' ? '0' : '5,5'}
              strokeOpacity={level.strength === 'weak' ? 0.6 : 1}
            />
          );
        })}

        {/* EMA lines */}
        {showEMA && (
          <>
            {/* EMA 9 */}
            {(() => {
              const pathParts: string[] = [];
              let isFirstPoint = true;
              
              data.forEach((point, index) => {
                if (point.ema9 !== undefined && point.ema9 !== null) {
                  const x = 50 + index * (candleWidth + candleSpacing) + candleWidth / 2;
                  const y = priceToY(point.ema9);
                  pathParts.push(`${isFirstPoint ? 'M' : 'L'} ${x} ${y}`);
                  isFirstPoint = false;
                }
              });
              
              if (pathParts.length > 0) {
                return (
                  <Path
                    d={pathParts.join(' ')}
                    stroke={CHART_COLORS.ema9}
                    strokeWidth="1.5"
                    fill="none"
                  />
                );
              }
              return null;
            })()}

            {/* EMA 21 */}
            {(() => {
              const pathParts: string[] = [];
              let isFirstPoint = true;
              
              data.forEach((point, index) => {
                if (point.ema21 !== undefined && point.ema21 !== null) {
                  const x = 50 + index * (candleWidth + candleSpacing) + candleWidth / 2;
                  const y = priceToY(point.ema21);
                  pathParts.push(`${isFirstPoint ? 'M' : 'L'} ${x} ${y}`);
                  isFirstPoint = false;
                }
              });
              
              if (pathParts.length > 0) {
                return (
                  <Path
                    d={pathParts.join(' ')}
                    stroke={CHART_COLORS.ema21}
                    strokeWidth="1.5"
                    fill="none"
                  />
                );
              }
              return null;
            })()}
          </>
        )}

        {/* Candlesticks */}
        {data.map((candle, index) => {
          const x = 50 + index * (candleWidth + candleSpacing) + candleWidth / 2;
          const isUp = candle.close >= candle.open;
          const color = isUp ? CHART_COLORS.candleUp : CHART_COLORS.candleDown;

          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);
          const openY = priceToY(candle.open);
          const closeY = priceToY(candle.close);

          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          return (
            <G key={index}>
              {/* Wick (high to low) */}
              <SvgLine
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={color}
                strokeWidth="1.5"
              />
              {/* Body (open to close) */}
              <Rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isUp ? color : color}
                fillOpacity={isUp ? 0.8 : 1}
                stroke={color}
                strokeWidth="1"
              />
            </G>
          );
        })}
      </Svg>

      {/* X-axis with smart label positioning */}
      <View style={[styles.xAxis, shouldRotateLabels && styles.xAxisRotated]}>
        {xAxisIndices.map((index, tickIdx) => {
          const position = (index / (data.length - 1)) * 100;
          
          // For 5D, use smart formatter
          let label;
          if (interval === '5d') {
            const tickTimestamps = xAxisIndices.map(i => data[i]?.timestamp).filter(Boolean);
            label = format5DLabel(data[index]?.timestamp, data, tickIdx, tickTimestamps);
          } else {
            label = formatChartDate(data[index]?.timestamp, interval, index);
          }
          
          return (
            <Text 
              key={index}
              style={[
                styles.axisLabel,
                shouldRotateLabels && styles.axisLabelRotated,
                { position: 'absolute', left: `${position}%` }
              ]}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

// Helper components
function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.tooltipRow}>
      <Text style={[styles.tooltipLabel, color && { color }]}>{label}</Text>
      <Text style={[styles.tooltipValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: CHART_COLORS.background,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  tooltip: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
  },
  tooltipDate: {
    ...typography.labelSm,
    color: colors.neutral[600],
    marginBottom: spacing.xs,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tooltipLabel: {
    ...typography.bodySm,
    color: colors.neutral[500],
  },
  tooltipValue: {
    ...typography.bodySm,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...typography.labelSm,
    color: colors.neutral[600],
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 10,
    height: '80%',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  xAxis: {
    flexDirection: 'row',
    position: 'relative',
    marginTop: spacing.xs,
    paddingHorizontal: 50,
    height: 20,
  },
  xAxisRotated: {
    height: 40,
  },
  axisLabel: {
    ...typography.labelSm,
    color: colors.neutral[500],
  },
  axisLabelRotated: {
    transform: [{ rotate: '-45deg' }],
    fontSize: 9,
  },
});
