/** Tests for the configuration API — GET /configuration, unwrapped via the shared envelope guard. */
import { apiClient } from '../../apiClient';
import { getConfiguration } from '../configuration';

jest.mock('../../apiClient', () => ({ apiClient: { get: jest.fn() } }));

const get = apiClient.get as jest.Mock;
const PATH = '/wp-json/transitquote/v1/configuration';

beforeEach(() => jest.clearAllMocks());

describe('getConfiguration', () => {
  it('requests /configuration and unwraps the data', async () => {
    get.mockResolvedValue({ data: { data: { team_settings: {} }, success: true } });
    const result = await getConfiguration();
    expect(get).toHaveBeenCalledWith(PATH);
    expect(result).toEqual({ team_settings: {} });
  });

  it('throws when the envelope reports failure', async () => {
    get.mockResolvedValue({ data: { success: false } });
    await expect(getConfiguration()).rejects.toThrow('Failed to load configuration');
  });

  it('throws when data is missing despite success', async () => {
    get.mockResolvedValue({ data: { success: true } });
    await expect(getConfiguration()).rejects.toThrow('Failed to load configuration');
  });
});
