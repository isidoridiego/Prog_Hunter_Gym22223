export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// Dati del profilo restituiti da /auth/login e /auth/me.
export interface User {
  id: number;
  email: string;
  username: string;
  is_admin?: boolean;
  total_xp?: number;
  rank?: string;
}
