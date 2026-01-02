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
      <Stack.Screen name="instruments" />
      <Stack.Screen name="pain-points" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="commitment" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
