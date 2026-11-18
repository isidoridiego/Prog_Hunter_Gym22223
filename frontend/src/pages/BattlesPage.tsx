import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, History, Scale, Swords, Trophy, X } from 'lucide-react';
import { api } from '../api/apiClient';
import { Alert, Card, CardHeader, EmptyState, Loading, PageHeader, StatPill } from '../components/ui';
import { errorText, formatDateTime } from '../utils/format';

type Fighter = {
  id: number;
  username: string;
  totalXp: number;
  rank: string;
  itemName: string | null;
  str: number;
  vit: number;
  agi: number;
  maxHp: number;
};
type Turn = {
  turn: number;
  attackerUsername: string;
  defenderId: number;
  defenderUsername: string;
  dodged: boolean;
  damage: number;
  defenderHp: number;
};
// Battaglia completa: serve per mostrare il risultato e il registro dei turni.
type Battle = {
  id: number;
  challenger_id: number;
  opponent_id: number;
  winner_id: number | null;
  winner_username?: string | null;
  challenger_stats: Fighter;
  opponent_stats: Fighter;
  turn_log: Turn[];
};
// Riga dello storico: il server non manda il registro dei turni, solo quanti sono stati.
type BattleSummary = {
  id: number;
  challenger_username: string;
  opponent_username: string;
  winner_id: number | null;
  winner_username: string | null;
  turns: number;
  created_at: string;
};
type Friend = { id: number; username: string; total_xp: number; rank: string };
type Rules = { maxDailyBattles: number; usedToday: number; remainingToday: number };

// Vita rimasta a un combattente alla fine dello scontro (ultimo colpo subito).
function remainingHp(battle: Battle, fighter: Fighter): number {
  let hp = fighter.maxHp;
  for (const turn of battle.turn_log) {
    if (turn.defenderId === fighter.id) hp = turn.defenderHp;
  }
  return hp;
}

function FighterCard({ battle, fighter }: { battle: Battle; fighter: Fighter }) {
  const hp = remainingHp(battle, fighter);
  const isWinner = battle.winner_id === fighter.id;
  return (
    <article className={`fighter${isWinner ? ' winner' : ''}`}>
      <span className="kicker">RANGO {fighter.rank}</span>
      <h4>{fighter.username}</h4>
      <small>{fighter.totalXp.toLocaleString('it-IT')} XP totali</small>
      <div className="hp-bar">
        <span style={{ width: `${(hp / fighter.maxHp) * 100}%` }} />
      </div>
      <small>
        HP {hp} / {fighter.maxHp}
      </small>
      <small>
        STR {fighter.str} · VIT {fighter.vit} · AGI {fighter.agi}
      </small>
      {fighter.itemName && <small>Item: {fighter.itemName}</small>}
      {isWinner && <span className="tag tag-verificata">VINCITORE</span>}
      {battle.winner_id === null && <span className="tag">PAREGGIO</span>}
    </article>
  );
}

export function BattlesPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [items, setItems] = useState<BattleSummary[]>([]);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);
  const [rules, setRules] = useState<Rules>({ maxDailyBattles: 0, usedToday: 0, remainingToday: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Ricarica lo storico e il numero di sfide rimaste oggi.
  async function loadHistory() {
    const history = await api.get<Rules & { items: BattleSummary[] }>('/battles');
    setItems(history.items);
    setRules(history);
  }

  useEffect(() => {
    Promise.all([api.get<Friend[]>('/friends'), loadHistory()])
      .then(([accepted]) => setFriends(accepted))
      .catch((caught) => setError(errorText(caught, 'Impossibile caricare l’arena.')))
      .finally(() => setLoading(false));
  }, []);

  async function challenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await api.post<{ battle: Battle }>('/battles', { opponentId: Number(selectedFriend) });
      setSelectedBattle(result.battle);
      setNotice('Battaglia completata. Lo scontro è stato risolto dal Sistema.');
      await loadHistory();
    } catch (caught) {
      setError(errorText(caught, 'Impossibile completare la battaglia.'));
    } finally {
      setBusy(false);
    }
  }

  // Scarica il dettaglio (con i turni) di una battaglia dello storico.
  async function openBattle(id: number) {
    setError('');
    setBusy(true);
    try {
      setSelectedBattle(await api.get<Battle>(`/battles/${id}`));
    } catch (caught) {
      setError(errorText(caught, 'Impossibile aprire la battaglia.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="[SISTEMA] CARICAMENTO ARENA…" />;

  const winnerName = selectedBattle
    ? selectedBattle.winner_id === selectedBattle.challenger_id
      ? selectedBattle.challenger_stats.username
      : selectedBattle.winner_id === selectedBattle.opponent_id
        ? selectedBattle.opponent_stats.username
        : null
    : null;

  return (
    <section className="page">
      <PageHeader
        kicker="ARENA DEI CACCIATORI"
        title="Misura la tua forza"
        description="Sfide automatiche tra amici, decise dalle statistiche. L'agilità decide chi attacca per primo, la forza il danno, la vitalità i punti vita e la difesa."
        aside={
          <StatPill value={`${rules.remainingToday}/${rules.maxDailyBattles}`} label="Sfide rimaste oggi" />
        }
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

      <Card>
        <CardHeader kicker="SFIDA AUTOMATICA" title="Scegli il tuo avversario" />
        <p className="muted">
          La battaglia si svolge subito. Il tuo amico non deve accettare e nessuno dei due riceve XP.
        </p>
        <form className="row" onSubmit={challenge}>
          <select
            aria-label="Scegli un amico"
            value={selectedFriend}
            onChange={(event) => setSelectedFriend(event.target.value)}
            required
            disabled={friends.length === 0}
          >
            <option value="">
              {friends.length ? 'Seleziona un amico accettato' : 'Aggiungi prima un amico'}
            </option>
            {friends.map((friend) => (
              <option key={friend.id} value={friend.id}>
                {friend.username} · {friend.rank} · {friend.total_xp.toLocaleString('it-IT')} XP
              </option>
            ))}
          </select>
          <button className="btn" disabled={busy || !selectedFriend || rules.remainingToday === 0}>
            <Swords size={15} /> Avvia battaglia <ArrowUpRight size={15} />
          </button>
        </form>
        {friends.length === 0 && (
          <small className="muted">Trova alleati nella sezione Amici per accedere all’arena.</small>
        )}
      </Card>

      {selectedBattle && (
        <Card>
          <div className="card-header">
            <div>
              <span className="kicker">RISULTATO DELLO SCONTRO</span>
              <h3>{winnerName ? `${winnerName} vince la battaglia` : 'Scontro terminato in pareggio'}</h3>
            </div>
            <button
              className="btn-icon"
              onClick={() => setSelectedBattle(null)}
              aria-label="Chiudi risultato"
            >
              <X size={17} />
            </button>
          </div>
          <div className="grid-2">
            <FighterCard battle={selectedBattle} fighter={selectedBattle.challenger_stats} />
            <FighterCard battle={selectedBattle} fighter={selectedBattle.opponent_stats} />
          </div>
          <CardHeader kicker="REGISTRO DEI TURNI" title={`${selectedBattle.turn_log.length} turni`} />
          <ol className="turn-log">
            {selectedBattle.turn_log.map((turn) => (
              <li key={turn.turn}>
                <strong>{String(turn.turn).padStart(2, '0')}</strong>
                <span>
                  {turn.attackerUsername} attacca {turn.defenderUsername}
                  {turn.dodged ? ' · schivata!' : ` · -${turn.damage} HP (rimasti: ${turn.defenderHp})`}
                </span>
              </li>
            ))}
          </ol>
          <small className="muted">Questa battaglia non assegna XP.</small>
        </Card>
      )}

      <Card>
        <CardHeader kicker="ARCHIVIO ARENA" title="Le tue battaglie" count={items.length} />
        {items.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nessuno scontro registrato"
            description="Le battaglie con i tuoi amici appariranno qui."
          />
        ) : (
          <div className="list">
            {items.map((battle) => (
              <article key={battle.id} className="item">
                <div className="item-icon">
                  {battle.winner_id === null ? <Scale size={16} /> : <Trophy size={16} />}
                </div>
                <div className="item-body">
                  <strong>
                    {battle.challenger_username} vs {battle.opponent_username}
                  </strong>
                  <small>
                    {formatDateTime(battle.created_at)} · {battle.turns} turni
                  </small>
                </div>
                <div className="item-body">
                  <small>{battle.winner_id === null ? 'PAREGGIO' : 'VINCITORE'}</small>
                  <strong>{battle.winner_username ?? '—'}</strong>
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => void openBattle(battle.id)}
                  disabled={busy}
                >
                  <History size={14} /> Rivedi
                </button>
              </article>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
