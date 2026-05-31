/** Customer list row: name + contact (spec §6.8). */
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { fullName } from '../../utils/formatters';
import type { CustomerRow } from '../../database/schema';

interface CustomerCardProps {
  customer: CustomerRow;
  onPress: (id: number) => void;
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const name = fullName(customer.firstName, customer.lastName) || `Customer ${customer.id}`;
  const contact = [customer.email, customer.phone].filter(Boolean).join(' · ');

  return (
    <Pressable
      testID={`customer-card-${customer.id}`}
      accessibilityRole="button"
      onPress={() => onPress(customer.id)}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOURS.background,
    borderWidth: 1,
    borderColor: COLOURS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  pressed: { backgroundColor: COLOURS.surface },
  name: { ...TYPOGRAPHY.subheading, color: COLOURS.text },
  contact: { ...TYPOGRAPHY.caption, color: COLOURS.textMuted },
});
