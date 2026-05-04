import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { colors } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.5, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Sightings',
          tabBarIcon: ({ color }) => <Ionicons name="compass-outline" size={22} color={color} />,
          tabBarButtonTestID: 'tab-feed',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Cosmos',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-star" size={22} color={color} />,
          tabBarButtonTestID: 'tab-calendar',
        }}
      />
      <Tabs.Screen
        name="sky-map"
        options={{
          title: 'Dark Sky',
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={22} color={color} />,
          tabBarButtonTestID: 'tab-skymap',
        }}
      />
      <Tabs.Screen
        name="logbook"
        options={{
          title: 'Logbook',
          tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={22} color={color} />,
          tabBarButtonTestID: 'tab-logbook',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
