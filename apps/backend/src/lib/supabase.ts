import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

// Load .env file if not already loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');

if (!process.env.SUPABASE_URL) {
  if (existsSync(envPath)) {
    config({ path: envPath });
  } else {
    const cwdEnvPath = resolve(process.cwd(), 'apps/backend/.env');
    if (existsSync(cwdEnvPath)) {
      config({ path: cwdEnvPath });
    } else {
      config();
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    `Missing Supabase environment variables. SUPABASE_URL: ${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseServiceKey}. ` +
    `Checked .env at: ${envPath} and ${resolve(process.cwd(), 'apps/backend/.env')}`
  );
}

// Admin client with service role key - bypasses RLS
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create a client for a specific user (respects RLS)
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// Helper to get user ID from JWT
export async function getUserFromToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}
