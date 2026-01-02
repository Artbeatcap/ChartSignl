import { Hono } from 'hono';
import { supabaseAdmin, getUserFromToken } from '../lib/supabase';
import type { UsageResponse, AuthResponse } from '@chartsignl/core';
import { FREE_ANALYSIS_LIMIT } from '@chartsignl/core';

const userRoute = new Hono();

// GET /api/user/me - Get current user profile
userRoute.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<AuthResponse>({
        success: false,
        error: 'Missing authorization token',
      }, 401);
    }
    
    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);
    
    if (!userId) {
      return c.json<AuthResponse>({
        success: false,
        error: 'Invalid authorization token',
      }, 401);
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return c.json<AuthResponse>({
        success: false,
        error: 'Profile not found',
      }, 404);
    }

    // Also get usage
    const { data: usage } = await supabaseAdmin
      .from('usage_counters')
      .select('free_analyses_used')
      .eq('user_id', userId)
      .single();

    return c.json<AuthResponse>({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        createdAt: profile.created_at,
        style: profile.trading_style,
        instruments: profile.instruments || [],
        isPro: profile.is_pro || false,
        freeAnalysesUsed: usage?.free_analyses_used || 0,
      },
    });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json<AuthResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

// PUT /api/user/profile - Update user profile
userRoute.put('/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing authorization token' }, 401);
    }
    
    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);
    
    if (!userId) {
      return c.json({ success: false, error: 'Invalid authorization token' }, 401);
    }

    const body = await c.req.json();
    
    // Only allow updating specific fields
    const allowedFields = [
      'display_name',
      'trading_style',
      'instruments',
      'pain_points',
      'goals',
      'commitment',
      'onboarding_completed',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400);
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      return c.json({ success: false, error: 'Failed to update profile' }, 500);
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

// GET /api/user/usage - Get usage stats
userRoute.get('/usage', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<UsageResponse>({
        success: false,
        error: 'Missing authorization token',
      }, 401);
    }
    
    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);
    
    if (!userId) {
      return c.json<UsageResponse>({
        success: false,
        error: 'Invalid authorization token',
      }, 401);
    }

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

    return c.json<UsageResponse>({
      success: true,
      freeAnalysesUsed: usage?.free_analyses_used || 0,
      freeAnalysesLimit: FREE_ANALYSIS_LIMIT,
      isPro: profile?.is_pro || false,
    });

  } catch (error) {
    console.error('Get usage error:', error);
    return c.json<UsageResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

export default userRoute;
