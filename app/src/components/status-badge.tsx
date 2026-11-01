import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { STATUS_TEXT, type AppointmentStatus } from '@/lib/appointments';

// Waiting and confirmed stand out; finished and cancelled stay quiet.
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const tone =
    status === 'pending' ? styles.pending : status === 'confirmed' ? styles.confirmed : styles.quiet;
  const textTone =
    status === 'pending' ? styles.pendingText : status === 'confirmed' ? styles.confirmedText : undefined;
  return (
    <View style={[styles.badge, tone]}>
      <Text variant="caption" muted={!textTone} style={textTone}>
        {STATUS_TEXT[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  pending: {
    backgroundColor: Colors.accentTint,
  },
  pendingText: {
    color: Colors.accentOnTint,
  },
  confirmed: {
    backgroundColor: Colors.secondaryTint,
  },
  confirmedText: {
    color: Colors.secondaryOnTint,
  },
  quiet: {
    backgroundColor: Colors.border,
  },
});
