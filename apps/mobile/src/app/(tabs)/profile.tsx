import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, EmailVerificationBanner } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { getCurrentUser, getUsage } from '../../lib/api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { FREE_ANALYSIS_LIMIT, TRADING_STYLE_OPTIONS } from '@chartsignl/core';
import { useEffect } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, signOut, isPremium, checkSubscriptionStatus, isEmailVerified, refreshSubscription } = useAuthStore();

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
  
  // Calculate remaining analyses for display
  const remainingAnalyses = usage?.isPro 
    ? Infinity 
    : (usage?.freeAnalysesLimit || FREE_ANALYSIS_LIMIT) - (usage?.freeAnalysesUsed || 0);

  useEffect(() => {
    // Check subscription status on mount
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user, checkSubscriptionStatus]);

  const handleUpgrade = () => {
    router.push('/premium');
  };

  const handleManageSubscription = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else if (Platform.OS === 'android') {
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      } else {
        Alert.alert(
          'Manage Subscription',
          'Please manage your subscription through the App Store or Google Play Store where you originally subscribed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      Alert.alert(
        'Error',
        'Unable to open subscription management. Please go to your device\'s Settings > Subscriptions to manage your subscription.',
        [{ text: 'OK' }]
      );
    }
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

  const handleTerms = () => {
    router.push('/(settings)/terms');
  };

  const handleRestorePurchases = async () => {
    try {
      const Purchases = (await import('react-native-purchases')).default;

      if (user?.id) {
        await Purchases.logIn(user.id);
      }

      const customerInfo = await Purchases.restorePurchases();

      if (customerInfo.entitlements.active['premium']) {
        await refreshSubscription();
        Alert.alert(
          'Success',
          'Your premium subscription has been restored!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any active subscriptions to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    }
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
                  Unlimited analysis for $4.99/month
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
              <Text style={styles.premiumPriceText}>$4.99/month</Text>
            </View>
            <Text style={styles.premiumActiveText}>
              You have access to all premium features
            </Text>
            <TouchableOpacity 
              style={styles.manageSubscriptionLink}
              onPress={handleUpgrade}
            >
              <Text style={styles.manageSubscriptionText}>View Benefits & Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary[500]} />
            </TouchableOpacity>
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
                {usage?.isPro ? '∞' : remainingAnalyses}
              </Text>
              <Text style={styles.usageLabel}>
                {usage?.isPro ? 'Unlimited' : 'Analyses Left'}
              </Text>
            </View>
            <View style={styles.usageDivider} />
            <View style={styles.usageStat}>
              <Text style={styles.usageNumber}>{usage?.freeAnalysesUsed || 0}</Text>
              <Text style={styles.usageLabel}>Total Analyses</Text>
            </View>
          </View>

          {!usage?.isPro && (
            <View style={styles.usageProgress}>
              <View style={styles.usageProgressBar}>
                <View
                  style={[
                    styles.usageProgressFill,
                    { width: `${((usage?.freeAnalysesUsed || 0) / (usage?.freeAnalysesLimit || FREE_ANALYSIS_LIMIT)) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.usageProgressText}>
                {remainingAnalyses} of {usage?.freeAnalysesLimit || FREE_ANALYSIS_LIMIT} free analyses this week
              </Text>
            </View>
          )}
        </Card>

        {/* Trading Profile */}
        {profile?.tradingStyle && (
          <Card style={styles.profileCard}>
            <Text style={styles.cardTitle}>Your Trading Profile</Text>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Trading Style</Text>
              <Text style={styles.profileValue}>
                {TRADING_STYLE_OPTIONS.find(o => o.value === profile.tradingStyle)?.label || profile.tradingStyle}
              </Text>
            </View>
            {profile.experienceLevel && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Experience Level</Text>
                <Text style={styles.profileValue}>
                  {profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1)}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Settings Section */}
        <Card style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingsItem} onPress={handleEditProfile}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="person-outline" size={24} color={colors.neutral[600]} />
              <Text style={styles.settingsItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={handleNotifications}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={colors.neutral[600]} />
              <Text style={styles.settingsItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>

          {/* Subscription Management - Only show for premium users */}
          {isPremium && (
            <TouchableOpacity style={styles.settingsItem} onPress={handleManageSubscription}>
              <View style={styles.settingsItemLeft}>
                <Ionicons name="card-outline" size={24} color={colors.neutral[600]} />
                <Text style={styles.settingsItemText}>Manage Subscription</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.settingsItem} onPress={handleHelp}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color={colors.neutral[600]} />
              <Text style={styles.settingsItemText}>Help & FAQ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={handleTerms}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="document-text-outline" size={24} color={colors.neutral[600]} />
              <Text style={styles.settingsItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingsItem} onPress={handlePrivacy}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield-outline" size={24} color={colors.neutral[600]} />
              <Text style={styles.settingsItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          style={styles.signOutButton}
        />

        {/* App Version */}
        <Text style={styles.versionText}>ChartSignl v1.0.0</Text>
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
    ...typography.displayMd,
    color: colors.primary[600],
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
  // Upgrade Card
  upgradeCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary[50],
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  upgradeDescription: {
    ...typography.bodySm,
    color: colors.neutral[600],
  },
  upgradeButton: {
    marginTop: spacing.sm,
  },
  // Premium Active Card
  premiumActiveCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  premiumActiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.labelMd,
    color: colors.primary[700],
    marginLeft: spacing.xs,
  },
  premiumPriceText: {
    ...typography.headingSm,
    color: colors.primary[600],
  },
  premiumActiveText: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    marginBottom: spacing.md,
  },
  manageSubscriptionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primary[200],
  },
  manageSubscriptionText: {
    ...typography.labelMd,
    color: colors.primary[500],
    marginRight: spacing.xs,
  },
  // Usage card
  // Usage Card
  usageCard: {
    marginBottom: spacing.lg,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  usageTitle: {
    ...typography.headingMd,
    color: colors.neutral[900],
  },
  upgradeLink: {
    ...typography.labelMd,
    color: colors.primary[500],
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
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  usageLabel: {
    ...typography.bodySm,
    color: colors.neutral[500],
  },
  usageDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing.md,
  },
  usageProgress: {
    marginTop: spacing.sm,
  },
  usageProgressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  usageProgressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  usageProgressText: {
    ...typography.bodySm,
    color: colors.neutral[500],
    textAlign: 'center',
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
  // Settings Card
  settingsCard: {
    marginBottom: spacing.lg,
  },
  settingsTitle: {
    ...typography.headingMd,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemText: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    marginLeft: spacing.md,
  },
  signOutButton: {
    marginBottom: spacing.lg,
  },
  versionText: {
    ...typography.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
});
