// src/data/classes.ts
// Class definitions for all 5 playable classes

export type ClassId = 'titan_shifter' | 'scout' | 'priest' | 'gunner' | 'engineer';

export interface ClassSkill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // seconds
  manaCost: number;
  icon: string; // key of the SVG asset
}

export interface ClassData {
  id: ClassId;
  name: string;
  role: string;
  description: string;
  color: number; // Phaser color for sprite placeholder
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  resource: {
    name: string;
    max: number;
    color: number;
    regenRate: number; // per second
  };
  skills: ClassSkill[];
}

export const CLASSES: Record<ClassId, ClassData> = {
  titan_shifter: {
    id: 'titan_shifter',
    name: 'Portador de Titã',
    role: 'Tank / Bruiser',
    description: 'Pode se transformar em um Titã colossal. Ganha Fúria atacando e sofrendo dano. Ao atingir 100% de Fúria, desencadeia a Transformação.',
    color: 0x8B0000,
    baseStats: {
      hp: 200,
      attack: 25,
      defense: 20,
      speed: 130
    },
    resource: {
      name: 'Fúria',
      max: 100,
      color: 0xFF4400,
      regenRate: 0
    },
    skills: [
      {
        id: 'heavy_strike',
        name: 'Golpe Pesado',
        description: 'Ataque físico poderoso corpo a corpo. Gera Fúria.',
        cooldown: 3,
        manaCost: 0,
        icon: 'icon_sword'
      },
      {
        id: 'roar',
        name: 'Rugido',
        description: 'Provoca inimigos próximos e aumenta geração de Fúria.',
        cooldown: 8,
        manaCost: 0,
        icon: 'icon_fury'
      },
      {
        id: 'transform',
        name: 'Transformação',
        description: 'Consome 100% de Fúria. Você se torna um Titã por 30 segundos.',
        cooldown: 0,
        manaCost: 100,
        icon: 'icon_fury'
      },
      {
        id: 'titan_punch',
        name: 'Soco Titânico',
        description: '[FORMA TITÃ] Soco devastador corpo a corpo.',
        cooldown: 2,
        manaCost: 0,
        icon: 'icon_sword'
      },
      {
        id: 'titan_stomp',
        name: 'Pisão',
        description: '[FORMA TITÃ] Pisão que causa dano em área.',
        cooldown: 5,
        manaCost: 0,
        icon: 'icon_fury'
      },
      {
        id: 'titan_harden',
        name: 'Endurecimento',
        description: '[FORMA TITÃ] Endurece a pele, aumentando muito a defesa.',
        cooldown: 12,
        manaCost: 0,
        icon: 'icon_shield'
      }
    ]
  },

  scout: {
    id: 'scout',
    name: 'Tropa de Exploração',
    role: 'DPS / Mobilidade',
    description: 'Especialista em lâminas e equipamento ODM. Alta mobilidade com Gancho. O Corte na Nuca causa dano massivo pelas costas do Titã.',
    color: 0x006400,
    baseStats: {
      hp: 120,
      attack: 30,
      defense: 10,
      speed: 190
    },
    resource: {
      name: 'Gás ODM',
      max: 100,
      color: 0x00AAFF,
      regenRate: 8
    },
    skills: [
      {
        id: 'grapple',
        name: 'Gancho ODM',
        description: 'Dispara ganchos e se lança rapidamente em direção ao ponto alvo. Consome Gás.',
        cooldown: 2,
        manaCost: 25,
        icon: 'icon_hook'
      },
      {
        id: 'spin_slash',
        name: 'Corte Giratório',
        description: 'Gira as lâminas ao redor do personagem, causando dano a todos inimigos próximos.',
        cooldown: 5,
        manaCost: 15,
        icon: 'icon_sword'
      },
      {
        id: 'nape_slash',
        name: 'Corte na Nuca',
        description: 'Ataque de alta precisão. Dano normal pela frente, dano crítico massivo pelas costas do Titã.',
        cooldown: 8,
        manaCost: 20,
        icon: 'icon_sword'
      }
    ]
  },

  priest: {
    id: 'priest',
    name: 'Pastor das Muralhas',
    role: 'Healer / Support',
    description: 'Seguidor da Igreja das Muralhas. Usa Fé para curar aliados e conceder bênçãos protetoras. Fundamental para expedições longas.',
    color: 0xFFD700,
    baseStats: {
      hp: 130,
      attack: 10,
      defense: 12,
      speed: 150
    },
    resource: {
      name: 'Fé',
      max: 100,
      color: 0xFFFFAA,
      regenRate: 5
    },
    skills: [
      {
        id: 'heal',
        name: 'Oração de Cura',
        description: 'Cura uma quantidade significativa de HP.',
        cooldown: 4,
        manaCost: 30,
        icon: 'icon_heal'
      },
      {
        id: 'blessing',
        name: 'Bênção das Muralhas',
        description: 'Aumenta sua defesa e resistência por 10 segundos.',
        cooldown: 12,
        manaCost: 20,
        icon: 'icon_shield'
      },
      {
        id: 'holy_ground',
        name: 'Oração de Restauração',
        description: 'Cria uma área sagrada que regenera HP periodicamente por 8 segundos.',
        cooldown: 15,
        manaCost: 40,
        icon: 'icon_heal'
      }
    ]
  },

  gunner: {
    id: 'gunner',
    name: 'Atirador da Guarnição',
    role: 'DPS Ranged / CC',
    description: 'Especialista em combate à distância com rifles militares. Mantém distância dos Titãs usando projéteis e redes de contenção.',
    color: 0x4169E1,
    baseStats: {
      hp: 130,
      attack: 28,
      defense: 10,
      speed: 155
    },
    resource: {
      name: 'Munição',
      max: 100,
      color: 0xFFAA00,
      regenRate: 5
    },
    skills: [
      {
        id: 'shoot',
        name: 'Tiro',
        description: 'Disparo básico à distância. Rápido e preciso.',
        cooldown: 1,
        manaCost: 5,
        icon: 'icon_gun'
      },
      {
        id: 'precision_shot',
        name: 'Tiro de Precisão',
        description: 'Tiro mais lento mas com dano muito maior.',
        cooldown: 6,
        manaCost: 15,
        icon: 'icon_gun'
      },
      {
        id: 'net',
        name: 'Rede de Contenção',
        description: 'Lança uma rede que reduz drasticamente a velocidade do Titã por 4 segundos.',
        cooldown: 12,
        manaCost: 20,
        icon: 'icon_hook'
      }
    ]
  },

  engineer: {
    id: 'engineer',
    name: 'Engenheiro de Campo',
    role: 'Support / Utilidade',
    description: 'Especialista em gadgets e dispositivos de campo. Cria suprimentos, torres automáticas e barricadas para controlar o campo de batalha.',
    color: 0xFF8C00,
    baseStats: {
      hp: 140,
      attack: 15,
      defense: 15,
      speed: 145
    },
    resource: {
      name: 'Suprimentos',
      max: 100,
      color: 0x88FF44,
      regenRate: 3
    },
    skills: [
      {
        id: 'supply_box',
        name: 'Caixa de Suprimentos',
        description: 'Deposita uma caixa que restaura Gás, Munição e Lâminas de aliados ao interagir.',
        cooldown: 20,
        manaCost: 30,
        icon: 'icon_heal'
      },
      {
        id: 'auto_cannon',
        name: 'Canhão Automático',
        description: 'Instala um canhão que ataca inimigos próximos automaticamente por 15 segundos.',
        cooldown: 25,
        manaCost: 40,
        icon: 'icon_gun'
      },
      {
        id: 'barricade',
        name: 'Barricada',
        description: 'Cria uma barricada que bloqueia o caminho dos inimigos por 10 segundos.',
        cooldown: 15,
        manaCost: 20,
        icon: 'icon_shield'
      }
    ]
  }
};
