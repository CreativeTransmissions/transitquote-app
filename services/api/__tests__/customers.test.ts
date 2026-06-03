/** Tests for the customers API — list (array-validated) and detail, via the shared envelope guard. */
jest.mock('../../apiClient', () => ({ apiClient: { get: jest.fn() } }));

import { apiClient } from '../../apiClient';
import { getCustomers, getCustomerById } from '../customers';

const get = apiClient.get as jest.Mock;
const PATH = '/wp-json/transitquote/v1/customers';

beforeEach(() => jest.clearAllMocks());

describe('getCustomers', () => {
  it('requests the list and unwraps the array', async () => {
    get.mockResolvedValue({ data: { data: [{ id: '1' }], success: true } });
    const result = await getCustomers();
    expect(get).toHaveBeenCalledWith(PATH);
    expect(result).toEqual([{ id: '1' }]);
  });

  it('throws when the payload is not an array', async () => {
    get.mockResolvedValue({ data: { data: { id: '1' }, success: true } });
    await expect(getCustomers()).rejects.toThrow('Failed to load customers');
  });

  it('throws on a failed envelope', async () => {
    get.mockResolvedValue({ data: { success: false } });
    await expect(getCustomers()).rejects.toThrow('Failed to load customers');
  });
});

describe('getCustomerById', () => {
  it('requests /customers/{id} and unwraps the object', async () => {
    get.mockResolvedValue({ data: { data: { id: '42' }, success: true } });
    const result = await getCustomerById(42);
    expect(get).toHaveBeenCalledWith(`${PATH}/42`);
    expect(result).toEqual({ id: '42' });
  });

  it('throws on a failed envelope', async () => {
    get.mockResolvedValue({ data: { success: false } });
    await expect(getCustomerById(42)).rejects.toThrow('Failed to load customer');
  });
});
