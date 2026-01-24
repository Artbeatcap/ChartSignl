import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { subscriptionService } from '../services/subscription.service';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isPremium: boolean;
  isEmailVerified: boolean;
  showEmailVerificationModal: boolean;
  pendingEmailVerification: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  setShowEmailVerificationModal: (show: boolean) => void;
  setPendingEmailVerification: (pending: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isInitialized: false,
  isPremium: false,
  isEmailVerified: true, // Default to true until we check
  showEmailVerificationModal: false,
  pendingEmailVerification: false,

  setSession: (session) => {
    const isEmailVerified = !!session?.user?.email_confirmed_at;
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isEmailVerified,
      pendingEmailVerification: session?.user && !isEmailVerified,
    });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true });
    
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }
      
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
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({
        session: null,
        user: null,
        isLoading: false,
        isInitialized: true,
        isEmailVerified: false,
      });
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
          pendingEmailVerification: false,
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

  setPendingEmailVerification: (pending) => {
    set({ pendingEmailVerification: pending });
  },

  checkSubscriptionStatus: async () => {
    const user = get().user;
    if (!user) {
      set({ isPremium: false });
      return false;
    }

    try {
      const status = await subscriptionService.getSubscriptionStatus(user.id);
      set({ isPremium: status.isActive });
      return status.isActive;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      set({ isPremium: false });
      return false;
    }
  },

  refreshSubscription: async () => {
    const user = get().user;
    if (!user) return;

    try {
      const status = await subscriptionService.getSubscriptionStatus(user.id);
      set({ isPremium: status.isActive });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      // Fallback: check status again
      try {
        const status = await subscriptionService.getSubscriptionStatus(user.id);
        set({ isPremium: status.isActive });
      } catch (checkError) {
        console.error('Error checking subscription status:', checkError);
        set({ isPremium: false });
      }
    }
  },

  signOut: async (): Promise<boolean> => {
    try {
      // Log out from subscription service (RevenueCat on mobile)
      try {
        await subscriptionService.logOut();
      } catch (subError) {
        console.log('Subscription service logout skipped (not initialized or error):', subError);
        // Continue with sign out even if subscription service fails
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        return false;
      }
      
      // Clear local state
      set({
        session: null,
        user: null,
        isPremium: false,
        isEmailVerified: true,
        showEmailVerificationModal: false,
        pendingEmailVerification: false,
      });
      
      return true;
    } catch (error) {
      console.error('SignOut error:', error);
      return false;
    }
  },
}));
