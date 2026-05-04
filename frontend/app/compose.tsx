import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView,
  Platform, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';

const OBJECT_TYPES = [
  { key: 'nebula', label: 'Nebula', icon: 'weather-night' },
  { key: 'planet', label: 'Planet', icon: 'earth' },
  { key: 'galaxy', label: 'Galaxy', icon: 'shimmer' },
  { key: 'meteor', label: 'Meteor', icon: 'meteor' },
  { key: 'moon', label: 'Moon', icon: 'moon-waning-crescent' },
  { key: 'comet', label: 'Comet', icon: 'comet' },
  { key: 'star_cluster', label: 'Cluster', icon: 'star-four-points' },
];

const SKY_CONDITIONS = [
  { key: 'clear', label: 'Clear' },
  { key: 'partly_cloudy', label: 'Partly cloudy' },
  { key: 'hazy', label: 'Hazy' },
];

export default function ComposeSighting() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [objectType, setObjectType] = useState('nebula');
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState('');
  const [conditions, setConditions] = useState('clear');
  const [notes, setNotes] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      const b64 = a.base64 ? `data:image/jpeg;base64,${a.base64}` : null;
      setImageBase64(b64);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      const b64 = a.base64 ? `data:image/jpeg;base64,${a.base64}` : null;
      setImageBase64(b64);
    }
  };

  const submit = async () => {
    if (!title.trim() || !location.trim() || !equipment.trim()) {
      Alert.alert('Missing info', 'Title, location, and equipment are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createSighting({
        title: title.trim(),
        object_type: objectType,
        location_name: location.trim(),
        sky_conditions: conditions,
        equipment: equipment.trim(),
        notes: notes.trim(),
        image_base64: imageBase64,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not post', e.message || 'Please try again');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="compose-sighting-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="compose-close-button">
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Sighting</Text>
        <TouchableOpacity onPress={submit} disabled={submitting} testID="compose-submit-button">
          {submitting ? (
            <ActivityIndicator color={colors.gold} />
          ) : (
            <Text style={styles.postText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {imageBase64 ? (
            <View>
              <Image source={{ uri: imageBase64 }} style={styles.preview} />
              <TouchableOpacity style={styles.removeImg} onPress={() => setImageBase64(null)}>
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imgPicker}>
              <TouchableOpacity style={styles.imgPickerBtn} onPress={takePhoto} testID="take-photo-button">
                <Ionicons name="camera-outline" size={24} color={colors.gold} />
                <Text style={styles.imgPickerText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imgPickerBtn} onPress={pickImage} testID="pick-image-button">
                <Ionicons name="image-outline" size={24} color={colors.gold} />
                <Text style={styles.imgPickerText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Orion Nebula through the city haze"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            testID="compose-title-input"
          />

          <Text style={styles.label}>Object type</Text>
          <View style={styles.chipRow}>
            {OBJECT_TYPES.map(o => (
              <TouchableOpacity
                key={o.key}
                style={[styles.chip, objectType === o.key && styles.chipActive]}
                onPress={() => setObjectType(o.key)}
                testID={`object-type-${o.key}`}
              >
                <MaterialCommunityIcons name={o.icon as any} size={14} color={objectType === o.key ? colors.textInverse : colors.gold} />
                <Text style={[styles.chipText, objectType === o.key && styles.chipTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Big Sur, CA"
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
            testID="compose-location-input"
          />

          <Text style={styles.label}>Equipment</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Celestron NexStar 8SE, 25mm Plössl"
            placeholderTextColor={colors.textMuted}
            value={equipment}
            onChangeText={setEquipment}
            testID="compose-equipment-input"
          />

          <Text style={styles.label}>Sky conditions</Text>
          <View style={styles.chipRow}>
            {SKY_CONDITIONS.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, conditions === c.key && styles.chipActive]}
                onPress={() => setConditions(c.key)}
                testID={`condition-${c.key}`}
              >
                <Text style={[styles.chipText, conditions === c.key && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
            placeholder="Impressions, observations, conditions..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            testID="compose-notes-input"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '600' },
  postText: { color: colors.gold, fontWeight: '700', fontSize: 15 },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  preview: { width: '100%', height: 220, borderRadius: radius.lg, marginBottom: spacing.md },
  removeImg: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(11,14,20,0.8)', alignItems: 'center', justifyContent: 'center' },
  imgPicker: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  imgPickerBtn: { flex: 1, alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: 4 },
  imgPickerText: { color: colors.textSecondary, fontSize: 13 },

  label: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.md, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.textInverse, fontWeight: '700' },
});
