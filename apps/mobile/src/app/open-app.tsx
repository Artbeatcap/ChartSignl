import { Redirect } from 'expo-router';

/** Universal / app-link target for email CTAs (`https://www.chartsignl.com/open-app`). */
export default function OpenAppScreen() {
  return <Redirect href="/(tabs)/analyze" />;
}
