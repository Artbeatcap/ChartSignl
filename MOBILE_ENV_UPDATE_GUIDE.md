# Mobile App Environment Variables Update Guide

## Important: How Expo Environment Variables Work

The mobile app uses `EXPO_PUBLIC_*` environment variables that are **baked into the build at build time**, not read at runtime. This means:

- Environment variables are embedded in the JavaScript bundle during the build process
- **You cannot update these by changing a .env file on the VPS** - you must rebuild the app
- The `.env` file on the VPS (if it exists) is only for reference/development, not for the running app

## Current VPS Status

- **Mobile source code**: Present at `/root/ChartSignl/apps/mobile/`
- **Mobile .env file**: **NOT FOUND** on VPS (does not exist)
- **Web build output**: Deployed to `/srv/chartsignl-web/` (static files served by Nginx)

## Required Mobile Environment Variables

Based on the codebase, the mobile app needs these environment variables (from `apps/mobile/.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://api.chartsignl.com
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your-ios-key (optional)
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your-android-key (optional)
```

## How to Update Mobile Environment Variables

Since Expo env vars are baked into builds, follow these steps:

### Step 1: Update Local .env File

Create or update `apps/mobile/.env` locally with your production values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://pgxlfjvezvmsynzimxnt.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_URL=https://api.chartsignl.com
```

### Step 2: Rebuild the Web App

From your project root, run:

```powershell
npm run build:web
```

This runs `expo export --platform web` which:
- Reads your `apps/mobile/.env` file
- Bakes the `EXPO_PUBLIC_*` variables into the JavaScript bundle
- Outputs static files to `apps/mobile/dist/`

### Step 3: Deploy the New Build to VPS

Upload the built files to the web root:

```powershell
# Using rsync (if available)
rsync -avz --delete -e ssh ./apps/mobile/dist/ root@167.88.43.61:/srv/chartsignl-web/

# Or using scp (manual)
scp -r ./apps/mobile/dist/* root@167.88.43.61:/srv/chartsignl-web/
```

### Step 4: Verify

Check that the web app loads correctly:
- Visit `https://app.chartsignl.com` (or your domain)
- Open browser DevTools > Network tab
- Check that API calls are going to the correct `EXPO_PUBLIC_API_URL`
- Verify Supabase auth is working (check for `EXPO_PUBLIC_SUPABASE_URL` in network requests)

## Helper Script

You can use the helper script `deploy-web.ps1` (if created) to automate steps 2-3:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-web.ps1
```

## Notes

1. **No restart needed**: Since it's static files, just upload and they're live (Nginx serves them directly)
2. **Cache busting**: Browsers may cache the old JavaScript. Users may need to hard refresh (Ctrl+F5)
3. **Native apps**: For iOS/Android apps, you need to rebuild via EAS Build or Expo Build, not just the web export
4. **Backend API URL**: Make sure `EXPO_PUBLIC_API_URL` matches your backend API domain (e.g., `https://api.chartsignl.com`)

## Troubleshooting

If the app isn't using the new environment variables:

1. **Check the build output**: Look in `apps/mobile/dist/_expo/static/js/` - search for your env var values in the JS files
2. **Clear browser cache**: Hard refresh (Ctrl+F5) or clear cache
3. **Check Nginx**: Ensure `/srv/chartsignl-web/` is the correct document root in Nginx config
4. **Verify file upload**: SSH into VPS and check file timestamps: `ls -la /srv/chartsignl-web/`
