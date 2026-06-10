/**
 * Transient toast shown when the pending outbox count transitions 0→>0 while offline.
 * "Saved — will sync when you're back online." Slides/fades in, auto-hides after 4s.
 * Fires hapticLight() on show. Shows at most once per session (module-level flag).
 *
 * Render from app/(app)/jobs/index.tsx — it overlays that screen above the tab bar.
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useOutbox } from '../../hooks/useOutbox';
import { useConnectivityStore } from '../../stores/connectivityStore';
import { hapticLight } from '../../utils/haptics';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

// Module-level: show the toast at most once per app session (not per component mount).
let _shownThisSession = false;

/** Reset the session flag — used in tests only. */
export function _resetOutboxToastSession(): void {
  _shownThisSession = false;
}

export function OutboxToast() {
  const { pendingCount } = useOutbox();
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const prevPendingRef = useRef(0);
  const visible = useRef(false);

  // Stable Animated.Values: lazy useState so the value is created once and survives re-renders.
  const [translateY] = useState(() => new Animated.Value(60));
  const [opacity] = useState(() => new Animated.Value(0));

  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  useEffect(() => {
    const prev = prevPendingRef.current;
    prevPendingRef.current = pendingCount;

    // Only trigger on 0→>0 while offline, and at most once per session.
    if (prev === 0 && pendingCount > 0 && !isOnline && !_shownThisSession) {
      _shownThisSession = true;
      visible.current = true;
      hapticLight();

      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        // Auto-hide after 4s
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(translateY, { toValue: 60, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start(() => {
            visible.current = false;
          });
        }, 4000);
      });
    }
  }, [pendingCount, isOnline, translateY, opacity]);

  return (
    <Animated.View
      style={[styles.toast, { transform: [{ translateY }], opacity }]}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      testID="outbox-toast"
    >
      <View style={styles.inner}>
        <Text style={styles.text}>{"Saved — will sync when you're back online"}</Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      bottom: SPACING.xl,
      left: SPACING.md,
      right: SPACING.md,
      zIndex: 100,
    },
    inner: {
      backgroundColor: t.colours.surface,
      borderWidth: 1,
      borderColor: t.colours.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
    },
    text: { ...TYPOGRAPHY.body, color: t.colours.text },
  });
