import { useEffect, useState, type FormEvent } from 'react';
import { Crown } from 'lucide-react';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Alert, Card, CardHeader, PageHeader, StatPill, StatsRow } from '../components/ui';
import { errorText } from '../utils/format';

type Stats = Record<'STR' | 'VIT' | 'AGI', number>;
type AdminProfile = {
  username: string;
  rank: string;
  total_xp: number;
  stats: Stats;
  questPoints: Stats;
};
type Reward = { xp: number; str: number; vit: number; agi: number };

const MAX_REWARD = 1_000_000_000;
const fields: Array<{ key: keyof Reward; label: string }> = [
  { key: 'xp', label: 'XP' },
  { key: 'str', label: 'STR' },
  { key: 'vit', label: 'VIT' },
  { key: 'agi', label: 'AGI' },
];

// Console per provare i ranghi: aggiunge XP e punti statistica al proprio account.
export function AdminPage() {
  const { refreshUser } = useAuth();
  const [reward, setReward] = useState<Reward>({ xp: 0, str: 0, vit: 0, agi: 0 });
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api
      .get<AdminProfile>('/profile')
      .then(setProfile)
      .catch((caught) => setError(errorText(caught)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await api.post<{ granted: Reward; profile: AdminProfile }>(
        '/admin/self/rewards',
        reward,
      );
      setProfile(result.profile);
      await refreshUser();
      const g = result.granted;
      setNotice(
        `Aggiunti ${g.xp.toLocaleString('it-IT')} XP · STR +${g.str.toLocaleString('it-IT')} · VIT +${g.vit.toLocaleString('it-IT')} · AGI +${g.agi.toLocaleString('it-IT')}.`,
      );
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <PageHeader
        kicker="ACCESSO AMMINISTRATORE"
        title="Console Admin"
        description="Assegna XP e punti statistica al tuo account."
        aside={<StatPill value={<Crown size={20} />} label="ADMIN" />}
      />
      {error && <Alert type="error">{error}</Alert>}
      {notice && <Alert type="success">{notice}</Alert>}

      <div className="grid-2">
        <Card>
          <form className="form" onSubmit={submit}>
            <CardHeader kicker="RICOMPENSA PERSONALE" title="Modifica progressione" />
            <p className="muted">
              Gli importi si sommano al profilo. Il limite per ogni campo è 1.000.000.000 per invio.
            </p>
            <div className="stats-row">
              {fields.map(({ key, label }) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    max={MAX_REWARD}
                    step="1"
                    value={reward[key]}
                    onChange={(event) => setReward({ ...reward, [key]: Number(event.target.value) })}
                  />
                </label>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setReward({ xp: MAX_REWARD, str: MAX_REWARD, vit: MAX_REWARD, agi: MAX_REWARD })}
            >
              Imposta il massimo per tutti i campi
            </button>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Aggiornamento…' : 'Aggiungi al mio account'}
            </button>
          </form>
        </Card>

        <Card>
          <CardHeader kicker="VALORI ATTUALI" title={profile?.username ?? 'Profilo'} />
          {profile ? (
            <>
              <p>
                {profile.rank} · {profile.total_xp.toLocaleString('it-IT')} XP
              </p>
              <StatsRow stats={profile.stats} base={profile.questPoints} baseLabel="punti base" />
            </>
          ) : (
            <p className="muted">Caricamento…</p>
          )}
        </Card>
      </div>
    </section>
  );
}
