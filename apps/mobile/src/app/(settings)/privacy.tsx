import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '../../theme';

const LAST_UPDATED = 'January 2, 2026';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Text style={styles.intro}>
          ChartSignl ("we," "our," or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when you
          use our mobile application and services.
        </Text>

        {/* Section 1 */}
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect information you provide directly to us, including:
        </Text>
        <Text style={styles.bulletItem}>
          • Account information (email address, display name)
        </Text>
        <Text style={styles.bulletItem}>
          • Trading preferences (trading style, preferred instruments)
        </Text>
        <Text style={styles.bulletItem}>
          • Chart data and analysis history
        </Text>
        <Text style={styles.bulletItem}>
          • Usage data and app interactions
        </Text>

        {/* Section 2 */}
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use the information we collect to:</Text>
        <Text style={styles.bulletItem}>
          • Provide, maintain, and improve our services
        </Text>
        <Text style={styles.bulletItem}>
          • Personalize your experience and provide tailored analysis
        </Text>
        <Text style={styles.bulletItem}>
          • Process transactions and send related information
        </Text>
        <Text style={styles.bulletItem}>
          • Send technical notices, updates, and support messages
        </Text>
        <Text style={styles.bulletItem}>
          • Respond to your comments and questions
        </Text>
        <Text style={styles.bulletItem}>
          • Monitor and analyze trends, usage, and activities
        </Text>

        {/* Section 3 */}
        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or rent your personal information to third parties. We may share
          your information only in the following circumstances:
        </Text>
        <Text style={styles.bulletItem}>
          • With service providers who assist in operating our app
        </Text>
        <Text style={styles.bulletItem}>
          • To comply with legal obligations
        </Text>
        <Text style={styles.bulletItem}>
          • To protect our rights and prevent fraud
        </Text>
        <Text style={styles.bulletItem}>
          • With your consent or at your direction
        </Text>

        {/* Section 4 */}
        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational measures to protect your personal
          information against unauthorized access, alteration, disclosure, or destruction. Your
          data is encrypted in transit and at rest.
        </Text>

        {/* Section 5 */}
        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your personal information for as long as necessary to provide our services and
          fulfill the purposes described in this policy. You may request deletion of your account
          and associated data at any time by contacting us.
        </Text>

        {/* Section 6 */}
        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have certain rights regarding your personal
          information, including:
        </Text>
        <Text style={styles.bulletItem}>
          • Access to your personal data
        </Text>
        <Text style={styles.bulletItem}>
          • Correction of inaccurate data
        </Text>
        <Text style={styles.bulletItem}>
          • Deletion of your data
        </Text>
        <Text style={styles.bulletItem}>
          • Data portability
        </Text>
        <Text style={styles.bulletItem}>
          • Opt-out of certain data processing
        </Text>

        {/* Section 7 */}
        <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Our app may integrate with third-party services for authentication (Supabase), market
          data (Polygon.io), and analytics. These services have their own privacy policies, and
          we encourage you to review them.
        </Text>

        {/* Section 8 */}
        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          ChartSignl is not intended for use by anyone under the age of 18. We do not knowingly
          collect personal information from children. If you believe a child has provided us with
          personal information, please contact us immediately.
        </Text>

        {/* Section 9 */}
        <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the "Last updated" date.
        </Text>

        {/* Section 10 */}
        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy or our privacy practices, please
          contact us at:
        </Text>
        <View style={styles.contactBox}>
          <Text style={styles.contactText}>support@chartsignl.com</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Investment Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            ChartSignl is a financial data and software tool, not a registered investment advisor
            or broker-dealer. The analysis provided is for educational and informational purposes
            only. All investment decisions are your sole responsibility.
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  backButton: {
    minWidth: 60,
  },
  backText: {
    ...typography.bodyMd,
    color: colors.primary[600],
  },
  headerTitle: {
    ...typography.headingMd,
    color: colors.neutral[900],
  },
  placeholder: {
    minWidth: 60,
  },
  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  lastUpdated: {
    ...typography.bodySm,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  intro: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSm,
    color: colors.neutral[900],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...typography.bodyMd,
    color: colors.neutral[700],
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  bulletItem: {
    ...typography.bodyMd,
    color: colors.neutral[600],
    lineHeight: 24,
    paddingLeft: spacing.sm,
  },
  contactBox: {
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactText: {
    ...typography.bodyMd,
    color: colors.primary[700],
    fontWeight: '500',
    textAlign: 'center',
  },
  disclaimer: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  disclaimerTitle: {
    ...typography.labelMd,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  disclaimerText: {
    ...typography.bodySm,
    color: colors.neutral[600],
    lineHeight: 20,
  },
});



