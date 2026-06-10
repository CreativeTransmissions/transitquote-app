/**
 * Placeholder card rendered during the first-sync state while the local DB is empty.
 * Matches JobCard's rough geometry (rounded rect, 3 grey bars of varying width, ~120dp tall)
 * with a gentle opacity pulse. Decorative only — not focusable by assistive technology.
 */
import { useEffect, useState, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { RADIUS, SPACING } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

export function SkeletonJobCard() {
  // Stable Animated.Value: lazy useState so the value is created once and survives re-renders.
  const [opacity] = useState(() => new Animated.Value(1));
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.card, { opacity }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {/* Status border placeholder */}
      <View style={styles.leftBar} />
      <View style={styles.body}>
        {/* Job ref row */}
        <View style={[styles.bar, styles.barWide]} />
        {/* Customer row */}
        <View style={[styles.bar, styles.barMedium]} />
        {/* Address / meta row */}
        <View style={[styles.bar, styles.barNarrow]} />
      </View>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: t.colours.surface,
      borderRadius: RADIUS.md,
      marginHorizontal: SPACING.md,
      marginVertical: SPACING.xs,
      minHeight: 120,
      overflow: 'hidden',
    },
    leftBar: {
      width: 3,
      backgroundColor: t.colours.surfaceAlt,
    },
    body: {
      flex: 1,
      padding: SPACING.md,
      gap: SPACING.sm,
      justifyContent: 'center',
    },
    bar: {
      height: 12,
      borderRadius: RADIUS.sm,
      backgroundColor: t.colours.surfaceAlt,
    },
    barWide: { width: '70%' },
    barMedium: { width: '50%' },
    barNarrow: { width: '35%' },
  });
