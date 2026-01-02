import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    });
  },

  initialize: async () => {
    if (get().isInitialized) return;
    
    set({ isLoading: true });
    
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isInitialized: true,
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
      });
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      session: null,
      user: null,
    });
  },
}));
