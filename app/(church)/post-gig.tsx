import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput, Button, HelperText, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';

export default function PostGigScreen() {
  const profile = useAuthStore((s) => s.profile);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instruments, setInstruments] = useState<InstrumentKey[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [payOffered, setPayOffered] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleInstrument = (key: InstrumentKey) => {
    setInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handlePost = async () => {
    if (!profile) return;
    if (!title.trim() || !date.trim() || !time.trim()) {
      setError('Title, date, and time are required');
      return;
    }
    if (instruments.length === 0) {
      setError('Select at least one instrument needed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('gigs').insert({
        church_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        instruments_needed: instruments,
        date: date.trim(),
        time: time.trim(),
        pay_offered: payOffered ? parseFloat(payOffered) : null,
        status: 'open',
      });

      if (insertError) throw insertError;

      router.back();
    } catch (e: any) {
      setError(e.message ?? 'Failed to post gig');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Post a Gig</Text>

      <TextInput
        label="Gig Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        placeholder="e.g. Sunday Worship Guitarist Needed"
      />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />

      <Text variant="titleMedium" style={styles.sectionTitle}>Instruments Needed</Text>
      <View style={styles.chips}>
        {INSTRUMENTS.map((inst) => (
          <Chip
            key={inst.key}
            selected={instruments.includes(inst.key)}
            onPress={() => toggleInstrument(inst.key)}
            style={styles.chip}
            showSelectedOverlay
          >
            {inst.label}
          </Chip>
        ))}
      </View>

      <View style={styles.row}>
        <TextInput
          label="Date"
          value={date}
          onChangeText={setDate}
          mode="outlined"
          placeholder="YYYY-MM-DD"
          style={[styles.input, styles.flex]}
        />
        <View style={styles.spacer} />
        <TextInput
          label="Time"
          value={time}
          onChangeText={setTime}
          mode="outlined"
          placeholder="e.g. 9:00 AM"
          style={[styles.input, styles.flex]}
        />
      </View>

      <TextInput
        label="Pay Offered ($, optional)"
        value={payOffered}
        onChangeText={setPayOffered}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
      />

      {error ? <HelperText type="error">{error}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handlePost}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Post Gig
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  title: { fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.lg },
  sectionTitle: { marginTop: Spacing.sm, marginBottom: Spacing.sm, fontWeight: '600' },
  input: { marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  spacer: { width: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  chip: { marginBottom: Spacing.xs },
  button: { marginTop: Spacing.lg },
});
