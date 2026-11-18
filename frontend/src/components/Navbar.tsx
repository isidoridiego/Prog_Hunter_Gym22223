import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Activity,
  CircleUserRound,
  Crown,
  Dumbbell,
  LogOut,
  ShieldCheck,
  Swords,
  UsersRound,
} from 'lucide-react';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Emblem } from './ui';

const links = [
  { to: '/allenamenti', label: 'Quest di oggi', Icon: Dumbbell },
  { to: '/verifica-amici', label: 'Verifiche', Icon: ShieldCheck },
  { to: '/amici', label: 'Amici', Icon: UsersRound },
  { to: '/combattimenti', label: 'Arena', Icon: Swords },
  { to: '/profilo', label: 'Profilo', Icon: CircleUserRound },
];

export function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  // Il badge delle verifiche si aggiorna a ogni cambio pagina.
  useEffect(() => {
    api
      .get<unknown[]>('/quests/verifications/incoming')
      .then((result) => setPendingCount(result.length))
      .catch(() => setPendingCount(0));
  }, [location.pathname]);

  // Il link Admin compare solo per gli amministratori.
  const menu = user?.is_admin ? [...links, { to: '/admin', label: 'Admin', Icon: Crown }] : links;

  return (
    <aside className="sidebar">
      <NavLink className="brand" to="/allenamenti">
        <Activity size={19} strokeWidth={1.8} />
        <span>
          HUNTER<span className="muted"> / GYM</span>
        </span>
      </NavLink>
      <nav className="nav-links" aria-label="Navigazione principale">
        {menu.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
            {to === '/verifica-amici' && pendingCount > 0 && (
              <span className="count">{pendingCount > 99 ? '99+' : pendingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="user-chip">
          <Emblem name={user?.username ?? '?'} />
          <span>
            <strong>{user?.username}</strong>
            <small>Cacciatore • {user?.rank ?? 'E I'}</small>
          </span>
        </div>
        <button className="btn btn-ghost" onClick={() => void signOut()}>
          <LogOut size={16} strokeWidth={1.8} /> Esci
        </button>
      </div>
    </aside>
  );
}
