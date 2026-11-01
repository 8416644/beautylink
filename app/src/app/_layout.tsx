import { Heebo_400Regular, Heebo_500Medium, Heebo_700Bold } from '@expo-google-fonts/heebo';
import { Rubik_500Medium, Rubik_700Bold } from '@expo-google-fonts/rubik';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Rubik_500Medium,
    Rubik_700Bold,
  });
  const ready = fontsLoaded || fontError != null;

  // On iOS and Android the expo-localization plugin forces right to left.
  // The web needs the page itself marked as Hebrew, right to left.
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'he';
    }
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.accent,
          headerTitleStyle: { fontFamily: Fonts.medium, color: Colors.text },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Screen name="sign-in" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="pro-signup" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="set-password" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="pro/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="my-services" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="my-portfolio" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="my-hours" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="book/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="my-calendar" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="add-appointment" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="block-time" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="admin" options={{ headerShown: true, title: 'ניהול' }} />
      </Stack>
    </AuthProvider>
  );
}
