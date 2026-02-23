import { ReactNode } from 'react';

// Web fallback: StripeProvider is native-only. On web, render children directly.
export function StripeWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
