// User Profile Types

// Simplified trading styles (stocks-focused)
export TradingStyle = 'day' | 'swing' | 'position';

// NEW: Experience level affects AI analysis verbosity
export ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

// NEW: Stress reducer - product insight for development
export StressReducer = 
  | 'clearer_levels'
  | 'faster_analysis'
  | 'confidence'
  | 'less_screen_time';

export const UserProfile {
  id;
  email;
  displayName | null;
  createdAt;
  tradingStyle: TradingStyle | null;
  experienceLevel: ExperienceLevel | null;
  stressReducer: StressReducer | null;
  isPro;
  freeAnalysesUsed;
}

// Onboarding Types
export const OnboardingAnswers {
  tradingStyle: TradingStyle | null;
  experienceLevel: ExperienceLevel | null;
  stressReducer: StressReducer | null;
  displayName;
}

// Labels for UI display
export const TRADING_STYLE_OPTIONS: { 
  value: TradingStyle; 
  label; 
  emoji; 
  description;
  defaultTimeframe;
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
  label;
  emoji;
  description;
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
  label;
  emoji;
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
export function getDefaultTimeframe(style: TradingStyle | null) {
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
