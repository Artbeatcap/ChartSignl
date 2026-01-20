import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Card, Button } from '../index';
import { useAuthStore } from '../../store/authStore';
import { subscriptionService } from '../../services/subscription.service';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    // On web, we don't need to load offerings (Stripe handles pricing)
    // On mobile, offerings are loaded when user tries to purchase
    setIsLoading(false);
  }, []);

  const handlePurchase = async () => {
    console.log('[PremiumScreen] Purchase button clicked');
    
    if (!user) {
      console.log('[PremiumScreen] No user found');
      Alert.alert('Error', 'You must be logged in to purchase a subscription.');
      return;
    }

    console.log('[PremiumScreen] User found:', user.id);
    console.log('[PremiumScreen] Platform:', Platform.OS);

    try {
      setIsPurchasing(true);
      console.log('[PremiumScreen] Starting purchase flow...');

      if (Platform.OS === 'web') {
        console.log('[PremiumScreen] Web platform - creating Stripe checkout');
        // On web, subscription service will redirect to Stripe Checkout
        await subscriptionService.purchaseSubscription();
        console.log('[PremiumScreen] Redirecting to Stripe Checkout');
        // Note: User will be redirected away, so we don't need to handle success here
        return;
      }

      console.log('[PremiumScreen] Mobile platform - using RevenueCat');
      // On mobile, use RevenueCat
      await subscriptionService.purchaseSubscription();
      console.log('[PremiumScreen] Purchase successful, refreshing subscription');
      
      // If we get here, purchase was successful
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
    } catch (error: any) {
      console.error('[PremiumScreen] Purchase error:', error);
      console.error('[PremiumScreen] Error details:', {
        message: error?.message,
        userCancelled: error?.userCancelled,
        stack: error?.stack,
      });
      
      if (error.userCancelled || error.message?.includes('cancelled')) {
        // User cancelled, don't show error
        console.log('[PremiumScreen] User cancelled purchase');
        return;
      }
      
      Alert.alert(
        'Purchase Failed',
        error.message || 'An error occurred during purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
      console.log('[PremiumScreen] Purchase flow completed');
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
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.neutral[700]} />
          <Text style={styles.backButtonText}>Back to Settings</Text>
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
        {Platform.OS !== 'web' && (
          <Card style={styles.planCard}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.planContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly Subscription</Text>
                <Text style={styles.planDescription}>
                  Cancel anytime. Billed monthly.
                </Text>
              </View>
            </View>
          </Card>
        )}
        
        {Platform.OS === 'web' && (
          <Card style={styles.planCard}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.planContainer}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly Subscription</Text>
                <Text style={styles.planDescription}>
                  You'll be redirected to Stripe Checkout to complete your purchase.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Purchase Button */}
        <Button
          title={isPurchasing ? 'Processing...' : 'Start Premium'}
          onPress={() => {
            console.log('[PremiumScreen] Button onPress triggered');
            handlePurchase();
          }}
          disabled={isPurchasing}
          loading={isPurchasing}
          fullWidth
          style={styles.purchaseButton}
        />

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backButtonText: {
    ...typography.bodyMd,
    color: colors.neutral[700],
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

