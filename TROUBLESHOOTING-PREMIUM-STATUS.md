# Premium Status Issue - Root Cause Analysis

## ✅ YOUR CODE CHANGES **ARE** DEPLOYED

All your local fixes are on the production server and running:

### Backend (Last updated: Feb 14, 2026 01:19 UTC)
- ✅ Customer Portal endpoint (`/api/subscription/customer-portal`) - **EXISTS**
- ✅ Test mode bypass logic for `isActive` calculation - **EXISTS**
- ✅ Auto-sync logic (lines 79-123) to sync Stripe → Supabase - **EXISTS**
- ✅ Container restarted: Feb 14, 2026 04:50 UTC - **RUNNING**

### Frontend Web Build (Last deployed: Feb 14, 2026 04:41 UTC)
- ✅ Profile page: "Manage Subscription" link - **EXISTS**
- ✅ Profile page: Hides "Upgrade to Pro" for premium users - **EXISTS**
- ✅ PremiumScreen: Web native dialogs (`window.alert`, `window.confirm`) - **EXISTS**
- ✅ PremiumScreen: Redirect to `/analyze` after upgrade - **EXISTS**

---

## ❌ THE ACTUAL PROBLEM: Database Out of Sync

### Two Tables, Conflicting Data

**`profiles` table:**
```
is_pro: true  ← Set correctly
```

**`subscriptions` table:**
```
status: 'free'                    ← WRONG - should be 'active'
stripe_subscription_id: null      ← WRONG - missing subscription link
```

### Why Users See "Free" Status

Your app calls `/api/subscription/status`, which checks the **`subscriptions.status`** field, NOT `profiles.is_pro`.

Even though `profiles.is_pro = true`, the subscription service returns `isPremium: false` because:
1. `subscriptions.status = 'free'`
2. `subscriptions.stripe_subscription_id = null`

---

## 🔍 WHAT I FOUND

### User Investigation Results

**User 1: clarencebellwork@gmail.com (user_id: `61227090-c6b0-4888-9ace-1598deafd1f8`)**
- Stripe: ✅ **HAS active paid subscription** `sub_1T0sKPPN7GMa1AwYjWKftYXv`
- Stripe: ✅ Status: `"active"`
- Stripe: ✅ Expires: March 12, 2026 (valid)
- Supabase (before fix): ❌ `status: 'free'`, `stripe_subscription_id: null`
- **I manually fixed this user** - their DB now matches Stripe ✅

**User 2: clarencebell@gmail.com (user_id: `2c9d75f9-12c7-44d1-806d-70dc21b37b02`)**
- Stripe: ❌ **NO subscriptions** (empty array)
- Supabase: `is_pro: true` but `status: 'free'`
- **Issue**: Database says pro, but they never completed a paid checkout

**User 3: clarencebellshop@gmail.com (user_id: `a78e446e-8530-43f4-afca-b0f785cdf084`)**
- Stripe: ❌ **NO subscriptions** (empty array)
- Supabase: `is_pro: true` but `status: 'free'`
- **Issue**: Database says pro, but they never completed a paid checkout

---

## 🐛 WHY AUTO-SYNC DIDN'T WORK

Your backend has auto-sync logic (lines 79-123 in `apps/backend/src/routes/subscription.ts`) that should automatically detect mismatches when a user calls `/api/subscription/status`. It should:

1. Check if `stripe_customer_id` exists ✅
2. Check if `status !== 'active'` ✅
3. Query Stripe for active subscriptions
4. If found, update Supabase automatically

**But it's not working.** Possible causes:
- Sync logic is silently failing (no error logs)
- Users aren't calling `/api/subscription/status` (frontend not triggering refresh)
- Stripe API error not being caught properly
- Race condition or timing issue

---

## 📋 PROMPT FOR CLAUDE TO DEBUG

```
The premium subscription status is out of sync between Stripe and Supabase.

VERIFIED FACTS:
1. ✅ All code changes ARE deployed to production server (verified via SSH)
2. ✅ Backend container restarted with latest code (Feb 14 04:50 UTC)
3. ✅ Web build deployed with latest code (Feb 14 04:41 UTC)
4. ✅ One user (clarencebellwork@gmail.com) HAS an active paid Stripe subscription
5. ❌ But Supabase subscriptions table showed status='free', stripe_subscription_id=null (manually fixed)

THE ISSUE:
The backend's auto-sync logic (apps/backend/src/routes/subscription.ts lines 79-123) 
should automatically sync active Stripe subscriptions to Supabase when users call 
/api/subscription/status, but it's NOT working.

WHAT TO DEBUG:
1. Add instrumentation logs to the auto-sync block (lines 79-123) to see:
   - Is it entering the sync block?
   - What does stripe.subscriptions.list() return?
   - Are there any errors in the try/catch?
   - Is the Supabase upsert succeeding or failing silently?

2. Check frontend (PremiumScreen.tsx and profile.tsx):
   - Is refreshSubscription() actually calling the backend /api/subscription/status?
   - Are there any frontend errors preventing the call?
   - Check browser console for errors

3. Test the sync manually:
   - SSH to server and check backend logs during a user login/refresh
   - Look for "[SUBSCRIPTION] Synced paid status" log message
   - Look for "[SUBSCRIPTION] Stripe sync failed" error message

SERVER: root@167.88.43.61
BACKEND PATH: /root/ChartSignl/
BACKEND LOGS: docker logs chartsignl-api --tail 100 --follow

GOAL: 
Figure out why the auto-sync isn't running or is failing, so users with paid 
Stripe subscriptions automatically show as premium in the app without manual DB updates.
```

---

## 🎯 IMMEDIATE FIX (What I Did)

1. **User 1 (clarencebellwork@gmail.com)**: ✅ Manually synced their Stripe subscription to Supabase
   - They should now see premium status across all screens

2. **Users 2 & 3**: ❌ No active Stripe subscriptions
   - Need to complete new checkouts to get premium status
   - OR manually set their subscription data if they already paid elsewhere

---

## 🔧 NEXT STEPS

### For You:
1. Test User 1 (`clarencebellwork@gmail.com`) - they should now see:
   - Premium badge in profile
   - No "Upgrade to Pro" button
   - "Manage Subscription" link at bottom of profile
   - Full premium features in analyze screen

2. Clear browser cache or use incognito mode to test
3. If still broken, use the Claude prompt above to debug the auto-sync

### For Users 2 & 3:
- Have them complete a new checkout at https://chartsignl.com/premium
- OR manually update their Supabase records if they already paid

---

## 📊 Database State (as of Feb 15, 2026 00:01 UTC)

```json
// User 1 - FIXED ✅
{
  "user_id": "61227090-c6b0-4888-9ace-1598deafd1f8",
  "email": "clarencebellwork@gmail.com",
  "is_pro": true,
  "status": "active",
  "stripe_subscription_id": "sub_1T0sKPPN7GMa1AwYjWKftYXv",
  "current_period_end": "2026-03-12T11:59:22Z"
}

// User 2 - NO STRIPE SUBSCRIPTION ❌
{
  "user_id": "2c9d75f9-12c7-44d1-806d-70dc21b37b02",
  "email": "clarencebell@gmail.com",
  "is_pro": true,           ← Set but no subscription
  "status": "free",
  "stripe_subscription_id": null
}

// User 3 - NO STRIPE SUBSCRIPTION ❌
{
  "user_id": "a78e446e-8530-43f4-afca-b0f785cdf084",
  "email": "clarencebellshop@gmail.com",
  "is_pro": true,           ← Set but no subscription
  "status": "free",
  "stripe_subscription_id": null
}
```
