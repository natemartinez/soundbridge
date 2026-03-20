import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { firestore } from '@/lib/firebase';
import { Conversation } from '@/lib/types';

export default function MusicianMessagesScreen() {
  const user = useAuthStore((s) => s.user);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const snapshot = await firestore()
        .collection('conversations')
        .where('participants', 'array-contains', user.uid)
        .get();

      const docs = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Conversation)
      );

      // Sort by last_message_at descending, nulls last
      docs.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return b.last_message_at.localeCompare(a.last_message_at);
      });

      setConversations(docs);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setLoading(false);
    }
  }, [user?.uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  // Not logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <MessageCircle size={64} color={Colors.textSecondary} />
          <Text variant="headlineSmall" style={styles.title}>Your Messages</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to view your conversations with churches and stay on top of your gigs.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/(auth)/login')}
            style={styles.button}
          >
            Sign In
          </Button>
        </View>
      </View>
    );
  }

  // First-load spinner
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherName =
      user.uid === item.musician_id ? item.poster_name : item.musician_name;
    const gigTitle = item.gig_title ?? 'Direct Message';
    const preview = item.last_message ?? 'No messages yet';
    const ts = item.last_message_at ?? item.created_at;
    const dateLabel = new Date(ts).toLocaleDateString();

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => router.push(`/conversation/${item.id}`)}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowTop}>
            <Text variant="titleSmall" style={styles.gigTitle} numberOfLines={1}>
              {gigTitle}
            </Text>
            <Text variant="bodySmall" style={styles.timestamp}>
              {dateLabel}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.otherName} numberOfLines={1}>
            {otherName}
          </Text>
          <Text variant="bodySmall" style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MessageCircle size={56} color={Colors.border} />
            <Text variant="titleMedium" style={styles.emptyTitle}>No messages yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Apply to a gig to start a conversation.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.sm,
  },

  // Row
  row: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowPressed: {
    backgroundColor: Colors.chipBackground,
  },
  rowMain: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  gigTitle: {
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  timestamp: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  otherName: {
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  preview: {
    color: Colors.textSecondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xl * 3,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
