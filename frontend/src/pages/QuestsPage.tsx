import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Flame, History, Swords } from 'lucide-react';
import { api } from '../api/apiClient';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  Loading,
  PageHeader,
  StatBadge,
  StatPill,
} from '../components/ui';
import { errorText, formatDate } from '../utils/format';
import type { User } from '../types/api';

type Difficulty = 'facile' | 'media' | 'hard';
type QuestStatus = 'assegnata' | 'in_attesa' | 'verificata';

type Quest = {
  id: number;
  quest_date: string;
  status: QuestStatus;
  name: string;
  description: string;
  objective: string;
  difficulty: Difficulty;
  stat: string;
  xp_awarded: number;
  verifier_username?: string | null;
};
type Friend = { id: number; username: string };

const difficulties: Difficulty[] = ['facile', 'media', 'hard'];
const difficultyLabels: Record<Difficulty, string> = { facile: 'Facile', media: 'Media', hard: 'Hard' };
// Premi mostrati all'utente (il calcolo vero lo fa il server).
const rewards: Record<Difficulty, { xp: number; stat: number }> = {
  facile: { xp: 10, stat: 1 },
  media: { xp: 20, stat: 1 },
  hard: { xp: 40, stat: 2 },
};

function statusText(quest: Quest): string {
  if (quest.status === 'assegnata') return 'Da completare';
  if (quest.status === 'verificata') return 'Verificata';
  return quest.verifier_username ? `In verifica · ${quest.verifier_username}` : 'In verifica';
}

export function QuestsPage() {
  const [today, setToday] = useState<Quest[]>([]);
  const [history, setHistory] = useState<Quest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [verifiers, setVerifiers] = useState<Record<number, string>>({});
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Carica quest di oggi, storico, amici e XP (serve per mostrare il premio corretto).
  async function loadPage() {
    const [quests, oldQuests, acceptedFriends, profile] = await Promise.all([
      api.get<Quest[]>('/quests/today'),
      api.get<Quest[]>('/quests/history'),
      api.get<Friend[]>('/friends'),
      api.get<User>('/auth/me'),
    ]);
    setToday(quests);
    setHistory(oldQuests);
    setFriends(acceptedFriends);
    setTotalXp(profile.total_xp ?? 0);
  }

  useEffect(() => {
    loadPage()
      .catch((caught) => setError(errorText(caught, 'Impossibile caricare le quest.')))
      .finally(() => setLoading(false));
  }, []);

  // Invia la quest all'amico scelto: gli XP arrivano solo dopo la sua approvazione.
  async function complete(quest: Quest) {
    setBusyId(quest.id);
    setError('');
    setNotice('');
    try {
      await api.post(`/quests/${quest.id}/complete`, { verifierId: Number(verifiers[quest.id]) });
      setNotice('Quest inviata al tuo amico per la verifica.');
      await loadPage();
    } catch (caught) {
      setError(errorText(caught, 'Impossibile aggiornare la quest.'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading text="[SISTEMA] CARICAMENTO QUEST…" />;

  const verifiedCount = today.filter((quest) => quest.status === 'verificata').length;
  const waitingCount = today.filter((quest) => quest.status === 'in_attesa').length;

  return (
    <section className="page">
      <PageHeader
        kicker="QUEST GIORNALIERE"
        title="Quest di oggi"
        description="Completa gli obiettivi e chiedi a un amico di approvarli. Senza amici le quest restano in attesa: non si può autoverificarsi."
        aside={<StatPill value={`${verifiedCount}/6`} label="Quest verificate" />}
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

      <div className="summary-grid">
        {difficulties.map((difficulty) => (
          <StatPill
            key={difficulty}
            value={today.filter((quest) => quest.difficulty === difficulty).length}
            label={`Quest ${difficultyLabels[difficulty].toLowerCase()}`}
          />
        ))}
        <StatPill value={waitingCount} label="In attesa" />
      </div>

      {difficulties.map((difficulty) => (
        <Card key={difficulty}>
          <CardHeader
            kicker={today[0] ? formatDate(today[0].quest_date) : 'OGGI'}
            title={`Quest ${difficultyLabels[difficulty].toLowerCase()}`}
            count={today.filter((quest) => quest.difficulty === difficulty).length}
          />
          <div className="list">
            {today
              .filter((quest) => quest.difficulty === difficulty)
              .map((quest) => {
                const reward = rewards[quest.difficulty];
                // La quest che porta a Monarca dà XP, ma nessun punto statistica.
                const statReward = totalXp + reward.xp >= 33000 ? 0 : reward.stat;
                return (
                  <article className={`item quest-${quest.status}`} key={quest.id}>
                    <div className="item-icon">
                      {quest.status === 'verificata' ? (
                        <CheckCircle2 />
                      ) : quest.status === 'in_attesa' ? (
                        <Clock3 />
                      ) : (
                        <Flame />
                      )}
                    </div>
                    <div className="item-body">
                      <div className="row">
                        <strong>{quest.name}</strong>
                        <StatBadge stat={quest.stat} />
                        <span className={`tag tag-${quest.status}`}>{statusText(quest)}</span>
                      </div>
                      <p>{quest.description}</p>
                      <small>Obiettivo: {quest.objective}</small>
                      <small>
                        Atleta: {reward.xp} XP
                        {statReward > 0 ? ` · +${statReward} ${quest.stat}` : ' · solo XP a Monarca'}
                        {` · Verificatore: ${Math.floor(reward.xp / 2)} XP`}
                      </small>
                    </div>
                    {quest.status === 'assegnata' && (
                      <div className="item-actions">
                        {friends.length === 0 ? (
                          <small>Aggiungi un amico per chiedere la verifica.</small>
                        ) : (
                          <>
                            <select
                              aria-label={`Scegli chi verifica ${quest.name}`}
                              value={verifiers[quest.id] ?? ''}
                              onChange={(event) =>
                                setVerifiers({ ...verifiers, [quest.id]: event.target.value })
                              }
                            >
                              <option value="">Verificatore…</option>
                              {friends.map((friend) => (
                                <option key={friend.id} value={friend.id}>
                                  {friend.username}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={busyId === quest.id || !verifiers[quest.id]}
                              onClick={() => void complete(quest)}
                            >
                              Segna completata <Swords size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader kicker="QUEST PASSATE" title="Storico quest" count={history.length} />
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nessuna quest nello storico"
            description="Le quest dei giorni precedenti appariranno qui."
          />
        ) : (
          <div className="list">
            {history.map((quest) => (
              <article className="item compact" key={quest.id}>
                <small>{formatDate(quest.quest_date)}</small>
                <strong className="item-body">{quest.name}</strong>
                <StatBadge stat={quest.stat} />
                <span className={`tag tag-${quest.difficulty}`}>{difficultyLabels[quest.difficulty]}</span>
                <span>
                  {quest.status === 'verificata'
                    ? `+${quest.xp_awarded} XP`
                    : quest.status === 'in_attesa'
                      ? 'In verifica'
                      : 'Non completata'}
                </span>
              </article>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
