import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Home, Search, MessageCircle, Settings, LogIn, User } from 'lucide-react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

const TAB_BAR_HEIGHT = 60;

export default function MusicianLayout() {
  const user = useAuthStore((s) => s.user);
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: { backgroundColor: 'transparent', borderTopColor: 'transparent', height: TAB_BAR_HEIGHT },
          headerShown: false,
        }}
        tabBar={(props) => (
          <View style={styles.bottomBar}>
            <View style={styles.tabBar}>
              {props.state.routes.map((route, index) => {
                const options = props.descriptors[route.key].options;
                if ((options as any).href === null) return null;

                const isFocused = props.state.index === index;
                const color = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.6)';

                const onPress = () => {
                  if (route.name === 'profile' && !user) {
                    router.push('/(auth)/login');
                    return;
                  }
                  if (!isFocused) {
                    props.navigation.navigate(route.name);
                  }
                };

                let icon = null;
                let label = options.title ?? route.name;
                const iconSize = 22;

                switch (route.name) {
                  case 'home': icon = <Home size={iconSize} color={color} />; break;
                  case 'search': icon = <Search size={iconSize} color={color} />; break;
                  case 'profile':
                    icon = user
                      ? <User size={iconSize} color={color} />
                      : <LogIn size={iconSize} color={color} />;
                    label = user ? 'Profile' : 'Sign In';
                    break;
                  case 'messages': icon = <MessageCircle size={iconSize} color={color} />; break;
                  case 'settings': icon = <Settings size={iconSize} color={color} />; break;
                }

                return (
                  <Pressable key={route.key} style={styles.tabItem} onPress={onPress}>
                    {icon}
                    <Text style={[styles.tabLabel, { color }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ height: bottomInset, backgroundColor: Colors.primary }} />
          </View>
        )}
      >
        <Tabs.Screen name="home" options={{ title: 'Gigs' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="profile" options={{ title: user ? 'Profile' : 'Sign In' }} />
        <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        <Tabs.Screen name="post-gig" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
