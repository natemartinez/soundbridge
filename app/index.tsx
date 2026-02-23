import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  // Authenticated users with incomplete profile go to onboarding
  if (session && (!profile || !profile.display_name)) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // Authenticated church users go to church home
  if (session && profile?.role === 'church') {
    return <Redirect href="/(church)/home" />;
  }

  // Everyone else (unauthenticated or musicians) browses gigs
  return <Redirect href="/(musician)/home" />;
}
