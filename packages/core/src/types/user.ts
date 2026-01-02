// User Profile Types

export type TradingStyle = 'scalper' | 'day' | 'swing' | 'position' | 'long_term';
export type InstrumentType = 'stocks' | 'options' | 'futures' | 'crypto' | 'forex';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  style: TradingStyle | null;
  instruments: InstrumentType[];
  isPro: boolean;
  freeAnalysesUsed: number;
}

// Onboarding Types
export interface OnboardingAnswers {
  // Screen 1: Welcome - no data needed
  
  // Screen 2: Style
  tradingStyle: TradingStyle | null;
  
  // Screen 3: Instruments
  instruments: InstrumentType[];
  
  // Screen 4: Pain Points
  painPoints: PainPoint[];
  
  // Screen 5: Goals
  goals: TradingGoal[];
  
  // Screen 6: Commitment
  commitment: string;
  displayName: string;
}

export type PainPoint =
  | 'missing_breakouts'
  | 'buying_tops'
  | 'selling_bottoms'
  | 'unclear_exits'
  | 'overtrading'
  | 'fomo'
  | 'revenge_trading'
  | 'analysis_paralysis';

export type TradingGoal =
  | 'fewer_fomo_trades'
  | 'clearer_entries'
  | 'better_exits'
  | 'consistent_process'
  | 'manage_risk'
  | 'reduce_stress'
  | 'trade_less_win_more';

export const PAIN_POINT_LABELS: Record<PainPoint, string> = {
  missing_breakouts: 'Missing breakouts',
  buying_tops: 'Buying at the top',
  selling_bottoms: 'Selling at the bottom',
  unclear_exits: 'Not knowing where to exit',
  overtrading: 'Trading too often',
  fomo: 'FOMO trades',
  revenge_trading: 'Revenge trading',
  analysis_paralysis: 'Analysis paralysis',
};

export const TRADING_GOAL_LABELS: Record<TradingGoal, string> = {
  fewer_fomo_trades: 'Fewer FOMO trades',
  clearer_entries: 'Clearer entry points',
  better_exits: 'Better exit strategy',
  consistent_process: 'A consistent process',
  manage_risk: 'Better risk management',
  reduce_stress: 'Less trading stress',
  trade_less_win_more: 'Trade less, win more',
};

export const TRADING_STYLE_LABELS: Record<TradingStyle, string> = {
  scalper: 'Scalper (minutes)',
  day: 'Day Trader (hours)',
  swing: 'Swing Trader (days)',
  position: 'Position Trader (weeks)',
  long_term: 'Long-term Investor (months+)',
};

export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
  stocks: 'Stocks',
  options: 'Options',
  futures: 'Futures',
  crypto: 'Crypto',
  forex: 'Forex',
};
