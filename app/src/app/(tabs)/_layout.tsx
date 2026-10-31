import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Colors, Fonts } from '@/constants/theme';

const tabIcon = (name: IconName) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} size={24} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: [
          { backgroundColor: Colors.surface, borderTopColor: Colors.border },
          // iOS and Android size the bar around the safe area; the web bar needs room set by hand.
          Platform.OS === 'web' && { height: 64, paddingTop: 6, paddingBottom: 8 },
        ],
        // Heebo's letters are taller than the default label box, so give it room.
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11, lineHeight: 16 },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'בית', tabBarIcon: tabIcon({ ios: 'house', android: 'home', web: 'home' }) }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'חיפוש',
          tabBarIcon: tabIcon({ ios: 'magnifyingglass', android: 'search', web: 'search' }),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'השראה',
          tabBarIcon: tabIcon({ ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' }),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'התורים שלי',
          tabBarIcon: tabIcon({ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: tabIcon({ ios: 'person', android: 'person', web: 'person' }),
        }}
      />
    </Tabs>
  );
}
