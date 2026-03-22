import { Gig } from '@/lib/types';

export function useGigPayment() {
  const handleGigPayment = async (_gig: Gig): Promise<boolean> => false;
  return { loading: false, error: '', handleGigPayment };
}
