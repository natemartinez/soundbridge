import { View, StyleSheet } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing } from '@/constants/theme';

export default function ChurchSettingsScreen() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Account</Text>
        <Text variant="bodyMedium" style={styles.item}>Email: {session?.user?.email}</Text>
        <Text variant="bodyMedium" style={styles.item}>Role: Church</Text>
      </View>

      <Divider style={styles.divider} />

      <Button mode="outlined" onPress={handleSignOut} textColor={Colors.error} style={styles.signOut}>
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  item: { color: Colors.textSecondary, marginBottom: Spacing.sm },
  divider: { marginVertical: Spacing.lg },
  signOut: { borderColor: Colors.error },
});
