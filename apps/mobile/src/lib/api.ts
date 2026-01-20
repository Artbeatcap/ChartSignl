import { getAccessToken } from './supabase';
import type {
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

// Get subscription status
export async function getSubscriptionStatus(): Promise<{
  success: boolean;
  isPro: boolean;
  expiresAt: string | null;
  platform: string | null;
}> {
  return apiFetch('/api/subscription/status');
}

// Create Stripe checkout session
export async function createCheckoutSession(): Promise<{
  success: boolean;
  checkoutUrl: string;
}> {
  return apiFetch('/api/subscription/create-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
