// User Profile Types

// Simplified trading styles (stocks-focused)
export type TradingStyle = 'day' | 'swing' | 'position';

// NEW: Experience level affects AI analysis verbosity
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

// NEW: Stress reducer - product insight for development
export type StressReducer = 
  | 'clearer_levels'
  | 'faster_analysis'
  | 'confidence'
  | 'less_screen_time';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  tradingStyle: TradingStyle | null;
  experienceLevel: ExperienceLevel | null;
  stressReducer: StressReducer | null;
  isPro: boolean;
  freeAnalysesUsed: number;
}

// Onboarding Types
export interface OnboardingAnswers {
  tradingStyle: TradingStyle | null;
  experienceLevel: ExperienceLevel | null;
  stressReducer: StressReducer | null;
  displayName: string;
}

// Labels for UI display
export const TRADING_STYLE_OPTIONS: { 
  value: TradingStyle; 
  label: string; 
  emoji: string; 
  description: string;
  defaultTimeframe: string;
}[] = [
  {
    value: 'day',
    label: 'Day Trades',
    emoji: '☀️',
    description: 'In and out same day',
    defaultTimeframe: '5min',
  },
  {
    value: 'swing',
    label: 'Swing Trades',
    emoji: '🌊',
    description: 'Holding days to weeks',
    defaultTimeframe: '1D',
  },
  {
    value: 'position',
    label: 'Position Trades',
    emoji: '🏔️',
    description: 'Weeks to months',
    defaultTimeframe: '1W',
  },
];

export const EXPERIENCE_LEVEL_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    value: 'beginner',
    label: 'New to it',
    emoji: '🌱',
    description: 'Still learning the basics',
  },
  {
    value: 'intermediate',
    label: 'Comfortable',
    emoji: '📊',
    description: 'Know support/resistance, use charts regularly',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    emoji: '🎯',
    description: 'Deep into indicators and patterns',
  },
];

export const STRESS_REDUCER_OPTIONS: {
  value: StressReducer;
  label: string;
  emoji: string;
}[] = [
  {
    value: 'clearer_levels',
    label: 'Clearer entry/exit levels',
    emoji: '🎯',
  },
  {
    value: 'faster_analysis',
    label: 'Faster analysis when I\'m busy',
    emoji: '⚡',
  },
  {
    value: 'confidence',
    label: 'Confidence I\'m not missing something',
    emoji: '✅',
  },
  {
    value: 'less_screen_time',
    label: 'Spend less time staring at charts',
    emoji: '🧘',
  },
];

// Helper to get default chart timeframe based on trading style
export function getDefaultTimeframe(style: TradingStyle | null): string {
  const option = TRADING_STYLE_OPTIONS.find(o => o.value === style);
  return option?.defaultTimeframe ?? '1D';
}

// Helper to determine AI verbosity based on experience
export function getAIVerbosity(level: ExperienceLevel | null): 'detailed' | 'standard' | 'concise' {
  switch (level) {
    case 'beginner':
      return 'detailed';
    case 'intermediate':
      return 'standard';
    case 'advanced':
      return 'concise';
    default:
      return 'standard';
  }
}
