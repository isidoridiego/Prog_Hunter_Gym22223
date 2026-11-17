import { Response } from 'express';

export function apiError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: { code, message } });
}

export function serverError(res: Response, label: string, error: unknown): void {
  console.error(label, error);
  apiError(res, 500, 'INTERNAL_ERROR', 'Errore interno del server');
}

export function parseId(raw: string): number | null {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
