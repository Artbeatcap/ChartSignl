import { getAccessToken } from './supabase';
import type {
  AnalyzeChartResponse,
  GetHistoryResponse,
  GetAnalysisResponse,
  UsageResponse,
  AuthResponse,
} from '@chartsignl/core';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Generic fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Analyze a chart from base64 image URI (from ViewShot capture)
export async function analyzeChartBase64(
  imageUri: string,
  symbol?: string,
  interval?: string
): Promise<AnalyzeChartResponse> {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Convert URI to base64 if needed
  let base64Data: string;
  
  if (imageUri.startsWith('data:')) {
    // Already base64
    base64Data = imageUri;
  } else if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
    // File URI - need to read and convert
    const response = await fetch(imageUri);
    const blob = await response.blob();
    base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Assume it's already a usable URI
    base64Data = imageUri;
  }

  const apiResponse = await fetch(`${API_URL}/api/analyze-chart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64Data,
      symbol: symbol,
      interval: interval,
    }),
  });

  const data = await apiResponse.json();
  
  if (!apiResponse.ok) {
    throw new Error(data.error || 'Failed to analyze chart');
  }

  return data;
}

// Legacy: Analyze a chart image from file URI
export async function analyzeChart(imageUri: string): Promise<AnalyzeChartResponse> {
  const token = await getAccessToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Create form data
  const formData = new FormData();
  
  // Handle different URI formats (file://, data:, etc.)
  const uriParts = imageUri.split('.');
  const fileType = uriParts[uriParts.length - 1];
  
  formData.append('file', {
    uri: imageUri,
    name: `chart.${fileType}`,
    type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/api/analyze-chart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to analyze chart');
  }

  return data;
}

// Get analysis history
export async function getAnalysisHistory(
  page = 1,
  limit = 20
): Promise<GetHistoryResponse> {
  return apiFetch(`/api/analyses?page=${page}&limit=${limit}`);
}

// Get single analysis
export async function getAnalysis(id: string): Promise<GetAnalysisResponse> {
  return apiFetch(`/api/analyses/${id}`);
}

// Delete analysis
export async function deleteAnalysis(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/analyses/${id}`, { method: 'DELETE' });
}

// Get current user
export async function getCurrentUser(): Promise<AuthResponse> {
  return apiFetch('/api/user/me');
}

// Get usage stats
export async function getUsage(): Promise<UsageResponse> {
  return apiFetch('/api/user/usage');
}

// Update profile
export async function updateProfile(data: Record<string, unknown>): Promise<{ success: boolean }> {
  return apiFetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
