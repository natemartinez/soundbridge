import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Pressable, Linking, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text, Chip, Portal, Modal, Button } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Flame, TrendingUp, PlusCircle, Lock, Check } from 'lucide-react-native';
import { Gig } from '@/lib/types';
import { Colors, Spacing } from '@/constants/theme';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { GigCard } from '@/components/GigCard';
import { useGigPayment } from '@/components/useGigPayment';
import { firestore } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

const TRENDING_PAY_THRESHOLD = 250;

export default function MusicianHomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const isPremium = false;
  const { width: screenWidth } = useWindowDimensions();
  // Carousel card width: narrower than full screen so the next card peeks
  const carouselCardWidth = screenWidth - Spacing.md * 5;

  const [allGigs, setAllGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentKey[]>([]);
  const [appliedGigs, setAppliedGigs] = useState<Gig[]>([]);
  const [applyModalGig, setApplyModalGig] = useState<Gig | null>(null);
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [paidGigIds, setPaidGigIds] = useState<Set<string>>(new Set());
  const { loading: gigPaymentLoading, error: gigPaymentError, handleGigPayment } = useGigPayment();

  const fetchGigs = async () => {
    try {
      const snapshot = await firestore()
        .collection('gigs')
        .where('active', '==', true)
        .get();
      const gigs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Gig)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      setAllGigs(gigs);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppliedGigs = async () => {
    if (!user) return;
    const snapshot = await firestore()
      .collection('applications')
      .where('musician_id', '==', user.uid)
      .get();
    const gigs: Gig[] = [];
    const paid = new Set<string>();
    snapshot.docs.forEach(doc => {
      const data = doc.data() as Record<string, any>;
      if (data.gig_snapshot) {
        gigs.push(data.gig_snapshot as Gig);
        if (data.status === 'paid') paid.add(data.gig_snapshot.id);
      }
    });
    setAppliedGigs(gigs);
    setPaidGigIds(paid);
  };

  useEffect(() => {
    fetchGigs();
  }, []);

  useEffect(() => {
    if (user) fetchAppliedGigs();
  }, [user?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGigs();
    setRefreshing(false);
  };

  const toggleInstrument = (key: InstrumentKey) => {
    setSelectedInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const hotGigs = [...allGigs]
    .filter(g => g.pay_offered != null)
    .sort((a, b) => (b.pay_offered ?? 0) - (a.pay_offered ?? 0))
    .slice(0, 3);

  const trendingGigs = allGigs.filter(
    (g) => g.pay_offered != null && g.pay_offered >= TRENDING_PAY_THRESHOLD
  );

  const filteredGigs = allGigs.filter((g) => {
    if (selectedInstruments.length > 0) {
      return selectedInstruments.some((inst) => (g.instruments_needed ?? []).includes(inst));
    }
    return true;
  });

  const recommendedGigs = [...allGigs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const handleSimulatePayment = async (gig: Gig) => {
    const success = await handleGigPayment(gig);
    if (success) {
      setPaidGigIds((prev) => new Set(prev).add(gig.id));
    }
  };

  const handleApplyPress = (gig: Gig) => {
    setApplyModalGig(gig);
    setApplyConfirmed(false);
  };

  const handleConfirmApply = async () => {
    if (!applyModalGig) return;
    setApplyConfirmed(true);
    setAppliedGigs((prev) => [...prev.filter((g) => g.id !== applyModalGig.id), applyModalGig]);
    if (user) {
      firestore().collection('applications').add({
        gig_id: applyModalGig.id,
        musician_id: user.uid,
        gig_snapshot: applyModalGig,
        status: 'pending',
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
    if (user && applyModalGig) {
      firestore().collection('conversations').add({
        participants: [user.uid, applyModalGig.church_id],
        gig_id: applyModalGig.id,
        gig_title: applyModalGig.title,
        musician_id: user.uid,
        poster_id: applyModalGig.church_id,
        musician_name: profile?.display_name ?? user.email ?? 'Musician',
        poster_name: applyModalGig.church?.display_name ?? 'Church',
        last_message: null,
        last_message_at: null,
        created_at: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  const appliedGigIds = new Set(appliedGigs.map((g) => g.id));

  const renderHeader = () => (
    <View>
      {/* Page Title + Post a Gig Button */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>SoundBridge</Text>
        <Pressable style={styles.postGigButton} onPress={() => router.push('/(musician)/post-gig')}>
          <PlusCircle size={16} color={Colors.primary} />
          <Text style={styles.postGigButtonText}>Post a Gig</Text>
        </Pressable>
      </View>

      {/* Applied Gig Roadmap — single card or horizontal carousel */}
      {appliedGigs.length > 0 && (
        <ScrollView
          horizontal={appliedGigs.length > 1}
          scrollEnabled={appliedGigs.length > 1}
          showsHorizontalScrollIndicator={false}
          snapToInterval={appliedGigs.length > 1 ? carouselCardWidth + Spacing.sm : undefined}
          decelerationRate="fast"
          contentContainerStyle={appliedGigs.length > 1 ? styles.carouselContent : undefined}
        >
      {appliedGigs.map((gig) => {
        const isPaid = paidGigIds.has(gig.id);
        return (
          <View
            key={`roadmap-${gig.id}`}
            style={[styles.roadmapCard, appliedGigs.length > 1 && { width: carouselCardWidth }]}
          >
            <Text variant="titleSmall" style={styles.roadmapGigTitle} numberOfLines={1}>{gig.title}</Text>
            {gig.church && (
              <Text variant="bodySmall" style={styles.roadmapChurch}>{gig.church.display_name}</Text>
            )}
            <View style={styles.roadmapTrack}>
              <View style={styles.roadmapStep}>
                <View style={[styles.roadmapDot, styles.roadmapDotDone]} />
                <Text style={styles.roadmapStepLabel}>Applied</Text>
              </View>
              <View style={[styles.roadmapLine, styles.roadmapLineDone]} />
              <View style={styles.roadmapStep}>
                <View style={[styles.roadmapDot, isPaid ? styles.roadmapDotDone : styles.roadmapDotActive]} />
                <Text style={[styles.roadmapStepLabel, isPaid ? undefined : styles.roadmapStepLabelActive]}>
                  {isPaid ? 'Paid' : 'Payment\npending'}
                </Text>
              </View>
              <View style={[styles.roadmapLine, isPaid ? styles.roadmapLineDone : styles.roadmapLineInactive]} />
              <View style={styles.roadmapStep}>
                <View style={[styles.roadmapDot, isPaid ? styles.roadmapDotDone : styles.roadmapDotInactive]} />
                <Text style={[styles.roadmapStepLabel, isPaid ? undefined : styles.roadmapStepLabelInactive]}>
                  Accepted
                </Text>
              </View>
            </View>

            {__DEV__ && !isPaid && (
              <Pressable
                style={styles.devPayButton}
                onPress={() => handleSimulatePayment(gig)}
                disabled={gigPaymentLoading}
              >
                <Text style={styles.devPayButtonText}>
                  {gigPaymentLoading ? 'Processing...' : `Test Payment — $${gig.pay_offered}`}
                </Text>
              </Pressable>
            )}
            {gigPaymentError && !isPaid ? (
              <Text style={styles.devPayError}>{gigPaymentError}</Text>
            ) : null}
          </View>
        );
      })}
        </ScrollView>
      )}

      {/* Instrument Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {INSTRUMENTS.map((inst) => (
          <Chip
            key={inst.key}
            selected={selectedInstruments.includes(inst.key)}
            onPress={() => toggleInstrument(inst.key)}
            style={[styles.filterChip, selectedInstruments.includes(inst.key) && styles.filterChipSelected]}
            textStyle={[styles.filterChipText, selectedInstruments.includes(inst.key) && styles.filterChipTextSelected]}
            compact
          >
            {inst.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Hot Gigs — liquid glass banner */}
      {hotGigs.length > 0 && selectedInstruments.length === 0 && (
        <View style={styles.hotGigsSection}>
          {/* Skeleton placeholders — same shape as GigCards but no real data */}
          <View pointerEvents="none" style={styles.hotCarousel}>
            {hotGigs.map((_, i) => (
              <View key={i} style={styles.hotCarouselCard}>
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonSubtitle} />
                  <View style={styles.skeletonRow} />
                  <View style={styles.skeletonPay} />
                </View>
              </View>
            ))}
          </View>

          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, styles.glassTint]} />

          {isPremium ? (
            <View style={styles.hotGigsContent}>
              <View style={styles.hotGigsHeader}>
                <Flame size={24} color="#F97316" />
                <Text variant="titleLarge" style={styles.hotGigsTitle}> Hot Gigs</Text>
              </View>
              <Text variant="bodyMedium" style={styles.hotGigsSubtitle}>
                Highest-paying opportunities right now. Be the first.
              </Text>
            </View>
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.padlockOverlay]}>
              <Lock size={32} color={Colors.text} />
              <Text variant="titleMedium" style={styles.padlockTitle}>Get Premium to unlock</Text>
              <View style={styles.hotGigsHeader}>
                <Flame size={24} color="#F97316" />
                <Text variant="titleLarge" style={styles.hotGigsTitle}> Hot Gigs</Text>
              </View>
              <Text variant="bodySmall" style={styles.padlockSubtitle}>
                Highest-paying opportunities right now. Be the first.
              </Text>
              <Pressable
                style={styles.upgradeButton}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade Now →</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Trending Section */}
      {trendingGigs.length > 0 && selectedInstruments.length === 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text variant="titleLarge" style={styles.sectionTitle}> Trending</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {trendingGigs.map((gig) => (
              <View key={gig.id} style={styles.trendingCard}>
                <GigCard gig={gig} isApplied={appliedGigIds.has(gig.id)} onApply={() => handleApplyPress(gig)} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recommended Section */}
      {recommendedGigs.length > 0 && selectedInstruments.length === 0 && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>Recommended for You</Text>
          {recommendedGigs.map((gig) => (
            <GigCard key={`rec-${gig.id}`} gig={gig} isApplied={appliedGigIds.has(gig.id)} onApply={() => handleApplyPress(gig)} />
          ))}
        </View>
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>
        {selectedInstruments.length > 0 ? 'Filtered Gigs' : 'All Gigs'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGigs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GigCard gig={item} isApplied={appliedGigIds.has(item.id)} onApply={() => handleApplyPress(item)} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="titleMedium" style={styles.emptyText}>
              {selectedInstruments.length > 0 ? 'No gigs match your filters' : 'No gigs posted yet'}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {selectedInstruments.length > 0 ? 'Try selecting different instruments' : 'Be the first to post a gig!'}
            </Text>
          </View>
        }
      />

      {/* Apply Modal */}
      <Portal>
        <Modal
          visible={!!applyModalGig}
          onDismiss={() => setApplyModalGig(null)}
          contentContainerStyle={styles.applyModal}
        >
          {!applyConfirmed ? (
            <>
              <Text variant="titleMedium" style={styles.applyModalTitle}>Apply for Gig</Text>
              <Text variant="titleSmall" style={styles.applyModalGigName} numberOfLines={2}>
                {applyModalGig?.title}
              </Text>
              <Text style={styles.applyModalPay}>${applyModalGig?.pay_offered}</Text>
              <Text variant="bodySmall" style={styles.applyModalNote}>
                Before applying, make sure your payment details are up to date so you can receive payment when accepted.
              </Text>
              <Pressable
                style={styles.paymentLinkButton}
                onPress={() => Linking.openURL('https://dashboard.stripe.com/settings/payouts')}
              >
                <Text style={styles.paymentLinkText}>Review Payment Method →</Text>
              </Pressable>
              <Button mode="contained" style={styles.confirmApplyButton} onPress={handleConfirmApply}>
                Confirm Application
              </Button>
            </>
          ) : (
            <>
              <View style={styles.successIcon}>
                <Check size={30} color="#FFFFFF" />
              </View>
              <Text variant="titleMedium" style={styles.applySuccessTitle}>Application Sent!</Text>
              <Text variant="bodyMedium" style={styles.applySuccessText}>
                You'll be notified when the church accepts your application.
              </Text>
              <Button mode="contained" style={styles.confirmApplyButton} onPress={() => setApplyModalGig(null)}>
                Done
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  postGigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.chipBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  postGigButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  filterScroll: { marginBottom: Spacing.md },
  filterContent: { gap: Spacing.xs },
  filterChip: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: '#000000', fontSize: 13 },
  filterChipTextSelected: { color: '#1A1A1A' },

  hotGigsSection: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  hotCarousel: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  hotCarouselCard: { width: 270 },
  glassTint: { backgroundColor: 'rgba(251, 249, 254, 0.08)' },
  hotGigsContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotGigsHeader: { flexDirection: 'row', alignItems: 'center' },
  hotGigsTitle: { fontWeight: 'bold', color: Colors.text, fontSize: 22 },
  hotGigsSubtitle: { color: Colors.textSecondary, marginTop: 6 },

  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },

  horizontalList: { gap: Spacing.md, paddingRight: Spacing.md },
  trendingCard: { width: 300 },

  empty: { alignItems: 'center', paddingTop: Spacing.xl * 3 },
  emptyText: { color: Colors.text },
  emptySubtext: { color: Colors.textSecondary, marginTop: Spacing.sm },

  padlockOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 254, 0.42)',
    borderRadius: 20,
    gap: Spacing.sm,
  },
  padlockSubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  upgradeButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  upgradeButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  padlockTitle: { color: Colors.text, fontWeight: '600' },

  roadmapCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  roadmapGigTitle: { fontWeight: '600', color: Colors.text },
  roadmapChurch: { color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.md },
  roadmapTrack: { flexDirection: 'row', alignItems: 'flex-start' },
  roadmapStep: { alignItems: 'center', width: 72 },
  roadmapDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 5 },
  roadmapDotDone: { backgroundColor: Colors.success },
  roadmapDotActive: { backgroundColor: Colors.primary, width: 14, height: 14, borderRadius: 7 },
  roadmapDotInactive: { backgroundColor: Colors.border },
  roadmapLine: { flex: 1, height: 2, marginTop: 5 },
  roadmapLineDone: { backgroundColor: Colors.success },
  roadmapLineInactive: { backgroundColor: Colors.border },
  roadmapStepLabel: { fontSize: 10, color: Colors.text, textAlign: 'center' },
  roadmapStepLabelActive: { color: Colors.primary, fontWeight: '600' },
  roadmapStepLabelInactive: { color: Colors.textSecondary },

  applyModal: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 16,
  },
  applyModalTitle: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  applyModalGigName: { color: Colors.text, marginBottom: 4 },
  applyModalPay: { color: Colors.success, fontWeight: 'bold', fontSize: 18, marginBottom: Spacing.md },
  applyModalNote: { color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.md },
  paymentLinkButton: { paddingVertical: Spacing.sm, marginBottom: Spacing.xs },
  paymentLinkText: { color: Colors.primary, fontWeight: '500' },
  confirmApplyButton: { marginTop: Spacing.sm },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  applySuccessTitle: { fontWeight: 'bold', color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  applySuccessText: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },

  devPayButton: {
    marginTop: Spacing.sm,
    backgroundColor: '#F59E0B',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  devPayButtonText: { color: '#1A1A1A', fontWeight: '600', fontSize: 13 },
  devPayError: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  carouselContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
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
});
