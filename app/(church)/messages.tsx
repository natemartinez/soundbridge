import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MessageCircle } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

export default function ChurchMessagesScreen() {
  return (
    <View style={styles.container}>
      <MessageCircle size={64} color={Colors.border} />
      <Text variant="titleLarge" style={styles.title}>Messages</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  title: { color: Colors.text, marginTop: Spacing.md },
  subtitle: { color: Colors.textSecondary, marginTop: Spacing.xs },
});
