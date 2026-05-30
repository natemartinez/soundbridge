import { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) return;
    router.replace(user ? '/(musician)/home' : '/(auth)/login');
  }, [initialized]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      <Text variant="headlineMedium" style={styles.title}>SoundBridge</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
