import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Spacing } from '@/constants/theme';
import { INSTRUMENTS, InstrumentKey } from '@/constants/instruments';
import { firestore } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';

// Format a Date as MM/DD/YYYY
const formatDate = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
};

// Format a Date as "9:00 AM" — always on the hour (no minutes)
const formatTime = (d: Date) => {
  const hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:00 ${ampm}`;
};

export default function PostGigScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [churchName, setChurchName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [instruments, setInstruments] = useState<InstrumentKey[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [pay, setPay] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Shared Date object backing both pickers; starts at today, rounded to next hour
  const [pickerDate, setPickerDate] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      setPickerDate(selected);
      setDate(formatDate(selected));
    }
  };

  // Snap to the hour — equivalent to the HTML step="3600" / resetMin() pattern
  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      selected.setMinutes(0, 0, 0); // reset minutes/seconds, mirroring resetMin()
      setPickerDate(new Date(selected));
      setTime(formatTime(selected));
    }
  };

  const toggleInstrument = (key: InstrumentKey) => {
    setInstruments((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !churchName.trim() || !city.trim() || !state.trim() || !date.trim() || !time.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await firestore().collection('gigs').add({
        church_id: user?.uid ?? 'anonymous',
        title: title.trim(),
        description: description.trim(),
        instruments_needed: instruments,
        date: date.trim(),
        time: time.trim(),
        pay_offered: pay ? parseFloat(pay) : null,
        status: 'open',
        active: true,
        created_at: new Date().toISOString(),
        church: {
          id: user?.uid ?? 'anonymous',
          display_name: churchName.trim(),
          location_city: city.trim(),
          location_state: state.trim(),
        },
      });
      router.back();
    } catch {
      setError('Failed to post gig. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Post a Gig</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextInput
          label="Gig Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Sunday Morning Worship Guitarist"
        />
        <TextInput
          label="Church / Organization Name *"
          value={churchName}
          onChangeText={setChurchName}
          mode="outlined"
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            label="City *"
            value={city}
            onChangeText={setCity}
            mode="outlined"
            style={[styles.input, styles.flex]}
          />
          <TextInput
            label="State *"
            value={state}
            onChangeText={setState}
            mode="outlined"
            style={[styles.input, styles.stateInput]}
          />
        </View>

        {/* Date field with calendar button */}
        <TextInput
          label="Date * (MM/DD/YYYY)"
          value={date}
          onChangeText={setDate}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 04/06/2026"
          keyboardType="numeric"
          right={
            <TextInput.Icon
              icon={() => <CalendarDays size={20} color={Colors.textSecondary} />}
              onPress={() => setShowDatePicker(true)}
            />
          }
        />

        {/* Time field with clock button — hour-only snapping */}
        <TextInput
          label="Time *"
          value={time}
          onChangeText={setTime}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 9:00 AM"
          right={
            <TextInput.Icon
              icon={() => <Clock size={20} color={Colors.textSecondary} />}
              onPress={() => setShowTimePicker(true)}
            />
          }
        />

        <TextInput
          label="Pay Offered ($)"
          value={pay}
          onChangeText={setPay}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="e.g. 150"
        />

        <Text style={styles.label}>Instruments Needed</Text>
        <View style={styles.chips}>
          {INSTRUMENTS.map((inst) => (
            <Chip
              key={inst.key}
              selected={instruments.includes(inst.key)}
              onPress={() => toggleInstrument(inst.key)}
              style={[styles.chip, instruments.includes(inst.key) && styles.chipSelected]}
              textStyle={[styles.chipText, instruments.includes(inst.key) && styles.chipTextSelected]}
              compact
            >
              {inst.label}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Add any details about the gig, expectations, or requirements..."
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
          contentStyle={styles.submitContent}
        >
          Post Gig
        </Button>
      </ScrollView>

      {/* Android: native system date dialog */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          mode="date"
          value={pickerDate}
          onChange={onDateChange}
        />
      )}

      {/* Android: native system time dialog — minuteInterval not supported, snapped in onChange */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          mode="time"
          value={pickerDate}
          onChange={onTimeChange}
          is24Hour={false}
        />
      )}

      {/* iOS: date picker in a bottom sheet modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="date"
                display="inline"
                value={pickerDate}
                onChange={onDateChange}
                accentColor={Colors.primary}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* iOS: time picker in a bottom sheet modal, minuteInterval=60 snaps to hour */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Time</Text>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                mode="time"
                display="spinner"
                value={pickerDate}
                onChange={onTimeChange}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  form: { padding: Spacing.md, paddingBottom: Spacing.xl * 2 },
  input: { marginBottom: Spacing.md, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  stateInput: { width: 80 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  chip: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.text },
  chipTextSelected: { color: '#1A1A1A' },
  errorText: { color: '#EF4444', marginBottom: Spacing.md, fontSize: 14 },
  submitButton: { marginTop: Spacing.md },
  submitContent: { paddingVertical: 6 },
  // Picker modal (iOS)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  doneText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
});
