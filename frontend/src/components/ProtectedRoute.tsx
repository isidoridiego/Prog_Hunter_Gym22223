import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './ui';

// Mostra le pagine solo a chi ha una sessione valida, altrimenti rimanda al login.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Verifica sessione…" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
