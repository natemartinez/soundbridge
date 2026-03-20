import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, Chip, Button, Avatar } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { firestore } from '@/lib/firebase';
import { Profile, MusicianDetails, ChurchDetails } from '@/lib/types';
import { INSTRUMENTS } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [musicianDetails, setMusicianDetails] = useState<MusicianDetails | null>(null);
  const [churchDetails, setChurchDetails] = useState<ChurchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Live Firestore path
    const fetchPublicProfile = async () => {
      try {
        const doc = await firestore().collection('users').doc(id).get();

        if (doc.exists) {
          const data = doc.data()!;
          setProfile({ id, ...data } as Profile);

          if (data.role === 'musician' && data.musician_details) {
            setMusicianDetails({ id, ...data.musician_details } as MusicianDetails);
          } else if (data.church_details) {
            setChurchDetails({ id, ...data.church_details } as ChurchDetails);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text variant="titleMedium">Profile not found</Text>
      </View>
    );
  }

  const denomination = churchDetails?.denomination;
  const worshipStyle = churchDetails?.worship_style;
  const congregationSize = churchDetails?.congregation_size;

  const initials = (profile.display_name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Header: avatar + name + location ── */}
      <View style={styles.header}>
        <Avatar.Text
          size={72}
          label={initials}
          style={styles.avatar}
          labelStyle={styles.avatarLabel}
        />
        <Text variant="headlineSmall" style={styles.name}>{profile.display_name}</Text>
        {(profile.location_city || profile.location_state) && (
          <Text variant="bodySmall" style={styles.location}>
            {[profile.location_city, profile.location_state].filter(Boolean).join(', ')}
          </Text>
        )}
      </View>

      {/* ── Church identity chips ── */}
      {(denomination || worshipStyle || congregationSize) && (
        <View style={styles.identityRow}>
          {denomination && (
            <View style={styles.identityChip}>
              <Text style={styles.identityChipText}>{denomination}</Text>
            </View>
          )}
          {worshipStyle && (
            <View style={styles.identityChip}>
              <Text style={styles.identityChipText}>{worshipStyle}</Text>
            </View>
          )}
          {congregationSize && (
            <View style={styles.identityChip}>
              <Text style={styles.identityChipText}>{congregationSize}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Bio ── */}
      {!!profile.bio && (
        <View style={styles.section}>
          <Text variant="bodyMedium" style={styles.bio}>{profile.bio}</Text>
        </View>
      )}

      {/* ── Musician-specific details ── */}
      {musicianDetails && (
        <View style={styles.section}>
          <View style={styles.chips}>
            {(musicianDetails.instruments ?? []).map((key) => {
              const label = INSTRUMENTS.find((i) => i.key === key)?.label ?? key;
              return <Chip key={key} compact style={styles.chip} textStyle={styles.chipText}>{label}</Chip>;
            })}
          </View>
          <Text variant="bodyMedium" style={styles.detail}>
            Experience: {musicianDetails.experience_years} years
          </Text>
          {musicianDetails.rate_per_service != null && (
            <Text variant="bodyMedium" style={styles.detail}>
              Rate: ${musicianDetails.rate_per_service}/service
            </Text>
          )}
          <Text variant="bodyMedium" style={styles.detail}>
            {musicianDetails.available ? 'Available for gigs' : 'Not currently available'}
          </Text>
        </View>
      )}

      <Button mode="outlined" disabled style={styles.messageButton}>
        Message (Coming Soon)
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },

  // Header
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  avatar: { backgroundColor: Colors.primary, marginBottom: Spacing.sm },
  avatarLabel: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 26 },
  name: { fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  location: { color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },

  // Identity chips
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'center', marginBottom: Spacing.lg },
  identityChip: { backgroundColor: Colors.chipBackground, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: 20 },
  identityChipText: { color: Colors.chipText, fontSize: 12, fontWeight: '500' },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.text, fontWeight: '700', marginBottom: Spacing.md },
  bio: { color: Colors.textSecondary, lineHeight: 22 },

  // Musician details
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: { backgroundColor: Colors.chipBackground },
  chipText: { fontSize: 12, color: Colors.chipText },
  detail: { color: Colors.text, marginTop: Spacing.sm },

  messageButton: { marginTop: Spacing.md },
});
