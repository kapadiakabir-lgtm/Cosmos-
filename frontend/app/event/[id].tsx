import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, getEventImage } from '../../src/theme';
import { useAuth } from '../../src/AuthContext';
import { useLocation, isVisibleFromHemisphere } from '../../src/LocationContext';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [tab, setTab] = useState<'beginner' | 'advanced'>('beginner');
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(false);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { loc } = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const e = await api.getEvent(id as string);
        setEvent(e);
        if (user) {
          const rems = await api.listReminders();
          const mine = rems.find((r: any) => r.event_id === id);
          if (mine) { setReminded(true); setReminderId(mine.reminder_id); }
        }
      } catch (err) { console.warn(err); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const toggleReminder = async () => {
    if (!user || !event) return;
    try {
      if (reminded && reminderId) {
        await api.deleteReminder(reminderId);
        setReminded(false); setReminderId(null);
      } else {
        const r = await api.addReminder(event.event_id, '');
        setReminded(true); setReminderId(r.reminder_id);
        Alert.alert('Reminder set', `We'll flag ${event.title} on your calendar.`);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.gold} /></View>;
  }
  if (!event) {
    return <View style={[styles.container, styles.center]}><Text style={{ color: colors.textMuted }}>Event not found</Text></View>;
  }

  return (
    <View style={styles.container} testID="event-detail-screen">
      <ScrollView>
        <View style={styles.heroWrap}>
          <Image source={{ uri: getEventImage(event.image_key) }} style={styles.heroImg} />
          <View style={styles.heroOverlay} />
          <SafeAreaView style={StyleSheet.absoluteFillObject} edges={['top']}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} testID="back-button">
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroContent}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{event.category.replace('_', ' ')}</Text>
            </View>
            <Text style={styles.heroTitle}>{event.title}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.gold} />
              <Text style={styles.heroMetaText}>{formatDate(event.date)}</Text>
              {event.peak_time && <Text style={styles.heroMetaText}>· Peak {event.peak_time}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.visibilityRow}>
            <Ionicons name="earth" size={16} color={colors.gold} />
            <Text style={styles.visibilityText}>{event.visibility}</Text>
          </View>

          {loc && (
            <View style={[styles.visibleLine, isVisibleFromHemisphere(event.visibility, loc.hemisphere) ? styles.visibleYes : styles.visibleNo]} testID="event-visible-from-you">
              <Ionicons
                name={isVisibleFromHemisphere(event.visibility, loc.hemisphere) ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={isVisibleFromHemisphere(event.visibility, loc.hemisphere) ? colors.starlight : colors.textMuted}
              />
              <Text style={[styles.visibleLineText, { color: isVisibleFromHemisphere(event.visibility, loc.hemisphere) ? colors.starlight : colors.textMuted }]}>
                {isVisibleFromHemisphere(event.visibility, loc.hemisphere)
                  ? `Visible from your location (${loc.hemisphere.toLowerCase()} hemisphere)`
                  : `Not visible from your location (${loc.hemisphere.toLowerCase()} hemisphere)`}
              </Text>
            </View>
          )}

          <View style={styles.tabsRow}>
            <TouchableOpacity style={[styles.tab, tab === 'beginner' && styles.tabActive]} onPress={() => setTab('beginner')} testID="tab-beginner">
              <Text style={[styles.tabText, tab === 'beginner' && styles.tabTextActive]}>Jargon-free</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'advanced' && styles.tabActive]} onPress={() => setTab('advanced')} testID="tab-advanced">
              <Text style={[styles.tabText, tab === 'advanced' && styles.tabTextActive]}>Advanced specs</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.paragraph}>
            {tab === 'beginner' ? event.description_beginner : event.description_advanced}
          </Text>
        </View>
      </ScrollView>

      {user && (
        <SafeAreaView edges={['bottom']} style={styles.ctaSafe}>
          <TouchableOpacity
            style={[styles.cta, reminded && styles.ctaActive]}
            onPress={toggleReminder}
            testID="event-remind-button"
          >
            <Ionicons name={reminded ? 'checkmark-circle' : 'notifications'} size={18} color={reminded ? colors.textInverse : colors.textInverse} />
            <Text style={styles.ctaText}>
              {reminded ? 'On your calendar' : 'Add to my Cosmos Calendar'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroWrap: { height: 320 },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,14,20,0.5)' },
  backBtn: { margin: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(23,28,40,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(242,201,76,0.15)', borderWidth: 1, borderColor: colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  categoryPillText: { color: colors.gold, fontSize: 10, letterSpacing: 1, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { color: colors.textPrimary, fontSize: 32, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginTop: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  heroMetaText: { color: colors.textSecondary, fontSize: 13 },

  body: { padding: spacing.lg },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  visibilityText: { color: colors.textSecondary, fontSize: 13 },
  visibleLine: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  visibleYes: { backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.4)' },
  visibleNo: { backgroundColor: 'rgba(100,116,139,0.08)', borderColor: colors.border },
  visibleLineText: { fontSize: 12, fontWeight: '600' },

  tabsRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.full, padding: 4, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.full },
  tabActive: { backgroundColor: colors.gold },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.textInverse },
  paragraph: { color: colors.textSecondary, fontSize: 15, lineHeight: 24 },

  ctaSafe: { padding: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.gold, paddingVertical: 14, borderRadius: radius.full },
  ctaActive: { backgroundColor: colors.starlight },
  ctaText: { color: colors.textInverse, fontWeight: '700', fontSize: 15 },
});
