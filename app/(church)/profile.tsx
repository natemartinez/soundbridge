import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons, HelperText } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ChurchDetails, WorshipStyle, CongregationSize } from '@/lib/types';
import { Colors, Spacing } from '@/constants/theme';

export default function ChurchProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [details, setDetails] = useState<ChurchDetails | null>(null);
  const [editing, setEditing] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [denomination, setDenomination] = useState('');
  const [worshipStyle, setWorshipStyle] = useState<WorshipStyle>('contemporary');
  const [congregationSize, setCongregationSize] = useState<CongregationSize>('medium');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetails = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('church_details')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (data) {
      setDetails(data as ChurchDetails);
      setDisplayName(profile.display_name);
      setBio(profile.bio);
      setDenomination(data.denomination ?? '');
      setWorshipStyle(data.worship_style ?? 'contemporary');
      setCongregationSize(data.congregation_size ?? 'medium');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [profile?.id])
  );

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
        .from('church_details')
        .update({
          denomination: denomination.trim(),
          worship_style: worshipStyle,
          congregation_size: congregationSize,
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
          <TextInput label="Church Name" value={displayName} onChangeText={setDisplayName} mode="outlined" style={styles.input} />
          <TextInput label="Bio / Description" value={bio} onChangeText={setBio} mode="outlined" multiline style={styles.input} />
          <TextInput label="Denomination" value={denomination} onChangeText={setDenomination} mode="outlined" style={styles.input} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Worship Style</Text>
          <SegmentedButtons
            value={worshipStyle}
            onValueChange={(v) => setWorshipStyle(v as WorshipStyle)}
            buttons={[
              { value: 'contemporary', label: 'Contemporary' },
              { value: 'traditional', label: 'Traditional' },
              { value: 'blended', label: 'Blended' },
            ]}
            style={styles.segmented}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>Congregation Size</Text>
          <SegmentedButtons
            value={congregationSize}
            onValueChange={(v) => setCongregationSize(v as CongregationSize)}
            buttons={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
            ]}
            style={styles.segmented}
          />

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

          <Text variant="bodyMedium" style={styles.detail}>Denomination: {details.denomination}</Text>
          <Text variant="bodyMedium" style={styles.detail}>Worship Style: {details.worship_style}</Text>
          <Text variant="bodyMedium" style={styles.detail}>Congregation Size: {details.congregation_size}</Text>

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
  segmented: { marginBottom: Spacing.md },
  detail: { color: Colors.text, marginTop: Spacing.sm },
  editButton: { marginTop: Spacing.lg },
  input: { marginBottom: Spacing.md },
  buttonRow: { flexDirection: 'row', marginTop: Spacing.lg },
  flex: { flex: 1 },
  spacer: { width: Spacing.sm },
});
