import { ReactNode } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

export function StripeWrapper({ children }: { children: ReactNode }) {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      {children}
    </StripeProvider>
  );
}
