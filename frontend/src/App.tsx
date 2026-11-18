import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { QuestsPage } from './pages/QuestsPage';
import { VerificationsPage } from './pages/VerificationsPage';
import { FriendsPage } from './pages/FriendsPage';
import { BattlesPage } from './pages/BattlesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { useAuth } from './context/AuthContext';

function AdminRoute() {
  const { user } = useAuth();
  return user?.is_admin ? <AdminPage /> : <Navigate to="/allenamenti" replace />;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/allenamenti" replace />} />
          <Route path="allenamenti" element={<QuestsPage />} />
          <Route path="verifica-amici" element={<VerificationsPage />} />
          <Route path="amici" element={<FriendsPage />} />
          <Route path="combattimenti" element={<BattlesPage />} />
          <Route path="profilo" element={<ProfilePage />} />
          <Route path="admin" element={<AdminRoute />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
