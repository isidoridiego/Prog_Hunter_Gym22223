import { ApiError } from '../api/apiClient';

// Messaggio da mostrare all'utente: quello del server se è un errore API, altrimenti uno generico.
export function errorText(error: unknown, fallback = 'Si è verificato un errore. Riprova.'): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
