/** Customer list row: name + contact (spec §6.8). */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { makeCard, makeCardPressed, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { fullName } from '../../utils/formatters';
import type { CustomerRow } from '../../database/schema';

interface CustomerCardProps {
  customer: CustomerRow;
  onPress: (id: number) => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const name = fullName(customer.firstName, customer.lastName) || `Customer ${customer.id}`;
  const contact = [customer.email, customer.phone].filter(Boolean).join(' · ');
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <Pressable
      testID={`customer-card-${customer.id}`}
      accessibilityRole="button"
      onPress={() => onPress(customer.id)}
      android_ripple={{ color: t.colours.surfaceAlt }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {contact ? (
        <Text style={styles.contact} numberOfLines={1}>
          {contact}
        </Text>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: { ...makeCard(t) },
    pressed: { ...makeCardPressed(t) },
    name: { ...TYPOGRAPHY.subheading, color: t.colours.text },
    contact: { ...TYPOGRAPHY.caption, color: t.colours.textMuted },
  });
