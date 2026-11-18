import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { RankAvatar } from '../components/RankAvatar';
import { Alert, Card, CardHeader, Loading, PageHeader, StatPill, StatsRow } from '../components/ui';
import { errorText } from '../utils/format';

const monarchClasses = ['Ombre', 'Fuoco', 'Ghiaccio', 'Fulmini', 'Vento', 'Bestie'];
type Stats = Record<'STR' | 'VIT' | 'AGI', number>;
type Item = {
  id: number;
  name: string;
  unlock_rank: string;
  str_percent: number;
  vit_percent: number;
  agi_percent: number;
  unlocked: boolean;
  equipped: boolean;
};
type Profile = {
  username: string;
  email: string;
  total_xp: number;
  rank: string;
  nextRankXp: number | null;
  rankBonus: number;
  monarchTitle: string | null;
  monarch_class: string | null;
  stats: Stats;
  questPoints: Stats;
  items: Item[];
};

export function ProfilePage() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  async function loadProfile() {
    setProfile(await api.get<Profile>('/profile'));
  }

  useEffect(() => {
    loadProfile()
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoading(false));
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== repeatPassword) {
      setError('Le nuove password non coincidono.');
      return;
    }
    setBusy(true);
    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      setNotice('Password aggiornata.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function equipItem(itemId: number) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.put('/profile/item', { itemId });
      await loadProfile();
      setNotice('Oggetto equipaggiato. I bonus si applicano solo nei combattimenti.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function chooseMonarchClass(monarchClass: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.put('/profile/monarch-class', { monarchClass });
      await loadProfile();
      setNotice('Classe Monarca scelta. La scelta è permanente.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="[SISTEMA] CARICAMENTO PROFILO…" />;
  if (!profile) return <Alert type="error">{error || 'Profilo non disponibile.'}</Alert>;

  return (
    <section className="page">
      <PageHeader
        kicker="DOSSIER CACCIATORE"
        title="Il tuo profilo"
        description="Progressione, classe e oggetti da combattimento."
        aside={<StatPill value={profile.rank} label="Rango" />}
      />
      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert type="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <div className="profile-layout">
        <div className="page">
          <Card className="profile-summary">
            <RankAvatar rank={profile.rank} username={profile.username} />
            <div className="stack">
              <span className="kicker">CACCIATORE</span>
              <h3>{profile.username}</h3>
              <p className="muted">{profile.email}</p>
              <p>
                {profile.total_xp.toLocaleString('it-IT')} XP totali · Bonus rango +{profile.rankBonus} a ogni
                statistica
              </p>
              {profile.monarchTitle && <strong>{profile.monarchTitle}</strong>}
              <StatsRow stats={profile.stats} base={profile.questPoints} baseLabel="da quest" />
              {profile.nextRankXp !== null && (
                <small className="muted">
                  Prossimo rango a {profile.nextRankXp.toLocaleString('it-IT')} XP
                </small>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader kicker="ITEM DA COMBATTIMENTO" title="Oggetti sbloccati" />
            <p className="muted">I bonus percentuali aumentano le statistiche solo nell’arena.</p>
            <div className="item-grid">
              {profile.items.map((item) => (
                <article className="card" key={item.id}>
                  <strong>{item.name}</strong>
                  <small>Sblocco {item.unlock_rank}</small>
                  <small>
                    STR +{item.str_percent}% · VIT +{item.vit_percent}% · AGI +{item.agi_percent}%
                  </small>
                  <button
                    className="btn btn-secondary"
                    disabled={busy || !item.unlocked || item.equipped}
                    onClick={() => void equipItem(item.id)}
                  >
                    {item.equipped ? 'Equipaggiato' : item.unlocked ? 'Equipaggia' : 'Non sbloccato'}
                  </button>
                </article>
              ))}
            </div>
          </Card>

          {profile.rank === 'Monarca' && !profile.monarch_class && (
            <Card>
              <CardHeader kicker="SCELTA PERMANENTE" title="Scegli la tua classe Monarca" />
              <p className="muted">La classe non può essere cambiata dopo la scelta.</p>
              <div className="row">
                {monarchClasses.map((monarchClass) => (
                  <button
                    className="btn btn-secondary"
                    key={monarchClass}
                    disabled={busy}
                    onClick={() => void chooseMonarchClass(monarchClass)}
                  >
                    {monarchClass}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="page">
          <Card>
            <form className="form" onSubmit={savePassword}>
              <CardHeader kicker="SICUREZZA" title="Cambia password" />
              <label>
                Password attuale
                <input
                  type="password"
                  required
                  maxLength={72}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label>
                Nuova password
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label>
                Ripeti password
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                />
              </label>
              <button className="btn" disabled={busy}>
                <KeyRound size={15} /> Aggiorna password
              </button>
            </form>
          </Card>
          <Card>
            <CardHeader title="Sessione" />
            <button className="btn btn-secondary" onClick={() => void signOut()}>
              Esci dall’account
            </button>
          </Card>
        </div>
      </div>
    </section>
  );
}
