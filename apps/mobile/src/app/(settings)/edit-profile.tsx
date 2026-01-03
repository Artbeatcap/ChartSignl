import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, updateProfile } from '../../lib/api';
import { colors, typography, spacing, borderRadius } from '../../theme';
import {
  TRADING_STYLE_LABELS,
  INSTRUMENT_LABELS,
  type TradingStyle,
  type InstrumentType,
} from '@chartsignl/core';

const TRADING_STYLES: TradingStyle[] = ['scalper', 'day', 'swing', 'position', 'long_term'];
const INSTRUMENTS: InstrumentType[] = ['stocks', 'options', 'futures', 'crypto', 'forex'];

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: getCurrentUser,
  });

  const [displayName, setDisplayName] = useState('');
  const [tradingStyle, setTradingStyle] = useState<TradingStyle | null>(null);
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with current profile data
  useEffect(() => {
    if (profileData?.user) {
      setDisplayName(profileData.user.displayName || '');
      setTradingStyle(profileData.user.style || null);
      setSelectedInstruments(profileData.user.instruments || []);
    }
  }, [profileData]);

  const toggleInstrument = (instrument: InstrumentType) => {
    setSelectedInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    );
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        trading_style: tradingStyle,
        instruments: selectedInstruments,
      });

      // Invalidate profile query to refetch updated data
      await queryClient.invalidateQueries({ queryKey: ['profile'] });

      // Navigate back to profile page - do this immediately for web compatibility
      // Alert button callbacks don't work reliably on web
      router.replace('/(tabs)/profile');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={styles.saveButton}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            placeholderTextColor={colors.neutral[400]}
            autoCapitalize="words"
          />
        </View>

        {/* Trading Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trading Style</Text>
          <Text style={styles.sectionSubtitle}>
            How do you typically approach the markets?
          </Text>
          <View style={styles.optionsGrid}>
            {TRADING_STYLES.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.optionChip,
                  tradingStyle === style && styles.optionChipSelected,
                ]}
                onPress={() => setTradingStyle(style)}
              >
                <Text
                  style={[
                    styles.optionText,
                    tradingStyle === style && styles.optionTextSelected,
                  ]}
                >
                  {TRADING_STYLE_LABELS[style]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Instruments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instruments</Text>
          <Text style={styles.sectionSubtitle}>
            What do you trade? Select all that apply.
          </Text>
          <View style={styles.optionsGrid}>
            {INSTRUMENTS.map((instrument) => (
              <TouchableOpacity
                key={instrument}
                style={[
                  styles.optionChip,
                  selectedInstruments.includes(instrument) && styles.optionChipSelected,
                ]}
                onPress={() => toggleInstrument(instrument)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedInstruments.includes(instrument) && styles.optionTextSelected,
                  ]}
                >
                  {INSTRUMENT_LABELS[instrument]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  closeButton: {
    minWidth: 60,
  },
  closeText: {
    ...typography.bodyMd,
    color: colors.neutral[600],
  },
  headerTitle: {
    ...typography.headingMd,
    color: colors.neutral[900],
  },
  saveButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveText: {
    ...typography.bodyMd,
    color: colors.primary[600],
    fontWeight: '600',
  },
  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSm,
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.neutral[500],
    marginBottom: spacing.md,
  },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
    color: colors.neutral[900],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionChipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  optionText: {
    ...typography.bodySm,
    color: colors.neutral[600],
  },
  optionTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});

