/** Configuration API — GET /configuration (app bootstrap reference data + current user). */
import { apiClient } from '../apiClient';
import { unwrapData } from '../unwrapResponse';
import type { ApiResponse, ConfigurationData } from '../../types/api';

const PATH = '/wp-json/transitquote/v1/configuration';

export async function getConfiguration(): Promise<ConfigurationData> {
  const res = await apiClient.get<ApiResponse<ConfigurationData>>(PATH);
  return unwrapData(res.data, 'configuration');
}
