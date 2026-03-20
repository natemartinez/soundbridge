import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, Portal, Modal, TextInput, Checkbox } from 'react-native-paper';
import { router } from 'expo-router';
import { User, MapPin } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { firestore } from '@/lib/firebase';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';

export default function MusicianProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [editVisible, setEditVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentKey[]>([]);
  const [ratePerService, setRatePerService] = useState('');

  const openEdit = () => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
    setCity(profile?.location_city ?? '');
    setStateName(profile?.location_state ?? '');

    const details = (profile as any)?.musician_details;
    setSelectedInstruments(details?.instruments ?? []);
    setRatePerService(
      details?.rate_per_service != null ? String(details.rate_per_service) : ''
    );

    setEditVisible(true);
  };

  const toggleInstrument = (key: InstrumentKey) => {
    setSelectedInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        location_city: city.trim(),
        location_state: stateName.trim(),
      };

      if (profile?.role === 'musician') {
        updates['musician_details.instruments'] = selectedInstruments;
        updates['musician_details.rate_per_service'] =
          ratePerService.trim() !== '' ? Number(ratePerService.trim()) : null;
      }

      await firestore().collection('users').doc(user.uid).update(updates);
      await fetchProfile();
      setEditVisible(false);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <User size={64} color={Colors.textSecondary} />
          <Text variant="headlineSmall" style={styles.title}>Your Profile</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to create your musician profile, add your instruments, and start applying for gigs.
          </Text>
          <Button mode="contained" onPress={() => router.push('/(auth)/login')} style={styles.button}>
            Sign In to Get Started
          </Button>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <User size={40} color={Colors.primary} />
          </View>
          <View style={styles.nameBlock}>
            <Text variant="headlineSmall" style={styles.displayName}>
              {profile?.display_name || 'Your Profile'}
            </Text>
            {(profile?.location_city || profile?.location_state) && (
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.textSecondary} />
                <Text variant="bodySmall" style={styles.location}>
                  {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </View>
          {profile?.account_tier === 'premium' && (
            <Chip style={styles.premiumChip} textStyle={styles.premiumChipText}>Premium</Chip>
          )}
        </View>

        <Button mode="outlined" onPress={openEdit} style={styles.editButton}>
          Edit Profile
        </Button>

        {profile?.bio ? (
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionLabel}>Bio</Text>
            <Text variant="bodyMedium" style={styles.bioText}>{profile.bio}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionLabel}>Email</Text>
          <Text variant="bodyMedium" style={styles.infoText}>{user.email}</Text>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={editVisible}
          onDismiss={() => setEditVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Edit Profile</Text>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
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
            <TextInput
              label="City"
              value={city}
              onChangeText={setCity}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="State"
              value={stateName}
              onChangeText={setStateName}
              mode="outlined"
              style={styles.input}
            />

            {profile?.role === 'musician' && (
              <>
                <Text variant="titleSmall" style={styles.sectionLabel}>Instruments</Text>
                {INSTRUMENTS.map((inst) => (
                  <Checkbox.Item
                    key={inst.key}
                    label={inst.label}
                    status={selectedInstruments.includes(inst.key as InstrumentKey) ? 'checked' : 'unchecked'}
                    onPress={() => toggleInstrument(inst.key as InstrumentKey)}
                  />
                ))}

                <TextInput
                  label="Rate per Service ($)"
                  value={ratePerService}
                  onChangeText={setRatePerService}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setEditVisible(false)}
              style={styles.modalButton}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.modalButton}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  scrollContent: { padding: Spacing.lg },
  title: { fontWeight: 'bold', color: Colors.text, marginTop: Spacing.lg },
  subtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg, lineHeight: 22 },
  button: { marginTop: Spacing.sm },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.chipBackground, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  nameBlock: { flex: 1 },
  displayName: { fontWeight: 'bold', color: Colors.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  location: { color: Colors.textSecondary },
  premiumChip: { backgroundColor: Colors.primary },
  premiumChipText: { color: '#FFFFFF', fontSize: 11 },
  editButton: { marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg },
  sectionLabel: { fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  bioText: { color: Colors.text, lineHeight: 22 },
  infoText: { color: Colors.text },
  // Modal
  modalContainer: {
    backgroundColor: Colors.background,
    margin: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md },
  modalScroll: { flexGrow: 0 },
  input: { marginBottom: Spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalButton: { minWidth: 90 },
});
