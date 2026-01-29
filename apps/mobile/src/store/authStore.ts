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
  setUserPendingVerification: (user: User) => void;
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
  isLoading: false, // Start as false, set to true when initializing
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
      isInitialized: true,
      isEmailVerified,
      pendingEmailVerification: session?.user && !isEmailVerified,
    });
    
    // If we have a user, check their subscription status
    if (session?.user) {
      get().checkSubscriptionStatus();
    }
  },

  setUserPendingVerification: (user) => {
    const isEmailVerified = !!user?.email_confirmed_at;
    set({
      session: null,
      user,
      isLoading: false,
      isInitialized: true,
      isEmailVerified,
      pendingEmailVerification: !isEmailVerified,
    });
  },

  initialize: async () => {
    // Prevent multiple simultaneous initializations - only check isInitialized
    if (get().isInitialized) {
      return;
    }
    
    // Prevent concurrent initialization attempts
    if (get().isLoading) {
      return;
    }
    
    set({ isLoading: true });
    
    try {
      // Get initial session with timeout to prevent hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: null }>((resolve) => {
        setTimeout(() => resolve({ data: { session: null }, error: null }), 5000);
      });
      
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error getting session:', error);
      }
      
      const isEmailVerified = !!session?.user?.email_confirmed_at;
      
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
        isEmailVerified,
      });

      // Check subscription status if user is logged in (don't await to prevent blocking)
      if (session?.user) {
        get().checkSubscriptionStatus().catch((err) => {
          console.error('Error checking subscription status during init:', err);
        });
      }

      // Set up auth state change listener (only once)
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event);
        
        const isEmailVerified = !!session?.user?.email_confirmed_at;
        
        set({
          session,
          user: session?.user ?? null,
          isEmailVerified,
          pendingEmailVerification: session?.user && !isEmailVerified,
        });

        // Handle specific events
        if (event === 'SIGNED_IN' && session?.user) {
          await get().checkSubscriptionStatus();
        } else if (event === 'SIGNED_OUT') {
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

      // Sign out from Supabase (best-effort; clear local state even if server errors)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Supabase signOut error (clearing local state anyway):', error);
      }

      // Always clear local state so UI can navigate home; treat sign-out as success
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
