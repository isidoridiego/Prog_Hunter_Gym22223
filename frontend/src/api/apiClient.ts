import type { ApiEnvelope } from '../types/api';

// Se VITE_API_URL non è impostata, l'API si trova sullo stesso host del sito, porta 3000.
const API_URL =
  import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3000/api`;

let unauthorizedHandler: (() => void) | undefined;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Chiamata quando una rotta protetta risponde 401 (sessione scaduta).
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler;
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      // credentials: 'include' fa inviare al server il cookie di sessione (httpOnly).
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Impossibile contattare il server. Controlla la connessione e riprova.',
    );
  }

  let envelope: ApiEnvelope<T> | undefined;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Se il body non è JSON, più sotto diventa un errore generico.
  }

  if (!response.ok || !envelope?.success) {
    // Un 401 fuori da /auth/ significa che la sessione è finita: si torna al login.
    if (response.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.();
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'REQUEST_FAILED',
      envelope?.error?.message ?? 'La richiesta non è riuscita.',
    );
  }
  return envelope.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
  put: <T>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
  delete: <T>(path: string) => request<T>(path, 'DELETE'),
};
