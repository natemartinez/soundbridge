import { useState, useMemo, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, TextInput, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gig } from '@/lib/types';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { Colors, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';
import { GigCard } from '@/components/GigCard';
import { firestore } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

export default function MusicianSearchScreen() {
  const { user } = useAuthStore();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [allGigs, setAllGigs] = useState<Gig[]>([]);
  const [appliedGigIds, setAppliedGigIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentKey[]>([]);

  useEffect(() => {
    firestore()
      .collection('gigs')
      .where('active', '==', true)
      .get()
      .then(snapshot => {
        setAllGigs(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Gig));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    firestore()
      .collection('applications')
      .where('musician_id', '==', user.uid)
      .get()
      .then(snap => {
        setAppliedGigIds(new Set(snap.docs.map(d => (d.data() as any).gig_id as string)));
      })
      .catch(() => {});
  }, [user?.uid]);

  const gigs = useMemo(() => {
    let results: Gig[] = allGigs.filter(g => !appliedGigIds.has(g.id));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          g.church?.location_city?.toLowerCase().includes(q) ||
          g.church?.location_state?.toLowerCase().includes(q)
      );
    }

    if (selectedInstruments.length > 0) {
      results = results.filter((g) =>
        selectedInstruments.some((inst) => (g.instruments_needed ?? []).includes(inst))
      );
    }

    return results;
  }, [searchQuery, selectedInstruments, allGigs, appliedGigIds]);

  const toggleInstrument = (key: InstrumentKey) => {
    setSelectedInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          placeholder="Search gigs by title or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          dense
          style={styles.searchInput}
        />
        <View style={styles.chips}>
          {INSTRUMENTS.map((inst) => (
            <Chip
              key={inst.key}
              selected={selectedInstruments.includes(inst.key)}
              onPress={() => toggleInstrument(inst.key)}
              style={styles.chip}
              compact
            >
              {inst.label}
            </Chip>
          ))}
        </View>
      </View>

      <FlatList
        data={gigs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GigCard gig={item} isApplied={appliedGigIds.has(item.id)} />}
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + bottomInset }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="titleMedium" style={styles.emptyText}>No gigs found</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Try different search terms or filters
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filters: { padding: Spacing.md, paddingBottom: 0 },
  searchInput: { marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: { marginBottom: Spacing.xs },
  list: { padding: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 3 },
  emptyText: { color: Colors.text },
  emptySubtext: { color: Colors.textSecondary, marginTop: Spacing.sm },
});
