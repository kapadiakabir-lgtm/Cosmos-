import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/api';
import { colors, spacing, radius, getEventImage } from '../../src/theme';
import { useAuth } from '../../src/AuthContext';
import { useLocation, isVisibleFromHemisphere } from '../../src/LocationContext';

export default function CalendarScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine' | 'mysky'>('all');
  const router = useRouter();
  const { user } = useAuth();
  const { loc } = useLocation();

  const load = async () => {
    try {
      const [ev, rem] = await Promise.all([
        api.listEvents(),
        user ? api.listReminders() : Promise.resolve([]),
      ]);
      setEvents(ev);
      setReminders(rem);
    } catch (e) {
      console.warn('calendar load', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [user?.user_id]));

  const reminderIds = new Set(reminders.map((r: any) => r.event_id));

  const toggleReminder = async (eventId: string) => {
    if (!user) return;
    try {
      if (reminderIds.has(eventId)) {
        const rem = reminders.find((r: any) => r.event_id === eventId);
        if (rem) {
          await api.deleteReminder(rem.reminder_id);
          setReminders(prev => prev.filter((r: any) => r.event_id !== eventId));
        }
      } else {
        const newRem = await api.addReminder(eventId, '');
        setReminders(prev => [...prev, newRem]);
      }
    } catch (e) { console.warn(e); }
  };

  const filtered = filter === 'mine'
    ? events.filter(e => reminderIds.has(e.event_id))
    : filter === 'mysky' && loc
      ? events.filter(e => isVisibleFromHemisphere(e.visibility, loc.hemisphere))
      : events;
  const grouped = groupByMonth(filtered);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="calendar-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionKicker}>COSMIC EVENTS</Text>
          <Text style={styles.title}>The Cosmos Calendar</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <FilterTab active={filter === 'all'} label="All" count={events.length} onPress={() => setFilter('all')} testID="filter-all" />
        <FilterTab active={filter === 'mine'} label="Reminders" count={reminders.length} onPress={() => setFilter('mine')} testID="filter-mine" />
        {loc && (
          <FilterTab
            active={filter === 'mysky'}
            label="My sky"
            count={events.filter(e => isVisibleFromHemisphere(e.visibility, loc.hemisphere)).length}
            onPress={() => setFilter('mysky')}
            testID="filter-mysky"
          />
        )}
      </View>

      {loc && (
        <View style={styles.locChip} testID="calendar-location-chip">
          <Ionicons name="location" size={11} color={colors.gold} />
          <Text style={styles.locChipText}>
            {[loc.city, loc.country].filter(Boolean).slice(0, 2).join(', ') || 'Your location'} · {loc.hemisphere}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.gold} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No events in this view</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([month, items]) => (
              <View key={month}>
                <Text style={styles.monthHeader}>{month}</Text>
                {(items as any[]).map(ev => (
                  <TouchableOpacity
                    key={ev.event_id}
                    activeOpacity={0.8}
                    style={styles.eventRow}
                    onPress={() => router.push(`/event/${ev.event_id}`)}
                    testID="calendar-event-item"
                  >
                    <View style={styles.dateBlock}>
                      <Text style={styles.dateDay}>{new Date(ev.date).getDate()}</Text>
                      <Text style={styles.dateMon}>{new Date(ev.date).toLocaleString(undefined, { month: 'short' }).toUpperCase()}</Text>
                    </View>
                    <Image source={{ uri: getEventImage(ev.image_key) }} style={styles.eventThumb} />
                    <View style={styles.eventBody}>
                      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>{ev.category.replace('_', ' ')}</Text>
                        </View>
                        {loc && isVisibleFromHemisphere(ev.visibility, loc.hemisphere) && (
                          <View style={styles.visiblePill}>
                            <Ionicons name="eye-outline" size={9} color={colors.starlight} />
                            <Text style={styles.visiblePillText}>VISIBLE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                      <Text style={styles.eventDesc} numberOfLines={2}>{ev.description_beginner}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); toggleReminder(ev.event_id); }}
                      style={[styles.reminderBtn, reminderIds.has(ev.event_id) && styles.reminderBtnActive]}
                      testID={`reminder-toggle-${ev.event_id}`}
                    >
                      <Ionicons
                        name={reminderIds.has(ev.event_id) ? 'notifications' : 'notifications-outline'}
                        size={18}
                        color={reminderIds.has(ev.event_id) ? colors.textInverse : colors.gold}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FilterTab({ active, label, count, onPress, testID }: any) {
  return (
    <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress} testID={testID}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      <View style={[styles.badge, active && styles.badgeActive]}>
        <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

function groupByMonth(events: any[]) {
  const g: Record<string, any[]> = {};
  for (const e of events) {
    const d = new Date(e.date);
    const k = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    if (!g[k]) g[k] = [];
    g[k].push(e);
  }
  return g;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  sectionKicker: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 30, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), marginTop: 4 },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: colors.textInverse },
  badge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, minWidth: 20, alignItems: 'center' },
  badgeActive: { backgroundColor: 'rgba(11,14,20,0.2)' },
  badgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: colors.textInverse },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyText: { color: colors.textSecondary },

  monthHeader: { color: colors.textMuted, fontSize: 12, letterSpacing: 2, fontWeight: '700', paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase' },

  eventRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
  },
  dateBlock: { width: 54, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRightWidth: 1, borderRightColor: colors.border, marginRight: spacing.sm },
  dateDay: { color: colors.gold, fontSize: 22, fontWeight: '700' },
  dateMon: { color: colors.textMuted, fontSize: 10, letterSpacing: 1 },
  eventThumb: { width: 44, height: 44, borderRadius: radius.md, marginRight: spacing.sm, backgroundColor: colors.nebula },
  eventBody: { flex: 1, gap: 2 },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: colors.nebula, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryPillText: { color: colors.gold, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '700' },
  visiblePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: colors.starlight, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  visiblePillText: { color: colors.starlight, fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '700' },
  locChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: 'rgba(242,201,76,0.08)', borderWidth: 1, borderColor: 'rgba(242,201,76,0.3)', borderRadius: radius.full,
  },
  locChipText: { color: colors.gold, fontSize: 10, letterSpacing: 0.5, fontWeight: '600' },
  eventTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  eventDesc: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  reminderBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  reminderBtnActive: { backgroundColor: colors.gold },
});
