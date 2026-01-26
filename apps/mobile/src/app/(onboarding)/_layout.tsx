import { Stack } from 'expo-router';
import { colors } from '../../theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="style" />
      <Stack.Screen name="experience" />
      <Stack.Screen name="stress-reducer" />
      <Stack.Screen name="account" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
