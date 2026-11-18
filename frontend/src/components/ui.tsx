import type { ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';

// Contenitore base: ogni sezione delle pagine è una card.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

// Intestazione di una card: etichetta piccola, titolo e, se serve, un contatore.
export function CardHeader({ kicker, title, count }: { kicker?: string; title: string; count?: number }) {
  return (
    <div className="card-header">
      <div>
        {kicker && <span className="kicker">{kicker}</span>}
        <h3>{title}</h3>
      </div>
      {count !== undefined && <span className="count">{count}</span>}
    </div>
  );
}

// Titolo di pagina con un numero riassuntivo a destra (facoltativo).
export function PageHeader(props: { kicker: string; title: string; description: string; aside?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <span className="kicker">{props.kicker}</span>
        <h2>{props.title}</h2>
        <p className="muted">{props.description}</p>
      </div>
      {props.aside}
    </header>
  );
}

// Numero grande con una descrizione sotto.
export function StatPill({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

// Messaggio di errore o di conferma che l'utente può chiudere.
export function Alert(props: { type: 'error' | 'success'; children: ReactNode; onClose?: () => void }) {
  return (
    <div className={`alert alert-${props.type}`} role={props.type === 'error' ? 'alert' : 'status'}>
      <span>{props.children}</span>
      {props.onClose && (
        <button className="btn-icon" onClick={props.onClose} aria-label="Chiudi messaggio">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return <p className="loading kicker">{text}</p>;
}

export function EmptyState(props: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="empty-state">
      <props.icon size={22} strokeWidth={1.8} />
      <h4>{props.title}</h4>
      {props.description && <p className="muted">{props.description}</p>}
    </div>
  );
}

// Cerchio con l'iniziale dell'username.
export function Emblem({ name }: { name: string }) {
  return <div className="emblem">{name.slice(0, 1).toUpperCase()}</div>;
}

// Etichetta colorata STR / VIT / AGI.
export function StatBadge({ stat }: { stat: string }) {
  return <span className={`badge badge-${stat.toLowerCase()}`}>{stat}</span>;
}

// Le tre statistiche del cacciatore (usata nel profilo e nella console admin).
export function StatsRow(props: {
  stats: Record<'STR' | 'VIT' | 'AGI', number>;
  base: Record<'STR' | 'VIT' | 'AGI', number>;
  baseLabel: string;
}) {
  return (
    <div className="stats-row">
      {(['STR', 'VIT', 'AGI'] as const).map((stat) => (
        <div key={stat}>
          <span>{stat}</span>
          <strong>{props.stats[stat].toLocaleString('it-IT')}</strong>
          <small>
            {props.base[stat].toLocaleString('it-IT')} {props.baseLabel}
          </small>
        </div>
      ))}
    </div>
  );
}

type TabItem = { value: string; label: string; icon?: LucideIcon; badge?: number };

// Barra di schede: la scheda attiva ha la classe "active".
export function Tabs(props: { items: TabItem[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {props.items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={props.value === item.value}
          className={`tab${props.value === item.value ? ' active' : ''}`}
          onClick={() => props.onChange(item.value)}
        >
          {item.icon && <item.icon size={15} />}
          {item.label}
          {item.badge ? <span className="count">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}
