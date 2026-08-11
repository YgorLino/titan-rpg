// src/data/quests.ts
// Quest definitions

export interface QuestObjective {
  type: 'kill' | 'talk' | 'reach';
  target: string;
  count: number;
  current: number;
}

export interface QuestData {
  id: string;
  name: string;
  description: string;
  npcId: string;
  objectives: QuestObjective[];
  xpReward: number;
  goldReward: number;
  completionDialog: string;
  startDialog: string;
}

export const QUESTS: Record<string, QuestData> = {
  first_expedition: {
    id: 'first_expedition',
    name: 'Primeira Expedição',
    description: 'Saia das muralhas e elimine Titãs para provar seu valor.',
    npcId: 'captain',
    objectives: [
      {
        type: 'kill',
        target: 'titan',
        count: 3,
        current: 0
      }
    ],
    xpReward: 200,
    goldReward: 50,
    startDialog: 'Soldado! As muralhas precisam de defensores corajosos.\nSua primeira missão: saia pelas portas e elimine 3 Titãs.\nProve que você tem o que é preciso para servir à humanidade!',
    completionDialog: 'Impressionante! Você realmente eliminou os Titãs.\nA humanidade tem um novo herói! Aqui está sua recompensa, soldado.\nContinue forte — há muito mais por vir além das muralhas.'
  },
  lost_supplies: {
    id: 'lost_supplies',
    name: 'Suprimentos Perdidos',
    description: 'Fale com o Ferreiro e ajude a proteger a rota de suprimentos eliminando Titãs na região norte.',
    npcId: 'blacksmith',
    objectives: [
      {
        type: 'kill',
        target: 'titan',
        count: 5,
        current: 0
      }
    ],
    xpReward: 350,
    goldReward: 120,
    startDialog: 'Nossas caravanas de suprimentos estão sendo atacadas perto das ruínas do norte.\nLimpe a área eliminando 5 Titãs e eu te recompensarei bem.',
    completionDialog: 'Meus rapazes conseguiram passar com o metal graças a você!\nTome, você mereceu cada moeda.'
  },
  elite_titan: {
    id: 'elite_titan',
    name: 'Ameaça Excêntrica',
    description: 'O Capitão Levi relatou a presença de um Titã Excêntrico perigoso. Abata-o.',
    npcId: 'captain', // We can use the captain or Levi himself for this
    objectives: [
      {
        type: 'kill',
        target: 'titan_aberrant',
        count: 1,
        current: 0
      }
    ],
    xpReward: 500,
    goldReward: 250,
    startDialog: 'Recebemos relatos de um Titã com comportamento anômalo — um Excêntrico.\nEles são rápidos e imprevisíveis. Encontre-o e elimine-o antes que cause um desastre.',
    completionDialog: 'Você derrubou um Excêntrico sozinho? Nada mau.\nParece que você não é só conversa. Aqui está seu pagamento.'
  }
};
