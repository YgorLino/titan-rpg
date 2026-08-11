// src/data/monsters.ts
// Monster definitions

export interface MonsterData {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  detectionRange: number;
  attackRange: number;
  attackCooldown: number; // seconds
  xpReward: number;
  width: number;  // visual size multiplier
  height: number;
  color: number;
  headColor: number;
  weaknessMultiplier: number; // damage mult from behind
  boss?: boolean;
}

export const MONSTERS: Record<string, MonsterData> = {
  titan_normal: {
    id: 'titan_normal',
    name: 'Titã',
    hp: 300,
    attack: 20,
    defense: 5,
    speed: 60,
    detectionRange: 220,
    attackRange: 55,
    attackCooldown: 2.5,
    xpReward: 50,
    width: 64,
    height: 96,
    color: 0xD4A574,
    headColor: 0xC8946A,
    weaknessMultiplier: 1.5
  },
  titan_aberrant: {
    id: 'titan_aberrant',
    name: 'Titã Excêntrico',
    hp: 400,
    attack: 40,
    defense: 8,
    speed: 130,
    detectionRange: 350,
    attackRange: 50,
    attackCooldown: 1.2,
    xpReward: 150,
    width: 64,
    height: 96,
    color: 0xB8860B,
    headColor: 0xA0740A,
    weaknessMultiplier: 1.5
  },
  titan_colossal: {
    id: 'titan_colossal',
    name: 'Titã Colossal',
    hp: 2400,
    attack: 72,
    defense: 16,
    speed: 38,
    detectionRange: 520,
    attackRange: 95,
    attackCooldown: 3.2,
    xpReward: 1200,
    width: 132,
    height: 190,
    color: 0x9b1f18,
    headColor: 0xc8432f,
    weaknessMultiplier: 2,
    boss: true
  }
};
