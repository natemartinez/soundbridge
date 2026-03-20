import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { auth } from '@/lib/firebase';
import { Colors } from '@/constants/theme';
import { Gig } from '@/lib/types';

export function useGigPayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGigPayment = async (gig: Gig): Promise<boolean> => {
    setLoading(true);
    setError('');

    try {
      if (!gig.pay_offered) throw new Error('Gig has no pay amount');

      const user = auth().currentUser;
      if (!user) throw new Error('Not signed in');
      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL}/createGigPayment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gig_id: gig.id,
            amount_cents: Math.round(gig.pay_offered * 100),
          }),
        }
      );

      const { clientSecret, ephemeralKey, customerId, error: fnError } = await response.json();
      if (fnError) throw new Error(fnError);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'SoundBridge',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { email: user.email ?? '' },
        appearance: {
          colors: {
            primary: Colors.primary,
            background: Colors.background,
            componentBackground: Colors.surface,
            componentBorder: Colors.border,
            primaryText: '#000000',
            secondaryText: '#444444',
            componentText: '#000000',
            placeholderText: '#888888',
          },
        },
      });

      if (initError) throw new Error(initError.message);

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          throw new Error(paymentError.message);
        }
        return false;
      }

      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleGigPayment };
}
