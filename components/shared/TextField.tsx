/** Labelled text input with optional error text. Reusable across forms. */
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { COLOURS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

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
  testID?: string;
}

export function TextField({ label, errorText, testID, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={[styles.input, errorText ? styles.inputError : null]}
        placeholderTextColor={COLOURS.textMuted}
        {...inputProps}
      />
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLOURS.textMuted,
    marginBottom: SPACING.xs,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLOURS.text,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLOURS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLOURS.background,
  },
  inputError: {
    borderColor: COLOURS.danger,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: COLOURS.danger,
    marginTop: SPACING.xs,
  },
});
