import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { Card, Button } from '../index';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

interface PremiumFeature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface ComparisonItem {
  feature: string;
  free: string | boolean;
  premium: string | boolean;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: 'infinite',
    title: 'Unlimited AI Analysis',
    description: 'Get unlimited chart analyses every week without restrictions',
  },
  {
    icon: 'layers',
    title: 'All Timeframes',
    description: 'Access 1-hour, 4-hour, daily, and weekly chart analysis',
  },
  {
    icon: 'analytics',
    title: 'Support & Resistance Levels',
    description: 'AI-identified key price levels with confluence scoring',
  },
  {
    icon: 'trending-up',
    title: 'Technical Indicators',
    description: 'EMA overlays and technical analysis on all charts',
  },
  {
    icon: 'time',
    title: 'Analysis History',
    description: 'Full access to your saved analysis history',
  },
  {
    icon: 'star',
    title: 'Priority Support',
    description: 'Get priority customer support and feature requests',
  },
];

const COMPARISON_DATA: ComparisonItem[] = [
  {
    feature: 'Weekly Analyses',
    free: '3 per week',
    premium: 'Unlimited',
  },
  {
    feature: 'Timeframes',
    free: 'All timeframes',
    premium: 'All timeframes',
  },
  {
    feature: 'Support & Resistance',
    free: true,
    premium: true,
  },
  {
    feature: 'Technical Indicators',
    free: true,
    premium: true,
  },
  {
    feature: 'Analysis History',
    free: 'Last 3 analyses',
    premium: 'Full history',
  },
  {
    feature: 'Priority Support',
    free: false,
    premium: true,
  },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { refreshSubscription, user, isPremium } = useAuthStore();
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setIsLoading(true);
      const Purchases = (await import('react-native-purchases')).default;
      const offeringsData = await Purchases.getOfferings();
      
      if (offeringsData.current !== null) {
        setOfferings(offeringsData.current);
        const monthlyPackage = offeringsData.current.availablePackages.find(
          (pkg) => pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY'
        ) || offeringsData.current.availablePackages[0];
        
        if (monthlyPackage) {
          setSelectedPackage(monthlyPackage);
        }
      } else if (!isPremium) {
        Alert.alert(
          'No Plans Available',
          'Subscription plans are not available at the moment. Please try again later.',
          [
            { text: 'Retry', onPress: loadOfferings },
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          ]
        );
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      if (!isPremium) {
        Alert.alert(
          'Error',
          'Failed to load subscription plans. Please check your connection and try again.',
          [
            { text: 'Retry', onPress: loadOfferings },
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to purchase a subscription.');
      return;
    }

    try {
      setIsPurchasing(true);
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logIn(user.id);
      const purchaseResult = await Purchases.purchasePackage(selectedPackage);
      
      if (purchaseResult.customerInfo.entitlements.active['premium']) {
        await refreshSubscription();
        Alert.alert(
          'Welcome to Premium! 🎉',
          'Your subscription is now active. Enjoy unlimited access to all premium features!',
          [{ text: 'Get Started', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Purchase completed but premium was not activated. Please contact support.');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      if (error.userCancelled) return;
      Alert.alert(
        'Purchase Failed',
        error.message || 'An error occurred during purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to restore purchases.');
      return;
    }

    try {
      setIsRestoring(true);
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.logIn(user.id);
      const customerInfo = await Purchases.restorePurchases();
      
      if (customerInfo.entitlements.active['premium']) {
        await refreshSubscription();
        Alert.alert(
          'Purchases Restored',
          'Your premium subscription has been restored successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
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
        error.message || 'Failed to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Open iOS subscription management
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
      } else if (Platform.OS === 'android') {
        // Open Google Play subscription management
        await Linking.openURL('https://play.google.com/store/account/subscriptions');
      } else {
        // Web fallback
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

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'To cancel your subscription, you\'ll need to manage it through the App Store or Google Play Store. Would you like to open subscription settings?',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: handleManageSubscription },
      ]
    );
  };

  const handleTermsPress = () => {
    router.push('/(settings)/terms');
  };

  const handlePrivacyPress = () => {
    router.push('/(settings)/privacy');
  };

  const renderComparisonRow = (item: ComparisonItem, index: number) => {
    const renderValue = (value: string | boolean, isPremiumColumn: boolean) => {
      if (typeof value === 'boolean') {
        return value ? (
          <Ionicons name="checkmark-circle" size={20} color={isPremiumColumn ? colors.primary[500] : colors.neutral[400]} />
        ) : (
          <Ionicons name="close-circle" size={20} color={colors.neutral[300]} />
        );
      }
      return (
        <Text style={[styles.comparisonValue, isPremiumColumn && styles.comparisonValuePremium]}>
          {value}
        </Text>
      );
    };

    return (
      <View key={index} style={[styles.comparisonRow, index % 2 === 0 && styles.comparisonRowAlt]}>
        <Text style={styles.comparisonFeature}>{item.feature}</Text>
        <View style={styles.comparisonCell}>{renderValue(item.free, false)}</View>
        <View style={styles.comparisonCell}>{renderValue(item.premium, true)}</View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.neutral[600]} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Premium user view - show subscription management
  if (isPremium) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.neutral[600]} />
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainerPremium}>
              <Ionicons name="star" size={48} color={colors.primary[500]} />
            </View>
            <Text style={styles.title}>Premium Active</Text>
            <Text style={styles.subtitle}>
              You have access to all premium features
            </Text>
          </View>

          {/* Current Plan Card */}
          <Card style={styles.currentPlanCard}>
            <View style={styles.currentPlanHeader}>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={16} color={colors.primary[500]} />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
              <Text style={styles.currentPlanPrice}>$4.99/month</Text>
            </View>
            <Text style={styles.currentPlanDescription}>
              Your subscription renews automatically each month. You can manage or cancel your subscription at any time.
            </Text>
          </Card>

          {/* Features List */}
          <Card style={styles.featuresCard}>
            <Text style={styles.sectionTitle}>Your Premium Features</Text>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={24} color={colors.primary[500]} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Manage Subscription */}
          <Button
            title="Manage Subscription"
            onPress={handleManageSubscription}
            variant="outline"
            fullWidth
            style={styles.manageButton}
          />

          <Button
            title="Cancel Subscription"
            onPress={handleCancelSubscription}
            variant="ghost"
            fullWidth
            style={styles.cancelButton}
          />

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Subscriptions are managed through the App Store or Google Play Store. 
              Cancellation takes effect at the end of your current billing period.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Non-premium user view - show upgrade options
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.neutral[600]} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="star" size={48} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.subtitle}>
            Unlock unlimited analysis for just $4.99/month
          </Text>
        </View>

        {/* Plan Comparison */}
        <Card style={styles.comparisonCard}>
          <Text style={styles.sectionTitle}>Compare Plans</Text>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonHeaderLabel}>Feature</Text>
            <Text style={styles.comparisonHeaderPlan}>Free</Text>
            <Text style={[styles.comparisonHeaderPlan, styles.comparisonHeaderPremium]}>Premium</Text>
          </View>
          {COMPARISON_DATA.map((item, index) => renderComparisonRow(item, index))}
        </Card>

        {/* Features List */}
        <Card style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={24} color={colors.primary[500]} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Subscription Plan */}
        {offerings && selectedPackage && (
          <Card style={styles.planCard}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.planContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly Premium</Text>
                <Text style={styles.planPrice}>
                  {selectedPackage.product.priceString || '$4.99'}/month
                </Text>
                <Text style={styles.planDescription}>
                  Cancel anytime. Billed monthly.
                </Text>
              </View>
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
              </View>
            </View>
          </Card>
        )}

        {/* Fallback if no offerings loaded */}
        {!offerings && (
          <Card style={styles.planCard}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.planContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly Premium</Text>
                <Text style={styles.planPrice}>$4.99/month</Text>
                <Text style={styles.planDescription}>
                  Cancel anytime. Billed monthly.
                </Text>
              </View>
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
              </View>
            </View>
          </Card>
        )}

        {/* Purchase Button */}
        <Button
          title={isPurchasing ? 'Processing...' : 'Start Premium - $4.99/month'}
          onPress={handlePurchase}
          disabled={isPurchasing || (!selectedPackage && !!offerings)}
          loading={isPurchasing}
          fullWidth
          style={styles.purchaseButton}
        />

        {/* Restore Button */}
        <Button
          title={isRestoring ? 'Restoring...' : 'Restore Purchases'}
          onPress={handleRestore}
          disabled={isRestoring}
          loading={isRestoring}
          variant="ghost"
          fullWidth
          style={styles.restoreButton}
        />

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink} onPress={handleTermsPress}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={handlePrivacyPress}>
              Privacy Policy
            </Text>
            . Subscription will auto-renew unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.neutral[500],
    marginTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconContainerPremium: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary[300],
  },
  title: {
    ...typography.displayMd,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  // Comparison styles
  comparisonCard: {
    marginBottom: spacing.lg,
  },
  comparisonHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  comparisonHeaderLabel: {
    flex: 2,
    ...typography.labelMd,
    color: colors.neutral[600],
  },
  comparisonHeaderPlan: {
    flex: 1,
    ...typography.labelMd,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  comparisonHeaderPremium: {
    color: colors.primary[600],
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  comparisonRowAlt: {
    backgroundColor: colors.neutral[50],
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  comparisonFeature: {
    flex: 2,
    ...typography.bodySm,
    color: colors.neutral[700],
  },
  comparisonCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonValue: {
    ...typography.bodySm,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  comparisonValuePremium: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  // Features styles
  featuresCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.headingSm,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  featureDescription: {
    ...typography.bodySm,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  // Current plan styles (for premium users)
  currentPlanCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary[50],
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    ...typography.labelSm,
    color: colors.primary[700],
    marginLeft: spacing.xs,
  },
  currentPlanPrice: {
    ...typography.headingMd,
    color: colors.primary[600],
  },
  currentPlanDescription: {
    ...typography.bodySm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  // Plan styles
  planCard: {
    marginBottom: spacing.lg,
  },
  planContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    ...typography.headingSm,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  planPrice: {
    ...typography.displaySm,
    color: colors.primary[600],
    marginBottom: spacing.xs,
  },
  planDescription: {
    ...typography.bodySm,
    color: colors.neutral[500],
  },
  selectedIndicator: {
    marginLeft: spacing.md,
  },
  purchaseButton: {
    marginBottom: spacing.md,
  },
  restoreButton: {
    marginBottom: spacing.lg,
  },
  manageButton: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    marginBottom: spacing.lg,
  },
  infoContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  termsContainer: {
    paddingHorizontal: spacing.md,
  },
  termsText: {
    ...typography.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    ...typography.bodySm,
    color: colors.primary[600],
    textDecorationLine: 'underline',
  },
});
