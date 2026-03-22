import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);

  const handleLogin = async () => {
    setError('');
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text variant="headlineLarge" style={styles.title}>SoundBridge</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Connecting musicians with churches
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mode="outlined"
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.button}
        >
          Sign In
        </Button>

        <Link href="/(auth)/register" asChild>
          <Button mode="text">Don't have an account? Sign up</Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { textAlign: 'center', fontWeight: 'bold', color: Colors.primary },
  subtitle: { textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.xl },
  input: { marginBottom: Spacing.md },
  button: { marginTop: Spacing.md, marginBottom: Spacing.sm },
});
