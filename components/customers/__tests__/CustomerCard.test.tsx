/** Tests for CustomerCard: name (+ fallback), contact join, and onPress. */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CustomerCard } from '../CustomerCard';
import type { CustomerRow } from '../../../database/schema';

function customer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: 1,
    wpUserId: null,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '0700',
    created: null,
    modified: null,
    ...overrides,
  };
}

describe('CustomerCard', () => {
  it('renders the full name and joined contact', () => {
    render(<CustomerCard customer={customer()} onPress={jest.fn()} />);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('ada@example.com · 0700')).toBeTruthy();
  });

  it('falls back to "Customer {id}" when the name is blank', () => {
    render(<CustomerCard customer={customer({ firstName: null, lastName: null })} onPress={jest.fn()} />);
    expect(screen.getByText('Customer 1')).toBeTruthy();
  });

  it('shows only the available contact field', () => {
    render(<CustomerCard customer={customer({ email: null })} onPress={jest.fn()} />);
    expect(screen.getByText('0700')).toBeTruthy();
  });

  it('omits the contact line when there is no contact info', () => {
    render(<CustomerCard customer={customer({ email: null, phone: null })} onPress={jest.fn()} />);
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('calls onPress with the customer id', () => {
    const onPress = jest.fn();
    render(<CustomerCard customer={customer({ id: 9 })} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('customer-card-9'));
    expect(onPress).toHaveBeenCalledWith(9);
  });
});
