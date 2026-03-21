import { useState } from 'react';
import { StyleSheet, View, Pressable, Linking, Platform, ScrollView } from 'react-native';
import { Card, Text, Chip, Modal, Portal } from 'react-native-paper';
import { router } from 'expo-router';
import { MapPin, Clock, ChevronLeft } from 'lucide-react-native';
import { Gig } from '@/lib/types';
import { INSTRUMENTS } from '@/constants/instruments';
import { Colors, Spacing } from '@/constants/theme';

interface GigCardProps {
  gig: Gig;
  isApplied?: boolean;
  onApply?: () => void;
}

export function GigCard({ gig, isApplied, onApply }: GigCardProps) {
  const [detailVisible, setDetailVisible] = useState(false);
  const isFilled = gig.status === 'filled';

  const instrumentItems = (gig.instruments_needed ?? []).map((key) => {
    const inst = INSTRUMENTS.find((i) => i.key === key);
    return { key, label: inst?.label ?? key };
  });

  const handleOpenMap = async (address: string) => {
    const encoded = encodeURIComponent(address);
    const nativeUrl = Platform.OS === 'ios'
      ? `maps://?q=${encoded}`
      : `geo:0,0?q=${encoded}`;
    const canOpen = await Linking.canOpenURL(nativeUrl);
    await Linking.openURL(canOpen ? nativeUrl : `https://maps.google.com/?q=${encoded}`);
  };

  const locationAddress = gig.church?.location_address;
  const locationLine = [gig.church?.location_city, gig.church?.location_state].filter(Boolean).join(', ');

  return (
    <>
      <Card
        style={[styles.card, isFilled && styles.cardFilled]}
        onPress={() => setDetailVisible(true)}
      >
        <Card.Content>
          <Text variant="titleMedium" style={styles.title}>{gig.title}</Text>
          {gig.church && (
            <Text variant="bodySmall" style={styles.churchName}>
              {gig.church.display_name}
            </Text>
          )}
          {locationLine ? (
            <Text variant="bodySmall" style={styles.churchName}>{locationLine}</Text>
          ) : null}

          {isFilled && (
            <Chip style={styles.filledChip} textStyle={styles.filledChipText} compact>
              Position Filled
            </Chip>
          )}

          <View style={styles.chips}>
            {instrumentItems.map((item) => (
              <Chip key={item.key} style={styles.chip} textStyle={styles.chipText} compact>
                {item.label}
              </Chip>
            ))}
          </View>

          <View style={styles.meta}>
            <Text variant="bodySmall" style={styles.metaText}>
              {gig.date} at {gig.time}
            </Text>
            {gig.pay_offered != null && (
              isFilled ? (
                <View style={styles.filledBadge}>
                  <Text style={styles.filledBadgeText}>Position Filled</Text>
                </View>
              ) : isApplied ? (
                <View style={styles.pendingBadge}>
                  <Clock size={13} color={Colors.textSecondary} />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              ) : onApply ? (
                <Pressable style={styles.payButton} onPress={onApply}>
                  <Text style={styles.payButtonText}>Accept — ${gig.pay_offered}</Text>
                </Pressable>
              ) : (
                <Text variant="titleMedium" style={styles.pay}>${gig.pay_offered}</Text>
              )
            )}
          </View>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={detailVisible}
          onDismiss={() => setDetailVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {/* Back button */}
          <Pressable onPress={() => setDetailVisible(false)} style={styles.modalBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            <Text variant="titleLarge" style={styles.modalTitle} numberOfLines={2}>
              {gig.title}
            </Text>

            {gig.church && (
              <Text variant="bodyMedium" style={styles.modalChurch}>
                {gig.church.display_name}
              </Text>
            )}

            {/* Location */}
            {locationAddress ? (
              <Pressable
                style={styles.modalLocationRow}
                onPress={() => handleOpenMap(locationAddress)}
              >
                <MapPin size={15} color={Colors.primary} />
                <Text style={styles.modalLocationText}>{locationAddress}</Text>
              </Pressable>
            ) : locationLine ? (
              <View style={styles.modalLocationRow}>
                <MapPin size={15} color={Colors.textSecondary} />
                <Text style={[styles.modalLocationText, { color: Colors.textSecondary }]}>
                  {locationLine}
                </Text>
              </View>
            ) : null}

            {/* Date & Time */}
            <View style={styles.modalLocationRow}>
              <Clock size={15} color={Colors.textSecondary} />
              <Text style={[styles.modalLocationText, { color: Colors.textSecondary }]}>
                {gig.date} at {gig.time}
              </Text>
            </View>

            {/* Pay */}
            {gig.pay_offered != null && (
              <Text style={styles.modalPay}>${gig.pay_offered}</Text>
            )}

            {/* Instruments */}
            {instrumentItems.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Instruments Needed</Text>
                <View style={styles.chips}>
                  {instrumentItems.map((item) => (
                    <Chip key={item.key} style={styles.chip} textStyle={styles.chipText} compact>
                      {item.label}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            {!!gig.description && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>About this Gig</Text>
                <Text variant="bodyMedium" style={styles.modalDescription}>
                  {gig.description}
                </Text>
              </View>
            )}

            <Pressable
              style={styles.modalViewProfile}
              onPress={() => {
                setDetailVisible(false);
                router.push(`/public-profile/${gig.church_id}`);
              }}
            >
              <Text style={styles.modalViewProfileText}>View Church Profile →</Text>
            </Pressable>
          </ScrollView>

          {/* Sticky Accept button */}
          {(isFilled || isApplied || onApply) && (
            <View style={styles.modalStickyFooter}>
              {isFilled ? (
                <View style={styles.modalFilledButton}>
                  <Text style={styles.modalFilledButtonText}>Position Has Been Filled</Text>
                </View>
              ) : isApplied ? (
                <View style={styles.modalAppliedButton}>
                  <Clock size={14} color={Colors.textSecondary} />
                  <Text style={styles.modalAppliedButtonText}>Already Applied</Text>
                </View>
              ) : onApply ? (
                <Pressable
                  style={styles.modalApplyButton}
                  onPress={() => { onApply(); setDetailVisible(false); }}
                >
                  <Text style={styles.modalApplyButtonText}>Accept — ${gig.pay_offered}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, backgroundColor: Colors.surface },
  cardFilled: { opacity: 0.55 },
  title: { fontWeight: '600', color: Colors.text },
  churchName: { color: Colors.textSecondary, marginTop: 2 },

  filledChip: { backgroundColor: Colors.warning, alignSelf: 'flex-start', marginTop: Spacing.xs },
  filledChipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  filledBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  filledBadgeText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 14 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: Spacing.xs },
  chip: { backgroundColor: Colors.chipBackground },
  chipText: { fontSize: 12, color: Colors.chipText },
  meta: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  metaText: { color: Colors.textSecondary },
  pay: { color: Colors.success, fontWeight: 'bold', fontSize: 18 },
  payButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  payButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.chipBackground,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 14 },

  modal: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 0,
    maxHeight: '85%',
  },
  modalBack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
    padding: 4,
    marginLeft: -4,
  },
  modalScroll: { flexGrow: 0 },
  modalTitle: { fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  modalChurch: { color: Colors.textSecondary, marginBottom: Spacing.md },
  modalStickyFooter: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  modalLocationText: { flex: 1, color: Colors.primary, fontSize: 14 },
  modalPay: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 22,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  modalSection: { marginTop: Spacing.md },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  modalDescription: { color: Colors.text, lineHeight: 22 },
  modalApplyButton: {
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalApplyButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  modalFilledButton: {
    backgroundColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalFilledButtonText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 15 },
  modalAppliedButton: {
    flexDirection: 'row',
    backgroundColor: Colors.chipBackground,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalAppliedButtonText: { color: Colors.textSecondary, fontWeight: '500', fontSize: 15 },
  modalViewProfile: { paddingVertical: Spacing.sm, alignItems: 'center' },
  modalViewProfileText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});
