// Web stub — Stripe PaymentSheet is native-only.
// Metro resolves useStripeUpgrade.native.ts on iOS/Android.
export function useStripeUpgrade() {
  const handleUpgrade = async () => {};
  return { loading: false, error: '', handleUpgrade, canUpgrade: false as const };
}
