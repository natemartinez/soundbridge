import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';

export function useStripeUpgrade() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');

    try {
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

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          throw new Error(paymentError.message);
        }
        return;
      }

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

  return { loading, error, handleUpgrade, canUpgrade: true as const };
}
