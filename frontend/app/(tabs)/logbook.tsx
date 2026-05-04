import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, media } from '../../src/theme';
import { useAuth } from '../../src/AuthContext';
import { useLocation } from '../../src/LocationContext';

export default function LogbookScreen() {
  const { user, logout, refresh } = useAuth();
  const { loc, clear: clearLocation } = useLocation();
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    try {
      const s = await api.mySightings();
      setMine(s);
      await refresh();
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (!user) return null;

  const stats = user.stats || { sightings: 0, nebulae: 0, planets: 0, galaxies: 0, meteors: 0 };

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="logbook-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: media.nebula }} style={styles.heroImg} blurRadius={2} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{(user.name || '?')[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} testID="logout-button">
              <Ionicons name="log-out-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.logoutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loc && (
          <View style={styles.locPanel} testID="logbook-location-panel">
            <Ionicons name="location" size={14} color={colors.gold} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.locPanelLabel}>TAILORED TO YOU</Text>
              <Text style={styles.locPanelValue}>
                {[loc.city, loc.region, loc.country].filter(Boolean).slice(0, 2).join(', ') || `${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)}`}
              </Text>
              <Text style={styles.locPanelSub}>{loc.hemisphere} hemisphere</Text>
            </View>
            <TouchableOpacity style={styles.forgetBtn} onPress={clearLocation} testID="forget-location-button">
              <Text style={styles.forgetText}>Forget</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Observatory</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="star" label="Sightings" value={stats.sightings} />
          <StatCard icon="weather-night" label="Nebulae" value={stats.nebulae} />
          <StatCard icon="earth" label="Planets" value={stats.planets} />
          <StatCard icon="shimmer" label="Galaxies" value={stats.galaxies} />
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent entries</Text>
          <TouchableOpacity onPress={() => router.push('/compose')} testID="new-sighting-fab">
            <Text style={styles.linkText}>+ New entry</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 24 }}><ActivityIndicator color={colors.gold} /></View>
        ) : mine.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="book-open-variant" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Your logbook is empty. Record your first sighting!</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/compose')}>
              <Text style={styles.emptyBtnText}>Log first sighting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bento}>
            {mine.map(s => (
              <View key={s.sighting_id} style={styles.entry}>
                {s.image_base64 ? (
                  <Image source={{ uri: s.image_base64 }} style={styles.entryImg} />
                ) : (
                  <View style={[styles.entryImg, styles.entryImgPlaceholder]}>
                    <MaterialCommunityIcons name="telescope" size={28} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ padding: spacing.sm, gap: 2 }}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.entryMeta} numberOfLines={1}>{new Date(s.created_at).toLocaleDateString()}</Text>
                  <View style={styles.entryTypeTag}>
                    <Text style={styles.entryTypeText}>{s.object_type}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heroWrap: { height: 240, marginBottom: spacing.md },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,14,20,0.7)' },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  bigAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.nebula, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  bigAvatarText: { color: colors.gold, fontSize: 28, fontWeight: '700' },
  userName: { color: colors.textPrimary, fontSize: 22, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) },
  userEmail: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  logoutText: { color: colors.textSecondary, fontSize: 12 },

  locPanel: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginTop: -spacing.md, marginBottom: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  locPanelLabel: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  locPanelValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  locPanelSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  forgetBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  forgetText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: spacing.lg },
  linkText: { color: colors.gold, fontSize: 13, fontWeight: '600', marginTop: spacing.md },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: spacing.sm },
  statCard: { flex: 1, minWidth: '22%', backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4 },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },

  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.full },
  emptyBtnText: { color: colors.textInverse, fontWeight: '700' },

  bento: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.sm },
  entry: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  entryImg: { width: '100%', height: 110, backgroundColor: colors.surfaceElevated },
  entryImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  entryTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  entryMeta: { color: colors.textMuted, fontSize: 10 },
  entryTypeTag: { alignSelf: 'flex-start', backgroundColor: colors.nebula, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  entryTypeText: { color: colors.gold, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '700' },
});
