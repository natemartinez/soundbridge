import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Chip, Switch, TextInput, HelperText } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MusicianDetails } from '@/lib/types';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';

export default function MusicianProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [details, setDetails] = useState<MusicianDetails | null>(null);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [instruments, setInstruments] = useState<InstrumentKey[]>([]);
  const [experienceYears, setExperienceYears] = useState('');
  const [ratePerService, setRatePerService] = useState('');
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetails = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('musician_details')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (data) {
      setDetails(data as MusicianDetails);
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      setInstruments(data.instruments ?? []);
      setExperienceYears(String(data.experience_years ?? 0));
      setRatePerService(data.rate_per_service != null ? String(data.rate_per_service) : '');
      setAvailable(data.available ?? true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [profile?.id])
  );

  const toggleInstrument = (key: InstrumentKey) => {
    setInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim(), bio: bio.trim() })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      const { error: detailsError } = await supabase
        .from('musician_details')
        .update({
          instruments,
          experience_years: parseInt(experienceYears) || 0,
          rate_per_service: ratePerService ? parseFloat(ratePerService) : null,
          available,
        })
        .eq('id', profile.id);
      if (detailsError) throw detailsError;

      await fetchProfile();
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !details) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {editing ? (
        <>
          <TextInput label="Display Name" value={displayName} onChangeText={setDisplayName} mode="outlined" style={styles.input} />
          <TextInput label="Bio" value={bio} onChangeText={setBio} mode="outlined" multiline style={styles.input} />
          <Text variant="titleMedium" style={styles.sectionTitle}>Instruments</Text>
          <View style={styles.chips}>
            {INSTRUMENTS.map((inst) => (
              <Chip key={inst.key} selected={instruments.includes(inst.key)} onPress={() => toggleInstrument(inst.key)} compact>
                {inst.label}
              </Chip>
            ))}
          </View>
          <TextInput label="Years of Experience" value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" mode="outlined" style={styles.input} />
          <TextInput label="Rate per Service ($)" value={ratePerService} onChangeText={setRatePerService} keyboardType="numeric" mode="outlined" style={styles.input} />
          <View style={styles.switchRow}>
            <Text variant="bodyLarge">Available for gigs</Text>
            <Switch value={available} onValueChange={setAvailable} />
          </View>
          {error ? <HelperText type="error">{error}</HelperText> : null}
          <View style={styles.buttonRow}>
            <Button mode="outlined" onPress={() => setEditing(false)} style={styles.flex}>Cancel</Button>
            <View style={styles.spacer} />
            <Button mode="contained" onPress={handleSave} loading={saving} style={styles.flex}>Save</Button>
          </View>
        </>
      ) : (
        <>
          <Text variant="headlineMedium" style={styles.name}>{profile.display_name}</Text>
          <Text variant="bodyMedium" style={styles.location}>
            {profile.location_city}{profile.location_state ? `, ${profile.location_state}` : ''}
          </Text>
          {profile.bio ? <Text variant="bodyMedium" style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.chips}>
            {(details.instruments ?? []).map((key) => {
              const label = INSTRUMENTS.find((i) => i.key === key)?.label ?? key;
              return <Chip key={key} compact>{label}</Chip>;
            })}
          </View>

          <Text variant="bodyMedium" style={styles.detail}>Experience: {details.experience_years} years</Text>
          {details.rate_per_service != null && (
            <Text variant="bodyMedium" style={styles.detail}>Rate: ${details.rate_per_service}/service</Text>
          )}
          <Text variant="bodyMedium" style={styles.detail}>
            Status: {details.available ? 'Available' : 'Not available'}
          </Text>

          <Button mode="contained" onPress={() => setEditing(true)} style={styles.editButton}>
            Edit Profile
          </Button>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.lg },
  name: { fontWeight: 'bold', color: Colors.text },
  location: { color: Colors.textSecondary, marginTop: Spacing.xs },
  bio: { color: Colors.text, marginTop: Spacing.md },
  sectionTitle: { marginTop: Spacing.md, marginBottom: Spacing.sm, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.md },
  detail: { color: Colors.text, marginTop: Spacing.sm },
  editButton: { marginTop: Spacing.lg },
  input: { marginBottom: Spacing.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.md },
  buttonRow: { flexDirection: 'row', marginTop: Spacing.lg },
  flex: { flex: 1 },
  spacer: { width: Spacing.sm },
});
