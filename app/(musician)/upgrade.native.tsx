import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { useStripe } from '@stripe/stripe-react-native';
import { Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
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
  'Hot Gigs — highest-paying opportunities',
];

export default function UpgradeScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const profile = useAuthStore((s) => s.profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPremium = profile?.account_tier === 'premium';

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Get payment details from Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { clientSecret, ephemeralKey, customerId, error: fnError } = await response.json();
      if (fnError) throw new Error(fnError);

      // 2. Initialize PaymentSheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'OnSpace',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { email: session?.user?.email ?? '' },
        appearance: {
          colors: {
            primary: Colors.primary,
            background: Colors.background,
            componentBackground: Colors.surface,
            componentBorder: Colors.border,
            primaryText: Colors.text,
            secondaryText: Colors.textSecondary,
          },
        },
      });

      if (initError) throw new Error(initError.message);

      // 3. Present PaymentSheet
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          throw new Error(paymentError.message);
        }
        return; // User cancelled — do nothing
      }

      // 4. Payment succeeded — poll for webhook to flip account_tier
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await fetchProfile();
        const currentProfile = useAuthStore.getState().profile;
        if (currentProfile?.account_tier === 'premium') break;
      }

    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
            {!isPremium && (
              <Chip compact style={styles.currentBadge} textStyle={styles.currentBadgeText}>
                Current Plan
              </Chip>
            )}
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
            {isPremium ? (
              <Chip compact style={styles.activeBadge} textStyle={styles.activeBadgeText}>
                Active
              </Chip>
            ) : (
              <Chip compact style={styles.popularBadge} textStyle={styles.popularBadgeText}>
                Most Popular
              </Chip>
            )}
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

          {!isPremium && (
            <>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
              <Button
                mode="contained"
                style={styles.upgradeButton}
                loading={loading}
                disabled={loading}
                onPress={handleUpgrade}
              >
                Upgrade to Premium
              </Button>
            </>
          )}
          {isPremium && (
            <Text style={styles.activeText}>You're on Premium. Enjoy Hot Gigs!</Text>
          )}
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
  popularBadge: { backgroundColor: Colors.chipBackground },
  popularBadgeText: { fontSize: 11, color: Colors.primary },
  activeBadge: { backgroundColor: Colors.success },
  activeBadgeText: { fontSize: 11, color: '#FFFFFF' },
  price: { fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  premiumPrice: { fontWeight: 'bold', color: Colors.primary },
  priceUnit: { color: Colors.textSecondary, marginLeft: Spacing.xs },
  divider: { marginVertical: Spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  featureText: { color: Colors.text, marginLeft: Spacing.sm },
  upgradeButton: { marginTop: Spacing.lg },
  errorText: { color: Colors.error, marginTop: Spacing.sm, textAlign: 'center' },
  activeText: { color: Colors.success, marginTop: Spacing.lg, textAlign: 'center', fontWeight: '600' },
});
