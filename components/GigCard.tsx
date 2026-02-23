import { StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { Gig } from '@/lib/types';
import { INSTRUMENTS } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';
import { View } from 'react-native';

interface GigCardProps {
  gig: Gig;
}

export function GigCard({ gig }: GigCardProps) {
  const instrumentLabels = gig.instruments_needed.map(
    (key) => INSTRUMENTS.find((i) => i.key === key)?.label ?? key
  );

  return (
    <Card
      style={styles.card}
      onPress={() => router.push(`/public-profile/${gig.church_id}`)}
    >
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>{gig.title}</Text>
        {gig.church && (
          <Text variant="bodySmall" style={styles.churchName}>
            {gig.church.display_name}
          </Text>
        )}

        <View style={styles.chips}>
          {instrumentLabels.map((label) => (
            <Chip key={label} style={styles.chip} textStyle={styles.chipText} compact>
              {label}
            </Chip>
          ))}
        </View>

        <View style={styles.meta}>
          <Text variant="bodySmall" style={styles.metaText}>
            {gig.date} at {gig.time}
          </Text>
          {gig.pay_offered != null && (
            <Text variant="titleMedium" style={styles.pay}>
              ${gig.pay_offered}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  title: { fontWeight: '600', color: Colors.text },
  churchName: { color: Colors.textSecondary, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: Spacing.xs },
  chip: { backgroundColor: Colors.background },
  chipText: { fontSize: 12, color: '#000000' },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  metaText: { color: Colors.textSecondary },
  pay: { color: Colors.success, fontWeight: 'bold', fontSize: 18 },
});
