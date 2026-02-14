import { Hono } from 'hono';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { sendDeletionConfirmationEmail, sendDeletionCompletedEmail } from '../lib/email.js';

const deleteAccountRoute = new Hono();

const requestSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  reason: z.string().max(500).optional(),
});

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// POST /delete-account – request deletion; sends confirmation email
deleteAccountRoute.post('/delete-account', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ message: 'Invalid request. Please check your email address.' }, 400);
    }
    const { email, reason } = parsed.data;

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const { error: insertError } = await supabaseAdmin.from('deletion_requests').insert({
      email,
      token,
      reason: reason || null,
      status: 'pending',
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Deletion request insert error:', insertError.message);
      return c.json({
        message:
          'If an account exists for this email, you will receive a confirmation link shortly. Please check your inbox and spam folder.',
      }, 200);
    }

    try {
      await sendDeletionConfirmationEmail(email, token);
    } catch (emailErr) {
      console.error('Error sending deletion confirmation email:', emailErr);
      // Still return success to avoid enumeration
    }

    return c.json({
      message:
        'If an account exists for this email, you will receive a confirmation link shortly. Please check your inbox and spam folder.',
    }, 200);
  } catch (err) {
    console.error('Delete account request error:', err);
    return c.json({ message: 'Something went wrong. Please try again later.' }, 500);
  }
});

// GET /confirm-deletion?token=... – confirm deletion via email link
deleteAccountRoute.get('/confirm-deletion', async (c) => {
  const token = c.req.query('token');
  if (!token || typeof token !== 'string') {
    return c.json({ success: false, error: 'Missing or invalid token.' }, 400);
  }
  return executeConfirmDeletion(c, token);
});

// POST /confirm-deletion – body: { token }
deleteAccountRoute.post('/confirm-deletion', async (c) => {
  try {
    const body = await c.req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : null;
    if (!token) {
      return c.json({ success: false, error: 'Missing or invalid token.' }, 400);
    }
    return executeConfirmDeletion(c, token);
  } catch {
    return c.json({ success: false, error: 'Invalid request.' }, 400);
  }
});

async function executeConfirmDeletion(c: { json: (body: unknown, status?: number) => Response }, token: string) {
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('deletion_requests')
    .select('id, email, status, expires_at')
    .eq('token', token)
    .single();

  if (fetchError || !row) {
    return c.json({ success: false, error: 'Invalid or expired link. Please request a new deletion link.' }, 400);
  }

  if (row.status !== 'pending') {
    return c.json({ success: false, error: 'This deletion link has already been used.' }, 400);
  }

  const expiresAt = new Date(row.expires_at);
  if (expiresAt.getTime() < Date.now()) {
    return c.json({ success: false, error: 'This link has expired. Please request a new deletion link.' }, 400);
  }

  const email = row.email as string;

  const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
  const userId = profile?.id ?? null;

  if (!userId) {
    await supabaseAdmin
      .from('deletion_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', row.id);
    return c.json({
      success: true,
      message: 'No account was found for this email. The request has been closed.',
    }, 200);
  }

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    console.error('Auth delete user error:', deleteUserError.message);
    return c.json({ success: false, error: 'Failed to delete account. Please try again or contact support.' }, 500);
  }

  await supabaseAdmin
    .from('deletion_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', row.id);

  try {
    await sendDeletionCompletedEmail(email);
  } catch (emailErr) {
    console.error('Error sending deletion completed email:', emailErr);
  }

  return c.json({
    success: true,
    message: 'Your account and associated data have been permanently deleted.',
  }, 200);
}

export default deleteAccountRoute;
