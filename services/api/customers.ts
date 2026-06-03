/** Customers API — GET /customers (list) and /customers/{id} (detail). Dispatch/Admin only. */
import { apiClient } from '../apiClient';
import { unwrapData } from '../unwrapResponse';
import type { ApiResponse, Customer } from '../../types/api';

const PATH = '/wp-json/transitquote/v1/customers';

export async function getCustomers(): Promise<Customer[]> {
  const res = await apiClient.get<ApiResponse<Customer[]>>(PATH);
  return unwrapData(res.data, 'customers', true);
}

export async function getCustomerById(id: number): Promise<Customer> {
  const res = await apiClient.get<ApiResponse<Customer>>(`${PATH}/${id}`);
  return unwrapData(res.data, 'customer');
}
