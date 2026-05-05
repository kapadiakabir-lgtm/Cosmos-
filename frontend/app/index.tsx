import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/AuthContext';
import { colors } from '../src/theme';

// Auto-generate a whimsical stargazer name so the user never sees an auth prompt.
const ADJECTIVES = ['Lunar', 'Stellar', 'Nebula', 'Astral', 'Cosmic', 'Orion', 'Vega', 'Comet', 'Nova', 'Aurora', 'Celestial', 'Twilight'];
const NOUNS = ['Voyager', 'Dreamer', 'Wanderer', 'Watcher', 'Scribe', 'Explorer', 'Pilot', 'Chaser', 'Seeker', 'Navigator'];
function generateName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900 + 100);
  return `${a}${n}${num}`;
}

export default function Index() {
  const { user, loading, identify } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (user) {
        router.replace('/(tabs)/feed');
        return;
      }
      try {
        await identify(generateName());
        router.replace('/(tabs)/feed');
      } catch (e) {
        // Network failed — keep showing spinner, user can retry by reloading.
        console.warn('auto-onboard failed', e);
      }
    })();
  }, [user, loading]);

  return (
    <View style={styles.center} testID="splash-screen">
      <ActivityIndicator color={colors.gold} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
