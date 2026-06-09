/** Labelled text input with optional error text. Reusable across forms. */
import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import { useTheme, type Theme } from '../../hooks/useTheme';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'placeholder'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'autoComplete'
    | 'keyboardType'
    | 'secureTextEntry'
    | 'editable'
    | 'textContentType'
  > {
  label: string;
  errorText?: string;
  /** Shown below the input when there is no errorText — error takes precedence. */
  helperText?: string;
  testID?: string;
}

export function TextField({ label, errorText, helperText, testID, ...inputProps }: TextFieldProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.input, errorText ? styles.inputError : null]}
        placeholderTextColor={t.colours.textMuted}
        {...inputProps}
      />
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: SPACING.md,
    },
    label: {
      ...TYPOGRAPHY.label,
      color: t.colours.textMuted,
      marginBottom: SPACING.xs,
    },
    input: {
      ...TYPOGRAPHY.body,
      color: t.colours.text,
      minHeight: 48,
      borderWidth: 1,
      borderColor: t.colours.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      backgroundColor: t.colours.background,
    },
    inputError: {
      borderColor: t.colours.danger,
    },
    error: {
      ...TYPOGRAPHY.caption,
      color: t.colours.danger,
      marginTop: SPACING.xs,
    },
    helper: {
      ...TYPOGRAPHY.caption,
      color: t.colours.textMuted,
      marginTop: SPACING.xs,
    },
  });
