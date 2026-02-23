import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Text, ActivityIndicator, Chip, FAB, Portal, Modal, Button } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useRouter } from 'expo-router';
import { Flame, TrendingUp, MessageCircleQuestion, X, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Gig } from '@/lib/types';
import { Colors, Spacing } from '@/constants/theme';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { MOCK_GIGS, TRENDING_PAY_THRESHOLD } from '@/constants/mockData';
import { GigCard } from '@/components/GigCard';
import { useAuthStore } from '@/stores/authStore';

const STARTER_QUESTIONS = [
  'How do I apply for a gig?',
  'What instruments are most in demand?',
  'How does the payment process work?',
  'How do I set up my musician profile?',
  'What is OnSpace Premium?',
];

const BOT_ANSWERS: Record<string, string> = {
  'How do I apply for a gig?':
    'Browse the Gigs tab and tap on any gig that interests you. You\'ll see the church\'s profile and can reach out to express interest. In a future update, there will be a one-tap "Apply" button!',
  'What instruments are most in demand?':
    'Guitars, keys, and vocalists are the most requested instruments on OnSpace. Audio techs are also in high demand — churches often struggle to find skilled sound engineers.',
  'How does the payment process work?':
    'Payment is agreed upon directly between you and the church. The listed pay is what the church is offering per service. OnSpace doesn\'t process payments — we just connect you.',
  'How do I set up my musician profile?':
    'Sign up and complete the onboarding flow. You\'ll add your instruments, experience level, rate, and location. A complete profile helps churches find you!',
  'What is OnSpace Premium?':
    'Premium ($9.99/mo) gives you unlimited gig applications, priority in search results, direct messaging, a profile badge, and early access to new gigs. Check the Upgrade tab!',
};

export default function MusicianHomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const isPremium = profile?.account_tier === 'premium';

  const [allGigs, setAllGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentKey[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatAnswer, setChatAnswer] = useState('');

  const fetchGigs = async () => {
    const { data, error } = await supabase
      .from('gigs')
      .select('*, church:profiles!gigs_church_id_fkey(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      setAllGigs(data as Gig[]);
    } else {
      setAllGigs(MOCK_GIGS);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchGigs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchGigs();
  };

  const toggleInstrument = (key: InstrumentKey) => {
    setSelectedInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Hot Gigs — top 3 by pay (shown in liquid glass banner)
  const hotGigs = [...allGigs]
    .filter(g => g.pay_offered != null)
    .sort((a, b) => (b.pay_offered ?? 0) - (a.pay_offered ?? 0))
    .slice(0, 3);

  // Derive trending gigs (high pay)
  const trendingGigs = allGigs.filter(
    (g) => g.pay_offered != null && g.pay_offered >= TRENDING_PAY_THRESHOLD
  );

  // Filter gigs by selected instruments
  const filteredGigs = selectedInstruments.length > 0
    ? allGigs.filter((g) =>
        selectedInstruments.some((inst) => g.instruments_needed.includes(inst))
      )
    : allGigs;

  // Recommended = soonest upcoming gigs (sorted by date)
  const recommendedGigs = [...allGigs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const handleQuestion = (question: string) => {
    setChatAnswer(BOT_ANSWERS[question] ?? 'Sorry, I don\'t have an answer for that yet.');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <View>
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
          {/* Cards rendered first — BlurView blurs whatever is behind it natively */}
          {hotGigs.slice(0, 2).map((gig, i) => (
            <View
              key={gig.id}
              pointerEvents="none"
              style={[styles.hotBgCard, {
                transform: [
                  { rotate: i === 0 ? '-3deg' : '2.5deg' },
                  { translateX: i === 0 ? -12 : 12 },
                ],
                top: i * 8,
              }]}
            >
              <GigCard gig={gig} />
            </View>
          ))}

          {/* Frosted glass overlay */}
          <BlurView intensity={22} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={[StyleSheet.absoluteFillObject, styles.glassTint]} />

          {/* Content on glass */}
          <View style={styles.hotGigsContent}>
            <View style={styles.hotGigsHeader}>
              <Flame size={24} color="#F97316" />
              <Text variant="titleLarge" style={styles.hotGigsTitle}> Hot Gigs</Text>
            </View>
            <Text variant="bodyMedium" style={styles.hotGigsSubtitle}>
              Highest-paying opportunities right now
            </Text>
          </View>

          {!isPremium && (
            <View style={[StyleSheet.absoluteFillObject, styles.padlockOverlay]}>
              <Lock size={32} color={Colors.text} />
              <Text variant="titleMedium" style={styles.padlockTitle}>Get Premium to unlock</Text>
              <Pressable
                style={styles.upgradeButton}
                onPress={() => router.push('/(musician)/upgrade')}
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
            <Text variant="titleMedium" style={styles.sectionTitle}> Trending</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {trendingGigs.map((gig) => (
              <View key={gig.id} style={styles.trendingCard}>
                <GigCard gig={gig} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recommended Section */}
      {recommendedGigs.length > 0 && selectedInstruments.length === 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Recommended for You</Text>
          {recommendedGigs.map((gig) => (
            <GigCard key={`rec-${gig.id}`} gig={gig} />
          ))}
        </View>
      )}

      {/* All Gigs / Filtered Results Header */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {selectedInstruments.length > 0 ? 'Filtered Gigs' : 'All Gigs'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGigs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GigCard gig={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="titleMedium" style={styles.emptyText}>No gigs match your filters</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Try selecting different instruments
            </Text>
          </View>
        }
      />

      {/* Help Chatbot FAB */}
      <FAB
        icon={() => <MessageCircleQuestion size={24} color="#1A1A1A" />}
        style={styles.fab}
        onPress={() => { setChatVisible(true); setChatAnswer(''); }}
        color="#1A1A1A"
      />

      {/* Chatbot Modal */}
      <Portal>
        <Modal visible={chatVisible} onDismiss={() => setChatVisible(false)} contentContainerStyle={styles.chatModal}>
          <View style={styles.chatHeader}>
            <Text variant="titleMedium" style={styles.chatTitle}>Help & FAQ</Text>
            <Pressable onPress={() => setChatVisible(false)}>
              <X size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {!chatAnswer ? (
            <>
              <Text variant="bodyMedium" style={styles.chatSubtitle}>
                What can I help you with?
              </Text>
              {STARTER_QUESTIONS.map((q) => (
                <Button
                  key={q}
                  mode="outlined"
                  onPress={() => handleQuestion(q)}
                  style={styles.questionButton}
                  labelStyle={styles.questionLabel}
                  compact
                >
                  {q}
                </Button>
              ))}
            </>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.chatAnswerText}>{chatAnswer}</Text>
              <Button
                mode="text"
                onPress={() => setChatAnswer('')}
                style={styles.backButton}
              >
                Ask another question
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

  // Filters
  filterScroll: { marginBottom: Spacing.md },
  filterContent: { gap: Spacing.xs },
  filterChip: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: '#000000', fontSize: 13 },
  filterChipTextSelected: { color: '#1A1A1A' },

  // Hot Gigs glass banner
  hotGigsSection: {
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  hotBgCard: {
    position: 'absolute',
    width: '92%',
    left: '4%',
  },
  glassTint: {
    backgroundColor: 'rgba(251, 249, 254, 0.38)',
  },
  hotGigsContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotGigsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotGigsTitle: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  hotGigsSubtitle: {
    color: Colors.textSecondary,
    marginTop: 6,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },

  // Trending horizontal scroll
  horizontalList: { gap: Spacing.md, paddingRight: Spacing.md },
  trendingCard: { width: 300 },

  // Empty
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 3 },
  emptyText: { color: Colors.text },
  emptySubtext: { color: Colors.textSecondary, marginTop: Spacing.sm },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 28,
  },

  // Chat Modal
  chatModal: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 16,
    maxHeight: '80%',
  },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chatTitle: { fontWeight: 'bold', color: Colors.text },
  chatSubtitle: { color: Colors.textSecondary, marginBottom: Spacing.md },
  questionButton: { marginBottom: Spacing.sm, borderColor: Colors.border, alignItems: 'flex-start' },
  questionLabel: { color: Colors.text, fontSize: 14, textAlign: 'left' },
  chatAnswerText: { color: Colors.text, lineHeight: 22 },
  backButton: { marginTop: Spacing.md },

  // Padlock overlay
  padlockOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 249, 254, 0.82)',
    borderRadius: 20,
    gap: Spacing.sm,
  },
  upgradeButton: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  padlockTitle: {
    color: Colors.text,
    fontWeight: '600',
  },
});
