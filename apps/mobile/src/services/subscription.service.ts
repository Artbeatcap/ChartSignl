import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { getAccessToken } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Conditionally import RevenueCat only on native platforms
let Purchases: any = null;
if (Platform.OS !== 'web') {
  try {
    Purchases = require('react-native-purchases').default;
  } catch (error) {
    console.warn('RevenueCat not available:', error);
  }
}

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionPlatform = 'ios' | 'android' | 'web';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt?: Date;
  platform?: SubscriptionPlatform;
}

class SubscriptionService {
  private isInitialized = false;

  /**
   * Initialize the subscription service
   * On mobile: Initializes RevenueCat
   * On web: Logs a message (no initialization needed)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (Platform.OS === 'web') {
      console.log('[Subscription] Web platform - using Stripe Checkout');
      this.isInitialized = true;
      return;
    }

    // Initialize RevenueCat on mobile platforms
    if (!Purchases) {
      console.warn('[Subscription] RevenueCat not available');
      this.isInitialized = true;
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || process.env.REVENUECAT_IOS_KEY;
        if (iosKey) {
          await Purchases.configure({ apiKey: iosKey });
          console.log('[Subscription] RevenueCat initialized for iOS');
        } else {
          console.warn('[Subscription] RevenueCat iOS key not found');
        }
      } else if (Platform.OS === 'android') {
        const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || process.env.REVENUECAT_ANDROID_KEY;
        if (androidKey) {
          await Purchases.configure({ apiKey: androidKey });
          console.log('[Subscription] RevenueCat initialized for Android');
        } else {
          console.warn('[Subscription] RevenueCat Android key not found');
        }
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[Subscription] Error initializing RevenueCat:', error);
      this.isInitialized = true; // Mark as initialized to prevent retry loops
    }
  }

  /**
   * Get subscription status for a user
   * On mobile: Checks RevenueCat customerInfo
   * On web: Calls backend API
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    if (Platform.OS === 'web') {
      // On web, check backend API
      try {
        const token = await getAccessToken();
        if (!token) {
          return { tier: 'free', isActive: false };
        }

        const response = await fetch(`${API_URL}/api/subscription/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('[Subscription] Failed to get status from backend');
          return { tier: 'free', isActive: false };
        }

        const data = await response.json();
        return {
          tier: data.isPro ? 'pro' : 'free',
          isActive: data.isPro,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
          platform: data.platform || 'web',
        };
      } catch (error) {
        console.error('[Subscription] Error getting status from backend:', error);
        return { tier: 'free', isActive: false };
      }
    }

    // On mobile, check RevenueCat
    if (!Purchases) {
      console.warn('[Subscription] RevenueCat not available');
      return { tier: 'free', isActive: false };
    }

    try {
      // Ensure user is identified with RevenueCat
      await Purchases.logIn(userId);
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';

      if (hasPremium) {
        const activeEntitlement = customerInfo.entitlements.active['premium'];
        const platform = activeEntitlement.store === 'APP_STORE' ? 'ios' : 'android';
        const expiresAt = activeEntitlement.expirationDate 
          ? new Date(activeEntitlement.expirationDate) 
          : undefined;

        return {
          tier: 'pro',
          isActive: true,
          expiresAt,
          platform,
        };
      }

      return { tier: 'free', isActive: false };
    } catch (error) {
      console.error('[Subscription] Error getting RevenueCat status:', error);
      return { tier: 'free', isActive: false };
    }
  }

  /**
   * Purchase a subscription
   * On mobile: Uses RevenueCat purchasePackage
   * On web: Creates Stripe checkout session and redirects
   */
  async purchaseSubscription(packageId?: string): Promise<void> {
    console.log('[Subscription] purchaseSubscription called, platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      // On web, create Stripe checkout session
      try {
        console.log('[Subscription] Getting access token for web checkout');
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Not authenticated');
        }

        console.log('[Subscription] Creating Stripe checkout session at:', `${API_URL}/api/subscription/create-checkout`);
        const response = await fetch(`${API_URL}/api/subscription/create-checkout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('[Subscription] Checkout response status:', response.status);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to create checkout' }));
          console.error('[Subscription] Checkout creation failed:', error);
          throw new Error(error.error || 'Failed to create checkout session');
        }

        const data = await response.json();
        console.log('[Subscription] Checkout response data:', data);
        
        if (data.checkoutUrl) {
          console.log('[Subscription] Redirecting to:', data.checkoutUrl);
          // Redirect to Stripe Checkout
          if (typeof window !== 'undefined') {
            window.location.href = data.checkoutUrl;
          } else {
            throw new Error('Window object not available');
          }
        } else {
          throw new Error('No checkout URL returned');
        }
      } catch (error) {
        console.error('[Subscription] Error creating checkout:', error);
        throw error;
      }
    }

    // On mobile, use RevenueCat
    if (!Purchases) {
      console.error('[Subscription] RevenueCat not available');
      throw new Error('RevenueCat not available. Please ensure the app is running on iOS or Android.');
    }

    try {
      // Get current user ID from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (userId) {
        console.log('[Subscription] Identifying user with RevenueCat:', userId);
        // Ensure user is identified with RevenueCat before purchasing
        await Purchases.logIn(userId);
      }

      console.log('[Subscription] Getting RevenueCat offerings');
      // Get offerings
      const offerings = await Purchases.getOfferings();
      console.log('[Subscription] Offerings received:', {
        hasCurrent: !!offerings.current,
        packageCount: offerings.current?.availablePackages?.length || 0,
      });
      
      if (!offerings.current) {
        console.error('[Subscription] No current offering available');
        throw new Error('No subscription offerings available');
      }

      // Find the package to purchase
      let packageToPurchase = null;
      if (packageId) {
        packageToPurchase = offerings.current.availablePackages.find(
          (pkg: any) => pkg.identifier === packageId
        );
      } else {
        // Default to monthly package
        packageToPurchase = offerings.current.availablePackages.find(
          (pkg: any) => pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY'
        ) || offerings.current.availablePackages[0];
      }

      if (!packageToPurchase) {
        console.error('[Subscription] No package found to purchase');
        throw new Error('No subscription package available');
      }

      console.log('[Subscription] Purchasing package:', packageToPurchase.identifier);
      // Purchase the package
      const purchaseResult = await Purchases.purchasePackage(packageToPurchase);
      console.log('[Subscription] Purchase result received');

      // Check if premium was activated
      if (!purchaseResult.customerInfo.entitlements.active['premium']) {
        console.error('[Subscription] Purchase completed but premium not activated');
        throw new Error('Purchase completed but premium was not activated');
      }

      console.log('[Subscription] Purchase successful, premium activated');
    } catch (error: any) {
      console.error('[Subscription] Purchase error:', error);
      console.error('[Subscription] Error details:', {
        message: error?.message,
        userCancelled: error?.userCancelled,
        code: error?.code,
      });
      
      if (error.userCancelled) {
        // User cancelled, don't throw error
        console.log('[Subscription] User cancelled purchase');
        return;
      }
      throw error;
    }
  }

  /**
   * Restore purchases (mobile only)
   * On web: No-op (returns void)
   */
  async restorePurchases(userId: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('[Subscription] Restore purchases not available on web');
      return;
    }

    if (!Purchases) {
      throw new Error('RevenueCat not available');
    }

    try {
      // Ensure user is identified with RevenueCat
      await Purchases.logIn(userId);
      const customerInfo = await Purchases.restorePurchases();

      if (!customerInfo.entitlements.active['premium']) {
        throw new Error('No active subscriptions found');
      }

      console.log('[Subscription] Purchases restored successfully');
    } catch (error: any) {
      console.error('[Subscription] Restore error:', error);
      throw error;
    }
  }

  /**
   * Sync subscription status to backend
   * Updates Supabase subscriptions table with current status
   */
  async syncToBackend(userId: string): Promise<void> {
    try {
      const status = await this.getSubscriptionStatus(userId);

      if (status.isActive && status.platform) {
        // Update backend with active subscription
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          status: 'active',
          platform: status.platform,
          expires_at: status.expiresAt?.toISOString() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } else {
        // Update to free if no active subscription
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          status: 'free',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    } catch (error) {
      console.error('[Subscription] Error syncing to backend:', error);
      // Don't throw - this is a background sync
    }
  }

  /**
   * Log out from RevenueCat (mobile only)
   */
  async logOut(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    if (!Purchases) {
      return;
    }

    try {
      await Purchases.logOut();
      console.log('[Subscription] Logged out from RevenueCat');
    } catch (error) {
      console.error('[Subscription] Error logging out from RevenueCat:', error);
      // Don't throw - continue with logout even if RevenueCat fails
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
