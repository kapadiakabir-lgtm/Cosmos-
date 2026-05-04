import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LocCoords = { latitude: number; longitude: number; city?: string; region?: string; country?: string; hemisphere: 'Northern' | 'Southern' };

type LocCtx = {
  loc: LocCoords | null;
  permission: 'idle' | 'granted' | 'denied';
  loading: boolean;
  request: () => Promise<void>;
  clear: () => Promise<void>;
};

const KEY = 'cosmos_location_v1';
const Context = createContext<LocCtx | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<LocCoords | null>(null);
  const [permission, setPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(KEY);
        if (cached) {
          setLoc(JSON.parse(cached));
          setPermission('granted');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const request = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let city, region, country;
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const p = places && places[0];
        if (p) { city = p.city || p.subregion || undefined; region = p.region || undefined; country = p.country || undefined; }
      } catch {}
      const data: LocCoords = {
        latitude: lat, longitude: lon, city, region, country,
        hemisphere: lat >= 0 ? 'Northern' : 'Southern',
      };
      setLoc(data);
      setPermission('granted');
      await AsyncStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      setPermission('denied');
    } finally { setLoading(false); }
  };

  const clear = async () => {
    await AsyncStorage.removeItem(KEY);
    setLoc(null);
    setPermission('idle');
  };

  return <Context.Provider value={{ loc, permission, loading, request, clear }}>{children}</Context.Provider>;
}

export function useLocation() {
  const c = useContext(Context);
  if (!c) throw new Error('useLocation must be inside LocationProvider');
  return c;
}

export function isVisibleFromHemisphere(visibility: string, hemisphere: 'Northern' | 'Southern'): boolean {
  const v = visibility.toLowerCase();
  if (v.includes('worldwide')) return true;
  if (hemisphere === 'Northern' && v.includes('northern')) return true;
  if (hemisphere === 'Southern' && v.includes('southern')) return true;
  // For specific regions, treat as "see if event applies broadly"
  return !v.includes('northern') && !v.includes('southern');
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
