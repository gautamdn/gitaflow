import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { getColors } from '../src/constants/theme';
import { useSettingsStore } from '../src/store/useSettingsStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { darkMode } = useSettingsStore();
  const colors = getColors(darkMode);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
