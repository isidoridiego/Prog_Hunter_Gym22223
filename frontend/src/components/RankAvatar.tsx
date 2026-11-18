// Immagine profilo: cambia in base al rango del cacciatore (4 stadi).
// Per cambiare un'immagine sostituisci il file in public/avatars/ (formato verticale 4:5 consigliato).
const STAGES = [
  { src: '/avatars/stage-1.jpg', title: 'Cacciatore Novizio', range: 'Ranghi E – D' },
  { src: '/avatars/stage-2.jpg', title: 'Cacciatore Esperto', range: 'Ranghi C – B' },
  { src: '/avatars/stage-3.jpg', title: 'Cacciatore d’Élite', range: 'Rango A' },
  { src: '/avatars/stage-4.jpg', title: 'Monarca delle Ombre', range: 'Ranghi S – SSS e Monarca' },
];

// E I–D III → 0; C I–B III → 1; A I–A III → 2; S, SS, SSS e Monarca → 3.
function getAvatarStage(rank: string): number {
  const letter = rank.trim().charAt(0).toUpperCase();
  if (letter === 'E' || letter === 'D') return 0;
  if (letter === 'C' || letter === 'B') return 1;
  if (letter === 'A') return 2;
  return 3;
}

export function RankAvatar({ rank, username }: { rank: string; username: string }) {
  const stage = STAGES[getAvatarStage(rank)];
  return (
    <figure className="rank-avatar">
      <img src={stage.src} alt={`${stage.title}: immagine profilo di ${username}`} />
      <figcaption>
        <strong>{stage.title}</strong>
        <small>{stage.range}</small>
      </figcaption>
    </figure>
  );
}
