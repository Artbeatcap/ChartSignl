import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components';
import { getAnalysisHistory } from '../../lib/api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import type { AnalysisHistoryItem } from '@chartsignl/core';

export default function HistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['analysisHistory'],
    queryFn: () => getAnalysisHistory(1, 50),
  });

  const analyses = data?.analyses || [];

  const handleAnalysisPress = (item: AnalysisHistoryItem) => {
    // Navigate to detail view (you could add a detail screen)
    // For now, we'll just refetch the analysis
    router.push({
      pathname: '/(tabs)/home',
      params: { analysisId: item.id },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: AnalysisHistoryItem }) => (
    <TouchableOpacity
      style={styles.analysisCard}
      onPress={() => handleAnalysisPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          {item.symbol && (
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolText}>{item.symbol}</Text>
            </View>
          )}
          {item.timeframe && (
            <View style={styles.timeframeBadge}>
              <Text style={styles.timeframeText}>{item.timeframe}</Text>
            </View>
          )}
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          {item.headline}
        </Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>📋</Text>
      <Text style={styles.emptyTitle}>No analyses yet</Text>
      <Text style={styles.emptySubtitle}>
        Your chart analyses will appear here after you upload your first chart.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSubtitle}>{analyses.length} analyses</Text>
      </View>

      <FlatList
        data={analyses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[500]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.displaySm,
    color: colors.neutral[900],
  },
  headerSubtitle: {
    ...typography.bodyMd,
    color: colors.neutral[500],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  analysisCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    backgroundColor: colors.neutral[100],
  },
  cardContent: {
    flex: 1,
    padding: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  symbolBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  symbolText: {
    ...typography.labelSm,
    color: colors.primary[700],
  },
  timeframeBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  timeframeText: {
    ...typography.labelSm,
    color: colors.neutral[600],
  },
  headline: {
    ...typography.bodySm,
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.labelSm,
    color: colors.neutral[400],
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headingLg,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.neutral[500],
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
