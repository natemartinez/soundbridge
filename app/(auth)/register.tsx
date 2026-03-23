import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { Spacing } from '@/constants/theme';
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
    <LinearGradient colors={['#1A0B2E', '#6B2FA0', '#9B59B6']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Text variant="displaySmall" style={styles.title}>Join SoundBridge</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Connecting musicians with churches
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleToggle}>
              {(['musician', 'church'] as UserRole[]).map((r) => {
                const selected = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.roleButton, selected && styles.roleButtonSelected]}
                  >
                    <Text style={[styles.roleButtonText, selected && styles.roleButtonTextSelected]}>
                      {r === 'musician' ? '🎵 Musician' : '⛪ Church'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="rgba(255,255,255,0.4)"
              placeholder="you@example.com"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="rgba(255,255,255,0.4)"
              placeholder="••••••••"
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleRegister}
              disabled={loading || !email || !password}
              style={({ pressed }) => [styles.button, (loading || !email || !password) && styles.buttonDisabled, pressed && styles.buttonPressed]}
            >
              {loading
                ? <ActivityIndicator color="#6B2FA0" />
                : <Text style={styles.buttonText}>Create Account</Text>
              }
            </Pressable>
          </View>

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.footerLink}>
              <Text style={styles.footerText}>Already have an account? <Text style={styles.footerTextBold}>Sign in</Text></Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: Spacing.xl * 1.5,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  roleToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  roleButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  roleButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    fontSize: 15,
  },
  roleButtonTextSelected: {
    color: '#6B2FA0',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  error: {
    color: '#FCA5A5',
    fontSize: 13,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#6B2FA0',
    fontWeight: '700',
    fontSize: 16,
  },
  footerLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  footerText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
  },
  footerTextBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
