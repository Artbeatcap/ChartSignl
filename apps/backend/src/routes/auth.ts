import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase.js';

const auth = new Hono();

// POST /api/auth/check-email - Check if email exists in the system
// Returns false on errors to prevent account enumeration attacks
auth.post('/check-email', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email || typeof email !== 'string') {
      return c.json({ exists: false }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return c.json({ exists: false }, 400);
    }

    // Use admin API to check if user exists
    // This is more reliable than client-side checks and avoids rate limiting
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error checking email:', error);
      // Return false to avoid account enumeration on errors
      return c.json({ exists: false });
    }

    const userExists = data.users.some(
      (user) => user.email?.toLowerCase() === normalizedEmail
    );

    return c.json({ exists: userExists });
  } catch (error) {
    console.error('Email check error:', error);
    // Return false to prevent account enumeration
    return c.json({ exists: false });
  }
});

export default auth;
