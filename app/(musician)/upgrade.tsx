import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

const BASIC_FEATURES = [
  'Browse open gigs',
  'Search by instrument & location',
  'Basic profile',
  'Apply to 3 gigs/month',
];

const PREMIUM_FEATURES = [
  'Everything in Basic',
  'Unlimited gig applications',
  'Priority in search results',
  'Direct messaging with churches',
  'Profile badge & verification',
  'Early access to new gigs',
];

export default function UpgradeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Upgrade Your Plan</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Get more gigs and stand out to churches
      </Text>

      {/* Basic Tier */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.tierHeader}>
            <Text variant="titleLarge" style={styles.tierName}>Basic</Text>
            <Chip compact style={styles.currentBadge} textStyle={styles.currentBadgeText}>
              Current Plan
            </Chip>
          </View>
          <Text variant="headlineLarge" style={styles.price}>Free</Text>
          <Divider style={styles.divider} />
          {BASIC_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Check size={18} color={Colors.success} />
              <Text variant="bodyMedium" style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Premium Tier */}
      <Card style={[styles.card, styles.premiumCard]}>
        <Card.Content>
          <View style={styles.tierHeader}>
            <Text variant="titleLarge" style={styles.premiumTierName}>Premium</Text>
            <Chip compact style={styles.popularBadge} textStyle={styles.popularBadgeText}>
              Most Popular
            </Chip>
          </View>
          <View style={styles.priceRow}>
            <Text variant="headlineLarge" style={styles.premiumPrice}>$9.99</Text>
            <Text variant="bodyMedium" style={styles.priceUnit}>/month</Text>
          </View>
          <Divider style={styles.divider} />
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Check size={18} color={Colors.primary} />
              <Text variant="bodyMedium" style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          <Button mode="contained" style={styles.upgradeButton}>
            Upgrade to Premium
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  title: { fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg },
  card: { marginBottom: Spacing.lg, backgroundColor: Colors.surface },
  premiumCard: { borderWidth: 2, borderColor: Colors.primary },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  tierName: { fontWeight: 'bold', color: Colors.text },
  premiumTierName: { fontWeight: 'bold', color: Colors.primary },
  currentBadge: { backgroundColor: Colors.background },
  currentBadgeText: { fontSize: 11, color: Colors.textSecondary },
  popularBadge: { backgroundColor: '#3D3800' },
  popularBadgeText: { fontSize: 11, color: Colors.primary },
  price: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  premiumPrice: { fontWeight: 'bold', color: Colors.primary },
  priceUnit: { color: Colors.textSecondary, marginLeft: Spacing.xs },
  divider: { marginVertical: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  featureText: { color: Colors.text, marginLeft: Spacing.sm },
  upgradeButton: { marginTop: Spacing.lg },
});
