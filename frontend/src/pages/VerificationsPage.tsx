import { useEffect, useState } from 'react';
import { Check, Clock3, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { api } from '../api/apiClient';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  Emblem,
  Loading,
  PageHeader,
  StatBadge,
  StatPill,
} from '../components/ui';
import { errorText, formatDate } from '../utils/format';

type Quest = {
  id: number;
  quest_date: string;
  name: string;
  description: string;
  objective: string;
  difficulty: string;
  stat: string;
  requester_username?: string;
  verifier_username?: string;
};
type Award = { xp: number; stat: number; verifierXp: number };
type DecisionResult = { award?: Award };

export function VerificationsPage() {
  const [incoming, setIncoming] = useState<Quest[]>([]);
  const [mine, setMine] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Carica le quest degli amici da approvare e quelle inviate dall'utente.
  async function loadPage() {
    const [received, own] = await Promise.all([
      api.get<Quest[]>('/quests/verifications/incoming'),
      api.get<Quest[]>('/quests/pending'),
    ]);
    setIncoming(received);
    setMine(own);
  }

  useEffect(() => {
    loadPage()
      .catch((caught) => setError(errorText(caught, 'Impossibile caricare le verifiche.')))
      .finally(() => setLoading(false));
  }, []);

  // Invia l'approvazione o il rifiuto al server e ricarica le due liste.
  async function decide(questId: number, approved: boolean) {
    setBusyId(questId);
    setError('');
    setNotice('');
    try {
      const result = await api.post<DecisionResult>(`/quests/${questId}/verify`, { approved });
      if (approved) {
        const award = result.award;
        const statMessage = award?.stat
          ? `e ${award.stat} punti stat`
          : 'e nessun punto stat perché il cacciatore ha raggiunto Monarca';
        setNotice(
          `Quest approvata: l'atleta riceve ${award?.xp} XP ${statMessage}; tu ricevi ${award?.verifierXp} XP.`,
        );
      } else {
        setNotice('Quest rifiutata: tornerà tra quelle da completare.');
      }
      await loadPage();
    } catch (caught) {
      setError(errorText(caught, 'Impossibile completare la verifica.'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading text="[SISTEMA] CARICAMENTO VERIFICHE…" />;

  return (
    <section className="page">
      <PageHeader
        kicker="PATTO TRA CACCIATORI"
        title="Verifica le quest di un amico"
        description="La conferma assegna XP e punti statistica al cacciatore."
        aside={<StatPill value={incoming.length} label="Da verificare" />}
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

      <div className="grid-2">
        <Card>
          <CardHeader kicker="RICHIESTE RICEVUTE" title="Quest da approvare" count={incoming.length} />
          <button className="btn btn-ghost" onClick={() => void loadPage()}>
            <RefreshCw size={15} /> Aggiorna
          </button>
          {incoming.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Nessuna quest in attesa"
              description="Le richieste dei tuoi amici compariranno qui."
            />
          ) : (
            <div className="list">
              {incoming.map((quest) => (
                <article className="item" key={quest.id}>
                  <Emblem name={quest.requester_username ?? '?'} />
                  <div className="item-body">
                    <div className="row">
                      <strong>{quest.requester_username}</strong>
                      <StatBadge stat={quest.stat} />
                    </div>
                    <p>
                      {quest.name} · {formatDate(quest.quest_date)}
                    </p>
                    <small>
                      {quest.objective} · {quest.difficulty}
                    </small>
                    <small>{quest.description}</small>
                  </div>
                  <div className="item-actions">
                    <button
                      className="btn"
                      disabled={busyId === quest.id}
                      onClick={() => void decide(quest.id, true)}
                    >
                      <Check size={14} /> Approva
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={busyId === quest.id}
                      onClick={() => void decide(quest.id, false)}
                    >
                      <X size={14} /> Rifiuta
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader kicker="LE TUE QUEST" title="In attesa di verifica" count={mine.length} />
          {mine.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="Nessuna quest inviata"
              description="Le tue richieste appariranno qui fino alla risposta dell’amico."
            />
          ) : (
            <div className="list">
              {mine.map((quest) => (
                <article className="item" key={quest.id}>
                  <StatBadge stat={quest.stat} />
                  <div className="item-body">
                    <strong>{quest.name}</strong>
                    <p>
                      {quest.objective} · {formatDate(quest.quest_date)}
                    </p>
                    <small>Verificatore: {quest.verifier_username}</small>
                  </div>
                  <span className="tag tag-in_attesa">In attesa</span>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
