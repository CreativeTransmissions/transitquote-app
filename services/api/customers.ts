/** Customers API — GET /customers (list) and /customers/{id} (detail). Dispatch/Admin only. */
import { apiClient } from '../apiClient';
import type { ApiResponse, Customer } from '../../types/api';

const PATH = '/wp-json/transitquote/v1/customers';

export async function getCustomers(): Promise<Customer[]> {
  const res = await apiClient.get<ApiResponse<Customer[]>>(PATH);
  if (!res.data?.success) throw new Error('Failed to load customers');
  return res.data.data;
}

export async function getCustomerById(id: number): Promise<Customer> {
  const res = await apiClient.get<ApiResponse<Customer>>(`${PATH}/${id}`);
  if (!res.data?.success) throw new Error('Failed to load customer');
  return res.data.data;
}
