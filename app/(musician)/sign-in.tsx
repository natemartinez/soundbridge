import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';
import { UserRole } from '@/lib/types';

export default function SignInTab() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('musician');
  const [error, setError] = useState('');
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);

  const handleSubmit = async () => {
    setError('');
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        router.replace('/');
      } else {
        await signUp(email.trim(), password, role);
        router.replace('/(auth)/onboarding');
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text variant="headlineMedium" style={styles.title}>
          {mode === 'login' ? 'Welcome Back' : 'Join OnSpace'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to apply for gigs and manage your profile'
            : 'Create an account to get started'}
        </Text>

        <SegmentedButtons
          value={mode}
          onValueChange={(v) => { setMode(v as 'login' | 'register'); setError(''); }}
          buttons={[
            { value: 'login', label: 'Sign In' },
            { value: 'register', label: 'Sign Up' },
          ]}
          style={styles.modeToggle}
        />

        {mode === 'register' && (
          <>
            <Text variant="titleSmall" style={styles.label}>I am a...</Text>
            <SegmentedButtons
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              buttons={[
                { value: 'musician', label: 'Musician' },
                { value: 'church', label: 'Church' },
              ]}
              style={styles.roleToggle}
            />
          </>
        )}

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
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.button}
        >
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { fontWeight: 'bold', color: Colors.primary, textAlign: 'center' },
  subtitle: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg },
  modeToggle: { marginBottom: Spacing.lg },
  label: { marginBottom: Spacing.sm },
  roleToggle: { marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.md },
  button: { marginTop: Spacing.md },
});
