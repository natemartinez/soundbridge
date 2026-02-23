import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, Chip, Button } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
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
    const fetchPublicProfile = async () => {
      if (!id) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);

        if (profileData.role === 'musician') {
          const { data } = await supabase
            .from('musician_details')
            .select('*')
            .eq('id', id)
            .single();
          if (data) setMusicianDetails(data as MusicianDetails);
        } else {
          const { data } = await supabase
            .from('church_details')
            .select('*')
            .eq('id', id)
            .single();
          if (data) setChurchDetails(data as ChurchDetails);
        }
      }
      setLoading(false);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.name}>{profile.display_name}</Text>
      <Text variant="bodySmall" style={styles.role}>
        {profile.role === 'musician' ? 'Musician' : 'Church'}
      </Text>
      <Text variant="bodyMedium" style={styles.location}>
        {profile.location_city}{profile.location_state ? `, ${profile.location_state}` : ''}
      </Text>
      {profile.bio ? <Text variant="bodyMedium" style={styles.bio}>{profile.bio}</Text> : null}

      {musicianDetails && (
        <>
          <View style={styles.chips}>
            {(musicianDetails.instruments ?? []).map((key) => {
              const label = INSTRUMENTS.find((i) => i.key === key)?.label ?? key;
              return <Chip key={key} compact>{label}</Chip>;
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
        </>
      )}

      {churchDetails && (
        <>
          <Text variant="bodyMedium" style={styles.detail}>Denomination: {churchDetails.denomination}</Text>
          <Text variant="bodyMedium" style={styles.detail}>Worship Style: {churchDetails.worship_style}</Text>
          <Text variant="bodyMedium" style={styles.detail}>Congregation Size: {churchDetails.congregation_size}</Text>
        </>
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
  content: { padding: Spacing.lg },
  name: { fontWeight: 'bold', color: Colors.text },
  role: { color: Colors.primary, marginTop: Spacing.xs, textTransform: 'capitalize' },
  location: { color: Colors.textSecondary, marginTop: Spacing.xs },
  bio: { color: Colors.text, marginTop: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.md },
  detail: { color: Colors.text, marginTop: Spacing.sm },
  messageButton: { marginTop: Spacing.xl },
});
