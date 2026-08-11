// src/data/levels.ts
// Level progression data

export interface LevelData {
  level: number;
  xpRequired: number; // XP needed to reach this level FROM previous
  hpBonus: number;
  attackBonus: number;
  defenseBonus: number;
}

export const LEVEL_DATA: LevelData[] = [
  { level: 1, xpRequired: 0,    hpBonus: 0,  attackBonus: 0, defenseBonus: 0 },
  { level: 2, xpRequired: 100,  hpBonus: 20, attackBonus: 3, defenseBonus: 2 },
  { level: 3, xpRequired: 220,  hpBonus: 25, attackBonus: 4, defenseBonus: 2 },
  { level: 4, xpRequired: 380,  hpBonus: 30, attackBonus: 4, defenseBonus: 3 },
  { level: 5, xpRequired: 600,  hpBonus: 35, attackBonus: 5, defenseBonus: 3 },
  { level: 6, xpRequired: 900,  hpBonus: 40, attackBonus: 5, defenseBonus: 4 },
  { level: 7, xpRequired: 1300, hpBonus: 45, attackBonus: 6, defenseBonus: 4 },
  { level: 8, xpRequired: 1800, hpBonus: 50, attackBonus: 7, defenseBonus: 5 },
  { level: 9, xpRequired: 2400, hpBonus: 60, attackBonus: 8, defenseBonus: 5 },
  { level: 10, xpRequired: 3200, hpBonus: 80, attackBonus: 10, defenseBonus: 7 }
];

export function getXpForLevel(level: number): number {
  return LEVEL_DATA.slice(1, level + 1).reduce((acc, l) => acc + l.xpRequired, 0);
}

export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= 10) return Infinity;
  return LEVEL_DATA[currentLevel].xpRequired;
}
