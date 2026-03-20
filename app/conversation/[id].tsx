import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  FlatList,
  StyleSheet,
  View,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';
import { firestore } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import type { Conversation, Message } from '@/lib/types';

const otherName = (c: Conversation, uid: string) =>
  uid === c.musician_id ? c.poster_name : c.musician_name;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<Message>>(null);

  // Fetch conversation metadata once
  useEffect(() => {
    if (!id || !user?.uid) return;

    firestore()
      .collection('conversations')
      .doc(id as string)
      .get()
      .then((snap) => {
        if (snap.exists) {
          setConversation({ id: id as string, ...(snap.data() as Omit<Conversation, 'id'>) });
        }
      })
      .catch(() => {
        setError('Could not load conversation.');
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [id, user?.uid]);

  // Real-time messages listener
  useEffect(() => {
    if (!id || !user?.uid) return;

    const unsubscribe = firestore()
      .collection('messages')
      .where('conversation_id', '==', id as string)
      .orderBy('created_at', 'asc')
      .onSnapshot(
        (snap) => {
          const msgs: Message[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Message, 'id'>),
          }));
          setMessages(msgs);
        },
        (_err) => {
          setError('Could not load messages. Check your connection.');
        }
      );

    return () => unsubscribe();
  }, [id, user?.uid]);

  // Scroll to end whenever new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!user || !id || !inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const now = new Date().toISOString();

      await firestore().collection('messages').add({
        conversation_id: id as string,
        sender_id: user.uid,
        text,
        created_at: now,
      });

      await firestore()
        .collection('conversations')
        .doc(id as string)
        .update({
          last_message: text,
          last_message_at: now,
        });
    } catch {
      // restore text on failure so the user doesn't lose the message
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.uid;
    return (
      <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
        <Text style={isMine ? styles.myText : styles.theirText}>{item.text}</Text>
      </View>
    );
  }, [user?.uid]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.signInText}>Please sign in to view messages.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!loading && !conversation) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: Colors.textSecondary }}>Conversation not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {conversation ? otherName(conversation, user.uid) : ''}
          </Text>
          {conversation?.gig_title ? (
            <Text style={styles.headerSubtitle}>{conversation.gig_title}</Text>
          ) : null}
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input row */}
      <View style={styles.inputRow}>
        <RNTextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message…"
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <Pressable
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Send
            size={22}
            color={inputText.trim() && !sending ? Colors.primary : Colors.textSecondary}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  signInText: { color: Colors.textSecondary, fontSize: 15 },
  errorBanner: { backgroundColor: '#FEE2E2', padding: Spacing.sm, paddingHorizontal: Spacing.md },
  errorText: { color: '#DC2626', fontSize: 13 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  headerSubtitle: { fontSize: 13, color: Colors.textSecondary },
  messagesList: { padding: Spacing.md, paddingBottom: Spacing.sm },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface },
  myText: { color: '#FFFFFF', fontSize: 15 },
  theirText: { color: Colors.text, fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: { padding: Spacing.sm },
});
