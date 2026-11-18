import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert, Card, Loading } from '../components/ui';
import { errorText } from '../utils/format';

// Pagina unica per accesso e registrazione: cambia solo il campo email e i testi.
export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Messaggio mandato dalla navigazione, per esempio "sessione terminata".
  const flash = (location.state as { message?: string } | null)?.message;

  if (loading) return <Loading text="[SISTEMA] Caricamento…" />;
  if (user) return <Navigate to="/allenamenti" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (isRegister) {
        setNotice(await signUp(email, username, password));
      } else {
        await signIn(username, password);
        navigate('/allenamenti', { replace: true });
      }
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-visual">
        <span className="kicker">[SISTEMA DI RISVEGLIO]</span>
        <h1>
          Il tuo limite <em>è solo l’inizio.</em>
        </h1>
        <p>Allenati. Dimostra il tuo valore. Scala i ranghi dei cacciatori.</p>
      </div>
      <Card className="auth-panel">
        <div className="brand">
          <Activity size={19} strokeWidth={1.8} /> HUNTER<span className="muted"> / GYM</span>
        </div>
        <h2>{isRegister ? 'Crea il tuo account' : 'Bentornato'}</h2>
        <p className="muted">
          {isRegister
            ? 'Inizia il tuo percorso e risveglia il tuo potenziale.'
            : 'Accedi al Sistema per continuare il tuo percorso.'}
        </p>
        {flash && <Alert type="error">{flash}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}
        <form onSubmit={handleSubmit} className="form">
          {isRegister && (
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                placeholder="nome@email.it"
              />
            </label>
          )}
          <label>
            Username
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              title="Da 3 a 20 caratteri: lettere, numeri o underscore"
              placeholder="Il tuo nome da hunter"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
              placeholder="Almeno 8 caratteri"
            />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Attendi…' : isRegister ? 'Crea account' : 'Entra nel Sistema'}
          </button>
        </form>
        <p className="muted">
          {isRegister ? 'Hai già un account?' : 'Non hai ancora un account?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Accedi' : 'Registrati'}</Link>
        </p>
      </Card>
    </main>
  );
}
