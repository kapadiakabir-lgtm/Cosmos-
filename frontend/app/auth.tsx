import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ImageBackground, ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/AuthContext';
import { colors, media, spacing, radius } from '../src/theme';

type Mode = 'login' | 'register' | 'reset';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, resetPassword } = useAuth();
  const router = useRouter();

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password; // never trim — could break legitimate trailing-space passwords
    const cleanName = name.trim();

    if (!cleanEmail || !cleanPassword) {
      Alert.alert('Missing info', 'Please fill in email and password.');
      return;
    }
    if (mode === 'register' && !cleanName) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    if ((mode === 'register' || mode === 'reset') && cleanPassword.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(cleanEmail, cleanPassword);
      } else if (mode === 'register') {
        await register(cleanEmail, cleanPassword, cleanName);
      } else {
        await resetPassword(cleanEmail, cleanPassword);
        Alert.alert('Password updated', 'You are now signed in with your new password.');
      }
      router.replace('/(tabs)/feed');
    } catch (e: any) {
      const msg = e?.message || 'Please try again';
      // Make 401 friendlier
      if (msg.toLowerCase().includes('invalid credentials')) {
        Alert.alert(
          'Sign-in failed',
          'Email or password is incorrect. If you forgot your password, tap "Forgot password?" below.'
        );
      } else {
        Alert.alert('Sign-in failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Begin your journey' : 'Reset password';
  const subtitle =
    mode === 'login'
      ? 'Sign in to your observatory'
      : mode === 'register'
      ? 'Create your stargazer profile'
      : 'Enter your email and a new password';
  const cta =
    mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Set new password';

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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {mode === 'register' && (
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
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
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              testID="auth-email-input"
            />
            <TextInput
              style={styles.input}
              placeholder={mode === 'reset' ? 'New password (min 6 chars)' : 'Password'}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === 'register' || mode === 'reset' ? 'new-password' : 'current-password'}
              textContentType={mode === 'register' || mode === 'reset' ? 'newPassword' : 'password'}
              testID="auth-password-input"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading} testID="auth-submit-button">
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryBtnText}>{cta}</Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity onPress={() => setMode('reset')} testID="auth-forgot-password">
                <Text style={[styles.switch, { color: colors.gold }]}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              testID="auth-toggle-mode"
            >
              <Text style={styles.switch}>
                {mode === 'login'
                  ? 'New here? Create an account'
                  : mode === 'register'
                  ? 'Already have an account? Sign in'
                  : 'Back to sign in'}
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
