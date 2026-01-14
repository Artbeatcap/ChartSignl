import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
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
  const { user, isEmailVerified, checkEmailVerification } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showModal, setShowModal] = useState(true);

  // Don't show if email is already verified or no user
  if (isEmailVerified || !user) {
    return null;
  }

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
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkEmailVerification]);

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
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setShowModal(false);
    onDismiss?.();
  };

  const handleRefreshStatus = async () => {
    await checkEmailVerification();
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

            <TouchableOpacity style={styles.continueButton} onPress={handleDismiss}>
              <Text style={styles.continueButtonText}>Continue to App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Banner variant - persistent reminder
  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <View style={styles.bannerIcon}>
          <Ionicons name="mail-unread-outline" size={20} color={colors.amber[700]} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Verify your email</Text>
          <Text style={styles.bannerDescription}>
            Check your inbox for a verification link
          </Text>
        </View>
      </View>
      
      <View style={styles.bannerActions}>
        {showSuccess ? (
          <View style={styles.bannerSuccess}>
            <Ionicons name="checkmark" size={16} color={colors.green[600]} />
            <Text style={styles.bannerSuccessText}>Sent!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.bannerResendButton}
            onPress={handleResendEmail}
            disabled={resendCooldown > 0 || isResending}
          >
            {isResending ? (
              <ActivityIndicator size="small" color={colors.amber[700]} />
            ) : (
              <Text style={[styles.bannerResendText, resendCooldown > 0 && styles.bannerResendTextDisabled]}>
                {resendCooldown > 0 ? `${resendCooldown}s` : 'Resend'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefreshStatus}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.amber[700]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
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
    ...typography.displaySm,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalDescription: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emailText: {
    color: colors.neutral[900],
    fontWeight: '600',
  },
  modalSubtext: {
    ...typography.bodySm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  successText: {
    ...typography.bodySm,
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
    ...typography.bodySm,
    color: colors.primary[600],
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: colors.neutral[400],
  },
  continueButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
  },
  continueButtonText: {
    ...typography.labelLg,
    color: colors.white,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Banner styles
  banner: {
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.amber[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.labelMd,
    color: colors.amber[800],
    fontWeight: '600',
  },
  bannerDescription: {
    ...typography.bodySm,
    color: colors.amber[700],
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerSuccessText: {
    ...typography.labelSm,
    color: colors.green[600],
    fontWeight: '500',
  },
  bannerResendButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  bannerResendText: {
    ...typography.labelSm,
    color: colors.amber[700],
    fontWeight: '600',
  },
  bannerResendTextDisabled: {
    color: colors.amber[400],
  },
  refreshButton: {
    padding: spacing.xs,
  },
});

export default EmailVerificationBanner;

