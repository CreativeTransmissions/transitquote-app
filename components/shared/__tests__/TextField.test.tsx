/** Tests for the shared TextField: label, value, change events, and the optional error text. */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextField } from '../TextField';

describe('TextField', () => {
  it('renders the label and current value', () => {
    render(<TextField label="Site URL" value="https://acme.example" onChangeText={jest.fn()} testID="f" />);
    expect(screen.getByText('Site URL')).toBeTruthy();
    expect(screen.getByTestId('f').props.value).toBe('https://acme.example');
  });

  it('calls onChangeText as the user types', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Site URL" value="" onChangeText={onChangeText} testID="f" />);
    fireEvent.changeText(screen.getByTestId('f'), 'https://new.example');
    expect(onChangeText).toHaveBeenCalledWith('https://new.example');
  });

  it('shows error text when provided', () => {
    render(<TextField label="Site URL" value="" onChangeText={jest.fn()} errorText="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('renders no error text by default', () => {
    render(<TextField label="Site URL" value="" onChangeText={jest.fn()} />);
    expect(screen.queryByText('Required')).toBeNull();
  });
});
