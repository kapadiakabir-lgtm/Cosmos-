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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const submit = async () => {
    if (!email || !password || (mode === 'register' && !name)) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      Alert.alert('Sign-in failed', e.message || 'Please try again');
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
            <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Begin your journey'}</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'Sign in to your observatory' : 'Create your stargazer profile'}
            </Text>

            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                testID="auth-name-input"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="auth-email-input"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="auth-password-input"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading} testID="auth-submit-button">
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} testID="auth-toggle-mode">
              <Text style={styles.switch}>
                {mode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
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
  title: { fontSize: 24, color: colors.textPrimary, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginBottom: 4 },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    borderRadius: radius.md, marginBottom: spacing.md,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: colors.gold,
    paddingVertical: 14, borderRadius: radius.full,
    alignItems: 'center', marginTop: spacing.sm,
    shadowColor: colors.gold, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { color: colors.textInverse, fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
  switch: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg, fontSize: 13 },
});
