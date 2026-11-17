// Durata della sessione di login (giorni) e limite di battaglie giornaliere per cacciatore.
export const SESSION_DAYS = 7;
export const MAX_DAILY_BATTLES = 10;

export const RANKS = [
  { name: 'E I', xp: 0, bonus: 5 },
  { name: 'E II', xp: 300, bonus: 10 },
  { name: 'E III', xp: 700, bonus: 15 },
  { name: 'D I', xp: 1200, bonus: 20 },
  { name: 'D II', xp: 1800, bonus: 25 },
  { name: 'D III', xp: 2500, bonus: 30 },
  { name: 'C I', xp: 3300, bonus: 35 },
  { name: 'C II', xp: 4200, bonus: 40 },
  { name: 'C III', xp: 5200, bonus: 45 },
  { name: 'B I', xp: 6400, bonus: 50 },
  { name: 'B II', xp: 7800, bonus: 55 },
  { name: 'B III', xp: 9400, bonus: 60 },
  { name: 'A I', xp: 11200, bonus: 65 },
  { name: 'A II', xp: 13200, bonus: 70 },
  { name: 'A III', xp: 15500, bonus: 75 },
  { name: 'S', xp: 18000, bonus: 80 },
  { name: 'SS', xp: 22000, bonus: 85 },
  { name: 'SSS', xp: 27000, bonus: 90 },
  { name: 'Monarca', xp: 33000, bonus: 0 },
] as const;
export type RankName = (typeof RANKS)[number]['name'];
type Rank = (typeof RANKS)[number];
export const MONARCH_CLASSES = ['Ombre', 'Fuoco', 'Ghiaccio', 'Fulmini', 'Vento', 'Bestie'] as const;
export type MonarchClass = (typeof MONARCH_CLASSES)[number];
export function getMonarchTitle(monarchClass: MonarchClass): string {
  const titleParts: Record<MonarchClass, string> = {
    Ombre: 'delle Ombre',
    Fuoco: 'del Fuoco',
    Ghiaccio: 'del Ghiaccio',
    Fulmini: 'dei Fulmini',
    Vento: 'del Vento',
    Bestie: 'delle Bestie',
  };
  return `Monarca ${titleParts[monarchClass]}`;
}

export function rankForXp(totalXp: number) {
  let current: Rank = RANKS[0];
  let previous: Rank = RANKS[0];
  const crossed: string[] = [];
  for (const rank of RANKS) {
    if (totalXp < rank.xp) break;
    current = rank;
    if (rank.xp > 0 && rank.xp > previous.xp) crossed.push(rank.name);
    previous = rank;
  }
  const rankIndex = RANKS.findIndex((rank) => rank.name === current.name);
  const rankBonus = RANKS.slice(0, rankIndex + 1).reduce((sum, rank) => sum + rank.bonus, 0);
  return { rank: current.name, rankIndex, rankBonus, nextRankXp: RANKS[rankIndex + 1]?.xp ?? null, crossed };
}

export const QUEST_REWARDS = {
  facile: { xp: 10, stat: 1 },
  media: { xp: 20, stat: 1 },
  hard: { xp: 40, stat: 2 },
} as const;
export type QuestDifficulty = keyof typeof QUEST_REWARDS;

export const BATTLE_MAX_TURNS = 40;
export const BATTLE_DAMAGE_VARIANCE = { min: 0.9, max: 1.1 } as const;
export const BATTLE_BASE_HP = 100;
export const BATTLE_HP_PER_VIT = 10;
export const BATTLE_ATTACK_PER_STR = 2;
export const BATTLE_DODGE_PER_AGI = 0.5;
export const BATTLE_MAX_DODGE_PERCENT = 40;
export const BATTLE_VIT_DAMAGE_FACTOR = 0.5;
export function getBattleMaxHp(vit: number): number {
  return BATTLE_BASE_HP + vit * BATTLE_HP_PER_VIT;
}
export function getBattleAttackPower(str: number): number {
  return str * BATTLE_ATTACK_PER_STR;
}
export function getBattleDodgeChance(agi: number): number {
  return Math.min(agi * BATTLE_DODGE_PER_AGI, BATTLE_MAX_DODGE_PERCENT);
}
export function challengerAttacksFirst(challengerAgi: number, opponentAgi: number): boolean {
  return challengerAgi >= opponentAgi;
}
export function isBattleAttackDodged(randomValue: number, dodgeChance: number): boolean {
  return randomValue * 100 < dodgeChance;
}
export function calculateBattleDamage(attackPower: number, defenderVit: number, randomValue: number): number {
  const multiplier =
    BATTLE_DAMAGE_VARIANCE.min + randomValue * (BATTLE_DAMAGE_VARIANCE.max - BATTLE_DAMAGE_VARIANCE.min);
  return Math.max(1, Math.round(attackPower * multiplier - defenderVit * BATTLE_VIT_DAMAGE_FACTOR));
}
export function getBattleWinner(
  challengerHp: number,
  opponentHp: number,
  challengerMaxHp: number,
  opponentMaxHp: number,
  challengerId: number,
  opponentId: number,
): number | null {
  if (challengerHp === 0) return opponentId;
  if (opponentHp === 0) return challengerId;
  const challengerRatio = challengerHp * opponentMaxHp;
  const opponentRatio = opponentHp * challengerMaxHp;
  if (challengerRatio > opponentRatio) return challengerId;
  if (opponentRatio > challengerRatio) return opponentId;
  return null;
}
