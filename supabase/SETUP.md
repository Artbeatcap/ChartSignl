# Supabase Setup Guide for ChartSignl

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `chartsignl`
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for setup

## 2. Run Database Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "New query"
3. Copy the entire contents of `schema.sql` 
4. Click "Run" to execute
5. Verify tables were created in **Table Editor**

## 3. Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click "Create a new bucket"
3. Configure:
   - **Name**: `chart_uploads`
   - **Public bucket**: ✅ Yes
   - **File size limit**: 10MB
   - **Allowed MIME types**: `image/png, image/jpeg, image/webp`
4. Click "Create bucket"

### Storage Policies

After creating the bucket, add these policies:

1. Go to **Storage** > **Policies**
2. Click "Add policy" for `chart_uploads` bucket

**Policy 1: Upload (INSERT)**
```sql
create policy "Authenticated users can upload"
on storage.objects for insert
with check (bucket_id = 'chart_uploads' and auth.role() = 'authenticated');
```

**Policy 2: View (SELECT)**
```sql
create policy "Public can view chart uploads"
on storage.objects for select
using (bucket_id = 'chart_uploads');
```

**Policy 3: Delete (DELETE)**
```sql
create policy "Users can delete own uploads"
on storage.objects for delete
using (bucket_id = 'chart_uploads' and auth.uid()::text = (storage.foldername(name))[1]);
```

## 4. Configure Authentication

### Email/Password Auth (Default)
Already enabled by default.

### Google OAuth
1. Go to **Authentication** > **Providers** > **Google**
2. Enable Google provider
3. Set up Google Cloud Console:
   - Create project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect: `https://<your-project>.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

### Apple OAuth
1. Go to **Authentication** > **Providers** > **Apple**
2. Enable Apple provider
3. Configure Apple Developer account:
   - Create App ID with Sign in with Apple
   - Create Services ID for web
   - Create private key
4. Add credentials to Supabase

## 5. Get Your API Keys

Go to **Settings** > **API** and note:

1. **Project URL**: `https://<project-id>.supabase.co`
2. **Anon/Public Key**: For client-side (mobile app)
3. **Service Role Key**: For server-side (backend) - KEEP SECRET!

## 6. Environment Variables

Create these environment variables:

### Backend (apps/backend/.env)
```env
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Service role key
OPENAI_API_KEY=sk-...
```

### Mobile App (apps/mobile/.env)
```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Anon key
EXPO_PUBLIC_API_URL=https://your-api-domain.com
```

## 7. Test Your Setup

Run this SQL query to verify everything works:

```sql
-- Test that tables exist
select count(*) from information_schema.tables 
where table_schema = 'public' 
and table_name in ('profiles', 'usage_counters', 'chart_analyses');
-- Should return 3

-- Test that storage bucket exists
select name, public from storage.buckets where name = 'chart_uploads';
-- Should return chart_uploads | true
```

## Common Issues

### "Row Level Security" errors
- Make sure you're passing the correct auth token
- Verify policies are created correctly
- Check that the user exists in auth.users

### Storage upload fails
- Verify bucket is public
- Check file size is under 10MB
- Verify MIME type is allowed
- Ensure authenticated user is uploading

### Auth not working
- Double-check redirect URLs
- Verify OAuth credentials
- Check that email confirmations are configured correctly

## Next Steps

After Supabase is set up:
1. Copy your API keys to the `.env` files
2. Run `npm install` in the root directory
3. Start the backend: `npm run dev:backend`
4. Start the mobile app: `npm run dev:mobile`
