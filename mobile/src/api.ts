import { supabase } from './supabase';
import { Platform } from 'react-native';
import { resolveApiBase } from './api-base';
export const apiBase = resolveApiBase(process.env.EXPO_PUBLIC_API_URL, Platform.OS);
export class ApiFailure extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
export async function api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  if (apiBase === undefined) throw new ApiFailure('The pantry service has not been configured yet.', 0, 'NOT_CONFIGURED');
  if (!supabase) throw new ApiFailure('Sign-in is not configured yet.', 0, 'NOT_CONFIGURED');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new ApiFailure('Please sign in again.', 401, 'UNAUTHENTICATED');
  const control = new AbortController();
  const abort = () => control.abort();
  if (signal?.aborted) control.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 30000);
  try {
    const response = await fetch(`${apiBase}/api/v1${path}`, {
      method, signal: control.signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value = await response.json().catch(() => null);
    if (!response.ok) throw new ApiFailure(value?.message || 'The pantry service could not complete this request.', response.status, value?.code || 'HTTP_ERROR');
    return value as T;
  } catch (error) {
    if (error instanceof ApiFailure || signal?.aborted) throw error;
    throw new ApiFailure('Could not reach the pantry service. Check your connection and try again.', 0, 'NETWORK_ERROR');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
