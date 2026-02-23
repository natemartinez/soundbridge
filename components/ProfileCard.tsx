import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { MusicianWithDetails } from '@/lib/types';
import { INSTRUMENTS } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';

interface ProfileCardProps {
  musician: MusicianWithDetails;
}

export function ProfileCard({ musician }: ProfileCardProps) {
  const instrumentLabels = (musician.musician_details?.instruments ?? []).map(
    (key) => INSTRUMENTS.find((i) => i.key === key)?.label ?? key
  );

  return (
    <Card
      style={styles.card}
      onPress={() => router.push(`/public-profile/${musician.id}`)}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.name}>
              {musician.display_name}
            </Text>
            <Text variant="bodySmall" style={styles.location}>
              {musician.location_city}{musician.location_state ? `, ${musician.location_state}` : ''}
            </Text>
          </View>
          {musician.musician_details?.available && (
            <Chip style={styles.availableBadge} textStyle={styles.availableText} compact>
              Available
            </Chip>
          )}
        </View>

        <View style={styles.chips}>
          {instrumentLabels.map((label) => (
            <Chip key={label} style={styles.chip} textStyle={styles.chipText} compact>
              {label}
            </Chip>
          ))}
        </View>

        {musician.musician_details?.rate_per_service != null && (
          <Text variant="bodySmall" style={styles.rate}>
            ${musician.musician_details.rate_per_service}/service
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  name: { fontWeight: '600', color: Colors.text },
  location: { color: Colors.textSecondary, marginTop: 2 },
  availableBadge: { backgroundColor: '#064E3B' },
  availableText: { color: Colors.success, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: Spacing.xs },
  chip: { backgroundColor: Colors.background },
  chipText: { fontSize: 12, color: '#000000' },
  rate: { color: Colors.success, fontWeight: '600', marginTop: Spacing.sm },
});
