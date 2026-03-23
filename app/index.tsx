import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const fadeOut = useRef(new Animated.Value(1)).current;
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) return;
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(musician)/home');
    });
  }, [initialized]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
      <Text variant="headlineMedium" style={styles.title}>SoundBridge</Text>
    </Animated.View>
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
