const API_BASE = '/api';

/** Clave en localStorage donde el store de auth guarda el JWT (misma que stores/auth.ts). */
const TOKEN_STORAGE_KEY = 'arcanum_token';

export interface ApiError {
  error: string;
}

/** Obtiene el token JWT del almacenamiento local. El interceptor lo inyecta en todas las peticiones. */
function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/** Si es 401, dispara evento para que el store de auth pueda hacer logout y redirigir */
function handleUnauthorized() {
  window.dispatchEvent(new CustomEvent('arcanum:unauthorized'));
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token: tokenOverride, ...fetchOptions } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  const token = tokenOverride !== undefined ? tokenOverride : getStoredToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    handleUnauthorized();
  }

  if (!res.ok) {
    throw new Error((data as ApiError).error || res.statusText || 'Error en la petición');
  }
  return data as T;
}

export const api = {
  get<T>(path: string, token?: string | null) {
    return request<T>(path, { method: 'GET', token });
  },
  post<T>(path: string, body: unknown, token?: string | null) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body), token });
  },
  put<T>(path: string, body: unknown, token?: string | null) {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body), token });
  },
  patch<T>(path: string, body: unknown, token?: string | null) {
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token });
  },
  delete<T>(path: string, token?: string | null) {
    return request<T>(path, { method: 'DELETE', token });
  },
};
