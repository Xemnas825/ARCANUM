// ===== RAZAS =====
export interface Race {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  abilityBonus: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  speed: number; // en pies
}

// ===== CLASES =====
export interface Class {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  hitDice: number; // d6, d8, d10, d12
  primaryAbility: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
}

// ===== HABILIDADES =====
export interface Ability {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// ===== PERSONAJE =====
export interface Character {
  id: string;
  userId: string;
  nameEs: string;
  nameEn?: string;
  raceId: string;
  classId: string;
  level: number;
  experience: number;
  
  // Habilidades base
  abilities: Ability;
  
  // Datos de partida
  health: {
    current: number;
    maximum: number;
  };
  
  gold: number;
  
  // Recursos según clase
  spellSlots?: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
    level6: number;
    level7: number;
    level8: number;
    level9: number;
  };
  
  inspiration: number; // Puntos de inspiración
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ===== STATS MUTABLES DE PARTIDA =====
export interface CharacterGameStats {
  characterId: string;
  currentHealth: number;
  maximumHealth: number;
  currentGold: number;
  spellSlotsUsed?: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
    level6: number;
    level7: number;
    level8: number;
    level9: number;
  };
  inspirationPoints: number;
  updatedAt: Date;
}

// ===== REQUEST/RESPONSE TYPES =====
export interface CreateCharacterRequest {
  nameEs: string;
  raceId: string;
  classId: string;
  userId: string;
}

export interface UpdateGameStatsRequest {
  currentHealth?: number;
  currentGold?: number;
  spellSlotsUsed?: CharacterGameStats['spellSlotsUsed'];
  inspirationPoints?: number;
}
