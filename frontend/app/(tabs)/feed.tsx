import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl,
  ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, getEventImage } from '../../src/theme';
import { useAuth } from '../../src/AuthContext';
import { useLocation, isVisibleFromHemisphere, distanceKm } from '../../src/LocationContext';

export default function FeedScreen() {
  const [sightings, setSightings] = useState<any[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { loc, permission, request } = useLocation();

  const load = async () => {
    try {
      const [s, e, sp] = await Promise.all([
        api.listSightings(),
        api.listEvents(true),
        api.listSkySpots(),
      ]);
      setSightings(s);
      setFeaturedEvent(e[0] || null);
      setSpots(sp);
    } catch (err) {
      console.warn('Feed load', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleLike = async (id: string) => {
    try {
      const res = await api.likeSighting(id);
      setSightings(prev => prev.map(s => {
        if (s.sighting_id !== id) return s;
        const liked_by = new Set<string>(s.liked_by || []);
        if (res.liked && user) liked_by.add(user.user_id);
        else if (user) liked_by.delete(user.user_id);
        return { ...s, likes: res.likes, liked_by: Array.from(liked_by) };
      }));
    } catch {}
  };

  const closestSpot = loc && spots.length
    ? spots.map(s => ({ ...s, distKm: distanceKm(loc.latitude, loc.longitude, s.latitude, s.longitude) }))
        .sort((a, b) => a.distKm - b.distKm)[0]
    : null;

  const featuredVisible = featuredEvent && loc
    ? isVisibleFromHemisphere(featuredEvent.visibility, loc.hemisphere)
    : null;

  const placeLabel = loc ? [loc.city, loc.region, loc.country].filter(Boolean).slice(0, 2).join(', ') || 'Your location' : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="feed-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Good evening</Text>
          <Text style={styles.brand}>Cosmos</Text>
        </View>
        <TouchableOpacity style={styles.composeBtn} onPress={() => router.push('/compose')} testID="compose-sighting-button">
          <Ionicons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.composeText}>Log</Text>
        </TouchableOpacity>
      </View>

      {/* Location chip / banner */}
      {loc ? (
        <View style={styles.locChip} testID="feed-location-chip">
          <Ionicons name="location" size={12} color={colors.gold} />
          <Text style={styles.locChipText} numberOfLines={1}>
            {placeLabel} · {loc.hemisphere} hemisphere
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.locPrompt} onPress={request} testID="feed-use-location-button">
          <Ionicons name="location-outline" size={16} color={colors.gold} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.locPromptTitle}>Tailor the sky to you</Text>
            <Text style={styles.locPromptSub}>
              {permission === 'denied' ? 'Permission denied — enable in settings' : 'Tap to share your location'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.centerPad}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.gold} />}
        >
          {featuredEvent && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.featured}
              onPress={() => router.push(`/event/${featuredEvent.event_id}`)}
              testID="featured-event-card"
            >
              <Image source={{ uri: getEventImage(featuredEvent.image_key) }} style={styles.featuredImage} />
              <View style={styles.featuredOverlay} />
              <View style={styles.featuredContent}>
                <View style={styles.pillRow}>
                  <View style={styles.pill}>
                    <Ionicons name="calendar-outline" size={11} color={colors.gold} />
                    <Text style={styles.pillText}>UPCOMING</Text>
                  </View>
                  {featuredVisible === true && (
                    <View style={[styles.pill, styles.pillSuccess]}>
                      <Ionicons name="eye-outline" size={11} color={colors.starlight} />
                      <Text style={[styles.pillText, { color: colors.starlight }]}>VISIBLE FROM YOU</Text>
                    </View>
                  )}
                  {featuredVisible === false && (
                    <View style={[styles.pill, styles.pillMuted]}>
                      <Text style={[styles.pillText, { color: colors.textMuted }]}>NOT IN YOUR SKY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featuredTitle}>{featuredEvent.title}</Text>
                <Text style={styles.featuredDate}>{formatDate(featuredEvent.date)}</Text>
              </View>
            </TouchableOpacity>
          )}

          {closestSpot && (
            <TouchableOpacity
              style={styles.nearestSpot}
              onPress={() => router.push('/(tabs)/sky-map')}
              testID="feed-nearest-spot"
            >
              <View style={styles.nearestBadge}>
                <MaterialCommunityIcons name="star-four-points" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.nearestLabel}>NEAREST DARK SKY SPOT</Text>
                <Text style={styles.nearestName}>{closestSpot.name}</Text>
                <Text style={styles.nearestMeta}>
                  {Math.round(closestSpot.distKm)} km · Bortle {closestSpot.bortle_scale} · {closestSpot.region}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent sightings</Text>
            <Text style={styles.sectionSub}>{sightings.length} observations</Text>
          </View>

          {sightings.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="telescope" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No sightings yet. Be the first to log one!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/compose')}>
                <Text style={styles.emptyBtnText}>Log a sighting</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sightings.map(s => (
              <View key={s.sighting_id} style={styles.card} testID="feed-sighting-card">
                <View style={styles.cardHead}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(s.user_name || '?')[0].toUpperCase()}</Text></View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.userName}>{s.user_name}</Text>
                    <Text style={styles.meta}>{relTime(s.created_at)} · {s.location_name}</Text>
                  </View>
                  <View style={styles.objBadge}><Text style={styles.objBadgeText}>{s.object_type}</Text></View>
                </View>
                {s.image_base64 ? (
                  <Image source={{ uri: s.image_base64 }} style={styles.cardImage} />
                ) : null}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  {!!s.notes && <Text style={styles.cardNotes} numberOfLines={3}>{s.notes}</Text>}
                  <View style={styles.tagsRow}>
                    <Tag icon="telescope" text={s.equipment} />
                    <Tag icon="weather-night" text={s.sky_conditions.replace('_', ' ')} />
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(s.sighting_id)} testID={`like-${s.sighting_id}`}>
                      <Ionicons
                        name={user && (s.liked_by || []).includes(user.user_id) ? 'star' : 'star-outline'}
                        size={18}
                        color={colors.gold}
                      />
                      <Text style={styles.actionText}>{s.likes}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.actionText}>{s.location_name}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Tag({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.tag}>
      <MaterialCommunityIcons name={icon} size={12} color={colors.textSecondary} />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerPad: { padding: 40, alignItems: 'center' },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  greeting: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  brand: { color: colors.textPrimary, fontSize: 28, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), letterSpacing: 1 },
  composeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
  },
  composeText: { color: colors.textInverse, fontWeight: '700', fontSize: 13 },

  locChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(242,201,76,0.08)', borderWidth: 1, borderColor: 'rgba(242,201,76,0.3)', borderRadius: radius.full,
  },
  locChipText: { color: colors.gold, fontSize: 11, letterSpacing: 0.5, fontWeight: '600' },
  locPrompt: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg,
  },
  locPromptTitle: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  locPromptSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  featured: { marginHorizontal: spacing.md, borderRadius: radius.xl, overflow: 'hidden', height: 200, marginBottom: spacing.md },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,14,20,0.55)' },
  featuredContent: { ...StyleSheet.absoluteFillObject, padding: spacing.lg, justifyContent: 'flex-end' },
  pillRow: { flexDirection: 'row', marginBottom: spacing.sm, gap: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(242,201,76,0.15)', borderWidth: 1, borderColor: colors.gold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  pillSuccess: { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: colors.starlight },
  pillMuted: { backgroundColor: 'rgba(100,116,139,0.15)', borderColor: colors.textMuted },
  pillText: { color: colors.gold, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  featuredTitle: { color: colors.textPrimary, fontSize: 24, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginBottom: 4 },
  featuredDate: { color: colors.textSecondary, fontSize: 13 },

  nearestSpot: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md, marginBottom: spacing.lg, padding: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
  },
  nearestBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.nebula, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(242,201,76,0.3)' },
  nearestLabel: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  nearestName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 },
  nearestMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) },
  sectionSub: { color: colors.textMuted, fontSize: 12 },

  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyText: { color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.full },
  emptyBtnText: { color: colors.textInverse, fontWeight: '700' },

  card: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.nebula, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold },
  avatarText: { color: colors.gold, fontWeight: '700' },
  userName: { color: colors.textPrimary, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 12 },
  objBadge: { backgroundColor: colors.nebula, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(242,201,76,0.3)' },
  objBadgeText: { color: colors.gold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardImage: { width: '100%', height: 220, backgroundColor: colors.surfaceElevated },
  cardBody: { padding: spacing.md },
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginBottom: 6 },
  cardNotes: { color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.textSecondary, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.textSecondary, fontSize: 13 },
});
