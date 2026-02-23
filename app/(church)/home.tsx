import { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, TextInput, ActivityIndicator, Chip } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MusicianWithDetails } from '@/lib/types';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';
import { ProfileCard } from '@/components/ProfileCard';

export default function ChurchHomeScreen() {
  const [musicians, setMusicians] = useState<MusicianWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentKey[]>([]);

  const fetchMusicians = async () => {
    let query = supabase
      .from('profiles')
      .select('*, musician_details(*)')
      .eq('role', 'musician');

    if (searchQuery.trim()) {
      query = query.or(
        `location_city.ilike.%${searchQuery.trim()}%,location_state.ilike.%${searchQuery.trim()}%,display_name.ilike.%${searchQuery.trim()}%`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      let results = data as MusicianWithDetails[];

      // Client-side filter for instruments (Supabase array contains)
      if (selectedInstruments.length > 0) {
        results = results.filter((m) =>
          selectedInstruments.some((inst) =>
            m.musician_details?.instruments?.includes(inst)
          )
        );
      }

      setMusicians(results);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchMusicians();
    }, [searchQuery, selectedInstruments])
  );

  const toggleInstrument = (key: InstrumentKey) => {
    setSelectedInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMusicians();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          placeholder="Search by name or location..."
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
        data={musicians}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProfileCard musician={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="titleMedium" style={styles.emptyText}>No musicians found</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Try adjusting your filters
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  filters: { padding: Spacing.md, paddingBottom: 0 },
  searchInput: { marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: { marginBottom: Spacing.xs },
  list: { padding: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 3 },
  emptyText: { color: Colors.text },
  emptySubtext: { color: Colors.textSecondary, marginTop: Spacing.sm },
});
