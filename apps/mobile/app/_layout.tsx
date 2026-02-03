import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Text, View } from 'react-native';
import { useUniwind } from 'uniwind';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { theme } = useUniwind();
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://giant-snail-951.convex.cloud';
  const convex = React.useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl, { unsavedChangesWarning: false });
  }, [convexUrl]);

  if (!convex) {
    return (
      <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <View className="bg-background flex-1 items-center justify-center px-6">
          <Text className="text-foreground text-center">
            Missing EXPO_PUBLIC_CONVEX_URL. Add it to your Expo environment and restart.
          </Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <ThemeProvider value={NAV_THEME[theme ?? 'light']}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack />
        <PortalHost />
      </ThemeProvider>
    </ConvexProvider>
  );
}
