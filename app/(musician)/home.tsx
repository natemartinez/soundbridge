import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { Text, ActivityIndicator, Chip, FAB, Portal, Modal, Button } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { Flame, MessageCircleQuestion, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Gig } from '@/lib/types';
import { Colors, Spacing } from '@/constants/theme';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { MOCK_GIGS, TRENDING_PAY_THRESHOLD } from '@/constants/mockData';
import { GigCard } from '@/components/GigCard';

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

      {/* Trending Section */}
      {trendingGigs.length > 0 && selectedInstruments.length === 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Flame size={20} color="#F97316" />
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
});
