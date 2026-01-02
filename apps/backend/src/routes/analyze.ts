import { Hono } from 'hono';
import { supabaseAdmin, getUserFromToken } from '../lib/supabase';
import { analyzeChartWithVision, analyzeChartFromBase64 } from '../lib/openai';
import { FREE_ANALYSIS_LIMIT } from '@chartsignl/core';
import type { AnalyzeChartResponse } from '@chartsignl/core';

const analyzeRoute = new Hono();

// POST /api/analyze-chart
analyzeRoute.post('/', async (c) => {
  try {
    // 1. Get authorization token
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Missing authorization token',
      }, 401);
    }
    
    const token = authHeader.slice(7);
    const userId = await getUserFromToken(token);
    
    if (!userId) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Invalid authorization token',
      }, 401);
    }

    // 2. Check user's usage limits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Failed to fetch user profile',
      }, 500);
    }

    const { data: usage, error: usageError } = await supabaseAdmin
      .from('usage_counters')
      .select('free_analyses_used')
      .eq('user_id', userId)
      .single();

    if (usageError) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Failed to fetch usage data',
      }, 500);
    }

    // Check if user can analyze
    const canAnalyze = profile.is_pro || usage.free_analyses_used < FREE_ANALYSIS_LIMIT;
    if (!canAnalyze) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Free analysis limit reached. Upgrade to Pro for unlimited analyses.',
      }, 403);
    }

    // 3. Get the image - handle both JSON (base64) and multipart uploads
    const contentType = c.req.header('Content-Type') || '';
    
    let imageBuffer: ArrayBuffer;
    let mimeType: string;
    let providedSymbol: string | undefined;
    let providedInterval: string | undefined;

    if (contentType.includes('application/json')) {
      // Handle base64 JSON upload
      const body = await c.req.json();
      const { image, symbol, interval } = body;

      if (!image) {
        return c.json<AnalyzeChartResponse>({
          success: false,
          error: 'No image provided',
        }, 400);
      }

      providedSymbol = symbol;
      providedInterval = interval;

      // Parse base64 data URI
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return c.json<AnalyzeChartResponse>({
          success: false,
          error: 'Invalid image format. Expected base64 data URI.',
        }, 400);
      }

      mimeType = matches[1];
      const base64Data = matches[2];
      
      // Convert base64 to buffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;

    } else {
      // Handle multipart form upload
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return c.json<AnalyzeChartResponse>({
          success: false,
          error: 'No file uploaded',
        }, 400);
      }

      mimeType = file.type;
      imageBuffer = await file.arrayBuffer();
    }

    // Validate mime type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(mimeType)) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Invalid file type. Please upload PNG, JPEG, or WebP.',
      }, 400);
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (imageBuffer.byteLength > maxSize) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      }, 400);
    }

    // 4. Upload to Supabase Storage
    const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
    const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('chart_uploads')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error('Upload error:', uploadError);
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: 'Failed to upload image',
      }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('chart_uploads')
      .getPublicUrl(uploadData.path);

    // 5. Call OpenAI Vision to analyze the chart
    const visionResult = await analyzeChartWithVision(publicUrl);
    
    if (!visionResult.success || !visionResult.analysis) {
      return c.json<AnalyzeChartResponse>({
        success: false,
        error: visionResult.error || 'Failed to analyze chart',
      }, 500);
    }

    const analysis = visionResult.analysis;

    // Override symbol/timeframe if provided by client (since they know what chart they captured)
    if (providedSymbol && !analysis.meta.symbol) {
      analysis.meta.symbol = providedSymbol;
    }
    if (providedInterval && !analysis.meta.timeframe) {
      // Convert interval to timeframe format
      const intervalMap: Record<string, string> = {
        '1': '1m', '5': '5m', '15': '15m', '30': '30m',
        '60': '1h', '240': '4h', 'D': 'D', 'W': 'W', 'M': 'M'
      };
      analysis.meta.timeframe = (intervalMap[providedInterval] || providedInterval) as any;
    }

    // 6. Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from('chart_analyses')
      .insert({
        user_id: userId,
        image_url: publicUrl,
        image_path: uploadData.path,
        symbol: analysis.meta.symbol,
        timeframe: analysis.meta.timeframe,
        analysis_json: analysis,
        headline: analysis.summary.headline,
        trend_type: analysis.meta.trend.type,
        level_count: analysis.levels.length,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      // Don't fail the request - the analysis was successful
    }

    // 7. Increment usage counter (for free users)
    if (!profile.is_pro) {
      await supabaseAdmin
        .from('usage_counters')
        .update({
          free_analyses_used: usage.free_analyses_used + 1,
          last_analysis_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // 8. Return the analysis
    return c.json<AnalyzeChartResponse>({
      success: true,
      analysisId: savedAnalysis?.id,
      imageUrl: publicUrl,
      analysis,
    });

  } catch (error) {
    console.error('Analyze chart error:', error);
    return c.json<AnalyzeChartResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

export default analyzeRoute;
