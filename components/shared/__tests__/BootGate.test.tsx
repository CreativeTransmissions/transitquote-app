/**
 * Tests for BootGate — gates the app on the boot sequence: an error screen when migrations fail,
 * a loading state while booting, and the app children once ready. useAppBoot is mocked.
 */
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAppBoot } from '../../../hooks/useAppBoot';
import { BootGate } from '../BootGate';

jest.mock('../../../hooks/useAppBoot', () => ({ useAppBoot: jest.fn() }));

const mockBoot = useAppBoot as jest.Mock;
const child = <Text>APP CONTENT</Text>;

beforeEach(() => mockBoot.mockReset());

describe('BootGate', () => {
  it('shows the error screen with the message when boot fails', () => {
    mockBoot.mockReturnValue({ status: 'error', error: new Error('migration failed') });
    render(<BootGate>{child}</BootGate>);
    expect(screen.getByText(/start the app/)).toBeTruthy();
    expect(screen.getByText('migration failed')).toBeTruthy();
    expect(screen.queryByText('APP CONTENT')).toBeNull();
  });

  it('falls back to a generic message when boot fails without an error message', () => {
    mockBoot.mockReturnValue({ status: 'error', error: undefined });
    render(<BootGate>{child}</BootGate>);
    expect(screen.getByText('Database migration failed.')).toBeTruthy();
  });

  it('does not render children while booting', () => {
    mockBoot.mockReturnValue({ status: 'booting', error: undefined });
    render(<BootGate>{child}</BootGate>);
    expect(screen.queryByText('APP CONTENT')).toBeNull();
  });

  it('renders the children once ready', () => {
    mockBoot.mockReturnValue({ status: 'ready', error: undefined });
    render(<BootGate>{child}</BootGate>);
    expect(screen.getByText('APP CONTENT')).toBeTruthy();
  });
});
