import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setUnauthorizedHandler } from '../api/apiClient';
import type { User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<string>;
  refreshUser: () => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Se il server dice che la sessione è scaduta, si torna alla pagina di login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate('/login', { replace: true, state: { message: 'La sessione è terminata. Accedi di nuovo.' } });
    });
    return () => setUnauthorizedHandler(undefined);
  }, [navigate]);

  // All'avvio chiediamo il profilo: se il cookie di sessione è valido l'utente resta collegato.
  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function signIn(username: string, password: string) {
    // Il server imposta il cookie di sessione e restituisce il profilo.
    setUser(await api.post<User>('/auth/login', { username, password }));
  }

  async function signUp(email: string, username: string, password: string) {
    const result = await api.post<{ message: string }>('/auth/register', { email, username, password });
    return result.message;
  }

  async function refreshUser() {
    const updated = await api.get<User>('/auth/me');
    setUser(updated);
    return updated;
  }

  async function signOut() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return context;
}
