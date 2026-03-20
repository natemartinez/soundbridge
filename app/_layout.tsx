import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { StripeWrapper } from '@/components/StripeWrapper';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: Colors.chipBackground,
    onPrimaryContainer: Colors.primaryDark,
    background: Colors.background,
    surface: Colors.surface,
    onSurface: Colors.text,
    onSurfaceVariant: Colors.textSecondary,
    outline: Colors.border,
    error: Colors.error,
    surfaceVariant: Colors.surface,
  },
};

// Preload icon fonts so @font-face rules exist in the static web export.
// Without this, icons render as blank on Netlify (Metro dev server handles it implicitly).
export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const segments = useSegments();
  const router = useRouter();

  useFonts({
    ...FontAwesome6.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(musician)/home');
    }
  }, [user, initialized]);

  return (
    <StripeWrapper>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(musician)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="public-profile/[id]" />
          <Stack.Screen name="conversation/[id]" />
        </Stack>
      </PaperProvider>
    </StripeWrapper>
  );
}
