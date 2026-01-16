// API Request/Response Types

import type { ChartAnalysis, AnalysisHistoryItem } from './chartAnalysis';
import type { UserProfile } from './user';

// Auth
export const AuthResponse {
  success;
  user?: UserProfile;
  error?;
}

// Analyze Chart
export const AnalyzeChartRequest {
  // File is sent as multipart form data
}

export const AnalyzeChartResponse {
  success;
  analysisId?;
  analysis?: ChartAnalysis;
  error?;
}

// Get Analysis History
export const GetHistoryRequest {
  page?;
  limit?;
}

export const GetHistoryResponse {
  success;
  analyses?: AnalysisHistoryItem[];
  total?;
  hasMore?;
  error?;
}

// Get Single Analysis
export const GetAnalysisResponse {
  success;
  analysis?: ChartAnalysis;
  createdAt?;
  error?;
}

// Usage
export const UsageResponse {
  success;
  freeAnalysesUsed?;
  freeAnalysesLimit?;
  isPro?;
  error?;
}

// Generic API Error
export const ApiError {
  success: false;
  error;
  code?;
}
