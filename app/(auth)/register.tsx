import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, SegmentedButtons } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';
import { UserRole } from '@/lib/types';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('musician');
  const [error, setError] = useState('');
  const signUp = useAuthStore((s) => s.signUp);
  const loading = useAuthStore((s) => s.loading);

  const handleRegister = async () => {
    setError('');
    try {
      await signUp(email.trim(), password, role);
      router.replace('/(auth)/onboarding');
    } catch (e: any) {
      setError(e.message ?? 'Registration failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text variant="headlineLarge" style={styles.title}>Join SoundBridge</Text>

        <Text variant="titleMedium" style={styles.label}>I am a...</Text>
        <SegmentedButtons
          value={role}
          onValueChange={(v) => setRole(v as UserRole)}
          buttons={[
            { value: 'musician', label: 'Musician' },
            { value: 'church', label: 'Church' },
          ]}
          style={styles.segmented}
        />

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
          onPress={handleRegister}
          loading={loading}
          disabled={loading || !email || !password}
          style={styles.button}
        >
          Create Account
        </Button>

        <Link href="/(auth)/login" asChild>
          <Button mode="text">Already have an account? Sign in</Button>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  title: { textAlign: 'center', fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.lg },
  label: { marginBottom: Spacing.sm },
  segmented: { marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.md },
  button: { marginTop: Spacing.md, marginBottom: Spacing.sm },
});
