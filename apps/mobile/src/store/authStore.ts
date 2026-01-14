import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
// Lazy import to avoid module resolution issues during config evaluation
// import Purchases from 'react-native-purchases';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isPremium: boolean;
  isEmailVerified: boolean;
  showEmailVerificationModal: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  setShowEmailVerificationModal: (show: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isInitialized: false,
  isPremium: false,
  isEmailVerified: true, // Default to true until we check
  showEmailVerificationModal: false,

  setSession: (session) => {
    const isEmailVerified = !!session?.user?.email_confirmed_at;
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isEmailVerified,
    });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true });
    
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check email verification status
    const isEmailVerified = !!session?.user?.email_confirmed_at;
    
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isInitialized: true,
      isEmailVerified,
    });

    // Check subscription status if user is logged in
    if (session?.user) {
      await get().checkSubscriptionStatus();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      const isEmailVerified = !!session?.user?.email_confirmed_at;
      
      set({
        session,
        user: session?.user ?? null,
        isEmailVerified,
      });
      
      // Check subscription when user logs in
      if (session?.user) {
        await get().checkSubscriptionStatus();
      } else {
        set({ isPremium: false });
      }

      // If user just verified their email, update state
      if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
        set({ 
          isEmailVerified: true,
          showEmailVerificationModal: false,
        });
      }
    });
  },

  checkEmailVerification: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const isVerified = !!user.email_confirmed_at;
      set({ 
        user,
        isEmailVerified: isVerified,
      });
      return isVerified;
    }
    
    return false;
  },

  setShowEmailVerificationModal: (show) => {
    set({ showEmailVerificationModal: show });
  },

  checkSubscriptionStatus: async () => {
    const user = get().user;
    if (!user) {
      set({ isPremium: false });
      return false;
    }

    try {
      // Lazy import to avoid loading during config evaluation
      const Purchases = (await import('react-native-purchases')).default;
      
      // Check RevenueCat entitlements
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';

      // Also check backend for consistency
      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      const backendPremium = data?.status === 'active';
      const isPremium = hasPremium || backendPremium;
      
      set({ isPremium });
      return isPremium;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Fallback to backend check only
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .single();

        const isPremium = data?.status === 'active';
        set({ isPremium });
        return isPremium;
      } catch (backendError) {
        console.error('Error checking backend subscription:', backendError);
        set({ isPremium: false });
        return false;
      }
    }
  },

  refreshSubscription: async () => {
    const user = get().user;
    if (!user) return;

    try {
      // Lazy import to avoid loading during config evaluation
      const Purchases = (await import('react-native-purchases')).default;
      
      // Ensure user is identified with RevenueCat
      await Purchases.logIn(user.id);
      
      const customerInfo = await Purchases.getCustomerInfo();
      const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';

      // Update backend with subscription details
      if (hasPremium) {
        const activeEntitlement = customerInfo.entitlements.active['premium'];
        const platform = activeEntitlement.store === 'APP_STORE' ? 'ios' : 'android';
        
        await supabase.from('subscriptions').upsert({
          user_id: user.id,
          status: 'active',
          platform,
          product_id: activeEntitlement.productIdentifier,
          expires_at: activeEntitlement.expirationDate || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } else {
        // Update to free if no active entitlement
        await supabase.from('subscriptions').upsert({
          user_id: user.id,
          status: 'free',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }

      set({ isPremium: hasPremium });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      // Still update local state from RevenueCat
      try {
        const Purchases = (await import('react-native-purchases')).default;
        const customerInfo = await Purchases.getCustomerInfo();
        const hasPremium = typeof customerInfo.entitlements.active['premium'] !== 'undefined';
        set({ isPremium: hasPremium });
      } catch (checkError) {
        console.error('Error checking RevenueCat status:', checkError);
      }
    }
  },

  signOut: async () => {
    try {
      // Lazy import to avoid loading during config evaluation
      const Purchases = (await import('react-native-purchases')).default;
      // Log out from RevenueCat
      await Purchases.logOut();
    } catch (error) {
      console.error('Error logging out from RevenueCat:', error);
    }
    
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
      isPremium: false,
      isEmailVerified: true,
      showEmailVerificationModal: false,
    });
  },
}));
