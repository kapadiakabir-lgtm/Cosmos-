import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ImageBackground, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/AuthContext';
import { colors, media, spacing, radius } from '../src/theme';

export default function AuthScreen() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { identify } = useAuth();
  const router = useRouter();

  const submit = async () => {
    const name = username.trim();
    if (name.length < 2) {
      Alert.alert('Pick a name', 'Use at least 2 characters.');
      return;
    }
    setLoading(true);
    try {
      await identify(name);
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      Alert.alert("Couldn't sign you in", e?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: media.milky_way }} style={styles.bg} testID="auth-screen">
      <View style={styles.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="sparkles" size={28} color={colors.gold} />
            </View>
            <Text style={styles.brand}>Cosmos</Text>
            <Text style={styles.tagline}>A journal for stargazers</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>
              Pick a stargazer name. No password, no email — just step into the night.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Galileo, MoonChaser, Astro_Aria"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={40}
              returnKeyType="go"
              onSubmitEditing={submit}
              testID="auth-username-input"
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={submit}
              disabled={loading}
              testID="auth-submit-button"
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>Step into the night</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              Use the same name later to return to your logbook on any device.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.bg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,14,20,0.75)' },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(242,201,76,0.1)',
    borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: { fontSize: 40, color: colors.textPrimary, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), letterSpacing: 2 },
  tagline: { color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs, letterSpacing: 1 },
  card: {
    backgroundColor: 'rgba(23,28,40,0.92)',
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg,
  },
  title: { fontSize: 22, color: colors.textPrimary, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginBottom: 4 },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderRadius: radius.md, marginBottom: spacing.md,
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 14, borderRadius: radius.full,
    alignItems: 'center', marginTop: spacing.sm,
    shadowColor: colors.gold, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.md, lineHeight: 16 },
});
