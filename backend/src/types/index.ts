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
  size: 'small' | 'medium';
  languages: string[];
  traits?: string[];
  subraces?: Subrace[];
}

export interface Subrace {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  abilityBonus?: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  traits?: string[];
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
  savingThrows: string[];
  skillOptions: string[];
  subclasses: Subclass[];
}

export interface Subclass {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  minLevel: number;
  features?: string[];
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
  subraceId?: string;
  classId: string;
  subclassId?: string;
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
  nameEn?: string;
  raceId: string;
  subraceId?: string;
  classId: string;
  subclassId?: string;
  backgroundId?: string;
  alignmentId?: string;
  /** Claves de skills en las que es competente (elegidas de class.skillOptions). Máximo según clase. */
  skillProficiencies?: string[];
  /** Personalidad opcional (trasfondo) */
  personality?: {
    ideals?: string;
    bonds?: string;
    flaws?: string;
  };
  /** No enviar: el userId se toma del JWT en el backend */
}

/** Una fila de la ficha: habilidad o skill con modificador y si es competencia */
export interface SheetSaveOrSkill {
  key: string;
  nameEs: string;
  nameEn: string;
  modifier: number;
  proficient: boolean;
}

/** Ficha de personaje tipo D&D oficial: todo lo necesario para mostrar/imprimir */
export interface CharacterSheet {
  id: string;
  userId: string;
  nameEs: string;
  nameEn?: string | null;
  raceId: string;
  raceNameEs: string;
  raceNameEn: string;
  subraceId?: string | null;
  subraceNameEs?: string;
  subraceNameEn?: string;
  classId: string;
  classNameEs: string;
  classNameEn: string;
  subclassId?: string | null;
  subclassNameEs?: string;
  subclassNameEn?: string;
  level: number;
  experience: number;
  backgroundId?: string | null;
  backgroundNameEs?: string;
  backgroundNameEn?: string;
  alignmentId?: string | null;
  alignmentNameEs?: string;
  alignmentNameEn?: string;
  personality?: {
    ideals?: string | null;
    bonds?: string | null;
    flaws?: string | null;
  };
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  abilityModifiers: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  proficiencyBonus: number;
  savingThrows: SheetSaveOrSkill[];
  skills: SheetSaveOrSkill[];
  passivePerception: number;
  armorClass: number;
  initiative: number;
  speed: number;
  health: { current: number; maximum: number };
  hitDice: string;
  hitDiceTotal: number;
  gold: number;
  inspiration: number;
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
  /** Totales por nivel (según clase y nivel de personaje) */
  spellSlotsTotal?: {
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
  /** Hechizo en el que está concentrando (null si no) */
  concentratingOn?: string | null;
  /** IDs de condiciones activas (ej. poisoned, frightened) */
  activeConditions?: string[];
  /** Objetos en el inventario */
  inventory?: { id: string; name: string; quantity: number }[];
  traitsAndFeatures: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateGameStatsRequest {
  currentHealth?: number;
  maximumHealth?: number;
  currentGold?: number;
  spellSlotsUsed?: CharacterGameStats['spellSlotsUsed'];
  inspirationPoints?: number;
  concentratingOn?: string | null;
}
