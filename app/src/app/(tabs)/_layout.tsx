import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Colors, Fonts, Radius, Spacing, TAB_BAR_HEIGHT } from '@/constants/theme';

const tabIcon = (name: IconName) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} size={24} />;
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.inkAccent,
        tabBarInactiveTintColor: Colors.onInkMuted,
        // A black pill floating above the bottom edge. Screens leave room for it
        // (see TAB_BAR_SPACE in the Screen component).
        tabBarStyle: {
          position: 'absolute',
          left: Spacing.four,
          right: Spacing.four,
          bottom: insets.bottom + Spacing.two,
          height: TAB_BAR_HEIGHT,
          paddingTop: Spacing.two,
          paddingBottom: Spacing.two,
          borderRadius: Radius.pill,
          borderTopWidth: 0,
          backgroundColor: Colors.ink,
        },
        // Hebrew letters are taller than the default label box, so give them room.
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
