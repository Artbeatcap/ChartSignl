import { Platform } from 'react-native';
import type {
  GetHistoryResponse,
  GetAnalysisResponse,
  UsageResponse,
  AuthResponse,
} from '@chartsignl/core';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

// #region agent log
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:10',message:'API_URL initialized',data:{apiUrl:API_URL,hasEnvVar:!!process.env.EXPO_PUBLIC_API_URL,envValue:process.env.EXPO_PUBLIC_API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
}
// #endregion

// Get access token directly from localStorage to avoid Supabase's hanging getSession()
function getAccessTokenFromStorage(): string | null {
  if (Platform.OS !== 'web') return null;
  
  try {
    // Supabase stores the session in localStorage with a specific key format
    const storageKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      const parsed = JSON.parse(storedData);
      return parsed?.access_token || null;
    }
  } catch (error) {
    console.error('Error reading token from storage:', error);
  }
  return null;
}

// Generic fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Get token directly from storage to avoid Supabase's hanging getSession()
  const token = getAccessTokenFromStorage();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  // #region agent log
  const fullUrl = `${API_URL}${endpoint}`;
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:42',message:'apiFetch request',data:{url:fullUrl,endpoint,apiUrl:API_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  }
  // #endregion
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:50',message:'apiFetch response',data:{ok:response.ok,status:response.status,statusText:response.statusText,url:fullUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  }
  // #endregion

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
  try {
    const result = await apiFetch('/api/subscription/status');
    return result;
  } catch (error) {
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
