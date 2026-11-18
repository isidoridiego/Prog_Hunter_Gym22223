import { useEffect, useState, type FormEvent } from 'react';
import { Check, Clock3, Search, Trophy, UserPlus, Users, X } from 'lucide-react';
import { api } from '../api/apiClient';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  Emblem,
  Loading,
  PageHeader,
  StatPill,
  Tabs,
} from '../components/ui';
import { errorText, formatDate } from '../utils/format';

type Hunter = {
  id: number;
  username: string;
  total_xp: number;
  rank: string;
  monarch_title?: string | null;
  str?: number;
  vit?: number;
  agi?: number;
  is_self?: boolean;
  position?: number;
};
type SearchUser = Pick<Hunter, 'id' | 'username' | 'total_xp' | 'rank'> & {
  relationship: 'none' | 'accepted' | 'rejected' | 'request_sent' | 'request_received';
};
type FriendRequest = {
  id: number;
  username: string;
  status: 'pending' | 'rejected';
  created_at: string;
};
type Requests = { incoming: FriendRequest[]; outgoing: FriendRequest[] };
type Tab = 'friends' | 'requests' | 'leaderboard';

// Riga con i dati di un cacciatore (amici e classifica).
function HunterRow({ hunter, position }: { hunter: Hunter; position?: number }) {
  return (
    <article className={`item${hunter.is_self ? ' is-self' : ''}`}>
      <Emblem name={hunter.username} />
      <div className="item-body">
        <strong>
          {hunter.username}
          {hunter.is_self && <span className="tag"> TU</span>}
          {hunter.monarch_title && <small> · {hunter.monarch_title}</small>}
        </strong>
        <small>
          Rango {hunter.rank} · {hunter.total_xp.toLocaleString('it-IT')} XP
        </small>
        {hunter.str !== undefined && (
          <small>
            STR {hunter.str} · VIT {hunter.vit} · AGI {hunter.agi}
          </small>
        )}
      </div>
      {position !== undefined && <strong className="position">{String(position).padStart(2, '0')}</strong>}
    </article>
  );
}

export function FriendsPage() {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Hunter[]>([]);
  const [requests, setRequests] = useState<Requests>({ incoming: [], outgoing: [] });
  const [leaderboard, setLeaderboard] = useState<Hunter[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<Hunter | null>(null);

  async function loadFriends() {
    setFriends(await api.get<Hunter[]>('/friends'));
  }
  async function loadRequests() {
    setRequests(await api.get<Requests>('/friends/requests'));
  }
  async function loadLeaderboard() {
    setLeaderboard(await api.get<Hunter[]>('/friends/leaderboard'));
  }

  // A ogni cambio di scheda ricarica solo i dati che servono a quella scheda.
  useEffect(() => {
    setLoading(true);
    setError('');
    const load = async () => {
      if (tab === 'friends') {
        await loadFriends();
        await loadRequests();
      } else if (tab === 'requests') {
        await loadRequests();
      } else {
        await loadLeaderboard();
      }
    };
    load()
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoading(false));
  }, [tab]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (query.trim().length < 2) {
      setError('Scrivi almeno due caratteri per cercare un hunter.');
      return;
    }
    try {
      setResults(await api.get<SearchUser[]>(`/users/search?username=${encodeURIComponent(query.trim())}`));
      setSearched(true);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function sendRequest(user: SearchUser) {
    setBusyId(user.id);
    setError('');
    setNotice('');
    try {
      await api.post('/friends/requests', { userId: user.id });
      setResults(
        results.map((item) => (item.id === user.id ? { ...item, relationship: 'request_sent' } : item)),
      );
      setNotice(`Richiesta inviata a ${user.username}.`);
      await loadRequests();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function respond(id: number, action: 'accept' | 'reject') {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      await api.post(`/friends/requests/${id}/${action}`);
      setNotice(action === 'accept' ? 'Richiesta accettata. Ora siete amici.' : 'Richiesta rifiutata.');
      await loadRequests();
      if (action === 'accept') await loadFriends();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function unfriend(friend: Hunter) {
    setBusyId(friend.id);
    setError('');
    setNotice('');
    try {
      await api.delete(`/friends/${friend.id}`);
      setNotice(`${friend.username} è stato rimosso dagli amici.`);
      setConfirmRemove(null);
      await loadFriends();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  const pendingReceived = requests.incoming.filter((item) => item.status === 'pending').length;
  const pendingSent = requests.outgoing.filter((item) => item.status === 'pending').length;

  return (
    <section className="page">
      <PageHeader
        kicker="RETE CACCIATORI"
        title="La forza cresce in compagnia"
        description="Trova alleati, accetta le richieste e confronta i progressi."
        aside={<StatPill value={friends.length} label="Amici accettati" />}
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
        <form className="row" onSubmit={search}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per username…"
            aria-label="Cerca username"
          />
          <button className="btn">
            <Search size={15} /> Cerca
          </button>
        </form>
        {searched && (
          <div className="list">
            <CardHeader kicker="RISULTATI RICERCA" title="Hunter trovati" count={results.length} />
            {results.length === 0 && <p className="muted">Nessun utente trovato con questo username.</p>}
            {results.map((result) => (
              <article className="item" key={result.id}>
                <Emblem name={result.username} />
                <div className="item-body">
                  <strong>{result.username}</strong>
                  <small>
                    Rango {result.rank} · {result.total_xp.toLocaleString('it-IT')} XP
                  </small>
                </div>
                {result.relationship === 'none' && (
                  <button
                    className="btn"
                    onClick={() => void sendRequest(result)}
                    disabled={busyId === result.id}
                  >
                    <UserPlus size={15} /> Aggiungi
                  </button>
                )}
                {result.relationship === 'request_received' && (
                  <button className="btn btn-secondary" onClick={() => setTab('requests')}>
                    Rispondi
                  </button>
                )}
                {result.relationship === 'accepted' && <span className="tag tag-verificata">Già amici</span>}
                {result.relationship === 'request_sent' && <span className="tag tag-in_attesa">Inviata</span>}
                {result.relationship === 'rejected' && <span className="tag">Richiesta già chiusa</span>}
              </article>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearched(false);
                setResults([]);
              }}
            >
              Chiudi ricerca
            </button>
          </div>
        )}
      </Card>

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        items={[
          { value: 'friends', label: 'I miei amici', icon: Users },
          { value: 'requests', label: 'Richieste', icon: Clock3, badge: pendingReceived },
          { value: 'leaderboard', label: 'Classifica', icon: Trophy },
        ]}
      />

      {loading ? (
        <Loading text="[SISTEMA] CARICAMENTO…" />
      ) : tab === 'friends' ? (
        <Card>
          <CardHeader kicker="ALLEATI CONFERMATI" title="I tuoi amici" count={friends.length} />
          {friends.length === 0 ? (
            <EmptyState
              icon={Users}
              title="La tua squadra deve ancora formarsi"
              description="Cerca un hunter per inviare la prima richiesta di amicizia."
            />
          ) : (
            <div className="list">
              {friends.map((friend) => (
                <div key={friend.id}>
                  <HunterRow hunter={friend} />
                  {confirmRemove?.id === friend.id ? (
                    <div className="row confirm">
                      <span>Rimuovere {friend.username} dagli amici?</span>
                      <button
                        className="btn btn-danger"
                        onClick={() => void unfriend(friend)}
                        disabled={busyId === friend.id}
                      >
                        Conferma
                      </button>
                      <button className="btn btn-ghost" onClick={() => setConfirmRemove(null)}>
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      onClick={() => setConfirmRemove(friend)}
                      aria-label={`Rimuovi ${friend.username}`}
                    >
                      <X size={15} /> Rimuovi
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : tab === 'requests' ? (
        <div className="grid-2">
          <Card>
            <CardHeader kicker="DA ESAMINARE" title="Ricevute" count={pendingReceived} />
            {requests.incoming.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Nessuna richiesta ricevuta"
                description="Le nuove richieste compariranno qui."
              />
            ) : (
              <div className="list">
                {requests.incoming.map((item) => (
                  <article className="item" key={item.id}>
                    <Emblem name={item.username} />
                    <div className="item-body">
                      <strong>{item.username}</strong>
                      <small>
                        {item.status === 'pending' ? 'Vuole aggiungerti agli amici' : 'Richiesta rifiutata'} ·{' '}
                        {formatDate(item.created_at)}
                      </small>
                    </div>
                    {item.status === 'pending' ? (
                      <div className="item-actions">
                        <button
                          className="btn"
                          onClick={() => void respond(item.id, 'accept')}
                          disabled={busyId === item.id}
                        >
                          <Check size={14} /> Accetta
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => void respond(item.id, 'reject')}
                          disabled={busyId === item.id}
                        >
                          <X size={14} /> Rifiuta
                        </button>
                      </div>
                    ) : (
                      <span className="tag">Rifiutata</span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader kicker="IN ATTESA" title="Inviate" count={pendingSent} />
            {requests.outgoing.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title="Nessuna richiesta inviata"
                description="Le richieste che invii saranno elencate qui."
              />
            ) : (
              <div className="list">
                {requests.outgoing.map((item) => (
                  <article className="item" key={item.id}>
                    <Emblem name={item.username} />
                    <div className="item-body">
                      <strong>{item.username}</strong>
                      <small>
                        {item.status === 'pending' ? 'In attesa di risposta' : 'Richiesta rifiutata'} ·{' '}
                        {formatDate(item.created_at)}
                      </small>
                    </div>
                    <span className={`tag ${item.status === 'pending' ? 'tag-in_attesa' : ''}`}>
                      {item.status === 'pending' ? 'In attesa' : 'Rifiutata'}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader kicker="HUNTER E ALLEATI" title="Classifica amici" count={leaderboard.length} />
          {leaderboard.length === 0 ? (
            <EmptyState icon={Trophy} title="Classifica non disponibile" description="Riprova tra poco." />
          ) : (
            <div className="list">
              {leaderboard.map((hunter, index) => (
                <HunterRow key={hunter.id} hunter={hunter} position={hunter.position ?? index + 1} />
              ))}
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
