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

// Subscription API methods
export interface SubscriptionStatusResponse {
  isActive: boolean;
  expiresAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  platform?: 'web' | 'ios' | 'android';
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:86',message:'getSubscriptionStatus called',data:{endpoint:'/api/subscription/status'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const result = await apiFetch('/api/subscription/status');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:90',message:'getSubscriptionStatus success',data:{hasResult:!!result},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77853d40-2630-465b-b1da-310f30bd4208',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:95',message:'getSubscriptionStatus error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
}

export async function createCheckoutSession(): Promise<CheckoutSessionResponse> {
  return apiFetch('/api/subscription/create-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
