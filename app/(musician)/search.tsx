import { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, TextInput, ActivityIndicator, Chip } from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { Gig } from '@/lib/types';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';
import { GigCard } from '@/components/GigCard';

export default function MusicianSearchScreen() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentKey[]>([]);

  const searchGigs = async () => {
    setLoading(true);

    let query = supabase
      .from('gigs')
      .select('*, church:profiles!gigs_church_id_fkey(*)')
      .eq('status', 'open')
      .order('date', { ascending: true });

    const { data, error } = await query;

    if (!error && data) {
      let results = data as Gig[];

      // Client-side filtering
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        results = results.filter(
          (g) =>
            g.title.toLowerCase().includes(q) ||
            g.description.toLowerCase().includes(q) ||
            g.church?.location_city?.toLowerCase().includes(q) ||
            g.church?.location_state?.toLowerCase().includes(q)
        );
      }

      if (selectedInstruments.length > 0) {
        results = results.filter((g) =>
          selectedInstruments.some((inst) => g.instruments_needed.includes(inst))
        );
      }

      setGigs(results);
    }
    setLoading(false);
  };

  useEffect(() => {
    searchGigs();
  }, [searchQuery, selectedInstruments]);

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <GigCard gig={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="titleMedium" style={styles.emptyText}>No gigs found</Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Try different search terms or filters
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filters: { padding: Spacing.md, paddingBottom: 0 },
  searchInput: { marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: { marginBottom: Spacing.xs },
  list: { padding: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 3 },
  emptyText: { color: Colors.text },
  emptySubtext: { color: Colors.textSecondary, marginTop: Spacing.sm },
});
