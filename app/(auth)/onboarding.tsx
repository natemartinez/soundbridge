import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, Checkbox, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { firestore } from '@/lib/firebase';
import { Colors, Spacing } from '@/constants/theme';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { WorshipStyle, CongregationSize } from '@/lib/types';

export default function OnboardingScreen() {
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const role = profile?.role;

  // Common fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Musician fields
  const [instruments, setInstruments] = useState<InstrumentKey[]>([]);
  const [experienceYears, setExperienceYears] = useState('');
  const [ratePerService, setRatePerService] = useState('');

  // Church fields
  const [denomination, setDenomination] = useState('');
  const [worshipStyle, setWorshipStyle] = useState<WorshipStyle>('contemporary');
  const [congregationSize, setCongregationSize] = useState<CongregationSize>('medium');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, []);

  const toggleInstrument = (key: InstrumentKey) => {
    setInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = firestore().collection('users').doc(profile.id);

      // Update profile + embed role-specific details in one write
      const updates: Record<string, unknown> = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        location_city: city.trim(),
        location_state: state.trim(),
      };

      if (role === 'musician') {
        updates.musician_details = {
          instruments,
          experience_years: parseInt(experienceYears) || 0,
          available: true,
          rate_per_service: ratePerService ? parseFloat(ratePerService) : null,
        };
      } else {
        updates.church_details = {
          denomination: denomination.trim(),
          worship_style: worshipStyle,
          congregation_size: congregationSize,
          website_url: null,
        };
      }

      await userRef.update(updates);

      // Refresh profile in store
      await fetchProfile();

      // Navigate to appropriate home
      if (role === 'musician') {
        router.replace('/(musician)/home');
      } else {
        router.replace('/(musician)/home');
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Complete Your Profile</Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        {role === 'musician' ? 'Tell churches about yourself' : 'Tell musicians about your church'}
      </Text>

      {/* Common Fields */}
      <TextInput
        label="Display Name"
        value={displayName}
        onChangeText={setDisplayName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Bio"
        value={bio}
        onChangeText={setBio}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />
      <View style={styles.row}>
        <TextInput
          label="City"
          value={city}
          onChangeText={setCity}
          mode="outlined"
          style={[styles.input, styles.flex]}
        />
        <View style={styles.spacer} />
        <TextInput
          label="State"
          value={state}
          onChangeText={setState}
          mode="outlined"
          style={[styles.input, { width: 100 }]}
        />
      </View>

      {/* Musician-specific Fields */}
      {role === 'musician' && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>Instruments</Text>
          <View style={styles.checkboxGroup}>
            {INSTRUMENTS.map((inst) => (
              <Checkbox.Item
                key={inst.key}
                label={inst.label}
                status={instruments.includes(inst.key) ? 'checked' : 'unchecked'}
                onPress={() => toggleInstrument(inst.key)}
                style={styles.checkboxItem}
              />
            ))}
          </View>

          <TextInput
            label="Years of Experience"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Rate per Service ($, optional)"
            value={ratePerService}
            onChangeText={setRatePerService}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
        </>
      )}

      {/* Church-specific Fields */}
      {role === 'church' && (
        <>
          <TextInput
            label="Denomination"
            value={denomination}
            onChangeText={setDenomination}
            mode="outlined"
            style={styles.input}
          />

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
        </>
      )}

      {error ? <HelperText type="error">{error}</HelperText> : null}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={loading}
        disabled={loading || !displayName.trim()}
        style={styles.button}
      >
        Complete Setup
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  title: { fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.xs },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.lg },
  sectionTitle: { marginTop: Spacing.md, marginBottom: Spacing.sm, fontWeight: '600' },
  input: { marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  spacer: { width: Spacing.sm },
  checkboxGroup: { marginBottom: Spacing.md },
  checkboxItem: { paddingVertical: 0 },
  segmented: { marginBottom: Spacing.md },
  button: { marginTop: Spacing.lg },
});
