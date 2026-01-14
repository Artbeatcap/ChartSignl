import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, EmailVerificationBanner } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { getCurrentUser, getUsage } from '../../lib/api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { FREE_ANALYSIS_LIMIT, TRADING_STYLE_LABELS } from '@chartsignl/core';
import { useEffect } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, signOut, isPremium, checkSubscriptionStatus, isEmailVerified } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: getCurrentUser,
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage'],
    queryFn: getUsage,
  });

  const profile = profileData?.user;
  const usage = usageData;

  useEffect(() => {
    // Check subscription status on mount
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user, checkSubscriptionStatus]);

  const handleUpgrade = () => {
    router.push('/premium');
  };

  const performSignOut = async () => {
    try {
      const success = await signOut();
      
      if (success) {
        // Clear React Query cache after successful sign out
        queryClient.clear();
        
        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          router.replace('/');
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleSignOut = () => {
    // On web, Alert.alert callbacks don't work reliably
    if (Platform.OS === 'web') {
      performSignOut();
      return;
    }

    // On mobile, show confirmation alert
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: performSignOut, // Pass function reference, not async inline
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/(settings)/edit-profile');
  };

  const handleNotifications = () => {
    router.push('/(settings)/notifications');
  };

  const handleHelp = () => {
    router.push('/(settings)/help');
  };

  const handlePrivacy = () => {
    router.push('/(settings)/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Verification Banner */}
        {!isEmailVerified && <EmailVerificationBanner variant="banner" />}
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.displayName?.[0]?.toUpperCase() || '👤'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.displayName || 'Trader'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Premium Upgrade Card */}
        {!isPremium ? (
          <Card style={styles.upgradeCard}>
            <View style={styles.upgradeContent}>
              <View style={styles.upgradeIconContainer}>
                <Ionicons name="star" size={32} color={colors.primary[600]} />
              </View>
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeDescription}>
                  Get unlimited analysis and advanced features
                </Text>
              </View>
            </View>
            <Button
              title="View Premium Features"
              onPress={handleUpgrade}
              variant="primary"
              fullWidth
              style={styles.upgradeButton}
            />
          </Card>
        ) : (
          <Card style={styles.premiumActiveCard}>
            <View style={styles.premiumActiveContent}>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={20} color={colors.primary[500]} />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
              <Text style={styles.premiumActiveText}>
                Premium Active - You have access to all premium features
              </Text>
            </View>
          </Card>
        )}

        {/* Usage Card */}
        <Card style={styles.usageCard}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageTitle}>
              {usage?.isPro ? '✨ Pro Plan' : 'Free Plan'}
            </Text>
            {!usage?.isPro && (
              <TouchableOpacity onPress={handleUpgrade}>
                <Text style={styles.upgradeLink}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.usageStats}>
            <View style={styles.usageStat}>
              <Text style={styles.usageNumber}>
                {usage?.isPro ? '∞' : `${FREE_ANALYSIS_LIMIT - (usage?.freeAnalysesUsed || 0)}`}
              </Text>
              <Text style={styles.usageLabel}>Analyses left</Text>
            </View>
            <View style={styles.usageDivider} />
            <View style={styles.usageStat}>
              <Text style={styles.usageNumber}>{usage?.freeAnalysesUsed || 0}</Text>
              <Text style={styles.usageLabel}>Total used</Text>
            </View>
          </View>

          {!usage?.isPro && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((usage?.freeAnalysesUsed || 0) / FREE_ANALYSIS_LIMIT) * 100}%` },
                ]}
              />
            </View>
          )}
        </Card>

        {/* Trading Profile */}
        {profile?.style && (
          <Card style={styles.profileCard}>
            <Text style={styles.cardTitle}>Your Trading Style</Text>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Style</Text>
              <Text style={styles.profileValue}>
                {TRADING_STYLE_LABELS[profile.style] || profile.style}
              </Text>
            </View>
            {profile.instruments && profile.instruments.length > 0 && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Instruments</Text>
                <Text style={styles.profileValue}>
                  {profile.instruments.join(', ')}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Settings */}
        <Card style={styles.settingsCard}>
          <Text style={styles.cardTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handleEditProfile}>
            <Text style={styles.settingsItemText}>Edit Profile</Text>
            <Text style={styles.settingsArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handleNotifications}>
            <Text style={styles.settingsItemText}>Notifications</Text>
            <Text style={styles.settingsArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handleHelp}>
            <Text style={styles.settingsItemText}>Help & Support</Text>
            <Text style={styles.settingsArrow}>→</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacy}>
            <Text style={styles.settingsItemText}>Privacy Policy</Text>
            <Text style={styles.settingsArrow}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={styles.version}>ChartSignl v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    color: colors.primary[600],
    fontWeight: '600',
  },
  name: {
    ...typography.headingLg,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  email: {
    ...typography.bodyMd,
    color: colors.neutral[500],
  },
  // Upgrade card
  upgradeCard: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[200],
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    ...typography.headingMd,
    color: colors.primary[700],
    marginBottom: spacing.xs,
  },
  upgradeDescription: {
    ...typography.bodyMd,
    color: colors.primary[600],
  },
  upgradeButton: {
    marginTop: spacing.sm,
  },
  // Premium active card
  premiumActiveCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary[300],
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  premiumActiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
  },
  premiumBadgeText: {
    ...typography.labelMd,
    color: colors.primary[600],
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  premiumActiveText: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    flex: 1,
  },
  // Usage card
  usageCard: {
    backgroundColor: colors.primary[50],
    marginBottom: spacing.md,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  usageTitle: {
    ...typography.headingSm,
    color: colors.primary[700],
  },
  upgradeLink: {
    ...typography.labelMd,
    color: colors.primary[600],
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  usageStat: {
    flex: 1,
    alignItems: 'center',
  },
  usageNumber: {
    ...typography.displaySm,
    color: colors.neutral[900],
  },
  usageLabel: {
    ...typography.bodySm,
    color: colors.neutral[500],
  },
  usageDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.primary[200],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.primary[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 3,
  },
  // Profile card
  profileCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.labelLg,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  profileLabel: {
    ...typography.bodyMd,
    color: colors.neutral[500],
  },
  profileValue: {
    ...typography.bodyMd,
    color: colors.neutral[800],
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  // Settings
  settingsCard: {
    marginBottom: spacing.lg,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  settingsItemText: {
    ...typography.bodyMd,
    color: colors.neutral[700],
  },
  settingsArrow: {
    ...typography.bodyMd,
    color: colors.neutral[400],
  },
  // Sign out
  signOutButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  signOutText: {
    ...typography.labelLg,
    color: colors.error,
  },
  version: {
    ...typography.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
