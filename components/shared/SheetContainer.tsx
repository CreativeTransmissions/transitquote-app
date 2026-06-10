/**
 * Shared bottom-sheet chrome for the app's slide-up modals.
 *
 * Standardises the Modal / backdrop / panel / grabber / title / inset-padding that
 * StatusPicker, DriverPicker, JobFilterSheet and SyncProblemsSheet previously each
 * duplicated. Consumers pass their inner content as children.
 */
import { type ReactNode, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { hapticLight } from '../../utils/haptics';

interface SheetContainerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Maximum sheet height as a fraction of the screen (0–1). Defaults to 0.85. */
  maxHeightPct?: number;
  testID?: string;
}

export function SheetContainer({
  visible,
  onClose,
  title,
  children,
  maxHeightPct = 0.85,
  testID,
}: SheetContainerProps) {
  const insets = useSafeAreaInsets();
  const t = useTheme();

  // Track the previous visibility so we can fire haptic on false→true transition.
  const prevVisible = useRef(visible);
  useEffect(() => {
    if (!prevVisible.current && visible) {
      void hapticLight();
    }
    prevVisible.current = visible;
  }, [visible]);

  const backdropColour = t.scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      testID={testID}
    >
      {/* Backdrop — tap outside to close */}
      <Pressable
        style={[styles.backdrop, { backgroundColor: backdropColour }]}
        onPress={onClose}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        {/* Inner sheet panel — stop backdrop tap propagating through the panel */}
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: t.colours.background,
              maxHeight: `${Math.round(maxHeightPct * 100)}%`,
              paddingBottom: SPACING.lg + insets.bottom,
            },
          ]}
          onPress={() => {/* intentional no-op: swallow presses inside the sheet */}}
        >
          {/* Grabber handle */}
          <View style={[styles.grabber, { backgroundColor: t.colours.border }]} />

          {/* Optional title */}
          {title ? (
            <Text style={[styles.title, { color: t.colours.text }]}>{title}</Text>
          ) : null}

          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.heading,
    marginBottom: SPACING.md,
  },
});
