import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Flame, Lock } from 'lucide-react-native';
import { Gig } from '@/lib/types';
import { Colors, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';
import { GigCard } from '@/components/GigCard';
import { firestore } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

export default function TrendingScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const isPremium = profile?.account_tier === 'premium';

  const [hotGigs, setHotGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedGigIds, setAppliedGigIds] = useState<Set<string>>(new Set());
  const [applyModalGig, setApplyModalGig] = useState<Gig | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchHotGigs = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const snapshot = await firestore()
          .collection('gigs')
          .where('active', '==', true)
          .get();
        const gigs = snapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as Record<string, any>) }) as Gig)
          .filter(g => g.pay_offered != null)
          .sort((a, b) => (b.pay_offered ?? 0) - (a.pay_offered ?? 0));
        setHotGigs(gigs);
      } catch (e: any) {
        if (e?.code !== 'permission-denied') console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHotGigs();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    firestore()
      .collection('applications')
      .where('musician_id', '==', user.uid)
      .get()
      .then(snapshot => {
        const ids = new Set(snapshot.docs.map(doc => (doc.data() as any).gig_id as string));
        setAppliedGigIds(ids);
      })
      .catch(() => {});
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Flame size={22} color="#F97316" />
        <Text style={styles.headerTitle}> Hot Gigs</Text>
      </View>
      <Text style={styles.subtitle}>Highest-paying opportunities right now. Be the first.</Text>

      {isPremium ? (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + bottomInset }]}>
          {hotGigs.filter(g => !appliedGigIds.has(g.id)).length === 0 ? (
            <Text style={styles.emptyText}>No paid gigs posted yet.</Text>
          ) : (
            hotGigs.filter(g => !appliedGigIds.has(g.id)).map(gig => (
              <GigCard
                key={gig.id}
                gig={gig}
                isApplied={appliedGigIds.has(gig.id)}
                onApply={() => setApplyModalGig(gig)}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <View style={styles.lockedContainer}>
          {/* Skeleton cards underneath the blur */}
          <View pointerEvents="none" style={styles.skeletonList}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
                <View style={styles.skeletonRow} />
                <View style={styles.skeletonPay} />
              </View>
            ))}
          </View>

          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, styles.glassTint]} />

          <View style={[StyleSheet.absoluteFillObject, styles.padlockOverlay]}>
            <Lock size={36} color={Colors.text} />
            <Text style={styles.padlockTitle}>Get Premium to unlock</Text>
            <View style={styles.padlockFireRow}>
              <Flame size={22} color="#F97316" />
              <Text style={styles.padlockHotGigs}> Hot Gigs</Text>
            </View>
            <Text style={styles.padlockSubtitle}>
              Highest-paying opportunities right now. Be the first.
            </Text>
            <Button
              mode="contained"
              style={styles.upgradeButton}
              labelStyle={styles.upgradeButtonLabel}
              onPress={() => router.push('/(auth)/login')}
            >
              Upgrade Now →
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  list: { padding: Spacing.md, gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },

  lockedContainer: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
  },
  skeletonList: { gap: Spacing.sm, padding: Spacing.sm },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  skeletonTitle: { height: 14, borderRadius: 6, backgroundColor: Colors.border, width: '70%' },
  skeletonSubtitle: { height: 11, borderRadius: 5, backgroundColor: Colors.border, width: '45%' },
  skeletonRow: { height: 11, borderRadius: 5, backgroundColor: Colors.border, width: '55%' },
  skeletonPay: { height: 20, borderRadius: 8, backgroundColor: Colors.border, width: '30%', marginTop: 4 },

  glassTint: { backgroundColor: 'rgba(251, 249, 254, 0.08)' },
  padlockOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 254, 0.42)',
    borderRadius: 20,
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  padlockTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  padlockFireRow: { flexDirection: 'row', alignItems: 'center' },
  padlockHotGigs: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  padlockSubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  upgradeButton: { marginTop: Spacing.sm, borderRadius: 20 },
  upgradeButtonLabel: { fontWeight: '600', fontSize: 15 },
});
