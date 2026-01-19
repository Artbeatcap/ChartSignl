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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../index';
import { useAuthStore } from '../../store/authStore';
import { subscriptionService } from '../../services/subscription.service';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

// Local type definitions for RevenueCat (only used on mobile, not imported to avoid web issues)
// These match the structure from react-native-purchases but are defined locally
interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

interface PurchasesOffering {
  availablePackages: PurchasesPackage[];
}

interface PremiumFeature {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: 'infinite',
    title: 'Unlimited AI-powered analysis',
    description: 'Get unlimited chart analyses without any restrictions',
  },
  {
    icon: 'trending-up',
    title: 'Advanced technical indicators',
    description: 'EMAs, Bollinger Bands, Fibonacci retracements, and more',
  },
  {
    icon: 'notifications',
    title: 'Priority notifications and alerts',
    description: 'Get instant alerts for key price levels and market movements',
  },
  {
    icon: 'bar-chart',
    title: 'Volume profile analysis',
    description: 'Deep insights into trading volume patterns and support/resistance',
  },
  {
    icon: 'flash',
    title: 'Real-time market data',
    description: 'Access live market data and real-time price updates',
  },
  {
    icon: 'download',
    title: 'Save and export charts',
    description: 'Save your analyses and export charts in high quality',
  },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { refreshSubscription, user } = useAuthStore();
  // Only use these types on mobile - on web they'll be null
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setIsLoading(true);
      
      if (Platform.OS === 'web') {
        // Web doesn't use RevenueCat offerings, show a simple plan
        setIsLoading(false);
        return;
      }

      const offeringsData = await subscriptionService.getOfferings();
      
      if (offeringsData?.current !== null) {
        setOfferings(offeringsData.current);
        // Select the first available package (monthly)
        const monthlyPackage = offeringsData.current.availablePackages.find(
          (pkg: any) => pkg.identifier === '$rc_monthly' || pkg.packageType === 'MONTHLY'
        ) || offeringsData.current.availablePackages[0];
        
        if (monthlyPackage) {
          setSelectedPackage(monthlyPackage);
        }
      } else {
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
      Alert.alert(
        'Error',
        'Failed to load subscription plans. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: loadOfferings },
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (Platform.OS === 'web') {
      // Web: Create Stripe checkout session
      if (!user) {
        Alert.alert('Error', 'You must be logged in to purchase a subscription.');
        return;
      }

      try {
        setIsPurchasing(true);
        const result = await subscriptionService.purchaseSubscription();
        
        if (result.checkoutUrl) {
          // Open Stripe checkout in browser
          const canOpen = await Linking.canOpenURL(result.checkoutUrl);
          if (canOpen) {
            await Linking.openURL(result.checkoutUrl);
          } else {
            Alert.alert('Error', 'Cannot open checkout URL. Please try again.');
          }
        } else {
          Alert.alert('Error', 'Failed to create checkout session. Please try again.');
        }
      } catch (error: any) {
        console.error('Purchase error:', error);
        Alert.alert(
          'Purchase Failed',
          error.message || 'An error occurred during purchase. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsPurchasing(false);
      }
      return;
    }

    // Mobile: Use RevenueCat
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
      const result = await subscriptionService.purchaseSubscription(selectedPackage, user.id);
      
      if (result.success) {
        // Premium activated!
        await refreshSubscription();
        
        Alert.alert(
          'Welcome to Premium! 🎉',
          'Your subscription is now active. Enjoy unlimited access to all premium features!',
          [
            {
              text: 'Get Started',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Purchase completed but premium was not activated. Please contact support.');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      
      if (error.message === 'Purchase cancelled') {
        // User cancelled, don't show error
        return;
      }
      
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
    if (Platform.OS === 'web') {
      // Web doesn't have restore purchases
      Alert.alert(
        'Not Available',
        'Restore purchases is not available on web. Please contact support if you need help with your subscription.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to restore purchases.');
      return;
    }

    try {
      setIsRestoring(true);
      const restored = await subscriptionService.restorePurchases(user.id);
      
      if (restored) {
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.title}>Premium</Text>
          <Text style={styles.subtitle}>
            Unlock the full power of ChartSignl
          </Text>
        </View>

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
        {Platform.OS === 'web' ? (
          <Card style={styles.planCard}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.planContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly Subscription</Text>
                <Text style={styles.planPrice}>Premium Access</Text>
                <Text style={styles.planDescription}>
                  Cancel anytime. Billed monthly.
                </Text>
              </View>
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
              </View>
            </View>
          </Card>
        ) : (
          offerings && selectedPackage && (
            <Card style={styles.planCard}>
              <Text style={styles.sectionTitle}>Subscription Plan</Text>
              <View style={styles.planContainer}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Monthly Subscription</Text>
                  <Text style={styles.planPrice}>{selectedPackage.product.priceString}/month</Text>
                  <Text style={styles.planDescription}>
                    Cancel anytime. Billed monthly.
                  </Text>
                </View>
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
                </View>
              </View>
            </Card>
          )
        )}

        {/* Purchase Button */}
        <Button
          title={isPurchasing ? 'Processing...' : 'Start Premium'}
          onPress={handlePurchase}
          disabled={isPurchasing || (Platform.OS !== 'web' && !selectedPackage)}
          loading={isPurchasing}
          fullWidth
          style={styles.purchaseButton}
        />

        {/* Restore Button - Mobile only */}
        {Platform.OS !== 'web' && (
          <Button
            title={isRestoring ? 'Restoring...' : 'Restore Purchases'}
            onPress={handleRestore}
            disabled={isRestoring}
            loading={isRestoring}
            variant="ghost"
            fullWidth
            style={styles.restoreButton}
          />
        )}

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Subscription will auto-renew unless cancelled at least 24 hours before the end of the current period.
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
  termsContainer: {
    paddingHorizontal: spacing.md,
  },
  termsText: {
    ...typography.bodySm,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
});

