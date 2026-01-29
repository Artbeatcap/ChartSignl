import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface EmailVerificationBannerProps {
  /** Whether to show as a compact banner or full modal */
  variant?: 'banner' | 'modal';
  /** Callback when user dismisses the banner */
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ 
  variant = 'banner',
  onDismiss 
}: EmailVerificationBannerProps) {
  const { user, isEmailVerified, checkEmailVerification, refreshSession } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showModal, setShowModal] = useState(true);

  // #region agent log
  const shouldHide = isEmailVerified || !user;
  fetch('http://127.0.0.1:7243/ingest/40355958-aed9-4b22-9cb1-0b68d3805912',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EmailVerificationBanner.tsx:render',message:'EmailVerificationBanner render',data:{hasUser:!!user,isEmailVerified,shouldHide},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // All hooks must run unconditionally (before any early return) to satisfy Rules of Hooks
  useEffect(() => {
    // Countdown timer for resend cooldown
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    // Periodically check if email was verified (e.g., user clicked link in another tab)
    const interval = setInterval(() => {
      checkEmailVerification();
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [checkEmailVerification]);

  // Don't show if email is already verified or no user (after all hooks)
  if (shouldHide) {
    return null;
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!,
      });

      if (error) throw error;

      setShowSuccess(true);
      setResendCooldown(60); // 60 second cooldown
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to send verification email. Please try again.';
      
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      }
      
      console.error('Email verification error:', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // First try to refresh the session
      await refreshSession();
      // Then check email verification status
      const verified = await checkEmailVerification();
      
      if (verified) {
        // Email is now verified!
        if (Platform.OS === 'web') {
          window.alert('Email verified! You now have full access to all features.');
        }
      }
    } catch (error) {
      console.error('Error refreshing verification status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    onDismiss?.();
  };

  // Modal variant - shows on first load after signup
  if (variant === 'modal') {
    return (
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="mail-outline" size={48} color={colors.primary[500]} />
            </View>
            
            <Text style={styles.modalTitle}>Check your email</Text>
            <Text style={styles.modalDescription}>
              We've sent a verification link to{'\n'}
              <Text style={styles.emailText}>{user.email}</Text>
            </Text>
            
            <Text style={styles.modalSubtext}>
              You can start exploring the app now. Some features may be limited until you verify your email.
            </Text>

            {showSuccess ? (
              <View style={styles.successMessage}>
                <Ionicons name="checkmark-circle" size={20} color={colors.green[600]} />
                <Text style={styles.successText}>Verification email sent!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
                onPress={handleResendEmail}
                disabled={resendCooldown > 0 || isResending}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                ) : (
                  <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                    {resendCooldown > 0 
                      ? `Resend in ${resendCooldown}s` 
                      : "Didn't receive it? Resend"}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <Text style={styles.dismissText}>Continue to App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Banner variant - shows in profile and other screens
  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <View style={styles.bannerIcon}>
          <Ionicons name="mail-unread-outline" size={24} color={colors.amber[600]} />
        </View>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Verify your email</Text>
          <Text style={styles.bannerDescription}>
            Check your inbox for a verification link to unlock all features.
          </Text>
        </View>
      </View>
      
      <View style={styles.bannerActions}>
        {/* Refresh button to check if verified */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefreshStatus}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary[600]} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={colors.primary[600]} />
              <Text style={styles.refreshText}>I've verified</Text>
            </>
          )}
        </TouchableOpacity>

        {showSuccess ? (
          <View style={styles.bannerSuccess}>
            <Ionicons name="checkmark-circle" size={16} color={colors.green[600]} />
            <Text style={styles.bannerSuccessText}>Sent!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.bannerResendButton, resendCooldown > 0 && styles.bannerResendButtonDisabled]}
            onPress={handleResendEmail}
            disabled={resendCooldown > 0 || isResending}
          >
            {isResending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.bannerResendText}>
                {resendCooldown > 0 ? `${resendCooldown}s` : 'Resend'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner styles
  banner: {
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.labelLg,
    color: colors.amber[800],
    marginBottom: spacing.xxs,
  },
  bannerDescription: {
    ...typography.bodySm,
    color: colors.amber[700],
    lineHeight: 18,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginLeft: 40, // Align with text
    gap: spacing.sm,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[200],
    gap: 4,
  },
  refreshText: {
    ...typography.bodySm,
    color: colors.primary[600],
    fontWeight: '500',
  },
  bannerResendButton: {
    backgroundColor: colors.amber[600],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  bannerResendButtonDisabled: {
    backgroundColor: colors.amber[400],
  },
  bannerResendText: {
    ...typography.bodySm,
    color: colors.white,
    fontWeight: '600',
  },
  bannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerSuccessText: {
    ...typography.bodySm,
    color: colors.green[600],
    fontWeight: '500',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.headingLg,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  emailText: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  modalSubtext: {
    ...typography.bodySm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  successText: {
    ...typography.bodyMd,
    color: colors.green[600],
    fontWeight: '500',
  },
  resendButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    ...typography.bodyMd,
    color: colors.primary[600],
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: colors.neutral[400],
  },
  dismissButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  dismissText: {
    ...typography.bodyMd,
    color: colors.white,
    fontWeight: '600',
  },
});
