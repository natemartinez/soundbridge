import { View, StyleSheet } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

export default function MusicianSettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { bottom: bottomInset } = useSafeAreaInsets();

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Account</Text>
          <Text variant="bodyMedium" style={styles.item}>
            Sign in to manage your account settings, view your email, and more.
          </Text>
          <Button mode="contained" onPress={() => router.push('/(auth)/login')} style={styles.signInButton}>
            Sign In
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT + bottomInset }]}>
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Account</Text>
        <Text variant="bodySmall" style={styles.label}>Email</Text>
        <Text variant="bodyMedium" style={styles.item}>{user.email}</Text>
        <Text variant="bodySmall" style={styles.label}>Role</Text>
        <Text variant="bodyMedium" style={styles.item} testID="role-value">
          {profile?.role === 'church' ? 'Church' : 'Musician'}
        </Text>
        <Text variant="bodySmall" style={styles.label}>Plan</Text>
        <Text variant="bodyMedium" style={styles.item}>
          {profile?.account_tier === 'premium' ? 'Premium' : 'Basic (Free)'}
        </Text>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <Button
          mode="outlined"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
          textColor={Colors.error}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  label: { color: Colors.textSecondary, marginBottom: 2 },
  item: { color: Colors.text, marginBottom: Spacing.md },
  divider: { marginVertical: Spacing.lg },
  signInButton: { marginTop: Spacing.sm },
  signOutButton: { borderColor: Colors.error },
});
