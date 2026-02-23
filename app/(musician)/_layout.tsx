import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Home, Search, User, MessageCircle, Settings, Star } from 'lucide-react-native';
import { Text } from 'react-native-paper';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

function SignInButton() {
  return (
    <Pressable
      onPress={() => router.push('/(auth)/login')}
      style={{ marginRight: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.primary, borderRadius: 8 }}
    >
      <Text style={{ color: '#1A1A1A', fontWeight: '600', fontSize: 14 }}>Sign In</Text>
    </Pressable>
  );
}

export default function MusicianLayout() {
  const session = useAuthStore((s) => s.session);
  const isGuest = !session;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShown: true,
        headerRight: isGuest ? () => <SignInButton /> : undefined,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Gigs',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upgrade"
        options={{
          title: 'Upgrade',
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
          href: isGuest ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          href: isGuest ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          href: isGuest ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          href: isGuest ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="sign-in"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
