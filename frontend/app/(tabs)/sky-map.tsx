import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, media } from '../../src/theme';
import { useLocation, distanceKm } from '../../src/LocationContext';

type Spot = {
  spot_id: string; name: string; latitude: number; longitude: number;
  bortle_scale: number; description: string; region: string;
};

export default function SkyMapScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Spot | null>(null);
  const { loc, permission, request } = useLocation();

  const load = async () => {
    try {
      const s = await api.listSkySpots();
      setSpots(s);
      setSelected(s[0] || null);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const spotsWithDistance = loc
    ? spots.map(s => ({ ...s, distanceKm: distanceKm(loc.latitude, loc.longitude, s.latitude, s.longitude) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : spots;
  const closest = (spotsWithDistance[0] as any);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="sky-map-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionKicker}>DARK SKY FINDER</Text>
          <Text style={styles.title}>Pristine Skies</Text>
        </View>
        <TouchableOpacity style={styles.locBtn} onPress={request} testID="request-location-button">
          <Ionicons name="locate" size={16} color={colors.gold} />
          <Text style={styles.locBtnText}>{loc ? 'Located' : 'Use my location'}</Text>
        </TouchableOpacity>
      </View>

      {loc && closest && 'distanceKm' in closest && (
        <View style={styles.banner} testID="sky-map-closest-banner">
          <MaterialCommunityIcons name="star-four-points" size={20} color={colors.gold} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.bannerLabel}>CLOSEST TO YOU</Text>
            <Text style={styles.bannerTitle}>{closest.name} · {Math.round(closest.distanceKm)} km</Text>
          </View>
        </View>
      )}

      <View style={styles.mapArea}>
        <Image source={{ uri: media.milky_way }} style={StyleSheet.absoluteFillObject} blurRadius={6} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(11,14,20,0.7)' }]} />
        <View style={[styles.pin, { top: '30%', left: '20%' }]}>
          <MaterialCommunityIcons name="star-four-points" size={28} color={colors.gold} />
        </View>
        <View style={[styles.pin, { top: '55%', left: '55%' }]}>
          <MaterialCommunityIcons name="star-four-points" size={24} color={colors.gold} />
        </View>
        <View style={[styles.pin, { top: '22%', left: '72%' }]}>
          <MaterialCommunityIcons name="star-four-points" size={18} color={colors.gold} />
        </View>
        <View style={styles.mapCenter}>
          <MaterialCommunityIcons name="map-marker-radius-outline" size={42} color={colors.gold} />
          <Text style={styles.mapTitle}>{spots.length} dark sky sites</Text>
          <Text style={styles.mapSub}>
            {loc ? 'Sorted by distance from you' : 'Enable location to sort by distance'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
          <Text style={styles.listTitle}>{loc ? 'Closest to you' : 'Featured spots'}</Text>
          {spotsWithDistance.map((s: any) => (
            <TouchableOpacity
              key={s.spot_id}
              style={[styles.spotCard, selected?.spot_id === s.spot_id && styles.spotCardActive]}
              onPress={() => setSelected(s)}
              testID={`spot-${s.spot_id}`}
            >
              <View style={styles.bortleBadge}>
                <Text style={styles.bortleLabel}>BORTLE</Text>
                <Text style={styles.bortleValue}>{s.bortle_scale}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.spotName}>{s.name}</Text>
                <Text style={styles.spotRegion}>{s.region}</Text>
                <Text style={styles.spotDesc} numberOfLines={2}>{s.description}</Text>
                {'distanceKm' in s && (
                  <View style={styles.distanceRow}>
                    <Ionicons name="navigate-outline" size={12} color={colors.gold} />
                    <Text style={styles.distanceText}>{Math.round(s.distanceKm)} km away</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {permission === 'denied' && (
        <View style={styles.permBanner}>
          <Text style={styles.permText}>Location access denied. Enable permissions to find spots near you.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionKicker: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 28, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginTop: 4 },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  locBtnText: { color: colors.gold, fontSize: 12, fontWeight: '600' },

  banner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(242,201,76,0.08)', borderWidth: 1, borderColor: 'rgba(242,201,76,0.3)', borderRadius: radius.lg },
  bannerLabel: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  bannerTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 2 },

  mapArea: { height: 180, marginHorizontal: spacing.md, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  pin: { position: 'absolute' },
  mapCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mapTitle: { color: colors.textPrimary, fontSize: 16, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }) },
  mapSub: { color: colors.textSecondary, fontSize: 12 },

  listTitle: { color: colors.textMuted, fontSize: 12, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: 4 },
  spotCard: {
    flexDirection: 'row', padding: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
  },
  spotCardActive: { borderColor: colors.gold },
  bortleBadge: { width: 54, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.nebula, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(242,201,76,0.3)' },
  bortleLabel: { color: colors.gold, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  bortleValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
  spotName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  spotRegion: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  spotDesc: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 16 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  distanceText: { color: colors.gold, fontSize: 11, fontWeight: '600' },

  permBanner: { position: 'absolute', bottom: 90, left: spacing.md, right: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.nightRed, padding: spacing.md, borderRadius: radius.md },
  permText: { color: colors.textSecondary, fontSize: 12 },
});
